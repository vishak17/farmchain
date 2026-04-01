# FARMCHAIN — FULL IMPLEMENTATION GUIDE
### Antigravity Prompts + Verification Protocol
**12-Hour Execution Plan | Hardware Simulated**

---

## BEFORE YOU START — ONE-TIME SETUP

### Create the monorepo skeleton first

**Antigravity Prompt:**
```
Create a monorepo directory structure for a project called FarmChain with the following
top-level folders inside a root folder called `farmchain`:
- blockchain/
- backend/
- ai-service/
- frontend/

Inside `farmchain/`, create a root `README.md` that lists the four services and their
ports: blockchain runs on 8545, backend on 3001, ai-service on 8000, frontend on 5173.

Also create a `farmchain/start-all.sh` bash script that opens 6 terminal tabs and runs
the correct start command in each:
1. npx hardhat node (in blockchain/)
2. npx hardhat run scripts/deploy.js --network localhost (in blockchain/)
3. uvicorn main:app --port 8000 --reload (in ai-service/)
4. npm run dev (in backend/)
5. npm run dev (in frontend/)
6. node src/scripts/demo-seed.js (in backend/, labeled "Run this LAST")

Print the full directory tree after creation.
```

### Verify setup:
```bash
ls farmchain/
# Should show: blockchain/ backend/ ai-service/ frontend/ README.md start-all.sh
cat farmchain/README.md
```

---

---

# MODULE 1 — SMART CONTRACTS (Blockchain Foundation)
**Estimated time: 90 minutes**
**Run order: FIRST — everything depends on this**

---

## STEP 1.1 — Initialize Hardhat Project

**Antigravity Prompt:**
```
Navigate to farmchain/blockchain. Initialize a new Hardhat project:

1. Run: npm init -y
2. Run: npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
3. Run: npx hardhat init and choose "Create a JavaScript project" and accept all defaults
4. Run: npm install @openzeppelin/contracts

Then replace hardhat.config.js with this exact content:
```
```js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  paths: {
    artifacts: "./artifacts",
    sources: "./contracts",
    scripts: "./scripts"
  }
};
```
```
Delete the default Lock.sol in contracts/ and the deploy.js in scripts/.
Print the final directory tree of blockchain/.
```

### Verify 1.1:
```bash
cd farmchain/blockchain
npx hardhat compile
# Should print: "Nothing to compile" (no contracts yet) with no errors
cat hardhat.config.js
# Should show the config above
```

---

## STEP 1.2 — Write FRSEngine.sol (Pure Library — No Dependencies)

**Antigravity Prompt:**
```
In farmchain/blockchain/contracts/, create FRSEngine.sol.

This is a pure Solidity library with NO external imports. It implements the
Freshness Rate Score calculation engine for an agricultural supply chain.

Requirements:

1. Define an enum at the file level (not inside the library):
   enum ProduceCategory { STANDARD, HIGH_SENSITIVITY, HIGH_TOLERANCE }

2. Create `library FRSEngine` with these functions, ALL marked `internal pure`:

   a. `calculateFRS(uint256 wOriginGrams, uint256 wDestGrams) returns (uint256 frsBasisPoints)`
      - Returns FRS as basis points (e.g. 9640 means 96.40%)
      - Formula: (wDestGrams * 10000) / wOriginGrams
      - Require wOriginGrams > 0 with message "Origin weight cannot be zero"
      - Require wDestGrams <= wOriginGrams with message "Dest weight exceeds origin"

   b. `getGrade(uint256 frsBasisPoints, ProduceCategory cat) returns (string memory grade, string memory label, string memory action, bool shouldDispute)`
      Implement all three grading tables from these thresholds:
      
      STANDARD (default):
        9800-10000 => ("A+", "Premium", "Full price - top shelf", false)
        9500-9799  => ("A",  "Fresh",   "Full price - marketable", false)
        9000-9499  => ("B",  "Acceptable", "Slight discount - sell within 2 days", false)
        8500-8999  => ("C",  "Reduced", "Significant discount - sell today", false)
        0-8499     => ("D",  "Rejected", "Dispute triggered - no full payment", true)
      
      HIGH_SENSITIVITY:
        9800-10000 => ("A+", "Premium", "Full price", false)
        9600-9799  => ("A",  "Fresh",   "Full price", false)
        9300-9599  => ("B",  "Acceptable", "Moderate discount", false)
        9000-9299  => ("C",  "Reduced", "Deep discount - sell immediately", false)
        0-8999     => ("D",  "Rejected", "Dispute triggered", true)
      
      HIGH_TOLERANCE:
        9500-10000 => ("A+", "Premium", "Full price", false)
        9200-9499  => ("A",  "Fresh",   "Full price", false)
        8800-9199  => ("B",  "Acceptable", "Minor discount", false)
        8500-8799  => ("C",  "Reduced", "Sell soon", false)
        0-8499     => ("D",  "Rejected", "Dispute triggered", true)

   c. `detectFreshnessAnomaly(uint256[] memory frsHistory) returns (bool isAnomaly, uint256 anomalyIndex)`
      - If ANY later entry is HIGHER than an earlier entry by more than 50 basis points,
        return (true, index of that entry). This flags preservative use.
      - Otherwise return (false, 0)

   d. `computePDEE(ProduceCategory cat, uint256 originFRS, uint256 transitHoursExpected) returns (uint256 expiryWindowHours)`
      - HIGH_SENSITIVITY: base 24 hours, reduced by: (10000 - originFRS) / 200 hours, min 6
      - STANDARD: base 72 hours, reduced by: (10000 - originFRS) / 200 hours, min 12
      - HIGH_TOLERANCE: base 168 hours, reduced by: (10000 - originFRS) / 200 hours, min 24
      - Subtract transitHoursExpected from base before returning

   e. `calculateFRSDelta(uint256 frs1, uint256 frs2) returns (uint256 delta, bool isDecrease)`
      - Returns absolute difference and direction

After writing the contract, compile it with: npx hardhat compile
Fix any compilation errors before proceeding.
Print the compiled artifacts path for FRSEngine.
```

### Verify 1.2:
```bash
cd farmchain/blockchain
npx hardhat compile
# Must show: "Compiled 1 Solidity file successfully"
ls artifacts/contracts/FRSEngine.sol/
# Must show: FRSEngine.json  FRSEngine.dbg.json
```

---

## STEP 1.3 — Write FarmerRegistry.sol

**Antigravity Prompt:**
```
In farmchain/blockchain/contracts/, create FarmerRegistry.sol.

Import: @openzeppelin/contracts/access/Ownable.sol
Import: @openzeppelin/contracts/utils/Counters.sol (if available, else implement a simple counter)

CONTRACT: FarmerRegistry is Ownable

STATE:
  using Counters for Counters.Counter;
  Counters.Counter private _farmerIdCounter;
  
  struct Farmer {
    uint256 id;
    address wallet;
    string name;
    string village;
    string state;
    string gpsLocation;
    uint8 incomeTier;        // 1=low, 2=medium, 3=high
    uint256 landHoldingsCents; // land in cents of acre (e.g. 50 = 0.5 acres)
    string[] produceCategories;
    bool isVerified;
    bool isBlacklisted;
    uint256 registrationTimestamp;
    uint256 insurancePoolWei;
    uint256 reputationScore;  // starts at 100, max 100
    uint256 totalBatchesCreated;
    uint256 totalDisputesAgainst;
    uint256 totalDisputesGuilty;
  }
  
  mapping(address => Farmer) public farmers;
  mapping(uint256 => address) public farmerIdToAddress;
  mapping(address => bool) public registeredFarmers;
  address[] public allFarmerAddresses;

EVENTS:
  FarmerRegistered(uint256 indexed id, address indexed wallet, string name, string village)
  FarmerVerified(address indexed wallet)
  InsurancePoolUpdated(address indexed wallet, uint256 newBalance)
  ReputationUpdated(address indexed wallet, uint256 newScore)
  FarmerBlacklisted(address indexed wallet)

FUNCTIONS:

1. constructor(address initialOwner) Ownable(initialOwner)

2. registerFarmer(
     string memory name,
     string memory village,
     string memory state,
     string memory gpsLocation,
     uint8 incomeTier,
     uint256 landHoldingsCents,
     string[] memory produceCategories
   ) external returns (uint256 farmerId)
   - Require: !registeredFarmers[msg.sender]
   - Require: incomeTier >= 1 && incomeTier <= 3
   - Require: bytes(name).length > 0
   - Auto-increment counter, assign id
   - Set reputationScore = 100
   - Push to allFarmerAddresses
   - Emit FarmerRegistered

3. verifyFarmer(address wallet) external onlyOwner
   - Set isVerified = true
   - Emit FarmerVerified

4. creditInsurancePool(address wallet, uint256 amountWei) external
   - Only callable by owner or BatchRegistry (store BatchRegistry address separately)
   - farmers[wallet].insurancePoolWei += amountWei
   - Emit InsurancePoolUpdated

5. updateReputation(address wallet, int8 delta) external
   - Only callable by owner or DisputeEngine
   - Safely clamp: if delta < 0 and would go below 0, set to 0; if would exceed 100, set to 100
   - Emit ReputationUpdated

6. calculateSubsidyPriority(address wallet) public view returns (uint256 score)
   - REQUIRE farmer is registered
   - incomeTierScore: tier 1 = 100, tier 2 = 50, tier 3 = 0
   - landScore: landHoldingsCents <= 100 (1 acre) = 100; <= 500 = 50; else = 10
   - activityScore: totalBatchesCreated >= 10 = 100; >= 5 = 60; >= 1 = 30; else = 0
   - cropRiskScore: if any produceCategory in ["spinach","lettuce","mushroom","strawberry"] = 100; else 50
   - Return: (40 * incomeTierScore + 25 * landScore + 20 * activityScore + 15 * cropRiskScore) / 100

7. getFarmer(address wallet) external view returns (Farmer memory)

8. getAllFarmers() external view returns (address[] memory)

9. incrementBatchCount(address wallet) external (onlyOwner or BatchRegistry)

10. setBatchRegistryAddress(address addr) external onlyOwner

Compile after writing. Fix any errors.
```

### Verify 1.3:
```bash
npx hardhat compile
# Must show: "Compiled 2 Solidity files successfully"
```

---

## STEP 1.4 — Write BatchRegistry.sol (Core Ledger)

**Antigravity Prompt:**
```
In farmchain/blockchain/contracts/, create BatchRegistry.sol. This is the most important contract.

Imports:
  @openzeppelin/contracts/access/Ownable.sol
  ./FRSEngine.sol (for ProduceCategory enum and library)
  ./FarmerRegistry.sol

CONTRACT: BatchRegistry is Ownable

STATE:
  using FRSEngine for *;
  FarmerRegistry public farmerRegistry;
  
  enum NodeType { FARM, MIDDLEMAN, DEPOT, RETAILER }
  enum SealStatus { INTACT, BROKEN, FLAGGED }
  
  struct CustodyRecord {
    address nodeWallet;
    string nodeName;
    uint256 timestamp;
    uint256 weightGrams;
    uint256 frsBasisPoints;
    SealStatus seal;
    string ipfsVisualHash;
    string gpsLocation;
    NodeType nodeType;
    string grade;
    string label;
  }
  
  struct Batch {
    string batchId;
    address farmerWallet;
    string produceType;
    ProduceCategory category;
    uint256 originWeightGrams;
    uint256 originCount;
    string originGPS;
    uint256 harvestTimestamp;
    uint256 pdeeTimestamp;
    uint256 currentFRS;
    CustodyRecord[] custodyChain;
    bool isDisputed;
    bool isExpired;
    bool isSettled;
    bool anomalyFlagged;
    uint256 disputeId;
  }
  
  mapping(string => Batch) public batches;
  mapping(address => string[]) public farmerBatches;
  mapping(string => uint256[]) public produceTypeTotalWeight;  // produceType => [totalWeightGrams]
  string[] public allBatchIds;
  uint256 private _batchCounter;
  address public disputeEngineAddress;
  mapping(address => bool) public blacklistedNodes;

EVENTS:
  BatchCreated(string indexed batchId, address indexed farmer, string produceType, uint256 originWeight)
  CustodyTransferred(string indexed batchId, address indexed node, uint256 newFRS, string grade)
  FreshnessDegraded(string indexed batchId, uint256 legDropBasisPoints, address responsibleNode)
  AnomalyFlagged(string indexed batchId, string anomalyType)
  BatchExpired(string indexed batchId)
  BatchDisputed(string indexed batchId, uint256 disputeId)

FUNCTIONS:

1. constructor(address initialOwner, address _farmerRegistry) Ownable(initialOwner)

2. generateBatchId() internal returns (string memory)
   - Format: "BATCH-KA-{4-digit-year}-{5-digit-zero-padded-counter}"
   - Year from block.timestamp (approximate: timestamp / 31557600 + 1970, use 2024 as hardcoded base + counter/10000)
   - Actually: just return string concat of "BATCH-KA-2024-" + zero-padded _batchCounter

3. createBatch(
     string memory produceType,
     ProduceCategory category,
     uint256 originWeightGrams,
     uint256 originCount,
     string memory originGPS,
     string memory ipfsVisualHash,
     string memory nodeName
   ) external returns (string memory batchId)
   - Require: farmerRegistry.registeredFarmers(msg.sender) == true
   - Require: !blacklistedNodes[msg.sender]
   - Require: originWeightGrams > 0 && originCount > 0
   - Generate batchId
   - Calculate pdeeTimestamp: block.timestamp + (FRSEngine.computePDEE(category, 10000, 24) * 1 hours)
   - Set currentFRS = 10000 (100.00%)
   - Create initial CustodyRecord at FARM node with FRS 10000, seal INTACT
   - Push to farmerBatches[msg.sender] and allBatchIds
   - Call farmerRegistry.incrementBatchCount(msg.sender)
   - Emit BatchCreated

4. recordCustodyTransfer(
     string memory batchId,
     uint256 newWeightGrams,
     string memory ipfsVisualHash,
     string memory gpsLocation,
     string memory nodeName,
     NodeType nodeType,
     SealStatus sealStatus
   ) external returns (uint256 newFRS)
   - Require: batches[batchId].farmerWallet != address(0), "Batch not found"
   - Require: !blacklistedNodes[msg.sender]
   - Require: !batches[batchId].isExpired
   - Calculate newFRS using FRSEngine.calculateFRS(originWeightGrams, newWeightGrams)
   - Get grade using FRSEngine.getGrade(newFRS, category)
   - Calculate delta from last custody record
   - If delta > 300 basis points (3%): emit FreshnessDegraded with responsible node
   - If shouldDispute: mark isDisputed = true, call DisputeEngine (store address)
   - If sealStatus == BROKEN: emit AnomalyFlagged with "BROKEN_SEAL"
   - Check anomaly: if newFRS > previous FRS: set anomalyFlagged = true, emit AnomalyFlagged with "PRESERVATIVE_SUSPECTED"
   - Check expiry: if block.timestamp > pdeeTimestamp: set isExpired = true, emit BatchExpired
   - Append CustodyRecord
   - Update currentFRS
   - Emit CustodyTransferred
   - Credit farmer insurance pool: call farmerRegistry.creditInsurancePool(farmerWallet, msg.value/10) if msg.value > 0
   - Return newFRS

5. getBatch(string memory batchId) external view returns (Batch memory)
   - Note: returning a struct with a dynamic array (custodyChain) requires "memory" — ensure this compiles

6. getCustodyChain(string memory batchId) external view returns (CustodyRecord[] memory)

7. getBatchesByFarmer(address farmer) external view returns (string[] memory)

8. getNetworkInventory(string memory produceType) external view returns (uint256 totalWeightGrams, uint256 activeBatchCount)
   - Iterate allBatchIds, sum weight of non-expired batches matching produceType

9. getAllActiveBatches() external view returns (string[] memory activeBatchIds)
   - Return only non-expired, non-settled batch IDs

10. blacklistNode(address node) external onlyOwner
    - Set blacklistedNodes[node] = true

11. setDisputeEngineAddress(address addr) external onlyOwner

12. markDisputed(string memory batchId, uint256 disputeId) external
    - Only callable by DisputeEngine address

Compile. If there are stack-too-deep errors, move local variables to a struct or split functions.
Print any warnings.
```

