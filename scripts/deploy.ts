import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying TimeArchive Contract...\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Deploy TimeArchive
  console.log("📦 Deploying TimeArchive...");
  const TimeArchive = await ethers.getContractFactory("TimeArchive");
  const timeArchive = await TimeArchive.deploy();

  await timeArchive.waitForDeployment();
  const address = await timeArchive.getAddress();

  console.log(`✅ TimeArchive deployed to: ${address}\n`);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    contractAddress: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  const fileName = `${network.name}-${network.chainId}.json`;
  const filePath = path.join(deploymentsDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`📄 Deployment info saved to: deployments/${fileName}\n`);

  // Display contract info
  const stats = await timeArchive.getStatistics();
  console.log("📊 Contract Statistics:");
  console.log(`   Total Files: ${stats._totalFiles}`);
  console.log(`   Total Batches: ${stats._totalBatches}`);
  console.log(`   Total Storage: ${stats._totalStorage} bytes\n`);

  console.log("🎉 Deployment Complete!\n");
  console.log("Next steps:");
  console.log("1. Add contract address to .env.local:");
  console.log(`   NEXT_PUBLIC_CONTRACT_ADDRESS_${network.name.toUpperCase()}=${address}`);
  console.log("2. Verify contract on block explorer (if mainnet/testnet)");
  console.log(`   npx hardhat verify --network ${network.name} ${address}\n`);

  return { address, deployer: deployer.address, network: network.name };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
