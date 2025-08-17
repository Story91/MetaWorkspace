import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting MetaWorkspace contract deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy MetaWorkspaceNFT contract (universal for all content)
  console.log("\n🎯 Deploying MetaWorkspaceNFT (Universal Content Contract)...");
  const MetaWorkspaceNFT = await ethers.getContractFactory("MetaWorkspaceNFT");
  const metaWorkspaceNFT = await MetaWorkspaceNFT.deploy();
  await metaWorkspaceNFT.waitForDeployment();
  const nftAddress = await metaWorkspaceNFT.getAddress();
  console.log("✅ MetaWorkspaceNFT deployed to:", nftAddress);

  // Display deployment summary
  console.log("\n🎉 Deployment completed successfully!");
  console.log("=" .repeat(50));
  console.log("🎯 MetaWorkspaceNFT:", nftAddress);
  console.log("=" .repeat(50));

  // Environment variables for .env.local
  console.log("\n📝 Add these to your .env.local file:");
  console.log(`NEXT_PUBLIC_METAWORKSPACE_NFT_ADDRESS=${nftAddress}`);

  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  try {
    // Test Voice NFT minting
    const tx1 = await metaWorkspaceNFT.mintVoiceNFT(
      deployer.address,
      "QmTestVoiceHash123",
      25,
      "test-room-1",
      ["test.eth"],
      "Test voice transcription"
    );
    await tx1.wait();
    console.log("✅ Test voice NFT minted successfully");

    // Test Video NFT minting
    const tx2 = await metaWorkspaceNFT.mintVideoNFT(
      deployer.address,
      "QmTestVideoHash456",
      1800,
      "test-room-1",
      ["test.eth", "user.eth"],
      "Test meeting summary",
      []
    );
    await tx2.wait();
    console.log("✅ Test video NFT minted successfully");

    // Test room stats
    const stats = await metaWorkspaceNFT.getRoomStats("test-room-1");
    console.log(`✅ Room stats: ${stats.totalContent} total, ${stats.voiceCount} voice, ${stats.videoCount} video`);

    console.log("\n🎊 MetaWorkspaceNFT deployed and tested successfully!");
    
  } catch (error) {
    console.error("❌ Error during testing:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