### Verify 1.4:
```bash
npx hardhat compile
# Must show: "Compiled 3 Solidity files successfully"
# Zero errors. Warnings about unused variables are OK.
```

---

## STEP 1.5 — Write DisputeEngine.sol and SubsidyEngine.sol

**Antigravity Prompt:**
```
In farmchain/blockchain/contracts/, create DisputeEngine.sol.

Imports:
  @openzeppelin/contracts/access/AccessControl.sol
  ./BatchRegistry.sol
  ./FarmerRegistry.sol

CONTRACT: DisputeEngine is AccessControl

ROLES:
  bytes32 public constant PANEL_ROLE = keccak256("PANEL_ROLE");
  bytes32 public constant INITIATOR_ROLE = keccak256("INITIATOR_ROLE");

STATE:
  enum DisputeStatus { OPEN, EVIDENCE_PHASE, VOTING, RESOLVED_GUILTY, RESOLVED_INNOCENT }
  enum DisputeType { LOW_FRS, BROKEN_SEAL, COUNT_DISCREPANCY, CONSUMER_REPORT }
  
  struct DisputeVote {
    address voter;
    uint8 vote; // 1=guilty, 2=innocent
    uint256 timestamp;
  }
  
  struct Dispute {
    uint256 id;
    string batchId;
    address initiator;
    address respondent;
    DisputeType disputeType;
    string systemEvidence;       // JSON string: frs delta analysis
    string submittedEvidence;    // IPFS hash of uploaded evidence
    uint256 createdAt;
    uint256 evidenceDeadline;
    DisputeStatus status;
    DisputeVote[] votes;
    uint256 guiltyVotes;
    uint256 innocentVotes;
    bool resolved;
    uint256 compensationWei;
    string systemRecommendation; // "GUILTY" or "INNOCENT" based on FRS delta analysis
  }
  
  mapping(uint256 => Dispute) public disputes;
  mapping(string => uint256) public batchToDisputeId;  // batchId => latest disputeId
  uint256 public disputeCounter;
  uint256 public disputeFundWei;
  BatchRegistry public batchRegistry;
  FarmerRegistry public farmerRegistry;

EVENTS:
  DisputeCreated(uint256 indexed id, string batchId, address respondent, DisputeType dtype)
  EvidenceSubmitted(uint256 indexed id, address submitter, string ipfsHash)
  VoteCast(uint256 indexed id, address voter, uint8 vote)
  DisputeResolved(uint256 indexed id, bool guilty, address respondent)
  CompensationDisbursed(uint256 indexed id, address recipient, uint256 amount)

FUNCTIONS:

1. constructor(address admin, address _batchRegistry, address _farmerRegistry)
   - Grant DEFAULT_ADMIN_ROLE to admin
   - Grant PANEL_ROLE to admin (for testing)
   - Grant INITIATOR_ROLE to admin

2. createDispute(
     string memory batchId,
     address respondent,
     DisputeType dtype,
     string memory systemEvidence,
     string memory systemRecommendation
   ) external returns (uint256 disputeId)
   - Require: hasRole(INITIATOR_ROLE, msg.sender) || msg.sender == address(batchRegistry)
   - disputeCounter++
   - Create dispute with evidenceDeadline = block.timestamp + 48 hours
   - Set status = EVIDENCE_PHASE
   - batchToDisputeId[batchId] = disputeCounter
   - Call batchRegistry.markDisputed(batchId, disputeCounter)
   - Emit DisputeCreated

3. submitEvidence(uint256 disputeId, string memory ipfsHash) external
   - Require: block.timestamp <= disputes[disputeId].evidenceDeadline
   - Require: disputes[disputeId].status == EVIDENCE_PHASE
   - Set submittedEvidence
   - Set status = VOTING
   - Emit EvidenceSubmitted

4. castVote(uint256 disputeId, uint8 vote) external onlyRole(PANEL_ROLE)
   - Require: disputes[disputeId].status == VOTING
   - Require: vote == 1 || vote == 2
   - Append vote
   - Update guiltyVotes or innocentVotes
   - Emit VoteCast

5. resolveDispute(uint256 disputeId) external
   - Require: block.timestamp > disputes[disputeId].evidenceDeadline || disputes[disputeId].votes.length >= 3
   - Require: !disputes[disputeId].resolved
   - Determine verdict: guiltyVotes > innocentVotes
   - Set appropriate status
   - If GUILTY:
     - Call farmerRegistry.updateReputation(respondent, -15)
     - Emit DisputeResolved with guilty=true
     - If disputeFundWei >= 0.1 ether: disburse compensation to initiator
   - Else:
     - Emit DisputeResolved with guilty=false
   - Set resolved = true

6. depositToFund() external payable
   - disputeFundWei += msg.value

7. getDispute(uint256 id) external view returns (...)
   - Return all fields except votes array (return separately)

8. getDisputeVotes(uint256 id) external view returns (DisputeVote[] memory)

9. getOpenDisputes() external view returns (uint256[] memory)

---

Now in the SAME file or a new file, create SubsidyEngine.sol:

CONTRACT: SubsidyEngine is Ownable

STATE:
  FarmerRegistry public farmerRegistry;
  uint256 public poolBalance;
  
  struct DisbursementRecord {
    address farmer;
    uint256 amount;
    uint256 timestamp;
    string source;
    uint256 priorityScore;
  }
  
  mapping(address => uint256) public totalReceived;
  mapping(address => uint256) public lastDisbursementTimestamp;
  DisbursementRecord[] public disbursementHistory;
  uint256 public disbursementPerFarmer;  // configurable, default 0.1 ether
  
EVENTS:
  SubsidyDeposited(address depositor, uint256 amount, string source)
  SubsidyQueued(address farmer, uint256 priorityScore)
  SubsidyDisbursed(address farmer, uint256 amount, uint256 priorityScore)

FUNCTIONS:

1. constructor(address initialOwner, address _farmerRegistry)
   - Set disbursementPerFarmer = 0.01 ether (small for demo)

2. depositSubsidy(string memory source) external payable onlyOwner
   - poolBalance += msg.value
   - Emit SubsidyDeposited

3. processDisbursements(uint256 batchSize) external onlyOwner
   - Get all farmers from farmerRegistry.getAllFarmers()
   - Filter: only verified, not blacklisted, lastDisbursement > 90 days ago (skip for demo: any farmer)
   - Sort by priority score (bubble sort top batchSize entries — yes, inefficient but fine for demo)
   - For each in top batchSize:
     - If poolBalance >= disbursementPerFarmer:
       - Transfer disbursementPerFarmer to farmer
       - Update poolBalance, totalReceived, lastDisbursementTimestamp
       - Record DisbursementRecord
       - Emit SubsidyDisbursed

4. getPriorityQueue() external view returns (address[] memory farmers, uint256[] memory scores)
   - Return all farmers sorted by calculateSubsidyPriority score

5. getDisbursementHistory() external view returns (DisbursementRecord[] memory)

6. setDisbursementAmount(uint256 amount) external onlyOwner

Compile ALL contracts. Fix any errors. Print final compile output.
```

### Verify 1.5:
```bash
npx hardhat compile
# Must show: "Compiled 5 Solidity files successfully" (FRSEngine, FarmerRegistry, BatchRegistry, DisputeEngine, SubsidyEngine)
```

---

## STEP 1.6 — Write FundingContracts.sol

**Antigravity Prompt:**
```
In farmchain/blockchain/contracts/, create FundingContracts.sol.

Imports:
  @openzeppelin/contracts/access/Ownable.sol
  @openzeppelin/contracts/security/ReentrancyGuard.sol
  ./FarmerRegistry.sol
  ./BatchRegistry.sol

CONTRACT: FundingContracts is Ownable, ReentrancyGuard

STATE:
  enum FundingStatus { OPEN, FUNDED, ACTIVE_SEASON, SETTLED, FAILED }
  
  struct FundingRequest {
    uint256 id;
    address farmer;
    string cropType;
    uint256 landAreaCents;
    uint256 inputRequiredWei;
    uint256 estimatedYieldKg;
    uint8 equityPercent;       // 0-30 max
    uint256 totalFundedWei;
    FundingStatus status;
    uint256 season;            // year
    uint256 createdAt;
    uint256 fundingDeadline;   // 30 days from creation
    address[] investors;
  }
  
  mapping(uint256 => FundingRequest) public requests;
  mapping(uint256 => mapping(address => uint256)) public contributions; // requestId => investor => amount
  mapping(address => uint256[]) public farmerRequests;
  mapping(address => uint256[]) public investorPortfolio;
  uint256 public requestCounter;
  FarmerRegistry public farmerRegistry;
  BatchRegistry public batchRegistry;

EVENTS:
  FundingRequestCreated(uint256 indexed id, address indexed farmer, string cropType, uint256 target)
  FarmerFunded(uint256 indexed id, address indexed investor, uint256 amount)
  HarvestSettled(uint256 indexed id, uint256 totalSale, uint256 investorShare)
  InsuranceClaimPaid(uint256 indexed id, address investor, uint256 amount)

FUNCTIONS:

1. constructor(address initialOwner, address _farmerRegistry, address _batchRegistry)

2. createFundingRequest(
     string memory cropType,
     uint256 landAreaCents,
     uint256 inputRequiredWei,
     uint256 estimatedYieldKg,
     uint8 equityPercent
   ) external returns (uint256 requestId)
   - Require farmer is registered
   - Require equityPercent <= 30
   - Require: no other OPEN request from this farmer (prevent fraud)
   - Require: inputRequiredWei > 0
   - Set fundingDeadline = block.timestamp + 30 days
   - Emit FundingRequestCreated

3. fundFarmer(uint256 requestId) external payable nonReentrant
   - Require: requests[requestId].status == OPEN
   - Require: block.timestamp <= requests[requestId].fundingDeadline
   - Require: msg.value > 0
   - Add to contributions[requestId][msg.sender]
   - If investor not already in list: push to investors array
   - Add requestId to investorPortfolio[msg.sender] if not already there
   - totalFundedWei += msg.value
   - If totalFundedWei >= inputRequiredWei: set status = FUNDED, transfer funds to farmer
   - Emit FarmerFunded

4. settleHarvest(uint256 requestId, uint256 actualSaleAmountWei) external payable nonReentrant
   - Require: msg.sender == requests[requestId].farmer
   - Require: requests[requestId].status == FUNDED || ACTIVE_SEASON
   - Require: msg.value == actualSaleAmountWei
   - For each investor in investors array:
     - investorContribution = contributions[requestId][investor]
     - investorShare = (investorContribution * equityPercent * actualSaleAmountWei) / (totalFundedWei * 100)
     - Transfer investorShare to investor
   - Set status = SETTLED
   - Emit HarvestSettled

5. getActiveFundingRequests() external view returns (uint256[] memory)
   - Return IDs with status OPEN

6. getFarmerReliabilityScore(address farmer) external view returns (uint256 score)
   - Simple scoring: (reputationScore from FarmerRegistry) * 1
   - Returns 0-100

7. getRequest(uint256 id) external view returns (FundingRequest memory)

8. getContribution(uint256 requestId, address investor) external view returns (uint256)

Compile all contracts. Print final output showing all 6 contracts compiled.
```

### Verify 1.6:
```bash
npx hardhat compile
# Must show: "Compiled 6 Solidity files successfully"
ls artifacts/contracts/
# Should show 6 directories
```

---

## STEP 1.7 — Write Deploy Script and Run It

**Antigravity Prompt:**
```
In farmchain/blockchain/scripts/, create deploy.js.

This script deploys all 6 FarmChain contracts to the local Hardhat network in the correct
dependency order and writes the deployment results to a JSON file.

Requirements:

1. Get the deployer (signers[0]) and 5 additional test accounts (signers[1] through signers[5]).
   Print deployer address and balance.

2. Deploy in this EXACT order (each depends on the previous):
   a. FRSEngine (library — deploy as a standalone contract)
   b. FarmerRegistry (pass deployer.address as initialOwner)
   c. BatchRegistry (pass deployer.address, farmerRegistry.address)
   d. DisputeEngine (pass deployer.address, batchRegistry.address, farmerRegistry.address)
   e. SubsidyEngine (pass deployer.address, farmerRegistry.address)
   f. FundingContracts (pass deployer.address, farmerRegistry.address, batchRegistry.address)

3. Wire the contracts together:
   - Call batchRegistry.setDisputeEngineAddress(disputeEngine.address)
   - Call farmerRegistry.setBatchRegistryAddress(batchRegistry.address)

4. Seed 5 demo farmers using signers[1] through signers[5]:
   Farmer 1 (signer[1]): name="Raju Kumar", village="Tumkur", state="Karnataka", 
     gps="13.3379,77.1173", incomeTier=1, landHoldings=50, produces=["tomato","mango"]
   Farmer 2 (signer[2]): name="Meena Devi", village="Hassan", state="Karnataka",
     gps="13.0072,76.1004", incomeTier=1, landHoldings=75, produces=["spinach","coriander"]
   Farmer 3 (signer[3]): name="Suresh Patil", village="Mysuru", state="Karnataka",
     gps="12.2958,76.6394", incomeTier=2, landHoldings=200, produces=["onion","garlic"]
   Farmer 4 (signer[4]): name="Anitha Reddy", village="Belagavi", state="Karnataka",
     gps="15.8497,74.4977", incomeTier=2, landHoldings=300, produces=["apple","grapes"]
   Farmer 5 (signer[5]): name="Venkat Rao", village="Hubballi", state="Karnataka",
     gps="15.3647,75.1240", incomeTier=3, landHoldings=600, produces=["pumpkin","coconut"]
   
   Connect each signer to farmerRegistry before calling registerFarmer.
   Then verify farmers 1-4 using deployer (call verifyFarmer for each).

5. Seed 3 demo batches from signer[1] (Raju Kumar):
   Batch 1: produceType="tomato", category=ProduceCategory.STANDARD (value 0),
     weight=10000 (10kg), count=80, gps="13.3379,77.1173", ipfs="QmFakeHash001", nodeName="Raju Farm"
   Batch 2: produceType="mango", category=STANDARD,
     weight=15000, count=60, gps="13.3379,77.1173", ipfs="QmFakeHash002", nodeName="Raju Farm"
   Batch 3 from signer[2] (Meena Devi): produceType="spinach", category=HIGH_SENSITIVITY (value 1),
     weight=5000, count=200, gps="13.0072,76.1004", ipfs="QmFakeHash003", nodeName="Meena Farm"

6. Deposit 10 ETH into SubsidyEngine pool using deployer:
   await subsidyEngine.depositSubsidy("Government Karnataka Pilot", { value: ethers.parseEther("10") })

7. Grant PANEL_ROLE in DisputeEngine to signers[0], signers[1], signers[2]

8. Write output to TWO files:
   a. farmchain/blockchain/deployed-addresses.json: 
      { "FRSEngine": addr, "FarmerRegistry": addr, "BatchRegistry": addr,
        "DisputeEngine": addr, "SubsidyEngine": addr, "FundingContracts": addr,
        "network": "localhost", "chainId": 31337, "deployedAt": timestamp }
   b. farmchain/backend/config/contracts.json: same content (backend reads from here)
      Create the farmchain/backend/config/ directory if it doesn't exist.

9. Also copy all 6 ABI files from artifacts/contracts/ to farmchain/backend/config/abis/:
   - Copy only the .json file (not .dbg.json) for each contract

10. Print a deployment summary table showing contract name, address, and tx hash.

After writing the script, run it:
  Start hardhat node in background: npx hardhat node &
  Wait 3 seconds, then run: npx hardhat run scripts/deploy.js --network localhost
  
Print the full output. If there are errors, fix the contracts and redeploy.
```

