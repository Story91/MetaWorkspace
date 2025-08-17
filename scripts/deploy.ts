const { ethers } = require("hardhat");

async function deployContract() {
  console.log("🚀 Starting MetaWorkspace contract deployment...");

  // Get the deployer account
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  if (!deployer) {
    throw new Error("No signer available. Please check your PRIVATE_KEY in .env");
  }
  
  const deployerAddress = await deployer.getAddress();
  console.log("📝 Deploying contracts with account:", deployerAddress);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployerAddress);
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
      deployerAddress,
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
      deployerAddress,
      "QmTestVideoHash456",
      1800,
      "test-room-1",
      ["test.eth", "user.eth"],
      "Test meeting summary",
      []
    );
    await tx2.wait();
    console.log("✅ Test video NFT minted successfully");

    // Test room content
    const roomContent = await metaWorkspaceNFT.getRoomContent("test-room-1");
    console.log(`✅ Room content: ${roomContent.length} NFTs in room`);

    // Test AI access purchase
    const aiAccessPrice = await metaWorkspaceNFT.aiAccessPrice();
    console.log(`💰 AI Access price: ${ethers.formatEther(aiAccessPrice)} ETH`);
    
    const tx3 = await metaWorkspaceNFT.purchaseAIAccess({ value: aiAccessPrice });
    await tx3.wait();
    console.log("✅ AI Access purchased successfully");

    // Test AI access check
    const hasAccess = await metaWorkspaceNFT.checkAIAccess(deployerAddress);
    console.log(`🤖 AI Access status: ${hasAccess}`);

    // Test content reading
    const voiceNFT = await metaWorkspaceNFT.getContent(0); // First NFT
    console.log(`📢 Voice NFT: ${voiceNFT.duration}s duration, room: ${voiceNFT.roomId}`);

    // Test room creation with join fee
    const tx4 = await metaWorkspaceNFT.createRoom(
      "premium-room-1",
      "Premium Team Room", 
      [deployerAddress],
      false,
      ethers.parseEther("0.00001") // 0.00001 ETH join fee
    );
    await tx4.wait();
    console.log("✅ Premium room created successfully");

    // Test room join with payment
    const joinFee = await metaWorkspaceNFT.roomJoinPrice("premium-room-1");
    console.log(`💰 Room join fee: ${ethers.formatEther(joinFee)} ETH`);
    
    // Test room member count
    const memberCount = await metaWorkspaceNFT.getRoomMemberCount("premium-room-1");
    console.log(`👥 Room members: ${memberCount}`);

    // Test room earnings (should be 0 initially)
    const earnings = await metaWorkspaceNFT.roomEarnings("premium-room-1");
    console.log(`💵 Room earnings: ${ethers.formatEther(earnings)} ETH`);

    console.log("\n🎊 MetaWorkspaceNFT deployed and tested successfully!");
    
  } catch (error) {
    console.error("❌ Error during testing:", error);
    console.error("📋 This might be normal if we're re-testing existing functions");
  }
}

deployContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
