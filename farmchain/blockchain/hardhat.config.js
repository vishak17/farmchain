require("@nomicfoundation/hardhat-toolbox");

/**
 * FarmChain v2 Hardhat Config
 *
 * Multi-compiler setup:
 *  - 0.8.24 : FRSEngine, FarmerRegistry, BatchRegistry, DisputeEngine,
 *             SubsidyEngine, FundingContracts  (original 6-contract suite)
 *  - 0.8.24 : FarmChainRegistry, ProduceBatch  (NFT custody layer from chronicles)
 *
 * Networks:
 *  - localhost (8545)  : Primary Hardhat node (deploy.js)
 *  - chronicle (8545)  : Alias for deploy-chronicle.js (same node, separate deploy)
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: { optimizer: { enabled: true, runs: 200 } }
      },
      {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: "cancun"
        }
      }
    ]
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    // Secondary port used by farm-chain-chronicles (FarmChainRegistry + ProduceBatch)
    chronicle: {
      url: "http://127.0.0.1:8546",
      chainId: 31340
    }
  },
  paths: {
    artifacts: "./artifacts",
    sources:   "./contracts",
    scripts:   "./scripts"
  }
};