### Verify 1.7 (CRITICAL — most important module verification):
```bash
# Check deployed addresses exist
cat farmchain/blockchain/deployed-addresses.json
# Must show 6 contract addresses, all different, all valid 0x... format

cat farmchain/backend/config/contracts.json
# Must be identical to deployed-addresses.json

ls farmchain/backend/config/abis/
# Must show: FarmerRegistry.json BatchRegistry.json DisputeEngine.json SubsidyEngine.json FundingContracts.json FRSEngine.json

# Quick contract interaction test
cd farmchain/blockchain
npx hardhat console --network localhost
# In console:
const addr = require('./deployed-addresses.json');
const FarmerRegistry = await ethers.getContractAt("FarmerRegistry", addr.FarmerRegistry);
const farmers = await FarmerRegistry.getAllFarmers();
console.log("Farmers registered:", farmers.length);
// Must print: "Farmers registered: 5"
const f = await FarmerRegistry.getFarmer(farmers[0]);
console.log(f.name, f.incomeTier.toString());
// Must print farmer name and tier
.exit
```

**Module 1 is complete when**: 6 contracts deployed, 5 farmers registered, 3 batches created, subsidy pool has 10 ETH, no errors in console.

---

---

# MODULE 2 — BACKEND API + SIMULATION ENGINE
**Estimated time: 2.5 hours**
**Run after Module 1 is verified**

---

## STEP 2.1 — Initialize Backend Project

**Antigravity Prompt:**
```
Navigate to farmchain/backend. Initialize the Node.js backend:

1. Run: npm init -y

2. Install all dependencies:
npm install express mongoose jsonwebtoken bcryptjs ethers cors helmet morgan multer
npm install qrcode sharp axios ws uuid express-validator dotenv cookie-parser
npm install --save-dev nodemon

3. Create this .env file in farmchain/backend/:
PORT=3001
MONGO_URI=mongodb://localhost:27017/farmchain
JWT_SECRET=farmchain_hackathon_secret_key_2024_do_not_share
JWT_EXPIRES_IN=7d
BLOCKCHAIN_RPC=http://127.0.0.1:8545
AI_SERVICE_URL=http://localhost:8000
IPFS_MOCK=true
NODE_ENV=development
GAS_FEE_INSURANCE_PERCENT=10

4. Create package.json scripts:
"dev": "nodemon src/server.js",
"start": "node src/server.js"

5. Create ALL of these empty directories (just mkdir -p, no files yet):
src/config/
src/middleware/
src/models/
src/routes/
src/services/
src/simulators/
src/scripts/
uploads/evidence/
uploads/batches/

Print the directory tree.
```

---

## STEP 2.2 — Config, Models, and Middleware

**Antigravity Prompt:**
```
In farmchain/backend/src/, create these files:

--- FILE: config/db.js ---
Mongoose connection function:
- Connect to process.env.MONGO_URI
- Log "MongoDB Connected: {host}" on success
- Log error and process.exit(1) on failure
- Export the connect function

--- FILE: models/User.js ---
Mongoose schema:
{
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['FARMER','TRANSPORTER','MIDDLEMAN','RETAILER','CONSUMER','ADMIN','PANEL_MEMBER'], required: true },
  walletAddress: { type: String },
  walletPrivateKey: { type: String },  // encrypted, for demo we store plaintext
  farmerId: { type: Number },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}
Add a method: generateWallet() that uses ethers.Wallet.createRandom() to generate a wallet
and sets walletAddress and walletPrivateKey. Call this automatically in a pre-save hook
if walletAddress is not set.
Export the model.

--- FILE: models/OffChainBatch.js ---
Mongoose schema to cache blockchain data for fast queries:
{
  batchId: { type: String, required: true, unique: true, index: true },
  farmerWallet: { type: String, required: true, index: true },
  farmerName: { type: String },
  produceType: { type: String, required: true },
  category: { type: String, enum: ['STANDARD','HIGH_SENSITIVITY','HIGH_TOLERANCE'] },
  currentFRS: { type: Number },
  currentGrade: { type: String },
  originWeightGrams: { type: Number },
  isDisputed: { type: Boolean, default: false },
  isExpired: { type: Boolean, default: false },
  anomalyFlagged: { type: Boolean, default: false },
  custodyChainLength: { type: Number, default: 1 },
  lastUpdated: { type: Date, default: Date.now },
  harvestTimestamp: { type: Date },
  pdeeTimestamp: { type: Date },
  tags: [String]  // for search
}

--- FILE: models/DisputeEvidence.js ---
{
  disputeId: { type: Number, required: true },
  batchId: { type: String, required: true },
  submittedBy: { type: String },  // wallet address
  submitterRole: { type: String },
  fileUrl: { type: String },
  ipfsHash: { type: String },
  evidenceType: { type: String, enum: ['PHOTO','TEMPERATURE_LOG','SEAL_PHOTO','STATEMENT'] },
  description: { type: String },
  submittedAt: { type: Date, default: Date.now }
}

--- FILE: middleware/auth.js ---
Export three middleware functions:
1. authenticate(req, res, next):
   - Extract token from Authorization header: "Bearer {token}"
   - If no token: 401 { error: "No token provided" }
   - Verify with JWT_SECRET, attach decoded to req.user
   - On error: 401 { error: "Invalid token" }

2. requireRole(...roles): returns middleware that checks req.user.role is in roles array
   - If not: 403 { error: "Access denied. Required role: {roles.join(', ')}" }

3. optionalAuth(req, res, next): like authenticate but calls next() even if no token
   (for public endpoints that behave differently when logged in)

--- FILE: middleware/errorHandler.js ---
Global error handler middleware and asyncHandler wrapper:
- asyncHandler: wraps async route handlers to catch errors and pass to next()
- errorHandler(err, req, res, next): sends { error: err.message, stack: (dev only) }
  with appropriate status code (err.statusCode || 500)
- AppError class: extends Error, adds statusCode property

Print confirmation that all files were created.
```

---

## STEP 2.3 — Blockchain Service (The Critical Bridge)

**Antigravity Prompt:**
```
Create farmchain/backend/src/services/blockchain.service.js

This file is the bridge between the Express API and the deployed smart contracts.
It MUST read the contract addresses from ../config/contracts.json and ABIs from ../config/abis/.

Requirements:

1. At the top, load all contract data:
   - Read contracts.json to get all addresses
   - Read each ABI from config/abis/ directory
   - Create an ethers JsonRpcProvider connected to process.env.BLOCKCHAIN_RPC

2. Export a class BlockchainService with these instance methods:

   getProvider() — returns the provider
   
   getSigner(privateKey) — returns ethers.Wallet connected to provider
   
   getDeployerSigner() — returns signer using first Hardhat account private key
     (hardcoded for demo: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
   
   getContract(contractName, signer) — returns ethers.Contract with ABI and address
   
   async registerFarmer(userData, privateKey):
     - Get signer from privateKey
     - Get FarmerRegistry contract
     - Call registerFarmer with correct params from userData
     - Wait for tx, return { txHash, farmerId from event, blockNumber }
   
   async createBatch(batchData, farmerPrivateKey):
     - Call BatchRegistry.createBatch
     - Wait for tx, parse BatchCreated event to get batchId
     - Return { txHash, batchId, pdeeTimestamp }
   
   async recordCustodyTransfer(params, nodePrivateKey):
     - Call BatchRegistry.recordCustodyTransfer
     - Parse events: CustodyTransferred, FreshnessDegraded (if present)
     - Return { txHash, newFRS, grade, label, alerts: [] }
     - If FreshnessDegraded event present: add to alerts array
   
   async getBatch(batchId):
     - Call BatchRegistry.getBatch(batchId)
     - Format result: convert BigInt to numbers, timestamps to ISO strings
     - Return formatted batch object
   
   async getCustodyChain(batchId):
     - Call BatchRegistry.getCustodyChain(batchId)
     - Format each record
     - Return array
   
   async getNetworkInventory(produceType):
     - Call BatchRegistry.getNetworkInventory(produceType)
     - Return { totalWeightGrams, activeBatchCount }
   
   async getAllActiveBatches():
     - Call BatchRegistry.getAllActiveBatches()
     - Return array of batchIds
   
   async createDispute(batchId, respondent, disputeType, systemEvidence, recommendation):
     - Use deployer signer (disputes auto-created by system)
     - Call DisputeEngine.createDispute
     - Return { disputeId, txHash }
   
   async submitEvidence(disputeId, ipfsHash, submitterPrivateKey):
     - Call DisputeEngine.submitEvidence
     - Return { txHash }
   
   async castVote(disputeId, vote, panelMemberPrivateKey):
     - Call DisputeEngine.castVote
     - Return { txHash }
   
   async resolveDispute(disputeId):
     - Call DisputeEngine.resolveDispute using deployer
     - Return { txHash, verdict }
   
   async getSubsidyQueue():
     - Call SubsidyEngine.getPriorityQueue()
     - Return sorted array of { address, score }
   
   async processSubsidyDisbursements(batchSize):
     - Call SubsidyEngine.processDisbursements(batchSize) using deployer
     - Return { txHash, processed: batchSize }
   
   async createFundingRequest(requestData, farmerPrivateKey):
     - Call FundingContracts.createFundingRequest
     - Return { requestId, txHash }
   
   async fundFarmer(requestId, amountWei, investorPrivateKey):
     - Call FundingContracts.fundFarmer with value
     - Return { txHash }
   
   async settleHarvest(requestId, saleAmountWei, farmerPrivateKey):
     - Call FundingContracts.settleHarvest with value
     - Return { txHash }

3. At the bottom, export a singleton: module.exports = new BlockchainService()

4. Wrap ALL blockchain calls in try/catch. On error, parse the ethers error:
   - If error.reason exists: throw new Error(error.reason)
   - If error.message includes "revert": extract the revert reason
   - Else: throw the original error
   
Print the completed file.
```

---

## STEP 2.4 — Sensor and Network Simulators

