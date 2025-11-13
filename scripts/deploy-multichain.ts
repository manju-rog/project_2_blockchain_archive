import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

interface DeploymentResult {
  network: string;
  success: boolean;
  address?: string;
  error?: string;
  chainId?: number;
}

/**
 * Deploy to multiple chains for maximum redundancy and censorship resistance
 */
async function deployMultiChain() {
  console.log("🌐 MULTI-CHAIN DEPLOYMENT INITIATED\n");
  console.log("Deploying TimeArchive to multiple blockchains for UNSTOPPABLE storage...\n");

  // Define deployment targets (testnet first for safety)
  const networks = [
    { name: "mumbai", display: "Polygon Mumbai Testnet", testnet: true },
    { name: "sepolia", display: "Ethereum Sepolia Testnet", testnet: true },
    { name: "bscTestnet", display: "BSC Testnet", testnet: true },
    // Uncomment for mainnet deployments (requires funds)
    // { name: "polygon", display: "Polygon Mainnet", testnet: false },
    // { name: "ethereum", display: "Ethereum Mainnet", testnet: false },
    // { name: "bsc", display: "Binance Smart Chain", testnet: false },
    // { name: "avalanche", display: "Avalanche C-Chain", testnet: false },
    // { name: "arbitrum", display: "Arbitrum One", testnet: false },
    // { name: "gnosis", display: "Gnosis Chain", testnet: false },
  ];

  const results: DeploymentResult[] = [];

  for (const network of networks) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🔗 Deploying to ${network.display}...`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      const { stdout, stderr } = await execAsync(
        `npx hardhat run scripts/deploy.ts --network ${network.name}`
      );

      console.log(stdout);
      if (stderr) console.error(stderr);

      // Parse deployment address from output
      const addressMatch = stdout.match(/TimeArchive deployed to: (0x[a-fA-F0-9]{40})/);
      const address = addressMatch ? addressMatch[1] : undefined;

      results.push({
        network: network.name,
        success: true,
        address: address,
      });

      console.log(`✅ Successfully deployed to ${network.display}\n`);
    } catch (error: any) {
      console.error(`❌ Failed to deploy to ${network.display}`);
      console.error(`Error: ${error.message}\n`);

      results.push({
        network: network.name,
        success: false,
        error: error.message,
      });
    }

    // Wait a bit between deployments to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log(`${"=".repeat(60)}\n`);

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}\n`);

  if (successful.length > 0) {
    console.log("Successful Deployments:");
    successful.forEach((r) => {
      console.log(`  • ${r.network}: ${r.address}`);
    });
    console.log();
  }

  if (failed.length > 0) {
    console.log("Failed Deployments:");
    failed.forEach((r) => {
      console.log(`  • ${r.network}: ${r.error}`);
    });
    console.log();
  }

  // Save multi-chain deployment summary
  const summaryPath = path.join(__dirname, "..", "deployments", "multi-chain-summary.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        results,
        summary: {
          total: results.length,
          successful: successful.length,
          failed: failed.length,
        },
      },
      null,
      2
    )
  );

  console.log(`📄 Summary saved to: deployments/multi-chain-summary.json\n`);

  // Generate environment variable updates
  if (successful.length > 0) {
    console.log("🔧 Add these to your .env.local:\n");
    successful.forEach((r) => {
      const envVar = `NEXT_PUBLIC_CONTRACT_ADDRESS_${r.network.toUpperCase()}=${r.address}`;
      console.log(envVar);
    });
    console.log();
  }

  console.log("🎉 Multi-chain deployment complete!\n");
  console.log("Your archive is now UNSTOPPABLE across multiple blockchains! 🚀\n");

  return results;
}

// Execute
deployMultiChain()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Multi-chain deployment failed:", error);
    process.exit(1);
  });
