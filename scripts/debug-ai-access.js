const { ethers } = require("hardhat");

async function debugAIAccess() {
  console.log("🔍 DEBUGGING AI ACCESS");
  
  const [owner] = await ethers.getSigners();
  console.log("👤 Testing with:", owner.address);

  const contractAddress = "0x1f6F0c63b25Eb3d29BDDc221C3048E0D6C889cb2";
  const MetaWorkspaceNFT = await ethers.getContractFactory("MetaWorkspaceNFT");
  const contract = MetaWorkspaceNFT.attach(contractAddress);

  // 1. Check current AI access
  console.log("\n1️⃣ Current state:");
  const hasDirectAccess = await contract.hasAIAccess(owner.address);
  const nftBalance = await contract.balanceOf(owner.address);
  const checkResult = await contract.checkAIAccess(owner.address);
  
  console.log(`Direct AI access mapping: ${hasDirectAccess}`);
  console.log(`NFT balance: ${nftBalance}`);
  console.log(`checkAIAccess result: ${checkResult}`);

  // 2. Purchase AI access again to see if it works
  const aiPrice = await contract.aiAccessPrice();
  console.log(`\n2️⃣ AI Access price: ${ethers.formatEther(aiPrice)} ETH`);
  
  try {
    const tx = await contract.purchaseAIAccess({ value: aiPrice });
    const receipt = await tx.wait();
    console.log("✅ AI Access purchase transaction successful");
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Check events
    const events = receipt.logs.filter(log => {
      try {
        const parsedLog = contract.interface.parseLog(log);
        return parsedLog.name === 'AIAccessGranted';
      } catch (e) {
        return false;
      }
    });
    
    if (events.length > 0) {
      const parsedEvent = contract.interface.parseLog(events[0]);
      console.log("✅ AIAccessGranted event:", {
        user: parsedEvent.args.user,
        payment: ethers.formatEther(parsedEvent.args.payment),
        timestamp: parsedEvent.args.timestamp.toString()
      });
    }
    
  } catch (error) {
    console.log("❌ Purchase failed:", error.message);
  }

  // 3. Check again after purchase
  console.log("\n3️⃣ After purchase:");
  const hasDirectAccess2 = await contract.hasAIAccess(owner.address);
  const checkResult2 = await contract.checkAIAccess(owner.address);
  
  console.log(`Direct AI access mapping: ${hasDirectAccess2}`);
  console.log(`checkAIAccess result: ${checkResult2}`);

  // 4. Let's also test by minting an NFT to see balance effect
  console.log("\n4️⃣ Testing NFT balance approach:");
  try {
    const mintTx = await contract.mintVoiceNFT(
      owner.address,
      "QmDebugVoice123",
      60,
      `debug-room-${Date.now()}`,
      [],
      "Debug voice test"
    );
    await mintTx.wait();
    console.log("✅ Voice NFT minted for testing");
    
    const newBalance = await contract.balanceOf(owner.address);
    const newCheckResult = await contract.checkAIAccess(owner.address);
    
    console.log(`New NFT balance: ${newBalance}`);
    console.log(`New checkAIAccess result: ${newCheckResult}`);
    
  } catch (error) {
    console.log("❌ NFT mint failed:", error.message);
  }
}

debugAIAccess()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Debug failed:", error);
    process.exit(1);
  });