**Antigravity Prompt:**
```
Create farmchain/backend/src/simulators/SensorSimulator.js

This class generates realistic IoT sensor data for farm produce without real hardware.

class SensorSimulator {

  DECAY_RATES = {
    HIGH_SENSITIVITY: 0.0020,   // weight loss per hour as fraction
    STANDARD: 0.0005,
    HIGH_TOLERANCE: 0.0001
  }

  PRODUCE_CATEGORIES = {
    'spinach': 'HIGH_SENSITIVITY', 'lettuce': 'HIGH_SENSITIVITY',
    'coriander': 'HIGH_SENSITIVITY', 'mushroom': 'HIGH_SENSITIVITY',
    'strawberry': 'HIGH_SENSITIVITY', 'mint': 'HIGH_SENSITIVITY',
    'tomato': 'STANDARD', 'mango': 'STANDARD', 'apple': 'STANDARD',
    'capsicum': 'STANDARD', 'grapes': 'STANDARD', 'carrot': 'STANDARD',
    'beans': 'STANDARD', 'brinjal': 'STANDARD',
    'pumpkin': 'HIGH_TOLERANCE', 'coconut': 'HIGH_TOLERANCE',
    'onion': 'HIGH_TOLERANCE', 'garlic': 'HIGH_TOLERANCE',
    'jackfruit': 'HIGH_TOLERANCE', 'watermelon': 'HIGH_TOLERANCE',
    'potato': 'HIGH_TOLERANCE', 'ginger': 'HIGH_TOLERANCE'
  }

  // Karnataka route templates: [fromCity, toCity, waypoints as {lat,lng,name}[]]
  ROUTES = [
    { from: "Tumkur", to: "Bengaluru", waypoints: [
      {lat:13.3379, lng:77.1173, name:"Tumkur Mandi"},
      {lat:13.1000, lng:77.3000, name:"Nelamangala Depot"},
      {lat:13.0827, lng:77.5977, name:"Peenya Hub"},
      {lat:12.9716, lng:77.5946, name:"Bengaluru Market"}
    ]},
    { from: "Hassan", to: "Mysuru", waypoints: [
      {lat:13.0072, lng:76.1004, name:"Hassan Farm"},
      {lat:12.7000, lng:76.4000, name:"Sakleshpur Depot"},
      {lat:12.2958, lng:76.6394, name:"Mysuru APMC"}
    ]},
    { from: "Belagavi", to: "Hubballi", waypoints: [
      {lat:15.8497, lng:74.4977, name:"Belagavi Cold Storage"},
      {lat:15.5000, lng:75.0000, name:"Dharwad Transit Hub"},
      {lat:15.3647, lng:75.1240, name:"Hubballi Market"}
    ]},
    { from: "Mysuru", to: "Bengaluru", waypoints: [
      {lat:12.2958, lng:76.6394, name:"Mysuru Aggregator"},
      {lat:12.5000, lng:77.0000, name:"Mandya Depot"},
      {lat:12.9716, lng:77.5946, name:"Bengaluru Market"}
    ]}
  ]

  getCategory(produceType) {
    return this.PRODUCE_CATEGORIES[produceType.toLowerCase()] || 'STANDARD';
  }

  // Add Gaussian noise using Box-Muller transform
  gaussianNoise(mean, stddev) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return mean + stddev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  generateWeightReading(originWeightGrams, hoursSinceHarvest, produceType, injectTamper = false) {
    const category = this.getCategory(produceType);
    const decayRate = this.DECAY_RATES[category];
    let weight = originWeightGrams * Math.pow(1 - decayRate, hoursSinceHarvest);
    weight = this.gaussianNoise(weight, originWeightGrams * 0.002); // 0.2% noise
    weight = Math.max(weight, originWeightGrams * 0.5); // never below 50% (unrealistic)
    if (injectTamper) {
      const tamperPct = 0.03 + Math.random() * 0.05; // 3-8% theft
      weight *= (1 - tamperPct);
    }
    return Math.round(weight); // grams, integer
  }

  generateGPSForRoute(routeIndex, waypointIndex) {
    const route = this.ROUTES[routeIndex % this.ROUTES.length];
    const wp = route.waypoints[waypointIndex % route.waypoints.length];
    // Add small noise to simulate GPS imprecision
    const lat = wp.lat + (Math.random() - 0.5) * 0.001;
    const lng = wp.lng + (Math.random() - 0.5) * 0.001;
    return { lat: lat.toFixed(6), lng: lng.toFixed(6), location: wp.name };
  }

  generateTemperature(produceType, isColdChain = false) {
    if (isColdChain) return this.gaussianNoise(6, 1).toFixed(1); // 4-8°C
    const base = produceType === 'mushroom' ? 15 : 28;
    return this.gaussianNoise(base, 2).toFixed(1);
  }

  generateHumidity() {
    return this.gaussianNoise(70, 5).toFixed(1);
  }

  generateIoTPayload(batchId, nodeType, produceType, originWeightGrams, hoursSinceHarvest, routeIndex, waypointIndex) {
    const injectTamper = Math.random() < 0.05; // 5% chance
    const weight = this.generateWeightReading(originWeightGrams, hoursSinceHarvest, produceType, injectTamper);
    const gps = this.generateGPSForRoute(routeIndex, waypointIndex);
    const isColdChain = ['mushroom','strawberry','lettuce','spinach'].includes(produceType.toLowerCase());
    return {
      batchId,
      nodeType,
      timestamp: new Date().toISOString(),
      weightGrams: weight,
      gpsLocation: `${gps.lat},${gps.lng}`,
      locationName: gps.location,
      temperature: parseFloat(this.generateTemperature(produceType, isColdChain)),
      humidity: parseFloat(this.generateHumidity()),
      tamperDetected: injectTamper,
      sensorId: `SENSOR-${batchId}-${nodeType}`,
      isColdChain
    };
  }
}

module.exports = new SensorSimulator();

---

Now create farmchain/backend/src/simulators/NetworkSimulator.js

This runs background simulation of the supply chain network.

const blockchainService = require('../services/blockchain.service');
const sensorSim = require('./SensorSimulator');
const OffChainBatch = require('../models/OffChainBatch');

class NetworkSimulator {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.tickCount = 0;
    this.activeBatches = [];  // { batchId, routeIndex, currentWaypoint, hoursSinceHarvest, produceType, originWeight }
    this.wsClients = new Set();  // WebSocket clients to broadcast to
  }

  setWsClients(clients) { this.wsClients = clients; }

  broadcast(event, data) {
    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    this.wsClients.forEach(ws => {
      if (ws.readyState === 1) ws.send(payload);  // OPEN = 1
    });
  }

  async loadActiveBatches() {
    try {
      const batchIds = await blockchainService.getAllActiveBatches();
      // For each batchId, get details and build simulation state
      for (const batchId of batchIds.slice(0, 10)) {  // max 10 for demo
        const batch = await blockchainService.getBatch(batchId);
        if (!batch || batch.isExpired || batch.isSettled) continue;
        const routeIndex = Math.floor(Math.random() * 4);
        const waypoint = batch.custodyChain ? batch.custodyChain.length : 1;
        this.activeBatches.push({
          batchId,
          routeIndex,
          currentWaypoint: waypoint,
          hoursSinceHarvest: 2 + waypoint * 3,
          produceType: batch.produceType || 'tomato',
          originWeightGrams: parseInt(batch.originWeightGrams) || 10000,
          category: batch.category || 0,
          farmerWallet: batch.farmerWallet
        });
      }
      console.log(`[NetworkSimulator] Loaded ${this.activeBatches.length} batches for simulation`);
    } catch (err) {
      console.error('[NetworkSimulator] Failed to load batches:', err.message);
    }
  }

  async tick() {
    this.tickCount++;
    if (this.activeBatches.length === 0) return;
    
    // Advance one random batch per tick
    const idx = this.tickCount % this.activeBatches.length;
    const batchSim = this.activeBatches[idx];
    
    if (!batchSim) return;
    
    batchSim.currentWaypoint++;
    batchSim.hoursSinceHarvest += 3;
    
    // Determine node type from waypoint
    const nodeTypes = [0, 1, 2, 3]; // FARM, MIDDLEMAN, DEPOT, RETAILER
    const nodeType = Math.min(batchSim.currentWaypoint, 3);
    
    try {
      const payload = sensorSim.generateIoTPayload(
        batchSim.batchId,
        nodeType,
        batchSim.produceType,
        batchSim.originWeightGrams,
        batchSim.hoursSinceHarvest,
        batchSim.routeIndex,
        batchSim.currentWaypoint
      );
      
      // Use deployer's signer for simulation (in prod each node has their own key)
      const result = await blockchainService.recordCustodyTransfer({
        batchId: batchSim.batchId,
        newWeightGrams: payload.weightGrams,
        ipfsVisualHash: `QmSim${Date.now()}`,
        gpsLocation: payload.gpsLocation,
        nodeName: payload.locationName,
        nodeType: nodeType,
        sealStatus: payload.tamperDetected ? 1 : 0  // 0=INTACT, 1=BROKEN
      }, null);  // null = use deployer key
      
      // Update MongoDB cache
      await OffChainBatch.findOneAndUpdate(
        { batchId: batchSim.batchId },
        { 
          currentFRS: result.newFRS / 100,
          currentGrade: result.grade,
          custodyChainLength: batchSim.currentWaypoint + 1,
          lastUpdated: new Date(),
          isDisputed: result.alerts && result.alerts.length > 0
        }
      );
      
      // Broadcast to WebSocket clients
      this.broadcast('CUSTODY_TRANSFER', {
        batchId: batchSim.batchId,
        newFRS: result.newFRS / 100,
        grade: result.grade,
        location: payload.locationName,
        gps: payload.gpsLocation,
        nodeType,
        alerts: result.alerts || []
      });
      
      if (result.alerts && result.alerts.length > 0) {
        this.broadcast('FRS_ALERT', { batchId: batchSim.batchId, alerts: result.alerts });
      }
      
      console.log(`[NetworkSimulator] Tick ${this.tickCount}: ${batchSim.batchId} → FRS ${result.newFRS/100}% (${result.grade})`);
      
      // If batch reaches retailer (waypoint 3), mark as settled after one more tick
      if (batchSim.currentWaypoint >= 3) {
        this.activeBatches.splice(idx, 1);  // remove from simulation
      }
      
    } catch (err) {
      console.error(`[NetworkSimulator] Tick error for ${batchSim.batchId}:`, err.message);
    }
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[NetworkSimulator] Transit simulation active');
    await this.loadActiveBatches();
    this.intervalId = setInterval(() => this.tick(), 30000);  // every 30 seconds
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.isRunning = false;
    console.log('[NetworkSimulator] Stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activeBatches: this.activeBatches.length,
      tickCount: this.tickCount
    };
  }
}

module.exports = new NetworkSimulator();
```

---

## STEP 2.5 — Services: FRS, IPFS, QR

**Antigravity Prompt:**
```
Create three service files in farmchain/backend/src/services/:

--- FILE: frs.service.js ---
Mirror the Solidity FRS logic in JavaScript. Export these functions:

1. calculateFRS(wOriginGrams, wDestGrams):
   Returns basis points (9640 = 96.40%). Returns 0 if invalid inputs.

2. getGrade(frsBasisPoints, category):
   category is 'STANDARD', 'HIGH_SENSITIVITY', or 'HIGH_TOLERANCE'
   Returns { grade, label, action, shouldDispute }
   Implement the same three grading tables from the contract.

3. detectAnomaly(custodyChain):
   custodyChain is array of { frsBasisPoints, timestamp, nodeType }
   If any later FRS is HIGHER than earlier by >50bp: return { isAnomaly: true, suspectedLeg: index, type: 'PRESERVATIVE_SUSPECTED' }
   If any single leg drops >300bp: return { isAnomaly: false, degradationAlert: true, leg: index, drop: value }
   Else: return { isAnomaly: false }

4. computePDEE(category, originFRS, transitHoursExpected):
   Returns a Date object (expiry timestamp)
   Use same formula as Solidity contract

5. generateFRSTrend(custodyChain):
   Returns array of { nodeType, frs, timestamp, grade, label, gps } for charting

6. getFRSColorClass(grade):
   Returns 'green'/'amber'/'red' based on grade letter

--- FILE: ipfs.service.js ---
Export an object with these methods:

pinJSON(data):
  If IPFS_MOCK=true: return fake CID as:
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return { hash: 'Qm' + hash.substring(0, 44), url: 'https://ipfs.io/ipfs/Qm' + hash.substring(0, 44) }
  If real Pinata: use axios to POST to https://api.pinata.cloud/pinning/pinJSONToIPFS

pinFile(filePath):
  If IPFS_MOCK=true: return fake CID based on file path hash
  Else: upload file to Pinata

getURL(hash): return `https://ipfs.io/ipfs/${hash}`

--- FILE: qr.service.js ---
const QRCode = require('qrcode');
const crypto = require('crypto');

Export an object with:

generateBatchQR(batchId):
  Payload: JSON.stringify({ batchId, v: 'farmchain-v1', t: Date.now(), c: generateChecksum(batchId) })
  checksum = crypto.createHmac('sha256', process.env.JWT_SECRET).update(batchId).digest('hex').slice(0,8)
  Returns: { dataURL: string (base64 PNG), payload: string, checksum }
  Use: QRCode.toDataURL(payloadString, { errorCorrectionLevel: 'H', width: 300 })

verifyQRPayload(payloadString):
  Parse JSON, verify checksum, return { valid: bool, batchId: string or null, error: string or null }

--- FILE: notification.service.js ---
Simple in-memory notification queue (no external service):

class NotificationService {
  constructor() { this.notifications = []; this.subscribers = new Map(); }
  
  addNotification(userId, type, message, data):
    Push { id: Date.now(), userId, type, message, data, read: false, createdAt: new Date() }
  
  getNotifications(userId): return this.notifications.filter(n => n.userId === userId)
  
  markRead(notificationId): find and set read = true
  
  broadcastToRole(role, message, data): 
    (placeholder — in production would use WebSockets or push)
}

module.exports = new NotificationService();
```

---

## STEP 2.6 — All API Routes

**Antigravity Prompt:**
```
Create all route files in farmchain/backend/src/routes/.
For each route, use express-validator for input validation and the asyncHandler wrapper.

--- FILE: auth.routes.js ---
POST /register:
  Body: { name, email, password, role, village?, state? }
  Validate: email valid, password min 6 chars, role is valid enum value
  Hash password with bcryptjs (10 rounds)
  Create User, call generateWallet() (from User model pre-save)
  If role === 'FARMER': also call blockchainService.registerFarmerOnChain with defaults
    (use wallet.address as the registering address, use name and village from body)
    NOTE: For demo, if blockchain call fails, still create the user (log warning)
  Return: { token: JWT, user: { id, name, email, role, walletAddress } }

POST /login:
  Body: { email, password }
  Find user, compare password, return JWT same format as register

GET /me: (authenticate required)
  Return req.user details from DB

--- FILE: farmer.routes.js ---
All routes require authenticate + requireRole('FARMER')

POST /register-produce:
  Body: { produceType, weightGrams, count, gpsLocation, harvestDate, specialNotes? }
  Call sensorSim to get a "scale reading" for confirmation
  Determine category from produceType using SensorSimulator.getCategory()
  Call blockchainService.createBatch(...)
  Generate QR code for batchId
  Save to OffChainBatch collection
  Broadcast WebSocket event BATCH_CREATED
  Return: { batchId, qrCode (dataURL), pdeeTimestamp, initialFRS: 100, category, grade: 'A+' }

GET /batches:
  Query OffChainBatch by farmerWallet = req.user.walletAddress
  Return array with FRS grades

GET /batches/:batchId:
  Fetch from blockchain + MongoDB cache
  Return merged result

GET /insurance-pool:
  Call farmerRegistry.getFarmer(walletAddress)
  Return { poolBalanceWei, poolBalanceEth, transactions: [] }

--- FILE: batch.routes.js ---
POST /custody-transfer: (authenticate required, any role except CONSUMER)
  Body: { batchId, nodeName }
  Determine nodeType from req.user.role (MIDDLEMAN=1, TRANSPORTER=2, RETAILER=3)
  Get sealStatus from body (default INTACT)
  Call sensorSim.generateIoTPayload to get weight and GPS
  Call AI service: axios.post(AI_SERVICE_URL/analyze, { batch_id, produce_type, category, declared_count, declared_weight_grams, node_type })
  Call blockchainService.recordCustodyTransfer(...)
  Update OffChainBatch
  Broadcast CUSTODY_TRANSFER via WebSocket
  Return: { newFRS, grade, label, action, sensorData, aiAnalysis, alerts, txHash }

GET /:batchId: (optionalAuth)
  Fetch from blockchain
  Enrich with farmer details from MongoDB
  Return full batch object

GET /:batchId/qr:
  Generate QR for batchId
  Return { dataURL, batchId }

GET /network/inventory: (no auth required)
  Query param: ?produce=tomato
  Call blockchainService.getNetworkInventory(produce)
  Return { produceType, totalWeightKg, activeBatchCount, lastUpdated }

--- FILE: consumer.routes.js ---
GET /trace/:batchId: (no auth required)
  Full public chain-of-custody
  Fetch batch from blockchain
  Enrich each custody record with node name from MongoDB users
  Calculate FRS trend
  Return comprehensive trace object

POST /report/:batchId: (authenticate required, role CONSUMER)
  Body: { issueType, description, purchaseDate }
  Call disputeEngine through blockchainService.createDispute(...)
  Return: { reportId, message }

GET /funding/marketplace: (optionalAuth)
  Get all OPEN funding requests from FundingContracts
  Enrich with farmer profiles from MongoDB
  Return sorted by reliability score

POST /funding/:requestId/invest: (authenticate + CONSUMER role)
  Body: { amountWei }
  Call blockchainService.fundFarmer(requestId, amountWei, req.user.walletPrivateKey)
  Return: { txHash, contribution, equityPercent }

--- FILE: dispute.routes.js ---
POST /create: (authenticate required)
  Body: { batchId, disputeType, description }
  Create dispute on-chain
  Return disputeId

