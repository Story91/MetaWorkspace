import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting MetaWorkspace contract deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy RoomManager contract
  console.log("\n📋 Deploying RoomManager...");
  const RoomManager = await ethers.getContractFactory("RoomManager");
  const roomManager = await RoomManager.deploy();
  await roomManager.waitForDeployment();
  const roomManagerAddress = await roomManager.getAddress();
  console.log("✅ RoomManager deployed to:", roomManagerAddress);

  // Deploy VoiceNFT contract
  console.log("\n🎤 Deploying VoiceNFT...");
  const VoiceNFT = await ethers.getContractFactory("VoiceNFT");
  const voiceNFT = await VoiceNFT.deploy();
  await voiceNFT.waitForDeployment();
  const voiceNFTAddress = await voiceNFT.getAddress();
  console.log("✅ VoiceNFT deployed to:", voiceNFTAddress);

  // Deploy VideoNFT contract
  console.log("\n🎥 Deploying VideoNFT...");
  const VideoNFT = await ethers.getContractFactory("VideoNFT");
  const videoNFT = await VideoNFT.deploy();
  await videoNFT.waitForDeployment();
  const videoNFTAddress = await videoNFT.getAddress();
  console.log("✅ VideoNFT deployed to:", videoNFTAddress);

  // Display deployment summary
  console.log("\n🎉 Deployment completed successfully!");
  console.log("=" .repeat(50));
  console.log("📋 RoomManager:", roomManagerAddress);
  console.log("🎤 VoiceNFT:   ", voiceNFTAddress);
  console.log("🎥 VideoNFT:   ", videoNFTAddress);
  console.log("=" .repeat(50));

  // Environment variables for .env.local
  console.log("\n📝 Add these to your .env.local file:");
  console.log(`NEXT_PUBLIC_ROOM_MANAGER_ADDRESS=${roomManagerAddress}`);
  console.log(`NEXT_PUBLIC_VOICE_NFT_ADDRESS=${voiceNFTAddress}`);
  console.log(`NEXT_PUBLIC_VIDEO_NFT_ADDRESS=${videoNFTAddress}`);

  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  try {
    // Test RoomManager
    const tx1 = await roomManager.createRoom(
      "test-room-1",
      "Test Room",
      ["test.eth"],
      false,
      {
        maxRecordingDuration: 30,
        allowVoiceNFTs: true,
        allowVideoNFTs: true,
        requireWhitelist: true
      }
    );
    await tx1.wait();
    console.log("✅ Test room created successfully");

    // Test VoiceNFT
    const tx2 = await voiceNFT.mintVoiceNFT(
      deployer.address,
      "QmTestHash123",
      25,
      "test-room-1",
      ["test.eth"],
      "Test transcription"
    );
    await tx2.wait();
    console.log("✅ Test voice NFT minted successfully");

    // Test VideoNFT
    const tx3 = await videoNFT.mintVideoNFT(
      deployer.address,
      "QmTestVideoHash456",
      1800,
      "test-room-1",
      ["test.eth", "user.eth"],
      "Test meeting summary",
      []
    );
    await tx3.wait();
    console.log("✅ Test video NFT minted successfully");

    console.log("\n🎊 All contracts deployed and tested successfully!");
    
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
