// scripts/deploy-chronicle.js
// Deploys only the FarmChainRegistry + ProduceBatch (NFT custody tracking layer).
// Runs independently of deploy.js — the existing 6-contract suite remains untouched.
//
// Usage:
//   cd blockchain && npx hardhat run scripts/deploy-chronicle.js --network localhost
//
// The script:
//  1. Deploys FarmChainRegistry
//  2. Deploys ProduceBatch (depends on Registry)
//  3. Registers & verifies the deployer as FARMER so they can immediately mintBatch()
//  4. Writes ABIs + addresses to:
//       blockchain/deployed-addresses-chronicle.json
//       backend/config/chronicle-contracts.json
//       backend/config/abis/FarmChainRegistry.json
//       backend/config/abis/ProduceBatch.json

const hre  = require("hardhat");
const fs   = require("fs");
const path = require("path");
const ethers = hre.ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance    = await ethers.provider.getBalance(deployer.address);

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  🌾  FarmChain Chronicle — NFT Custody Layer Deployment");
  console.log("══════════════════════════════════════════════════════════");
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Balance  : ${ethers.formatEther(balance)} ETH\n`);

  // ── 1. Deploy FarmChainRegistry ─────────────────────────────────────────
  console.log("  Deploying FarmChainRegistry...");
  const Registry     = await ethers.getContractFactory("FarmChainRegistry");
  const registry     = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log(`  ✅ FarmChainRegistry → ${registryAddr}`);

  // ── 2. Deploy ProduceBatch ───────────────────────────────────────────────
  console.log("  Deploying ProduceBatch...");
  const ProduceBatch = await ethers.getContractFactory("ProduceBatch");
  const batch        = await ProduceBatch.deploy(registryAddr);
  await batch.waitForDeployment();
  const batchAddr    = await batch.getAddress();
  console.log(`  ✅ ProduceBatch       → ${batchAddr}`);

  // ── 3. Bootstrap deployer as verified FARMER ────────────────────────────
  const FARMER_ROLE      = 0n;
  const LOCATION_HQ      = ethers.encodeBytes32String("HQ");
  await registry.registerParticipant(deployer.address, FARMER_ROLE, LOCATION_HQ);
  await registry.verifyParticipant(deployer.address);
  console.log(`\n  👤 Deployer verified as FARMER: ${deployer.address}\n`);

  // ── 4. Build output data ─────────────────────────────────────────────────
  const registryArtifact = await hre.artifacts.readArtifact("FarmChainRegistry");
  const batchArtifact    = await hre.artifacts.readArtifact("ProduceBatch");

  const chronicleData = {
    FarmChainRegistry: registryAddr,
    ProduceBatch:      batchAddr,
    RegistryABI:       registryArtifact.abi,
    BatchABI:          batchArtifact.abi,
    network:           "localhost",
    chainId:           31337,
    deployedAt:        new Date().toISOString(),
  };

  // ── 5. Write to blockchain dir ───────────────────────────────────────────
  const blockchainOut = path.resolve(__dirname, "..", "deployed-addresses-chronicle.json");
  fs.writeFileSync(blockchainOut, JSON.stringify(chronicleData, null, 2));
  console.log(`  📝 ${blockchainOut}`);

  // ── 6. Write to backend config ───────────────────────────────────────────
  const backendConfigDir = path.resolve(__dirname, "..", "..", "backend", "config");
  fs.mkdirSync(backendConfigDir, { recursive: true });

  const backendOut = path.join(backendConfigDir, "chronicle-contracts.json");
  const minimalData = {
    FarmChainRegistry: registryAddr,
    ProduceBatch:      batchAddr,
    network:           "localhost",
    chainId:           31337,
    deployedAt:        chronicleData.deployedAt,
  };
  fs.writeFileSync(backendOut, JSON.stringify(minimalData, null, 2));
  console.log(`  📝 ${backendOut}`);

  // ── 7. Copy ABI files to backend ─────────────────────────────────────────
  const abiDir = path.join(backendConfigDir, "abis");
  fs.mkdirSync(abiDir, { recursive: true });

  const abiMap = {
    FarmChainRegistry: path.resolve(__dirname, "..", "artifacts", "contracts", "FarmChainRegistry.sol", "FarmChainRegistry.json"),
    ProduceBatch:      path.resolve(__dirname, "..", "artifacts", "contracts", "ProduceBatch.sol",      "ProduceBatch.json"),
  };

  for (const [name, src] of Object.entries(abiMap)) {
    const dst = path.join(abiDir, `${name}.json`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      console.log(`  📂 ABI copied: ${name}.json`);
    } else {
      console.warn(`  ⚠️  Artifact not found (run compile first): ${src}`);
    }
  }

  // ── 8. Write frontend-ready config ───────────────────────────────────────
  const frontendConfigDir = path.resolve(__dirname, "..", "..", "frontend", "src", "services");
  fs.mkdirSync(frontendConfigDir, { recursive: true });

  const frontendContractsPath = path.join(frontendConfigDir, "chronicle-contracts.json");
  fs.writeFileSync(frontendContractsPath, JSON.stringify({
    FarmChainRegistry: registryAddr,
    RegistryABI:       registryArtifact.abi,
    ProduceBatch:      batchAddr,
    BatchABI:          batchArtifact.abi,
    chainId:           31337,
    rpcUrl:            "http://127.0.0.1:8545",
  }, null, 2));
  console.log(`  📝 ${frontendContractsPath}`);

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  🎉 Chronicle Contracts Deployed!\n");
  console.log("  FarmChainRegistry :", registryAddr);
  console.log("  ProduceBatch      :", batchAddr);
  console.log("\n  Next steps:");
  console.log("  • Farmers call mintBatch() on ProduceBatch contract");
  console.log("  • Admin calls registerParticipant() to onboard logistics/retailers");
  console.log("  • Use transferCustody() + acceptCustody() for supply chain hops");
  console.log("══════════════════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