POST /:disputeId/evidence: (authenticate required)
  multipart/form-data with 'evidence' file field (use multer)
  Save file to uploads/evidence/
  Call ipfsService.pinFile(filePath)
  Call blockchainService.submitEvidence(disputeId, ipfsHash)
  Save to DisputeEvidence collection
  Return: { ipfsHash, txHash }

POST /:disputeId/vote: (authenticate + PANEL_MEMBER role)
  Body: { vote: 1 or 2 }
  Call blockchainService.castVote
  Return: { txHash }

POST /:disputeId/resolve: (authenticate + ADMIN role)
  Call blockchainService.resolveDispute
  Return: { verdict, txHash }

GET /:disputeId:
  Get dispute from DisputeEngine contract
  Get evidence from MongoDB
  Return merged object

GET /open: (authenticate + ADMIN or PANEL_MEMBER)
  Get all open dispute IDs
  Return array

--- FILE: subsidy.routes.js ---
GET /queue: (authenticate + ADMIN)
  Call blockchainService.getSubsidyQueue()
  Enrich each farmer address with name from MongoDB
  Return sorted array with scores

POST /deposit: (authenticate + ADMIN)
  Body: { amountEth, source }
  Call SubsidyEngine.depositSubsidy via blockchainService
  Return: { txHash, poolBalance }

POST /process: (authenticate + ADMIN)
  Body: { batchSize }
  Call blockchainService.processSubsidyDisbursements(batchSize)
  Return: { processed, txHash }

GET /stats:
  Get pool balance from SubsidyEngine
  Get disbursement history
  Return { poolBalanceEth, totalDisbursedEth, queueSize, lastProcessed }

--- FILE: admin.routes.js ---
All routes require authenticate + requireRole('ADMIN')

GET /dashboard:
  Aggregate: total batches from OffChainBatch, FRS distribution, active disputes count,
  subsidy pool from blockchain, network inventory for top 5 produce types
  Return comprehensive stats object

GET /bad-actors:
  Query users from MongoDB where disputeCount > 0
  Enrich with on-chain reputation scores
  Return sorted list

POST /blacklist: Body: { walletAddress, reason }
  Call batchRegistry.blacklistNode via deployer signer
  Return { txHash }

GET /simulation-status:
  Return networkSimulator.getStatus()

POST /simulation/trigger:
  Manually trigger one simulation tick
  Return { result }
```

---

## STEP 2.7 — Main App and Server

**Antigravity Prompt:**
```
Create farmchain/backend/src/app.js and farmchain/backend/src/server.js.

--- FILE: src/app.js ---
1. Import express, cors, helmet, morgan, dotenv, errorHandler
2. Configure:
   - cors({ origin: 'http://localhost:5173', credentials: true })
   - helmet() for security headers
   - morgan('dev') for request logging
   - express.json() and express.urlencoded({ extended: true })
   - Serve static files from uploads/ directory at /uploads

3. Mount all routes:
   app.use('/api/auth', authRoutes)
   app.use('/api/farmer', farmerRoutes)
   app.use('/api/batch', batchRoutes)
   app.use('/api/consumer', consumerRoutes)
   app.use('/api/dispute', disputeRoutes)
   app.use('/api/subsidy', subsidyRoutes)
   app.use('/api/admin', adminRoutes)

4. Health check: GET /health → { status: 'ok', timestamp, uptime }

5. Mount errorHandler as last middleware

Export app.

--- FILE: src/server.js ---
1. Import http, ws (WebSocket), app, db.connect, NetworkSimulator

2. Create HTTP server from app

3. Create WebSocket.Server({ server, path: '/ws' })

4. Track connected clients in a Set
   - On connection: add to Set, send { event: 'CONNECTED', message: 'FarmChain WS active' }
   - On close: remove from Set
   - Log client count on connect/disconnect

5. Pass the clients Set to NetworkSimulator: networkSimulator.setWsClients(clients)

6. Start sequence:
   a. Connect MongoDB
   b. Start HTTP server on PORT
   c. Start NetworkSimulator after 5 seconds (give blockchain time to be ready)
   d. Log startup banner:
      ╔══════════════════════════════════════╗
      ║   FARMCHAIN BACKEND v1.0             ║
      ║   API: http://localhost:3001         ║
      ║   WS:  ws://localhost:3001/ws        ║
      ╚══════════════════════════════════════╝

--- FILE: src/scripts/demo-seed.js ---
This script populates the MongoDB database with user accounts matching the
blockchain farmers seeded in Module 1.

Create these users (passwords all = "farmchain123"):
1. email: raju@farm.com, role: FARMER, name: Raju Kumar, walletAddress: (signer[1] address from deployed-addresses.json)
2. email: meena@farm.com, role: FARMER, name: Meena Devi, walletAddress: signer[2] address
3. email: suresh@farm.com, role: FARMER, name: Suresh Patil, walletAddress: signer[3] address
4. email: retailer1@shop.com, role: RETAILER, name: Delhi Fruits Store
5. email: middleman1@trade.com, role: MIDDLEMAN, name: Karnataka Traders MM
6. email: consumer1@user.com, role: CONSUMER, name: Priya Sharma
7. email: admin@farmchain.com, role: ADMIN, name: FarmChain Admin
8. email: panel1@farmchain.com, role: PANEL_MEMBER, name: Panel Member 1

For the hardhat test accounts, use these private keys to derive addresses:
signer[1]: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
signer[2]: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
signer[3]: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6

After creating users, also seed 3 OffChainBatch documents (matching the batches
created in the deploy script) using the batch IDs that were printed during deploy
(read them from the blockchain: call getAllActiveBatches via ethers).

Print "Demo seed complete. Users created: X, Batches cached: Y" when done.
```

### Verify Module 2:
```bash
# Start the backend
cd farmchain/backend
npm run dev

# Expected console output:
# MongoDB Connected: localhost
# FarmChain BACKEND v1.0 banner
# [NetworkSimulator] Transit simulation active
# [NetworkSimulator] Loaded N batches for simulation

# Test in a second terminal:
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"...","uptime":...}

curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@farmchain.com","password":"farmchain123"}'
# Expected: {"token":"eyJ...","user":{"role":"ADMIN",...}}

# Save the token:
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@farmchain.com","password":"farmchain123"}' | jq -r '.token')

curl http://localhost:3001/api/admin/dashboard \
  -H "Authorization: Bearer $TOKEN"
# Expected: JSON with totalBatches, FRS distribution, etc.

curl "http://localhost:3001/api/batch/network/inventory?produce=tomato"
# Expected: { totalWeightKg, activeBatchCount }

# Test WebSocket (use wscat if available, else skip):
# npx wscat -c ws://localhost:3001/ws
# Expected: {"event":"CONNECTED","message":"FarmChain WS active"}
```

**Module 2 is complete when**: Backend starts without errors, login returns JWT, admin dashboard returns data, WebSocket connects.

---

---

# MODULE 3 — AI VISUAL ESTIMATION MICROSERVICE
**Estimated time: 75 minutes**
**Can run concurrently with Module 2 in a second terminal**

---

## STEP 3.1 — Python Setup

**Antigravity Prompt:**
```
Navigate to farmchain/ai-service/.

1. Create requirements.txt with these exact versions:
fastapi==0.111.0
uvicorn[standard]==0.29.0
python-multipart==0.0.9
Pillow==10.3.0
numpy==1.26.4
scikit-learn==1.4.2
pydantic==2.7.1
httpx==0.27.0
python-dotenv==1.0.1

2. Run: pip install -r requirements.txt
   (If pip3 is needed, use pip3. If in a conda env, activate it first.)

3. Create all directories:
mkdir -p models schemas utils

4. Create empty __init__.py in models/, schemas/, utils/

Print confirmation.
```

---

## STEP 3.2 — Schemas and Simulation Engine

**Antigravity Prompt:**
```
Create farmchain/ai-service/schemas/analysis.py with these Pydantic models:

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

class AnalysisRequest(BaseModel):
    batch_id: str
    produce_type: str
    category: Literal["STANDARD", "HIGH_SENSITIVITY", "HIGH_TOLERANCE"]
    declared_count: int
    declared_weight_grams: float
    node_type: int = Field(ge=0, le=3, description="0=farm,1=mm,2=depot,3=retailer")
    hours_since_harvest: Optional[float] = None

class ItemCountEstimate(BaseModel):
    estimated_count: int
    confidence: float = Field(ge=0.0, le=1.0)
    count_anomaly: bool
    count_delta_pct: float
    fraud_flag: bool

class FreshnessIndicators(BaseModel):
    visual_freshness_score: float = Field(ge=0.0, le=100.0)
    spoilage_detected: bool
    bruising_detected: bool
    mould_detected: bool
    colour_anomaly: bool
    preservative_flag: bool
    wilting_detected: bool
    surface_uniformity: float = Field(ge=0.0, le=1.0)

class AnalysisResponse(BaseModel):
    batch_id: str
    visual_frs_confidence: float
    visual_frs_estimate: float
    item_count: ItemCountEstimate
    freshness: FreshnessIndicators
    overall_quality_label: str
    grade: str
    flags: List[str]
    ipfs_hash: str
    processing_time_ms: float
    model_version: str = "simulation_v1.0"

---

Now create farmchain/ai-service/utils/simulation_engine.py:

import numpy as np
import hashlib
import time
from typing import Optional

DECAY_RATES = {
    "STANDARD": 0.0005,
    "HIGH_SENSITIVITY": 0.0020,
    "HIGH_TOLERANCE": 0.0001
}

FRESHNESS_THRESHOLDS = {
    "STANDARD": [(9800, "A+"), (9500, "A"), (9000, "B"), (8500, "C"), (0, "D")],
    "HIGH_SENSITIVITY": [(9800, "A+"), (9600, "A"), (9300, "B"), (9000, "C"), (0, "D")],
    "HIGH_TOLERANCE": [(9500, "A+"), (9200, "A"), (8800, "B"), (8500, "C"), (0, "D")]
}

def seeded_random(seed_str: str) -> np.random.Generator:
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16) % (2**32)
    return np.random.default_rng(seed)

def get_grade(frs_pct: float, category: str) -> str:
    frs_bp = int(frs_pct * 100)
    for threshold, grade in FRESHNESS_THRESHOLDS[category]:
        if frs_bp >= threshold:
            return grade
    return "D"

class SimulationEngine:
    def analyze(self, request, image_array=None):
        start = time.time()
        rng = seeded_random(request.batch_id + request.produce_type)
        
        hours = request.hours_since_harvest or (request.node_type * 4 + 2)
        decay_rate = DECAY_RATES[request.category]
        
        # Weight-based FRS estimate
        frs_estimate = (1.0 - decay_rate) ** hours * 100
        frs_estimate = float(np.clip(frs_estimate, 50.0, 100.0))
        
        # Add controlled noise
        frs_noise = float(rng.normal(0, 0.3))
        frs_estimate = float(np.clip(frs_estimate + frs_noise, 50.0, 100.0))
        
        # If real image provided, use RGB analysis
        if image_array is not None:
            try:
                mean_rgb = np.mean(image_array.reshape(-1, 3), axis=0)
                green_ratio = mean_rgb[1] / (mean_rgb.sum() + 1e-6)
                # Greener = fresher for most produce
                image_freshness_adj = (green_ratio - 0.33) * 10
                frs_estimate = float(np.clip(frs_estimate + image_freshness_adj, 50.0, 100.0))
                colour_variance = float(np.std(image_array.reshape(-1, 3)))
            except:
                colour_variance = 30.0
        else:
            colour_variance = float(rng.uniform(20, 50))
        
        grade = get_grade(frs_estimate, request.category)
        
        # Count estimation with noise
        count_noise = int(rng.normal(0, max(1, request.declared_count * 0.04)))
        # Apply transit loss: 1-2% per node
        transit_loss_pct = request.node_type * rng.uniform(0.005, 0.015)
        adjusted_count = int(request.declared_count * (1 - transit_loss_pct))
        estimated_count = max(0, adjusted_count + count_noise)
        count_delta = abs(estimated_count - request.declared_count) / max(1, request.declared_count)
        count_anomaly = count_delta > 0.10
        fraud_flag = count_delta > 0.20  # >20% missing = likely fraud
        
        # Freshness indicators
        is_degraded = frs_estimate < 90
        spoilage = bool(rng.random() < (0.001 * max(0, 100 - frs_estimate)))
        bruising = bool(rng.random() < (0.002 * max(0, 100 - frs_estimate) + request.node_type * 0.01))
        mould = bool(rng.random() < (0.0005 * max(0, 100 - frs_estimate)))
        
        # Preservative flag: FRS suspiciously high for the elapsed time
        expected_min_frs = (1.0 - decay_rate) ** hours * 100 - 5.0
        preservative_flag = frs_estimate > expected_min_frs + 3.0 and hours > 12
        
        # Wilting: high sensitivity produce
        wilting = request.category == "HIGH_SENSITIVITY" and hours > 8 and bool(rng.random() < 0.15)
        
        # Colour anomaly: high uniformity surface (preservative coating)
        surface_uniformity = float(np.clip(1.0 - (colour_variance / 100.0), 0, 1))
        colour_anomaly = surface_uniformity > 0.85  # too uniform = suspicious
        
        flags = []
        if preservative_flag: flags.append("PRESERVATIVE_SUSPECTED")
        if fraud_flag: flags.append("COUNT_FRAUD_SUSPECTED")
        if count_anomaly: flags.append(f"COUNT_MISMATCH_{count_delta*100:.0f}PCT")
        if mould: flags.append("MOULD_DETECTED")
        if bruising: flags.append("BRUISING_DETECTED")
        if colour_anomaly: flags.append("SURFACE_ANOMALY")
        
        # Mock IPFS hash
        ipfs_input = f"{request.batch_id}{request.node_type}{frs_estimate}"
        ipfs_hash = "Qm" + hashlib.sha256(ipfs_input.encode()).hexdigest()[:44]
        
        elapsed_ms = (time.time() - start) * 1000
        
        return {
            "batch_id": request.batch_id,
            "visual_frs_confidence": float(np.clip(0.85 + rng.normal(0, 0.05), 0.6, 0.98)),
            "visual_frs_estimate": round(frs_estimate, 2),
            "item_count": {
                "estimated_count": estimated_count,
                "confidence": float(np.clip(0.90 - count_delta, 0.5, 0.99)),
                "count_anomaly": count_anomaly,
                "count_delta_pct": round(count_delta * 100, 2),
                "fraud_flag": fraud_flag
            },
            "freshness": {
                "visual_freshness_score": round(frs_estimate, 2),
                "spoilage_detected": spoilage,
                "bruising_detected": bruising,
                "mould_detected": mould,
                "colour_anomaly": colour_anomaly,
                "preservative_flag": preservative_flag,
                "wilting_detected": wilting,
                "surface_uniformity": round(surface_uniformity, 3)
            },
            "overall_quality_label": grade,
            "grade": grade,
            "flags": flags,
            "ipfs_hash": ipfs_hash,
            "processing_time_ms": round(elapsed_ms, 2),
            "model_version": "simulation_v1.0"
        }

