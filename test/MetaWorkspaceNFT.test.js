const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("MetaWorkspaceNFT", function () {
  let metaWorkspaceNFT;
  let owner;
  let user1;
  let user2;
  
  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const MetaWorkspaceNFT = await ethers.getContractFactory("MetaWorkspaceNFT");
    metaWorkspaceNFT = await MetaWorkspaceNFT.deploy();
    await metaWorkspaceNFT.waitForDeployment();
  });

  describe("🎯 CONTRACT DEPLOYMENT", function () {
    it("Should deploy with correct name and symbol", async function () {
      expect(await metaWorkspaceNFT.name()).to.equal("MetaWorkspace NFT");
      expect(await metaWorkspaceNFT.symbol()).to.equal("MWNFT");
    });

    it("Should set correct owner", async function () {
      expect(await metaWorkspaceNFT.owner()).to.equal(owner.address);
    });

    it("Should have correct AI access price", async function () {
      const price = await metaWorkspaceNFT.aiAccessPrice();
      expect(price).to.equal(ethers.parseEther("0.0001"));
    });
  });

  describe("🎤 VOICE NFT MINTING", function () {
    it("Should mint voice NFT successfully", async function () {
      const tx = await metaWorkspaceNFT.mintVoiceNFT(
        user1.address,
        "QmVoiceHash123",
        300, // 5 minutes
        "team-room-1",
        ["alice.eth", "bob.eth"],
        "Meeting transcription here"
      );
      
      await expect(tx)
        .to.emit(metaWorkspaceNFT, "VoiceNFTCreated")
        .withArgs(0, "team-room-1", "QmVoiceHash123", 300);
      
      expect(await metaWorkspaceNFT.balanceOf(user1.address)).to.equal(1);
    });

    it("Should store voice NFT data correctly", async function () {
      await metaWorkspaceNFT.mintVoiceNFT(
        user1.address,
        "QmVoiceHash123",
        300,
        "team-room-1",
        ["alice.eth"],
        "Test transcription"
      );
      
      const content = await metaWorkspaceNFT.getContent(0);
      expect(content.ipfsHash).to.equal("QmVoiceHash123");
      expect(content.duration).to.equal(300);
      expect(content.roomId).to.equal("team-room-1");
      expect(content.contentType).to.equal(0); // VOICE = 0
    });
  });

  describe("🎥 VIDEO NFT MINTING", function () {
    it("Should mint video NFT successfully", async function () {
      const tx = await metaWorkspaceNFT.mintVideoNFT(
        user1.address,
        "QmVideoHash456",
        1800, // 30 minutes
        "team-room-1",
        ["alice.eth", "bob.eth", "carol.eth"],
        "Meeting summary here",
        []
      );
      
      await expect(tx)
        .to.emit(metaWorkspaceNFT, "VideoNFTCreated")
        .withArgs(0, "team-room-1", "QmVideoHash456", 1800);
    });

    it("Should handle video NFT with whitelist", async function () {
      await metaWorkspaceNFT.mintVideoNFT(
        user1.address,
        "QmVideoHash456",
        1800,
        "private-room",
        ["alice.eth"],
        "Private meeting",
        ["bob.eth", "carol.eth"] // whitelist
      );
      
      const content = await metaWorkspaceNFT.getContent(0);
      expect(content.isPrivate).to.equal(true);
    });
  });

  describe("🏠 ROOM MANAGEMENT", function () {
    it("Should create room successfully", async function () {
      const tx = await metaWorkspaceNFT.createRoom(
        "dev-team-room",
        "Development Team Room",
        [user1.address, user2.address],
        false,
        0 // Free room
      );
      
      await expect(tx)
        .to.emit(metaWorkspaceNFT, "RoomCreated")
        .withArgs("dev-team-room", "Development Team Room", false, owner.address);
      
      expect(await metaWorkspaceNFT.roomExists("dev-team-room")).to.equal(true);
    });

    it("Should handle room whitelist correctly", async function () {
      await metaWorkspaceNFT.createRoom(
        "private-room",
        "Private Room",
        [user1.address],
        false,
        0 // Free room
      );
      
      expect(await metaWorkspaceNFT.isUserWhitelisted("private-room", user1.address)).to.equal(true);
      expect(await metaWorkspaceNFT.isUserWhitelisted("private-room", user2.address)).to.equal(false);
    });

    it("Should add users to whitelist", async function () {
      await metaWorkspaceNFT.createRoom(
        "team-room",
        "Team Room",
        [],
        false,
        0 // Free room
      );
      
      await metaWorkspaceNFT.addToWhitelist("team-room", user2.address);
      expect(await metaWorkspaceNFT.isUserWhitelisted("team-room", user2.address)).to.equal(true);
    });
  });

  describe("🤖 AI ACCESS SYSTEM", function () {
    it("Should purchase AI access", async function () {
      const price = await metaWorkspaceNFT.aiAccessPrice();
      const tx = await metaWorkspaceNFT.connect(user1).purchaseAIAccess({ value: price });
      
      await expect(tx)
        .to.emit(metaWorkspaceNFT, "AIAccessGranted")
        .withArgs(user1.address, price, anyValue);
      
      expect(await metaWorkspaceNFT.checkAIAccess(user1.address)).to.equal(true);
    });

    it("Should reject insufficient payment", async function () {
      const insufficientPrice = ethers.parseEther("0.00001"); // Too low
      
      await expect(
        metaWorkspaceNFT.connect(user1).purchaseAIAccess({ value: insufficientPrice })
      ).to.be.revertedWith("Insufficient payment for AI access");
    });

    it("Should allow owner to grant free AI access", async function () {
      await metaWorkspaceNFT.grantAIAccess(user1.address);
      expect(await metaWorkspaceNFT.checkAIAccess(user1.address)).to.equal(true);
    });

    it("Should allow owner to update AI access price", async function () {
      const newPrice = ethers.parseEther("0.0005");
      await metaWorkspaceNFT.setAIAccessPrice(newPrice);
      expect(await metaWorkspaceNFT.aiAccessPrice()).to.equal(newPrice);
    });
  });

  describe("📖 DATA READING", function () {
    beforeEach(async function () {
      // Mint test NFTs
      await metaWorkspaceNFT.mintVoiceNFT(
        user1.address,
        "QmVoice1",
        300,
        "room-1",
        [], // No whitelist = public NFT
        "Voice 1"
      );
      
      await metaWorkspaceNFT.mintVideoNFT(
        user1.address,
        "QmVideo1",
        1800,
        "room-1",
        ["alice.eth", "bob.eth"],
        "Video 1",
        []
      );
    });

    it("Should get room content correctly", async function () {
      const roomContent = await metaWorkspaceNFT.getRoomContent("room-1");
      expect(roomContent.length).to.equal(2);
      expect(roomContent[0]).to.equal(0); // First NFT
      expect(roomContent[1]).to.equal(1); // Second NFT
    });

    it("Should check access correctly", async function () {
      // Check if NFT 0 is public (no whitelist = public)
      const nft0 = await metaWorkspaceNFT.getContent(0);
      console.log("NFT 0 isPrivate:", nft0.isPrivate);
      
      // Public NFT - everyone has access  
      expect(await metaWorkspaceNFT.hasAccess(0, "user2.eth")).to.equal(true);
      
      // Create private NFT with username whitelist
      await metaWorkspaceNFT.mintVoiceNFT(
        user1.address,
        "QmPrivateVoice", 
        300,
        "private-room",
        ["alice.eth", "user1.eth"], // whitelisted usernames (not addresses!)
        "Private voice"
      );
      
      expect(await metaWorkspaceNFT.hasAccess(2, "alice.eth")).to.equal(true);
      expect(await metaWorkspaceNFT.hasAccess(2, "user1.eth")).to.equal(true); 
      expect(await metaWorkspaceNFT.hasAccess(2, "user2.eth")).to.equal(false);
    });
  });

  describe("💰 ADMIN FUNCTIONS", function () {
    it("Should allow owner to withdraw funds", async function () {
      // User purchases AI access
      const price = await metaWorkspaceNFT.aiAccessPrice();
      await metaWorkspaceNFT.connect(user1).purchaseAIAccess({ value: price });
      
      const initialBalance = await ethers.provider.getBalance(owner.address);
      
      const tx = await metaWorkspaceNFT.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.above(initialBalance + price - gasUsed * 2n); // Account for gas
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(
        metaWorkspaceNFT.connect(user1).withdraw()
      ).to.be.revertedWithCustomError(metaWorkspaceNFT, "OwnableUnauthorizedAccount");
    });
  });

  describe("💰 ROOM MONETIZATION", function () {
    it("Should create room with join fee", async function () {
      const joinFee = ethers.parseEther("0.01"); // 0.01 ETH
      
      const tx = await metaWorkspaceNFT.createRoom(
        "paid-room",
        "Paid Room",
        [user1.address],
        false,
        joinFee
      );
      
      await expect(tx)
        .to.emit(metaWorkspaceNFT, "RoomCreated")
        .withArgs("paid-room", "Paid Room", false, owner.address);
      
      expect(await metaWorkspaceNFT.roomJoinPrice("paid-room")).to.equal(joinFee);
      expect(await metaWorkspaceNFT.roomCreator("paid-room")).to.equal(owner.address);
      expect(await metaWorkspaceNFT.getRoomMemberCount("paid-room")).to.equal(1); // Creator auto-joined
    });

    it("Should allow users to join paid room", async function () {
      const joinFee = ethers.parseEther("0.01");
      
      await metaWorkspaceNFT.createRoom(
        "test-paid-room",
        "Test Paid Room",
        [],
        true,
        joinFee
      );
      
      const initialCreatorBalance = await ethers.provider.getBalance(owner.address);
      const initialEarnings = await metaWorkspaceNFT.roomEarnings("test-paid-room");
      
      const tx = await metaWorkspaceNFT.connect(user1).joinRoom("test-paid-room", { value: joinFee });
      
      await expect(tx)
        .to.emit(metaWorkspaceNFT, "RoomJoined")
        .withArgs(user1.address, "test-paid-room", joinFee, anyValue);
      
      // Check earnings (80% of join fee)
      const expectedEarnings = (joinFee * 80n) / 100n;
      expect(await metaWorkspaceNFT.roomEarnings("test-paid-room")).to.equal(expectedEarnings);
      
      // Check user is now member
      expect(await metaWorkspaceNFT.isRoomMember("test-paid-room", user1.address)).to.equal(true);
      expect(await metaWorkspaceNFT.getRoomMemberCount("test-paid-room")).to.equal(2);
    });

    it("Should reject insufficient payment for room join", async function () {
      const joinFee = ethers.parseEther("0.01");
      const insufficientFee = ethers.parseEther("0.005");
      
      await metaWorkspaceNFT.createRoom(
        "expensive-room",
        "Expensive Room",
        [],
        true,
        joinFee
      );
      
      await expect(
        metaWorkspaceNFT.connect(user1).joinRoom("expensive-room", { value: insufficientFee })
      ).to.be.revertedWith("Insufficient payment to join room");
    });

    it("Should prevent duplicate room joining", async function () {
      const joinFee = ethers.parseEther("0.01");
      
      await metaWorkspaceNFT.createRoom(
        "no-duplicate-room",
        "No Duplicate Room",
        [],
        true,
        joinFee
      );
      
      await metaWorkspaceNFT.connect(user1).joinRoom("no-duplicate-room", { value: joinFee });
      
      await expect(
        metaWorkspaceNFT.connect(user1).joinRoom("no-duplicate-room", { value: joinFee })
      ).to.be.revertedWith("Already a member");
    });

    it("Should allow free room joining", async function () {
      await metaWorkspaceNFT.createRoom(
        "free-room",
        "Free Room",
        [],
        true,
        0 // No join fee
      );
      
      const tx = await metaWorkspaceNFT.connect(user1).joinRoom("free-room");
      
      await expect(tx)
        .to.emit(metaWorkspaceNFT, "RoomActivity")
        .withArgs("free-room", "USER_JOINED", user1.address, anyValue);
      
      expect(await metaWorkspaceNFT.isRoomMember("free-room", user1.address)).to.equal(true);
    });
  });

  describe("💵 CREATOR EARNINGS", function () {
    beforeEach(async function () {
      // Create paid room
      const joinFee = ethers.parseEther("0.01");
      await metaWorkspaceNFT.createRoom(
        "earnings-room",
        "Earnings Room",
        [],
        true,
        joinFee
      );
      
      // Two users join
      await metaWorkspaceNFT.connect(user1).joinRoom("earnings-room", { value: joinFee });
      await metaWorkspaceNFT.connect(user2).joinRoom("earnings-room", { value: joinFee });
    });

    it("Should allow creator to withdraw earnings", async function () {
      const initialBalance = await ethers.provider.getBalance(owner.address);
      const earnings = await metaWorkspaceNFT.roomEarnings("earnings-room");
      
      expect(earnings).to.be.above(0);
      
      const tx = await metaWorkspaceNFT.withdrawRoomEarnings("earnings-room");
      
      await expect(tx)
        .to.emit(metaWorkspaceNFT, "CreatorEarningsWithdrawn")
        .withArgs(owner.address, "earnings-room", earnings, anyValue);
      
      // Earnings should be reset to 0
      expect(await metaWorkspaceNFT.roomEarnings("earnings-room")).to.equal(0);
      
      // Balance should increase (minus gas)
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.above(initialBalance);
    });

    it("Should not allow non-creator to withdraw earnings", async function () {
      await expect(
        metaWorkspaceNFT.connect(user1).withdrawRoomEarnings("earnings-room")
      ).to.be.revertedWith("Only room creator can withdraw");
    });

    it("Should prevent withdrawal when no earnings", async function () {
      // Create room with no earnings
      await metaWorkspaceNFT.connect(user1).createRoom(
        "no-earnings-room",
        "No Earnings Room",
        [],
        true,
        0
      );
      
      await expect(
        metaWorkspaceNFT.connect(user1).withdrawRoomEarnings("no-earnings-room")
      ).to.be.revertedWith("No earnings to withdraw");
    });
  });

  describe("⚙️ ROOM PRICE MANAGEMENT", function () {
    it("Should allow creator to update room join price", async function () {
      const initialPrice = ethers.parseEther("0.01");
      const newPrice = ethers.parseEther("0.02");
      
      await metaWorkspaceNFT.createRoom(
        "price-update-room",
        "Price Update Room",
        [],
        true,
        initialPrice
      );
      
      const tx = await metaWorkspaceNFT.setRoomJoinPrice("price-update-room", newPrice);
      
      await expect(tx)
        .to.emit(metaWorkspaceNFT, "RoomJoinPriceUpdated")
        .withArgs("price-update-room", initialPrice, newPrice, owner.address);
      
      expect(await metaWorkspaceNFT.roomJoinPrice("price-update-room")).to.equal(newPrice);
    });

    it("Should not allow non-creator to update room price", async function () {
      await metaWorkspaceNFT.createRoom(
        "protected-price-room",
        "Protected Price Room",
        [],
        true,
        ethers.parseEther("0.01")
      );
      
      await expect(
        metaWorkspaceNFT.connect(user1).setRoomJoinPrice("protected-price-room", ethers.parseEther("0.05"))
      ).to.be.revertedWith("Only room creator can set price");
    });
  });

  describe("🔄 INTEGRATION TESTS", function () {
    it("Should handle complete workflow", async function () {
      // 1. Create room
      await metaWorkspaceNFT.createRoom(
        "integration-room",
        "Integration Test Room",
        [user1.address],
        false,
        0 // Free room
      );
      
      // 2. Purchase AI access
      const price = await metaWorkspaceNFT.aiAccessPrice();
      await metaWorkspaceNFT.connect(user1).purchaseAIAccess({ value: price });
      
      // 3. Mint voice NFT
      await metaWorkspaceNFT.mintVoiceNFT(
        user1.address,
        "QmIntegrationVoice",
        600,
        "integration-room",
        ["alice.eth"],
        "Integration test voice"
      );
      
      // 4. Mint video NFT
      await metaWorkspaceNFT.mintVideoNFT(
        user1.address,
        "QmIntegrationVideo",
        3600,
        "integration-room",
        ["alice.eth", "bob.eth"],
        "Integration test video",
        []
      );
      
      // 5. Verify everything
      expect(await metaWorkspaceNFT.checkAIAccess(user1.address)).to.equal(true);
      expect(await metaWorkspaceNFT.balanceOf(user1.address)).to.equal(2);
      
      const roomContent = await metaWorkspaceNFT.getRoomContent("integration-room");
      expect(roomContent.length).to.equal(2);
      
      console.log("✅ Complete workflow test passed!");
    });
  });
});
