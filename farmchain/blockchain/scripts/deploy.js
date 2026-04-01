// scripts/deploy.js – Deploy all FarmChain contracts to local Hardhat network
const hre    = require("hardhat");
const fs     = require("fs");
const path   = require("path");
const ethers = hre.ethers;

// ── Produce category enum values (matches FRSEngine.sol) ────────
const ProduceCategory = { STANDARD: 0, HIGH_SENSITIVITY: 1, HIGH_TOLERANCE: 2 };

async function main() {
  // ─── 1. Signers ───────────────────────────────────────
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const balance  = await ethers.provider.getBalance(deployer.address);

  console.log("\n════════════════════════════════════════════════");
  console.log("  🌾  FarmChain — Contract Deployment");
  console.log("════════════════════════════════════════════════");
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Balance  : ${ethers.formatEther(balance)} ETH\n`);

  const deployed = {};   // name → { address, txHash }

  // ─── 2. Deploy in dependency order ────────────────────

  // a) FRSEngine (library deployed as contract)
  const FRSEngine = await ethers.getContractFactory("FRSEngine");
  const frsEngine = await FRSEngine.deploy();
  await frsEngine.waitForDeployment();
  deployed.FRSEngine = { address: await frsEngine.getAddress(), txHash: frsEngine.deploymentTransaction().hash };

  // b) FarmerRegistry
  const FarmerRegistry = await ethers.getContractFactory("FarmerRegistry");
  const farmerRegistry = await FarmerRegistry.deploy(deployer.address);
  await farmerRegistry.waitForDeployment();
  deployed.FarmerRegistry = { address: await farmerRegistry.getAddress(), txHash: farmerRegistry.deploymentTransaction().hash };

  // c) BatchRegistry
  const BatchRegistry = await ethers.getContractFactory("BatchRegistry");
  const batchRegistry = await BatchRegistry.deploy(deployer.address, await farmerRegistry.getAddress());
  await batchRegistry.waitForDeployment();
  deployed.BatchRegistry = { address: await batchRegistry.getAddress(), txHash: batchRegistry.deploymentTransaction().hash };

  // d) DisputeEngine
  const DisputeEngine = await ethers.getContractFactory("DisputeEngine");
  const disputeEngine = await DisputeEngine.deploy(
    deployer.address, await batchRegistry.getAddress(), await farmerRegistry.getAddress()
  );
  await disputeEngine.waitForDeployment();
  deployed.DisputeEngine = { address: await disputeEngine.getAddress(), txHash: disputeEngine.deploymentTransaction().hash };

  // e) SubsidyEngine
  const SubsidyEngine = await ethers.getContractFactory("SubsidyEngine");
  const subsidyEngine = await SubsidyEngine.deploy(deployer.address, await farmerRegistry.getAddress());
  await subsidyEngine.waitForDeployment();
  deployed.SubsidyEngine = { address: await subsidyEngine.getAddress(), txHash: subsidyEngine.deploymentTransaction().hash };

  // f) FundingContracts
  const FundingContracts = await ethers.getContractFactory("FundingContracts");
  const fundingContracts = await FundingContracts.deploy(
    deployer.address, await farmerRegistry.getAddress(), await batchRegistry.getAddress()
  );
  await fundingContracts.waitForDeployment();
  deployed.FundingContracts = { address: await fundingContracts.getAddress(), txHash: fundingContracts.deploymentTransaction().hash };

  console.log("  ✅ All 6 contracts deployed.\n");

  // ─── 3. Wire contracts together ───────────────────────
  await batchRegistry.setDisputeEngineAddress(await disputeEngine.getAddress());
  await farmerRegistry.setBatchRegistryAddress(await batchRegistry.getAddress());
  console.log("  🔗 Contracts wired (DisputeEngine ↔ BatchRegistry ↔ FarmerRegistry)\n");

  // ─── 4. Seed 5 demo farmers ──────────────────────────
  const farmers = [
    { signer: signers[1], name: "Raju Kumar",   village: "Tumkur",   state: "Karnataka", gps: "13.3379,77.1173", tier: 1, land: 50,  produces: ["tomato","mango"] },
    { signer: signers[2], name: "Meena Devi",   village: "Hassan",   state: "Karnataka", gps: "13.0072,76.1004", tier: 1, land: 75,  produces: ["spinach","coriander"] },
    { signer: signers[3], name: "Suresh Patil", village: "Mysuru",   state: "Karnataka", gps: "12.2958,76.6394", tier: 2, land: 200, produces: ["onion","garlic"] },
    { signer: signers[4], name: "Anitha Reddy", village: "Belagavi", state: "Karnataka", gps: "15.8497,74.4977", tier: 2, land: 300, produces: ["apple","grapes"] },
    { signer: signers[5], name: "Venkat Rao",   village: "Hubballi", state: "Karnataka", gps: "15.3647,75.1240", tier: 3, land: 600, produces: ["pumpkin","coconut"] },
  ];

  for (const f of farmers) {
    const registry = farmerRegistry.connect(f.signer);
    const tx = await registry.registerFarmer(
      f.name, f.village, f.state, f.gps, f.tier, f.land, f.produces
    );
    await tx.wait();
    console.log(`  👤 Registered: ${f.name} (${f.signer.address.slice(0, 10)}…)`);
  }

  // Verify farmers 1-4 (not farmer 5)
  for (let i = 1; i <= 4; i++) {
    await farmerRegistry.verifyFarmer(signers[i].address);
  }
  console.log("  ✅ Farmers 1-4 verified.\n");

  // ─── 5. Seed 3 demo batches ──────────────────────────
  const batchRegistryRaju  = batchRegistry.connect(signers[1]);
  const batchRegistryMeena = batchRegistry.connect(signers[2]);

  let tx;
  tx = await batchRegistryRaju.createBatch("tomato", ProduceCategory.STANDARD, 10000, 80, "13.3379,77.1173", "QmFakeHash001", "Raju Farm");
  await tx.wait();
  console.log("  📦 Batch 1: tomato (10 kg, STANDARD) — Raju Kumar");

  tx = await batchRegistryRaju.createBatch("mango", ProduceCategory.STANDARD, 15000, 60, "13.3379,77.1173", "QmFakeHash002", "Raju Farm");
  await tx.wait();
  console.log("  📦 Batch 2: mango (15 kg, STANDARD) — Raju Kumar");

  tx = await batchRegistryMeena.createBatch("spinach", ProduceCategory.HIGH_SENSITIVITY, 5000, 200, "13.0072,76.1004", "QmFakeHash003", "Meena Farm");
  await tx.wait();
  console.log("  📦 Batch 3: spinach (5 kg, HIGH_SENSITIVITY) — Meena Devi\n");

  // ─── 6. Deposit 10 ETH into SubsidyEngine ────────────
  tx = await subsidyEngine.depositSubsidy("Government Karnataka Pilot", { value: ethers.parseEther("10") });
  await tx.wait();
  console.log("  💰 Deposited 10 ETH into SubsidyEngine pool.\n");

  // ─── 7. Grant PANEL_ROLE ──────────────────────────────
  const PANEL_ROLE = await disputeEngine.PANEL_ROLE();
  for (let i = 0; i <= 2; i++) {
    await disputeEngine.grantRole(PANEL_ROLE, signers[i].address);
  }
  console.log("  🔑 PANEL_ROLE granted to signers[0..2].\n");

  // ─── 8. Write deployment files ────────────────────────
  const deploymentData = {
    FRSEngine:        deployed.FRSEngine.address,
    FarmerRegistry:   deployed.FarmerRegistry.address,
    BatchRegistry:    deployed.BatchRegistry.address,
    DisputeEngine:    deployed.DisputeEngine.address,
    SubsidyEngine:    deployed.SubsidyEngine.address,
    FundingContracts: deployed.FundingContracts.address,
    network:          "localhost",
    chainId:          31337,
    deployedAt:       new Date().toISOString(),
  };

  const blockchainOut = path.resolve(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(blockchainOut, JSON.stringify(deploymentData, null, 2));
  console.log(`  📝 ${blockchainOut}`);

  const backendConfigDir = path.resolve(__dirname, "..", "..", "backend", "config");
  fs.mkdirSync(backendConfigDir, { recursive: true });
  const backendOut = path.join(backendConfigDir, "contracts.json");
  fs.writeFileSync(backendOut, JSON.stringify(deploymentData, null, 2));
  console.log(`  📝 ${backendOut}`);

  // ─── 9. Copy ABI files to backend ─────────────────────
  const abiDir = path.join(backendConfigDir, "abis");
  fs.mkdirSync(abiDir, { recursive: true });

  const contractNames = ["FRSEngine", "FarmerRegistry", "BatchRegistry", "DisputeEngine", "SubsidyEngine", "FundingContracts"];
  for (const name of contractNames) {
    const src = path.resolve(__dirname, "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`);
    const dst = path.join(abiDir, `${name}.json`);
    fs.copyFileSync(src, dst);
  }
  console.log(`  📂 6 ABI files copied to ${abiDir}\n`);

  // ─── 10. Summary table ────────────────────────────────
  console.log("════════════════════════════════════════════════════════════════════════════");
  console.log("  Contract            Address                                    Tx Hash");
  console.log("────────────────────────────────────────────────────────────────────────────");
  for (const [name, info] of Object.entries(deployed)) {
    const n = name.padEnd(18);
    const a = info.address;
    const t = info.txHash.slice(0, 18) + "…";
    console.log(`  ${n} ${a}  ${t}`);
  }
  console.log("════════════════════════════════════════════════════════════════════════════\n");
  console.log("  🎉 Deployment complete!\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