engine = SimulationEngine()
```

---

## STEP 3.3 — FastAPI Main App

**Antigravity Prompt:**
```
Create farmchain/ai-service/main.py:

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import json
import numpy as np
from PIL import Image
import io
from datetime import datetime
from schemas.analysis import AnalysisRequest, AnalysisResponse
from utils.simulation_engine import engine

app = FastAPI(
    title="FarmChain AI Visual Estimation Service",
    description="Produce freshness and count estimation via computer vision (simulation mode)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/health")
async def health():
    return {"status": "ok", "model": "simulation_v1.0", "timestamp": datetime.utcnow().isoformat()}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_produce(
    request: str = Form(...),
    image: Optional[UploadFile] = File(None)
):
    try:
        req_data = AnalysisRequest(**json.loads(request))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid request: {str(e)}")
    
    image_array = None
    if image:
        try:
            contents = await image.read()
            pil_image = Image.open(io.BytesIO(contents)).convert("RGB").resize((224, 224))
            image_array = np.array(pil_image)
        except Exception as e:
            # Log but don't fail — just analyze without image
            print(f"[AI] Image processing error: {e}")
    
    result = engine.analyze(req_data, image_array)
    return result

@app.post("/batch-analyze")
async def batch_analyze(requests: List[AnalysisRequest]):
    results = []
    for req in requests:
        result = engine.analyze(req)
        results.append(result)
    return {"results": results, "count": len(results)}

@app.get("/freshness-anomaly")
async def check_freshness_anomaly(
    batch_id: str,
    produce_type: str,
    category: str = "STANDARD"
):
    # Generate a fake custody history for demo
    import hashlib, random
    seed = int(hashlib.md5(batch_id.encode()).hexdigest(), 16) % 1000
    random.seed(seed)
    
    decay = {"STANDARD": 0.5, "HIGH_SENSITIVITY": 2.0, "HIGH_TOLERANCE": 0.1}[category]
    history = []
    frs = 100.0
    for i in range(4):
        frs -= random.uniform(0, decay * 2)
        history.append(round(frs, 2))
    
    is_anomaly = any(history[i] > history[i-1] + 0.5 for i in range(1, len(history)))
    
    return {
        "batch_id": batch_id,
        "frs_history": history,
        "is_anomaly": is_anomaly,
        "anomaly_type": "PRESERVATIVE_SUSPECTED" if is_anomaly else None,
        "recommendation": "FLAG_FOR_INSPECTION" if is_anomaly else "NORMAL"
    }

@app.get("/produce-categories")
async def get_produce_categories():
    from utils.simulation_engine import DECAY_RATES
    return {
        "categories": ["STANDARD", "HIGH_SENSITIVITY", "HIGH_TOLERANCE"],
        "decay_rates": DECAY_RATES,
        "examples": {
            "HIGH_SENSITIVITY": ["spinach", "lettuce", "mushroom", "strawberry"],
            "STANDARD": ["tomato", "mango", "apple", "carrot"],
            "HIGH_TOLERANCE": ["pumpkin", "onion", "garlic", "watermelon"]
        }
    }

After writing the file, start the server to test it:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Verify Module 3:
```bash
# After starting: uvicorn main:app --port 8000 --reload

curl http://localhost:8000/health
# Expected: {"status":"ok","model":"simulation_v1.0","timestamp":"..."}

curl http://localhost:8000/docs
# FastAPI auto-docs — should open in browser at http://localhost:8000/docs

# Test analyze endpoint:
curl -X POST http://localhost:8000/analyze \
  -F 'request={"batch_id":"BATCH-KA-2024-00001","produce_type":"tomato","category":"STANDARD","declared_count":80,"declared_weight_grams":10000,"node_type":2}'
# Expected: JSON with visual_frs_estimate, grade, flags, item_count

curl "http://localhost:8000/freshness-anomaly?batch_id=BATCH-KA-2024-00001&produce_type=tomato&category=STANDARD"
# Expected: frs_history array, is_anomaly bool
```

**Module 3 complete when**: All 4 endpoints return valid JSON with no errors.

---

---

# MODULE 4 — REACT FRONTEND
**Estimated time: 3 hours**
**Start after verifying Modules 1, 2, 3**

---

## STEP 4.1 — Vite Setup and Design System

**Antigravity Prompt:**
```
Navigate to farmchain/frontend.

1. Initialize: npm create vite@latest . -- --template react (accept overwrite)

2. Install all dependencies:
npm install tailwindcss @tailwindcss/forms postcss autoprefixer
npm install axios react-router-dom zustand recharts
npm install qrcode.react html5-qrcode react-hot-toast lucide-react framer-motion date-fns
npm install @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-progress
npx tailwindcss init -p

3. Replace tailwind.config.js with:
```
```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        farm: {
          green: '#16a34a', 'green-light': '#22c55e', 'green-dark': '#15803d',
          amber: '#d97706', 'amber-light': '#f59e0b',
          red: '#dc2626', 'red-light': '#ef4444',
          blue: '#1d4ed8', 'blue-light': '#3b82f6',
          surface: '#1e293b', 'surface-2': '#273449', 'surface-3': '#334155',
          bg: '#0f172a', border: '#334155', text: '#e2e8f0', muted: '#94a3b8'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-up': 'fadeUp 0.4s ease-out'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
}
```
```

4. Replace index.html <head> section to add Google Fonts:
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

5. Replace src/index.css with:
@tailwind base;
@tailwind components;
@tailwind utilities;

body { @apply bg-farm-bg text-farm-text font-display; }

.glass { @apply bg-farm-surface/80 backdrop-blur-sm border border-farm-border; }
.card { @apply bg-farm-surface border border-farm-border rounded-xl p-4; }
.btn-primary { @apply bg-farm-green hover:bg-farm-green-dark text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 active:scale-95; }
.btn-danger { @apply bg-farm-red hover:opacity-90 text-white font-semibold py-2 px-4 rounded-lg transition-all; }
.btn-ghost { @apply border border-farm-border hover:bg-farm-surface-2 text-farm-text font-medium py-2 px-4 rounded-lg transition-all; }
.input { @apply bg-farm-surface-2 border border-farm-border rounded-lg px-3 py-2 text-farm-text placeholder-farm-muted focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent w-full; }
.badge-green { @apply bg-farm-green/20 text-farm-green-light border border-farm-green/30 px-2 py-0.5 rounded-full text-xs font-medium; }
.badge-amber { @apply bg-farm-amber/20 text-farm-amber-light border border-farm-amber/30 px-2 py-0.5 rounded-full text-xs font-medium; }
.badge-red { @apply bg-farm-red/20 text-farm-red-light border border-farm-red/30 px-2 py-0.5 rounded-full text-xs font-medium; }
.badge-blue { @apply bg-farm-blue/20 text-farm-blue-light border border-farm-blue/30 px-2 py-0.5 rounded-full text-xs font-medium; }

Create all empty directories:
src/components/shared/
src/components/layout/
src/pages/auth/
src/pages/farmer/
src/pages/retailer/
src/pages/middleman/
src/pages/consumer/
src/pages/admin/
src/services/
src/store/

Print confirmation.
```

---

## STEP 4.2 — Services and State (Zustand Stores)

**Antigravity Prompt:**
```
Create farmchain/frontend/src/services/api.js:

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 15000
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('farmchain_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('farmchain_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

// Farmer
export const registerProduce = (data) => api.post('/farmer/register-produce', data);
export const getFarmerBatches = () => api.get('/farmer/batches');
export const getInsurancePool = () => api.get('/farmer/insurance-pool');

// Batch
export const getBatch = (id) => api.get(`/batch/${id}`);
export const getBatchQR = (id) => api.get(`/batch/${id}/qr`);
export const recordCustody = (data) => api.post('/batch/custody-transfer', data);
export const getNetworkInventory = (produce) => api.get(`/batch/network/inventory?produce=${produce}`);

// Consumer
export const traceConsumer = (id) => api.get(`/consumer/trace/${id}`);
export const reportQuality = (id, data) => api.post(`/consumer/report/${id}`, data);
export const getFundingMarketplace = () => api.get('/consumer/funding/marketplace');
export const investInFarmer = (id, data) => api.post(`/consumer/funding/${id}/invest`, data);

// Dispute
export const createDispute = (data) => api.post('/dispute/create', data);
export const submitEvidence = (id, formData) => api.post(`/dispute/${id}/evidence`, formData, { headers: {'Content-Type': 'multipart/form-data'} });
export const castVote = (id, vote) => api.post(`/dispute/${id}/vote`, { vote });
export const getDispute = (id) => api.get(`/dispute/${id}`);
export const getOpenDisputes = () => api.get('/dispute/open');

// Subsidy
export const getSubsidyQueue = () => api.get('/subsidy/queue');
export const depositSubsidy = (data) => api.post('/subsidy/deposit', data);
export const processSubsidy = (batchSize) => api.post('/subsidy/process', { batchSize });
export const getSubsidyStats = () => api.get('/subsidy/stats');

// Admin
export const getAdminDashboard = () => api.get('/admin/dashboard');
export const getBadActors = () => api.get('/admin/bad-actors');
export const blacklistNode = (data) => api.post('/admin/blacklist', data);
export const triggerSimulation = () => api.post('/admin/simulation/trigger');

export default api;

---

Create farmchain/frontend/src/services/websocket.js:

class WSClient {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();  // eventType => Set of callbacks
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
  }
  
  connect(url = 'ws://localhost:3001/ws') {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      console.log('[WS] Connected to FarmChain');
      this.reconnectDelay = 1000;
      this.emit('CONNECTION_STATUS', { connected: true });
    };
    this.ws.onmessage = (event) => {
      try {
        const { event: type, data, timestamp } = JSON.parse(event.data);
        this.emit(type, data);
        this.emit('*', { type, data, timestamp });  // wildcard subscribers
      } catch (e) { console.error('[WS] Parse error:', e); }
    };
    this.ws.onclose = () => {
      this.emit('CONNECTION_STATUS', { connected: false });
      console.log(`[WS] Disconnected. Reconnecting in ${this.reconnectDelay}ms`);
      setTimeout(() => this.connect(url), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    };
    this.ws.onerror = (e) => console.error('[WS] Error:', e);
  }
  
  emit(eventType, data) {
    const subs = this.subscribers.get(eventType);
    if (subs) subs.forEach(cb => cb(data));
  }
  
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) this.subscribers.set(eventType, new Set());
    this.subscribers.get(eventType).add(callback);
    return () => this.subscribers.get(eventType).delete(callback);  // unsubscribe function
  }
}

export const wsClient = new WSClient();
export default wsClient;

---

Create farmchain/frontend/src/store/authStore.js:

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('farmchain_token', token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('farmchain_token');
        set({ user: null, token: null });
      },
      isAuthenticated: () => !!get().token,
      hasRole: (...roles) => roles.includes(get().user?.role)
    }),
    { name: 'farmchain-auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);

---

Create farmchain/frontend/src/store/batchStore.js:

import { create } from 'zustand';

export const useBatchStore = create((set, get) => ({
  activeBatches: [],
  selectedBatch: null,
  recentEvents: [],
  
  addEvent: (event) => set(s => ({
    recentEvents: [event, ...s.recentEvents].slice(0, 50)  // keep last 50
  })),
  
  updateBatch: (batchId, data) => set(s => ({
    activeBatches: s.activeBatches.map(b => b.batchId === batchId ? { ...b, ...data } : b)
  })),
  
  setActiveBatches: (batches) => set({ activeBatches: batches }),
  setSelectedBatch: (batch) => set({ selectedBatch: batch }),
  clearEvents: () => set({ recentEvents: [] })
}));
```

---

## STEP 4.3 — Core Shared Components

**Antigravity Prompt:**
```
Create these shared components in farmchain/frontend/src/components/shared/:

--- FILE: FRSGauge.jsx ---
A semi-circular SVG gauge showing FRS value with animated needle.

Props: { frs (0-100 number), category ('STANDARD'|'HIGH_SENSITIVITY'|'HIGH_TOLERANCE'), size ('sm'|'md'|'lg'), showLabel (bool) }

Implementation:
- SVG viewBox="0 0 200 120"
- Semi-circle arc from 180° to 0° (left to right)
- Three color zones drawn as arc segments:
  - Red zone: 0-85% of arc
  - Amber zone: 85-92% of arc  
  - Green zone: 92-100% of arc
- Needle: a line from center (100, 100) to arc edge, rotated by: angle = 180 - (frs/100 * 180) degrees
  Use framer-motion to animate needle rotation when frs changes
- Center text: show FRS number large, grade letter below it
- Grade colors: A+/A = green, B = amber, C = orange, D = red

Helper function getGrade(frs, category) that mirrors the backend logic.

Usage:
<FRSGauge frs={96.4} category="STANDARD" size="md" showLabel />

--- FILE: FRSTimeline.jsx ---
Horizontal timeline of custody chain.

Props: { custodyChain (array), currentFRS (number) }

custodyChain item shape: { nodeType (0-3), frsBasisPoints, timestamp, gpsLocation, grade, label, nodeName }

Implementation:
- Use Recharts LineChart with dots
- X-axis: node names (Farm → Middleman → Depot → Retailer)
- Y-axis: FRS percentage 80-100
- Line color: green for normal, red for degraded legs
- Each dot: custom shape — circle colored by grade
- Hover tooltip: nodeName, FRS%, grade, timestamp formatted with date-fns
- Reference line at 85% labeled "Rejection threshold"
- Show node type emoji above each dot: 🌾 🏬 🏭 🏪

--- FILE: BatchCard.jsx ---
A compact card showing batch summary.

Props: { batch, onClick, showActions (bool) }

Layout:
- Top row: batchId in monospace font (truncated), grade badge
- Middle: produce type + weight + FRS gauge (small size)
- Bottom row: farmer name, PDEE countdown timer, location
- If anomalyFlagged: show orange warning banner
- If isDisputed: show red "DISPUTED" badge
- If isExpired: show grey overlay with "EXPIRED" label
- onClick: calls onClick(batch)

--- FILE: LiveFeed.jsx ---
Real-time event feed component.

Props: { maxItems (default 20), filter (event types array, default all) }

- Subscribe to wsClient on '*' wildcard
- Add new events to top of list with slide-in animation (framer-motion AnimatePresence)
- Each event: icon + type badge + batchId + timestamp (relative: "2s ago")
- Event type icons:
  BATCH_CREATED: 🌱
  CUSTODY_TRANSFER: 🚚
  FRS_ALERT: ⚠️
  DISPUTE_CREATED: ⚖️
  SUBSIDY_DISBURSED: 💰
- Color code by type
- Auto-scroll to top on new event
- "Clear" button

--- FILE: QRDisplay.jsx ---
Shows a QR code for a batch.

Props: { batchId, size (default 200) }

- Use QRCode from 'qrcode.react'
- Include a download button (download QR as PNG)
- Show batchId below in monospace
- Border with farm green color
- Copy payload button

Print all 4 files.
```

---

## STEP 4.4 — Layout and Auth Pages

