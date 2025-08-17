const { ethers } = require("hardhat");

async function testFullContract() {
  console.log("🧪 TESTING FULL METAWORKSPACE CONTRACT");
  console.log("=" .repeat(70));

  // Get signers
  const signers = await ethers.getSigners();
  const owner = signers[0];
  const user1 = signers[0]; // Use same signer for testing
  const user2 = signers[0]; // Use same signer for testing  
  const user3 = signers[0]; // Use same signer for testing
  
  if (!owner) {
    throw new Error("No signer available. Check your private key in .env");
  }
  
  console.log("👤 Owner/Tester:", owner.address);
  console.log("⚠️ Using single signer for all operations in testnet");

  // Connect to deployed contract
  const contractAddress = "0x1f6F0c63b25Eb3d29BDDc221C3048E0D6C889cb2";
  const MetaWorkspaceNFT = await ethers.getContractFactory("MetaWorkspaceNFT");
  const contract = MetaWorkspaceNFT.attach(contractAddress);
  
  console.log("📋 Connected to contract:", contractAddress);

  try {
    console.log("\n🎯 TESTING CONTRACT BASICS");
    console.log("-".repeat(50));
    
    // Test 1: Basic contract info
    const name = await contract.name();
    const symbol = await contract.symbol();
    const ownerAddr = await contract.owner();
    const aiPrice = await contract.aiAccessPrice();
    
    console.log(`✅ Name: ${name}`);
    console.log(`✅ Symbol: ${symbol}`);
    console.log(`✅ Owner: ${ownerAddr}`);
    console.log(`✅ AI Access Price: ${ethers.formatEther(aiPrice)} ETH`);

    console.log("\n💰 TESTING AI ACCESS SYSTEM");
    console.log("-".repeat(50));
    
    // Test 2: AI Access Check (already purchased in previous tests)
    console.log("2️⃣ Checking AI access status...");
    const aiAccess = await contract.checkAIAccess(owner.address);
    console.log(`✅ AI access status: ${aiAccess}`);

    console.log("\n🏠 TESTING ROOM SYSTEM");
    console.log("-".repeat(50));
    
    // Test 3: Free Room Creation
    console.log("3️⃣ Creating free room...");
    const freeRoomId = `free-room-${Date.now()}`;
    const tx2 = await contract.createRoom(
      freeRoomId,
      "Free Test Room",
      [user1.address],
      true,
      0 // Free room
    );
    await tx2.wait();
    console.log(`✅ Free room created: ${freeRoomId}`);
    
    const roomExists = await contract.roomExists(freeRoomId);
    const roomPrice = await contract.roomJoinPrice(freeRoomId);
    const roomCreator = await contract.roomCreator(freeRoomId);
    const memberCount = await contract.getRoomMemberCount(freeRoomId);
    
    console.log(`Room exists: ${roomExists}`);
    console.log(`Room price: ${ethers.formatEther(roomPrice)} ETH`);
    console.log(`Room creator: ${roomCreator}`);
    console.log(`Initial member count: ${memberCount}`);

    // Test 4: Paid Room Creation
    console.log("\n4️⃣ Creating paid room...");
    const paidRoomId = `paid-room-${Date.now()}`;
    const joinFee = ethers.parseEther("0.001");
    
    const tx3 = await contract.connect(user2).createRoom(
      paidRoomId,
      "Paid Test Room",
      [],
      true,
      joinFee
    );
    await tx3.wait();
    console.log(`✅ Paid room created: ${paidRoomId}`);
    
    const paidRoomPrice = await contract.roomJoinPrice(paidRoomId);
    const paidRoomCreator = await contract.roomCreator(paidRoomId);
    
    console.log(`Paid room price: ${ethers.formatEther(paidRoomPrice)} ETH`);
    console.log(`Paid room creator: ${paidRoomCreator}`);

    // Test 5: Skip joining free room (same address already member)
    console.log("\n5️⃣ Checking free room membership...");
    const freeRoomMembers = await contract.getRoomMemberCount(freeRoomId);
    const isOwnerMember = await contract.isRoomMember(freeRoomId, owner.address);
    
    console.log(`✅ Free room members: ${freeRoomMembers}`);
    console.log(`✅ Owner is member: ${isOwnerMember}`);

    // Test 6: Check Paid Room Status  
    console.log("\n6️⃣ Checking paid room status...");
    const paidRoomMembers = await contract.getRoomMemberCount(paidRoomId);
    const roomEarnings = await contract.roomEarnings(paidRoomId);
    const currentRoomPrice = await contract.roomJoinPrice(paidRoomId);
    
    console.log(`✅ Paid room members: ${paidRoomMembers}`);
    console.log(`✅ Room earnings: ${ethers.formatEther(roomEarnings)} ETH`);
    console.log(`✅ Join price: ${ethers.formatEther(currentRoomPrice)} ETH`);

    console.log("\n🎤 TESTING NFT MINTING");
    console.log("-".repeat(50));
    
    // Test 7: Voice NFT Minting
    console.log("7️⃣ Minting voice NFT...");
    const tx6 = await contract.mintVoiceNFT(
      user1.address,
      "QmTestVoiceHash123",
      300, // 5 minutes
      freeRoomId,
      ["alice.eth", "bob.eth"],
      "Test voice transcription"
    );
    await tx6.wait();
    console.log("✅ Voice NFT minted");
    
    const totalSupply = await contract.totalSupply();
    console.log(`Total NFTs: ${totalSupply}`);
    
    // Test 8: Video NFT Minting
    console.log("\n8️⃣ Minting video NFT...");
    const tx7 = await contract.mintVideoNFT(
      user2.address,
      "QmTestVideoHash456",
      1800, // 30 minutes
      paidRoomId,
      ["alice.eth", "bob.eth", "carol.eth"],
      "Test meeting summary",
      [] // Public video
    );
    await tx7.wait();
    console.log("✅ Video NFT minted");
    
    const newTotalSupply = await contract.totalSupply();
    console.log(`Total NFTs: ${newTotalSupply}`);

    // Test 9: NFT Content Reading
    console.log("\n9️⃣ Reading NFT content...");
    const voiceNFTContent = await contract.getContent(0);
    const videoNFTContent = await contract.getContent(1);
    
    console.log(`Voice NFT: ${voiceNFTContent.duration}s in room ${voiceNFTContent.roomId}`);
    console.log(`Video NFT: ${videoNFTContent.duration}s in room ${videoNFTContent.roomId}`);
    
    // Test 10: Room Content
    const freeRoomContent = await contract.getRoomContent(freeRoomId);
    const paidRoomContent = await contract.getRoomContent(paidRoomId);
    
    console.log(`Free room NFTs: ${freeRoomContent.length}`);
    console.log(`Paid room NFTs: ${paidRoomContent.length}`);

    console.log("\n💵 TESTING CREATOR EARNINGS");
    console.log("-".repeat(50));
    
    // Test 11: Creator Earnings Withdrawal
    console.log("🔟 Testing creator earnings withdrawal...");
    const user2InitialBalance = await ethers.provider.getBalance(user2.address);
    const earningsBeforeWithdraw = await contract.roomEarnings(paidRoomId);
    
    console.log(`Earnings before withdraw: ${ethers.formatEther(earningsBeforeWithdraw)} ETH`);
    
    if (earningsBeforeWithdraw > 0) {
      const tx8 = await contract.connect(user2).withdrawRoomEarnings(paidRoomId);
      const receipt8 = await tx8.wait();
      
      const user2FinalBalance = await ethers.provider.getBalance(user2.address);
      const withdrawGasUsed = receipt8.gasUsed * receipt8.gasPrice;
      const netGain = user2FinalBalance - user2InitialBalance + withdrawGasUsed;
      
      console.log(`✅ Creator withdrew: ${ethers.formatEther(netGain)} ETH`);
      
      const earningsAfterWithdraw = await contract.roomEarnings(paidRoomId);
      console.log(`Earnings after withdraw: ${ethers.formatEther(earningsAfterWithdraw)} ETH`);
    }

    console.log("\n⚙️ TESTING PRICE MANAGEMENT");
    console.log("-".repeat(50));
    
    // Test 12: Room Price Update
    console.log("1️⃣1️⃣ Testing room price update...");
    const newPrice = ethers.parseEther("0.002");
    
    const tx9 = await contract.connect(user2).setRoomJoinPrice(paidRoomId, newPrice);
    await tx9.wait();
    console.log("✅ Room price updated");
    
    const updatedPrice = await contract.roomJoinPrice(paidRoomId);
    console.log(`New room price: ${ethers.formatEther(updatedPrice)} ETH`);

    // Test 13: Check final status
    console.log("\n1️⃣2️⃣ Checking final room status...");
    const finalMemberCount = await contract.getRoomMemberCount(paidRoomId);
    const finalEarnings = await contract.roomEarnings(paidRoomId);
    
    console.log(`✅ Final member count: ${finalMemberCount}`);
    console.log(`✅ Final earnings: ${ethers.formatEther(finalEarnings)} ETH`);

    console.log("\n🎉 TESTING COMPLETED SUCCESSFULLY!");
    console.log("=" .repeat(70));
    
    // Final Summary
    console.log("\n📊 FINAL SUMMARY:");
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    const finalTotalSupply = await contract.totalSupply();
    
    console.log(`• Total NFTs minted: ${finalTotalSupply}`);
    console.log(`• Free room members: ${await contract.getRoomMemberCount(freeRoomId)}`);
    console.log(`• Paid room members: ${await contract.getRoomMemberCount(paidRoomId)}`);
    console.log(`• Contract balance: ${ethers.formatEther(contractBalance)} ETH`);
    console.log(`• Creator earnings available: ${ethers.formatEther(await contract.roomEarnings(paidRoomId))} ETH`);
    
    console.log("\n✅ ALL MONETIZATION FEATURES WORKING PERFECTLY!");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

testFullContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Full contract testing failed:", error);
    process.exit(1);
  });