**Antigravity Prompt:**
```
Create farmchain/frontend/src/components/layout/RoleLayout.jsx:

A sidebar layout that adapts navigation based on user role.

Nav items per role:
FARMER: Dashboard, Register Produce, My Batches, Funding Requests, Insurance Pool
RETAILER: Dashboard, Receive Delivery, FRS Verification, My Transactions
MIDDLEMAN: Dashboard, Batch Aggregation, My Rating (MRQA)
CONSUMER: Dashboard, Scan Batch, Fund a Farmer, My Investments
ADMIN: Dashboard, Network Map, Disputes, Subsidy Control, Bad Actors, Simulation
PANEL_MEMBER: Dashboard, Open Disputes

Sidebar design:
- Dark sidebar (#0f172a) with green accent for active item
- FarmChain logo at top: a simple chain-link SVG icon + "FarmChain" text
- User info at bottom: avatar circle with role initial, name, role badge
- Logout button with icon
- Collapse to icon-only on small screens

Top bar:
- Page title (dynamic)
- Live connection status indicator (WebSocket): green dot if connected, grey if not
- Notification bell with count badge
- Current date/time in IST

---

Create farmchain/frontend/src/pages/auth/Login.jsx:

Full-page split layout:
- Left half: FarmChain branding — large logo, tagline "Transparent. Accountable. Trusted.", 
  animated blockchain nodes SVG background (simple dots connected by lines, subtle animation)
- Right half: login form with email/password fields, submit button, "Register" link
- On submit: call login API, save to authStore, navigate to role-based dashboard
  Role → route map: FARMER→/farmer, RETAILER→/retailer, MIDDLEMAN→/middleman, 
  CONSUMER→/consumer, ADMIN→/admin, PANEL_MEMBER→/disputes
- Show loading spinner on submit
- Show error toast on failure
- Pre-fill option: show 3 quick-login buttons for demo:
  "Login as Farmer" → raju@farm.com / farmchain123
  "Login as Admin" → admin@farmchain.com / farmchain123
  "Login as Consumer" → consumer1@user.com / farmchain123

---

Create farmchain/frontend/src/pages/auth/Register.jsx:
Simple registration form.
Fields: name, email, password, role (dropdown of all roles), village, state
On success: auto-login and navigate to role dashboard.

---

Create farmchain/frontend/src/App.jsx:

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import wsClient from './services/websocket';
import { useBatchStore } from './store/batchStore';

// Import all page components (create placeholder imports for now)

function ProtectedRoute({ element, roles }) {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/unauthorized" />;
  return element;
}

export default function App() {
  const addEvent = useBatchStore(s => s.addEvent);
  const updateBatch = useBatchStore(s => s.updateBatch);
  
  useEffect(() => {
    wsClient.connect();
    wsClient.subscribe('CUSTODY_TRANSFER', (data) => { addEvent({type:'CUSTODY_TRANSFER',...data}); updateBatch(data.batchId, data); });
    wsClient.subscribe('BATCH_CREATED', (data) => addEvent({type:'BATCH_CREATED',...data}));
    wsClient.subscribe('FRS_ALERT', (data) => addEvent({type:'FRS_ALERT',...data}));
    wsClient.subscribe('DISPUTE_CREATED', (data) => addEvent({type:'DISPUTE_CREATED',...data}));
    wsClient.subscribe('SUBSIDY_DISBURSED', (data) => addEvent({type:'SUBSIDY_DISBURSED',...data}));
  }, []);
  
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' } }} />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/trace/:batchId" element={<BatchTrace />} />
        <Route path="/farmer/*" element={<ProtectedRoute element={<FarmerLayout />} roles={['FARMER']} />} />
        <Route path="/retailer/*" element={<ProtectedRoute element={<RetailerLayout />} roles={['RETAILER']} />} />
        <Route path="/consumer/*" element={<ProtectedRoute element={<ConsumerLayout />} roles={['CONSUMER']} />} />
        <Route path="/admin/*" element={<ProtectedRoute element={<AdminLayout />} roles={['ADMIN']} />} />
        <Route path="/disputes/*" element={<ProtectedRoute element={<DisputePanel />} roles={['PANEL_MEMBER','ADMIN']} />} />
        <Route path="/unauthorized" element={<div className="text-center p-20 text-farm-red">Access Denied</div>} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## STEP 4.5 — Role-Specific Pages (Part 1: Farmer + Retailer)

**Antigravity Prompt:**
```
Create the two most important role pages:

--- FILE: src/pages/farmer/RegisterProduce.jsx ---
4-step wizard to register a produce batch.

STEP 1 - PRODUCE DETAILS:
- Produce type: searchable dropdown input. As user types, show matching suggestions
  from this list: tomato, mango, apple, spinach, lettuce, onion, garlic, grapes, carrot, mushroom,
  strawberry, brinjal, capsicum, pumpkin, coconut, jackfruit, watermelon, coriander, ginger, potato
- Auto-detect category: display "HIGH_SENSITIVITY 🔴" / "STANDARD 🟡" / "HIGH_TOLERANCE 🟢" 
  badge next to produce type based on the PRODUCE_CATEGORIES mapping
- Weight input: number field (grams) + a "SIMULATE SCALE READING" button that calls
  GET /api/batch/network/inventory (just to show a number), then shows a fake reading with 
  a progress animation: "Connecting to scale... Reading... {weight}g ✓" over 2 seconds
- Item count: number input
- Harvest date: datetime-local input, default to now

STEP 2 - LOCATION:
- GPS coordinates: two number inputs (latitude, longitude)
- "Use Device Location" button: calls navigator.geolocation.getCurrentPosition
- Village/location name: text input
- Show a static preview card: "Tumkur, Karnataka — 13.3379°N, 77.1173°E"

STEP 3 - SPECIAL HANDLING NOTES (conditional based on produce type):
- Bananas: show ripeness stage selector (Green/Turning/Yellow)
- Tomatoes: show calyx status checkbox ("Calyx intact?")
- Watermelon/Muskmelon: show "Whole fruit only" confirmation checkbox
- Grapes: show stem condition (Green/Partial Brown/Fully Brown)
- Leafy greens: show "Wrapped in moist cloth?" checkbox
- Mushrooms: show "Packed in paper bags?" confirmation
- If produce has no special handling: show "✓ No special handling notes required for {produce}"

STEP 4 - REVIEW & SUBMIT:
- Summary card showing all entered data
- Preview: "Expected PDEE: {computed date} ({X hours})"
- Preview: "Initial FRS: 100.00% — Grade A+"
- Preview QR code (placeholder): FarmChain logo in a QR-looking bordered box with text "QR will generate on submit"
- Submit button: "REGISTER ON BLOCKCHAIN 🔗"
- On submit: call POST /api/farmer/register-produce
- On success: show success screen with the REAL generated QR code (use QRDisplay component),
  download button, and "Register Another Batch" / "View My Batches" buttons
- Show a transaction hash: "Recorded on-chain: 0xabc...def ✓"

Progress indicator: show 4 step dots at top, color completed steps green.
Navigation: Next/Back buttons, disable Next if required fields empty.

--- FILE: src/pages/retailer/FRSVerification.jsx ---
This is the accountability moment when a retailer receives a delivery.

Layout: Two-column split

LEFT COLUMN - Batch Information:
- At top: "SCAN OR ENTER BATCH ID" with a QR scanner button (opens QRScanner component in modal)
  + a text input for manual entry
- Once batchId loaded: show BatchCard with full details
- Show FRSTimeline component with custody history
- Show "System Prediction": what the FRS is EXPECTED to be at this point in transit
  (based on time elapsed and produce decay rate)
- Show any flags from previous nodes (anomalies, seal breaks)
- Show farmer info: name, village, reputation score

RIGHT COLUMN - Weighing & Verification:
- Big "PLACE CRATE ON SCALE" button (green, pulsing animation)
- On click: show animated weighing sequence:
  1. "Taring scale..." (500ms)
  2. "Detecting crate..." (800ms)  
  3. "Reading weight..." (1000ms)
  4. "Weight: {X}g ✓" — call GET /api/batch/{batchId}/qr to get batch, then simulate weight
  
- Immediately calculate and animate FRS gauge from predicted → actual
- If FRS dropped >3% from last node: red alert banner "⚠️ SIGNIFICANT DEGRADATION DETECTED"
  Auto-populate: "Responsible transit leg: [last transporter name]"
  Show: "Initiating dispute? [YES/NO]"
  
- Grade display: large A+/A/B/C/D with color and action label
  Grade D: red pulsing border, "REJECTED — DO NOT SELL"
  Grade C: amber border, "DISCOUNTED — Sell Today"
  Grade B: amber border, "Slight Discount"
  Grade A/A+: green border, "ACCEPTED — Full Price"
  
- Two action buttons:
  "CONFIRM DELIVERY" (green) → calls POST /api/batch/custody-transfer
  "REJECT & DISPUTE" (red) → shows dispute form

- On confirmation: show success with TX hash, updated FRS written on-chain confirmation
```

---

## STEP 4.6 — Admin Dashboard and Consumer Trace

**Antigravity Prompt:**
```
Create the two evaluation-facing pages:

--- FILE: src/pages/admin/AdminDashboard.jsx ---
Full-page operations command center.

TOP ROW — 4 KPI Cards (animated count-up numbers):
1. "Active Batches" — fetch from admin dashboard API, icon: 📦, color: blue
2. "Network Avg FRS" — percentage with FRS color, icon: 🌡️, color: green/amber/red dynamic
3. "Open Disputes" — count, icon: ⚖️, color: red if > 0 else green
4. "Subsidy Pool" — ETH amount, icon: 💰, color: green

MIDDLE ROW — Three charts:
1. FRS Distribution BarChart (Recharts):
   - 5 bars: A+, A, B, C, D
   - Colors: green, lightgreen, amber, orange, red
   - X-axis: grade labels, Y-axis: count
   - Animated bar entry
   
2. Network Inventory HorizontalBarChart:
   - Top 5 produce types by total weight
   - Show weight in kg
   - Farm-green color scheme
   
3. Live Event Feed (use LiveFeed component):
   - Last 20 events from WebSocket
   - Real-time scrolling

BOTTOM ROW:
1. Karnataka Supply Chain Map (LiveDepotMap):
   - Static SVG of Karnataka outline (approximate — just major city nodes connected by lines)
   - Node cities: Bengaluru, Mysuru, Tumkur, Hassan, Belagavi, Hubballi, Mangaluru, Dharwad
   - Animated dots for active batches moving between nodes
   - Dot color = current FRS grade (green/amber/red)
   - Legend below map
   
2. Quick Actions Panel:
   - "Process Subsidy Queue (10)" button → calls processSubsidy(10)
   - "Trigger Simulation Tick" button → calls triggerSimulation()
   - "Refresh Data" button
   - "View Bad Actors" link
   - Each action shows its result inline

Auto-refresh every 30 seconds. Show last-updated timestamp.

--- FILE: src/pages/consumer/BatchTrace.jsx ---
Public-facing page (no auth required). URL: /trace/:batchId

This is what a consumer sees when they scan produce in a shop.

DESIGN: Clean, trust-building, non-technical language. Use green throughout.

HEADER: 
- Large produce name and type badge
- "✓ VERIFIED ON BLOCKCHAIN" green banner with chain icon
- FRS gauge (large) showing current freshness score
- Grade: "This produce is FRESH — Grade A" in large text

FARMER SECTION:
- Farmer avatar circle (first letter of name)
- Name, village, state
- "Verified Smallholder Farmer" badge if incomeTier = 1
- Reputation score as stars (out of 5, based on 0-100 score)
- "Farmed on: {harvest date}"

SUPPLY CHAIN JOURNEY:
- Vertical timeline (not horizontal — better for mobile)
- Each node: icon + name + timestamp + FRS at that point
- Color: green if grade A+/A, amber if B, red if C/D
- If any anomaly: "⚠️ Quality alert at this stage" note
- Show transit time between each leg

TRUST INDICATORS:
- "Weight verified at 4 checkpoints ✓"
- "No seal breaks detected ✓" (or ⚠️ if seal was broken)
- "No freshness anomalies detected ✓" (or ⚠️ if preservative flag)
- "Smart contract payment to farmer ✓"

CONSUMER ACTIONS:
- "📸 REPORT QUALITY ISSUE" button → modal with issue type + description
- "💰 FUND THIS FARMER" button → links to funding page for this farmer

BOTTOM:
- "Want to see the raw blockchain data?" expandable section with:
  Batch ID, TX hashes for each custody record, IPFS hashes, block numbers
- All in monospace font, copyable

If batch is NOT found: show "Batch Not Found" with a note about how to report suspicious QR codes.
```

### Verify Module 4:
```bash
cd farmchain/frontend
npm run dev

# Open http://localhost:5173
# Should show: Login page with FarmChain branding (no blank screen, no console errors)

# Test login flow:
# Click "Login as Admin" quick-button → should navigate to /admin
# Admin dashboard should show 4 KPI cards (may show 0s if backend not running)
# WebSocket indicator should show connected (green dot)

# Test with backend running:
# Farmer login → Register Produce page should show the 4-step wizard
# Consumer trace: go to http://localhost:5173/trace/BATCH-KA-2024-00001
# Should show batch details (may show "not found" if that batch ID doesn't exist yet)

# No TypeScript/import errors in browser console
# All route navigations work (no 404 pages)
```

---

---

# MODULE 5 — EQUITY & SUBSIDY WIRING
**Estimated time: 1 hour**
**Wire the funding contracts to working UI flows**

---

## STEP 5.1 — Consumer Funding Marketplace

**Antigravity Prompt:**
```
Create farmchain/frontend/src/pages/consumer/FundFarmer.jsx

This is the marketplace where consumers invest in farmer harvests.

LAYOUT: Two-panel page

LEFT PANEL — Funding Requests Marketplace:
- Title: "Fund a Farmer" with subtext "Become a stakeholder in your food supply"
- Filter bar: crop type dropdown, min/max target amount, sort by (reliability score / funding %, newest)
- Grid of "Funding Cards":
  Each card shows:
  - Farmer name + village + income tier badge (if tier 1: "🌱 Smallholder Farmer")
  - Crop type + land area (e.g. "0.75 acres")
  - Funding progress bar: X% of target filled (animated on load)
  - Equity offered: "15% of harvest proceeds"
  - Target: ₹X,XXX (convert ETH to INR at mock rate of 1 ETH = ₹200,000)
  - Reliability score: X/100 with colored bar
  - "FUND NOW" button (disabled if fully funded)
  - Days remaining countdown

On "FUND NOW" click: open a slide-over panel (RIGHT PANEL)

RIGHT PANEL — Investment Detail:
- Full farmer profile
- Past season performance table: year, crop, yield, investor ROI%
- Investment calculator:
  - Input: "Your contribution" slider + number input (min ₹100, max target remaining)
  - Show: "Your equity %: X.XX%"
  - Show: "Projected return at estimated yield: ₹X,XXX"  
  - Show: "Insurance coverage: If harvest fails, you recover ~60% via gas fee pool"
- Smart contract terms (expandable):
  - "Funds lock until harvest (estimated: {season end date})"
  - "Auto-disbursed when farmer settles harvest"
  - "Terms recorded on blockchain, cannot be altered"
- "INVEST NOW" button → calls POST /consumer/funding/{id}/invest
- Transaction confirmation: show TX hash + equity contract address

On success: show confetti animation + "You are now a FarmChain stakeholder!" message

Fetch funding requests from GET /consumer/funding/marketplace on mount.
Show skeleton loaders while loading.

--- FILE: src/pages/farmer/FundingRequests.jsx ---

FARMER SIDE of the same system.

Shows:
- "Create Funding Request" form:
  - Crop type, land area input
  - Input cost estimate (with breakdown: seeds + fertiliser + labor)
  - Estimated yield (kg)
  - Equity offered % slider (max 30%, shows warning if > 25%)
  - Season (current year auto-filled)
  - Submit → calls POST /farmer/funding-request via blockchainService

- My Active Requests list:
  - Status badge: OPEN / FUNDED / ACTIVE_SEASON / SETTLED
  - Funding progress bar
  - Investor count
  - "Settle Harvest" button (only when FUNDED): opens modal asking for actual sale amount,
    calls POST /farming/funding/{id}/settle

- Past Requests history table: shows ROI delivered to investors, season, status

--- FILE: src/pages/admin/SubsidyControl.jsx ---

Full subsidy management dashboard.

TOP: Stats row:
- Pool Balance: X ETH (₹X,XX,XXX)
- Total Disbursed: X ETH to Y farmers
- Queue Size: N farmers pending
- Last Processed: {datetime}

MAIN TABLE — Priority Queue:
Columns: Farmer Name | Income Tier | Land (acres) | Activity Score | Crop Risk | Total Priority Score | Last Disbursement | Action
- Each row has a colored priority score bar (higher = greener)
- Sort by priority score descending
- Show top 3 farmers highlighted with "PRIORITY" badge
- "DISBURSE ALL TOP 10" button at top right

BOTTOM: Disbursement History:
- Table: Farmer | Amount | Date | Priority Score at disbursement
- "Export CSV" button

Process disbursements:
- "Process Batch" button + input for batch size
- Progress: show each disbursement happening in real-time via WebSocket SUBSIDY_DISBURSED events
- Each disbursement shows as a toast notification

Fetch data on mount from GET /subsidy/queue and GET /subsidy/stats.
Use "Simulate Deposit (10 ETH)" button to add to pool via POST /subsidy/deposit.
```

---

## STEP 5.2 — Verify Modules 5 + Full Integration

**Antigravity Prompt:**
```
In farmchain/frontend/src/pages/admin/AdminDashboard.jsx, add a "DEMO CONTROLS" floating
panel in the bottom-right corner of the screen (z-index high, fixed position).

Panel appears/disappears with a toggle button showing ⚙️.

Demo Controls panel contains these buttons, each with a description:
1. "🌱 Register New Batch" → POST /farmer/register-produce with preset data (tomato, 10kg)
2. "🚚 Simulate Transit Leg" → POST /admin/simulation/trigger
3. "⚠️ Inject FRS Alert" → POST /admin/simulation/trigger (same endpoint, shows an alert)
4. "⚖️ Create Mock Dispute" → POST /dispute/create with batchId = first active batch
5. "💰 Deposit Subsidy (1 ETH)" → POST /subsidy/deposit
6. "🔄 Process Subsidy Queue" → POST /subsidy/process with batchSize=5

Each button:
- Shows a loading spinner while the request is in progress
- Shows the result (success/error) inline below the button
- Auto-clears after 5 seconds

This panel is the key tool for demonstrating live functionality to evaluators.

Also add a floating WebSocket event ticker at the BOTTOM of the screen (full width, semi-transparent):
- Shows the last 3 WS events as scrolling pills
- Each pill shows: event type icon + batchId + timestamp
- New events slide in from the right
- Auto-fades after 8 seconds
- Toggle-able with a small button
```

---

---

# MODULE 6 — DISPUTE RESOLUTION + NETWORK INTELLIGENCE
**Estimated time: 1 hour**
**Final module — tie everything together**

---

## STEP 6.1 — Dispute Panel + Bad Actors Page

**Antigravity Prompt:**
```
Create farmchain/frontend/src/pages/admin/DisputePanel.jsx

This is the governance interface for dispute resolution.

LEFT SIDEBAR — Open Disputes List:
- Each dispute: ID badge, batchId, type icon, status badge, created timestamp
- Status color: OPEN=blue, EVIDENCE_PHASE=amber, VOTING=purple, RESOLVED=green/red
- Click to load into main panel
- "Refresh" button
- Filter by status

MAIN PANEL — Dispute Detail:
When a dispute is selected:

TOP:
- Dispute ID + "BLOCKCHAIN RECORD ↗" link
- Status badge + dispute type
- Created: {date} | Evidence Deadline: {date} + countdown timer

SYSTEM ANALYSIS SECTION:
- "AI Recommendation: {GUILTY/INNOCENT}" with confidence %
- FRS delta analysis:
  - Table: Node | FRS | Change | Status
  - Highlight the leg with biggest drop in red
- "System recommends holding responsible: {address truncated}"

EVIDENCE SECTION:
- List of submitted evidence with IPFS links
- File type icons (photo/document/log)
- "Submit Evidence" button (for authorized parties): file upload with evidence type selector

VOTING SECTION (visible to PANEL_MEMBER and ADMIN):
- Anonymous vote tally (hidden until deadline):
  - Before deadline: "X votes cast — results revealed after {deadline}"
  - After deadline: reveal bar chart: GUILTY X | INNOCENT Y
- "CAST VOTE" buttons: [GUILTY] [INNOCENT]
- Render current user's vote if already cast: "You voted: GUILTY ✓"

RESOLUTION BUTTON:
- "RESOLVE DISPUTE" (ADMIN only, enabled after evidence deadline)
- Shows verdict + compensation details
- TX hash on resolution

---

Create farmchain/frontend/src/pages/admin/BadActors.jsx

Network integrity monitoring page.

HEADER: "Network Integrity Monitor"
Stats: X nodes flagged | Y blacklisted | Z disputes this week

MAIN TABLE:
Columns: Wallet (truncated + copy) | Role | Name | Disputes | Guilty Verdicts | Reputation Score | Status
- Reputation score shown as 0-100 gauge (small)
- Status: ACTIVE/FLAGGED/BLACKLISTED with colored badge
- Sort by disputes descending
- Each row has action buttons:
  "🔍 View Disputes" → filter disputes panel by this wallet
  "🚫 Flag for Review" (ADMIN)
  "⛔ Blacklist" (ADMIN, shows confirmation dialog)

HEATMAP section:
- Simple grid showing dispute frequency by day of week and time of day
- Helps identify patterns (e.g. batch substitutions happen at night)

---

Create farmchain/frontend/src/pages/admin/NetworkInventory.jsx

Market manipulation detection.

HEADER: "Real-Time Supply Chain Intelligence"

MAIN CHART: 
- Recharts ComposedChart
- Bar: current registered weight by produce type (top 10)
- Line: expected market volume (mock baseline)
- Divergence highlighted: if registered >> expected → orange/red coloring

ALERTS SECTION:
- List of potential manipulation alerts:
  - "⚠️ Tomato: 340% above 7-day average volume in Bengaluru district"
  - "⚠️ Onion: Batch BATCH-KA-2024-00004 stale at MM node for 27 hours"
- Click alert: show the specific batch in question

QUERY INTERFACE:
- "Show all [produce type] in [node type] in Karnataka"
- Dropdown + dropdown + "QUERY" button
- Result: table of matching batches with FRS status
```

---

## STEP 6.2 — Final Demo Seed Script and Full Integration

**Antigravity Prompt:**
```
Update farmchain/backend/src/scripts/demo-seed.js to add comprehensive seeding that
makes the demo visually compelling from the first second.

The script should:

1. Connect to MongoDB and blockchain (read contracts.json)

2. Create 8 farmer users in MongoDB (passwords all farmchain123):
   raju@farm.com (FARMER), meena@farm.com (FARMER), suresh@farm.com (FARMER),
   anitha@farm.com (FARMER), middleman1@trade.com (MIDDLEMAN),
   retailer1@shop.com (RETAILER), consumer1@user.com (CONSUMER),
   admin@farmchain.com (ADMIN), panel1@farmchain.com (PANEL_MEMBER)
   (use the wallet addresses from hardhat signers as shown in deploy script)
   Skip if email already exists (upsert logic).

3. Create 8 diverse OffChainBatch documents in MongoDB:
   Use batchIds from the blockchain (call getAllActiveBatches) for the first 3.
   For the rest, generate IDs: BATCH-KA-2024-00004 through BATCH-KA-2024-00008.
   
   Mix of states:
   - 2 batches with grade A+ (FRS 99-100), farmer Raju, tomato + mango
   - 2 batches with grade B (FRS 90-94), in transit, mango + spinach
   - 1 batch with grade C (FRS 86-89), anomalyFlagged: true, spinach
   - 1 batch isDisputed: true, grade C, tomato
   - 1 batch isExpired: true, grade D, lettuce
   - 1 batch fresh A+, onion, Suresh

4. Insert 2 DisputeEvidence documents for the disputed batch:
   - Evidence 1: submittedBy middleman wallet, evidenceType: "STATEMENT", 
     description: "Produce was intact at pickup. Temperature log attached.", ipfsHash: "QmEvidence001"
   - Evidence 2: submittedBy retailer wallet, evidenceType: "PHOTO",
     description: "Photo showing damaged seal on arrival.", ipfsHash: "QmEvidence002"

5. Print a summary table:
   ╔═══════════════════════════════════════════════════════╗
   ║   FARMCHAIN DEMO SEED COMPLETE                        ║
   ╠═══════════════════════════════════════════════════════╣
   ║   Users created/updated:  9                           ║
   ║   Batches in MongoDB:     8 (3 from blockchain)       ║
   ║   Disputes seeded:        1                           ║
   ║   Evidence records:       2                           ║
   ║   Subsidy pool:           10 ETH                      ║
   ╚═══════════════════════════════════════════════════════╝

6. FINAL INTEGRATION TEST — add to the end of the seed script:
   Test all 6 critical API paths using axios:
   a. POST /auth/login → expect token
   b. GET /admin/dashboard → expect non-empty stats
   c. GET /batch/network/inventory?produce=tomato → expect weight > 0
   d. GET /consumer/trace/BATCH-KA-2024-00001 → expect custody chain
   e. POST /ai-service analyze → call localhost:8000/analyze directly
   f. GET /subsidy/queue → expect sorted farmer list
   
   Print PASS/FAIL for each test.
```

### Final Verification — Full System Check:
```bash
# === TERMINAL 1: Blockchain node ===
cd farmchain/blockchain
npx hardhat node
# Expected: "Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/"

# === TERMINAL 2: Deploy contracts ===
cd farmchain/blockchain
npx hardhat run scripts/deploy.js --network localhost
# Expected: Deployment summary table, 5 farmers registered, 3 batches created

# === TERMINAL 3: AI Service ===
cd farmchain/ai-service
uvicorn main:app --port 8000 --reload
# Expected: "Application startup complete."

# === TERMINAL 4: Backend ===
cd farmchain/backend
npm run dev
# Expected: FarmChain banner, MongoDB connected, [NetworkSimulator] active

# === TERMINAL 5: Seed demo data ===
cd farmchain/backend
node src/scripts/demo-seed.js
# Expected: 6/6 integration tests PASS

# === TERMINAL 6: Frontend ===
cd farmchain/frontend
npm run dev
# Expected: "Local: http://localhost:5173/"

# ================================================================
# MANUAL DEMO VERIFICATION CHECKLIST (run in browser)
# ================================================================

# 1. Open http://localhost:5173
#    ✓ Login page renders with FarmChain branding

# 2. Click "Login as Admin"
#    ✓ Navigates to /admin
#    ✓ KPI cards show non-zero data
#    ✓ WS status shows green (connected)
#    ✓ Live feed shows events after 30 seconds (from simulator)

# 3. Open /admin in another tab, navigate to Network Map
#    ✓ Karnataka SVG renders
#    ✓ Colored dots visible representing batches

# 4. Click "Login as Farmer" (in a new incognito window)
#    ✓ Navigates to /farmer
#    ✓ Register Produce shows 4-step wizard
#    ✓ Complete all steps and submit
#    ✓ QR code appears on success screen
#    ✓ Admin dashboard batch count increments (may need refresh)

# 5. Go to /trace/BATCH-KA-2024-00001 (no login required)
#    ✓ Shows farmer info, custody timeline, FRS gauge
#    ✓ "VERIFIED ON BLOCKCHAIN" banner shows

# 6. Login as Admin, open Demo Controls panel (⚙️ button)
#    ✓ "Simulate Transit Leg" runs without error
#    ✓ Live feed shows CUSTODY_TRANSFER event
#    ✓ WebSocket event ticker at bottom shows the event

# 7. Open /admin/disputes
#    ✓ Shows the seeded disputed batch
#    ✓ FRS delta analysis panel renders
#    ✓ Vote buttons visible

# 8. Open /admin/subsidy
#    ✓ Shows 5 farmers in priority queue with scores
#    ✓ Pool balance shows 10 ETH
#    ✓ "Process Batch" button works

# ALL 8 CHECKS PASS = System is demo-ready ✓
```

---

## QUICK REFERENCE: DEMO CREDENTIALS

| Email | Password | Role | Quick Access |
|---|---|---|---|
| admin@farmchain.com | farmchain123 | ADMIN | /admin |
| raju@farm.com | farmchain123 | FARMER | /farmer |
| consumer1@user.com | farmchain123 | CONSUMER | /consumer |
| retailer1@shop.com | farmchain123 | RETAILER | /retailer |
| panel1@farmchain.com | farmchain123 | PANEL_MEMBER | /disputes |

## QUICK REFERENCE: KEY API ENDPOINTS

| Endpoint | What it shows |
|---|---|
| GET /health | System status |
| GET /admin/dashboard | Full network stats |
| GET /batch/network/inventory?produce=tomato | Market manipulation check |
| GET /consumer/trace/:batchId | Public blockchain trace |
| GET /subsidy/queue | Priority-ordered subsidy list |
| GET /dispute/open | All open disputes |
| POST /admin/simulation/trigger | Manual simulation tick |

## IF SOMETHING BREAKS

**Blockchain won't connect**: Make sure `npx hardhat node` is running in Terminal 1 BEFORE deploying or starting backend.

**MongoDB error**: Run `mongod` or `brew services start mongodb-community` first.

**Contract addresses undefined**: Rerun deploy script, check `backend/config/contracts.json` exists.

**Frontend blank screen**: Check browser console. 99% of the time it's a missing import — check App.jsx imports all page components.

**Simulation not advancing**: NetworkSimulator starts 5 seconds after backend boot. Wait, then check Terminal 4 logs for `[NetworkSimulator]` lines.

**AI service 422 errors**: Check that `request` form field is valid JSON with ALL required fields (batch_id, produce_type, category, declared_count, declared_weight_grams, node_type).
