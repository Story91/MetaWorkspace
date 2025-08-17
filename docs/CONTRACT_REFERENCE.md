# MetaWorkspaceNFT Contract Reference

**Contract Address (Base Mainnet):** `0x3e9747E50635bC453071504cf959CFbdD3F736e4`  
**Verified on Basescan:** https://basescan.org/address/0x3e9747E50635bC453071504cf959CFbdD3F736e4#code

## 📋 Contract Overview

The MetaWorkspaceNFT contract is a comprehensive ERC721 NFT contract that handles:
- **Voice/Video/Document NFTs** - Content creation and storage
- **Room Management** - Workspace room creation and membership
- **AI Access Control** - Gated AI assistant features
- **Monetization** - Room join fees and creator earnings
- **Event Tracking** - Comprehensive blockchain events

---

## 🎯 Core NFT Functions

### 1. Voice NFT Minting
```solidity
function mintVoiceNFT(
    address to,
    string memory ipfsHash,
    uint256 duration,
    string memory roomId,
    string[] memory whitelistedUsers,
    string memory transcription
) external returns (uint256)
```
**Usage:** Mint voice recording as NFT  
**UI Integration:** VoiceVideoHub component  
**Events:** `NFTMinted`, `VoiceNFTCreated`, `RoomActivity`

### 2. Video NFT Minting
```solidity
function mintVideoNFT(
    address to,
    string memory ipfsHash,
    uint256 duration,
    string memory roomId,
    string[] memory participants,
    string memory summary,
    string[] memory whitelistedUsers
) external returns (uint256)
```
**Usage:** Mint video recording as NFT  
**UI Integration:** VoiceVideoHub component  
**Events:** `NFTMinted`, `VideoNFTCreated`, `RoomActivity`

---

## 🏛️ Room Management Functions

### 3. Create Room (UPDATED with join price)
```solidity
function createRoom(
    string memory roomId,
    string memory name,
    string[] memory farcasterWhitelist,
    bool isPublic,
    uint256 joinPrice
) external
```
**Usage:** Create workspace room with optional join fee  
**UI Integration:** RoomManager component  
**Events:** `RoomCreated`, `RoomActivity`  
**NEW:** `joinPrice` parameter in ETH wei

### 4. Join Room (MONETIZED)
```solidity
function joinRoom(string memory roomId) external payable
```
**Usage:** Join room with payment if required  
**UI Integration:** RoomManager join button  
**Events:** `RoomJoined`, `RoomActivity`  
**Revenue Split:** 80% to creator, 20% to platform

### 5. Add to Whitelist
```solidity
function addToWhitelist(string memory roomId, string memory username) external
```
**Usage:** Add Farcaster user to room whitelist  
**UI Integration:** Room management modals  
**Events:** `AccessGranted`, `RoomActivity`

### 6. Check Whitelist
```solidity
function isUserWhitelisted(string memory roomId, string memory username) external view returns (bool)
```
**Usage:** Check if user has access to room  
**UI Integration:** Access control components

---

## 💰 Monetization Functions

### 7. Purchase AI Access
```solidity
function purchaseAIAccess() external payable
```
**Price:** 0.0001 ETH  
**Usage:** Unlock AI Assistant features  
**UI Integration:** AI Access Gate in AITaskAssistant  
**Events:** `AIAccessGranted`

### 8. Check AI Access
```solidity
function checkAIAccess(address user) external view returns (bool)
```
**Logic:** Returns true if user paid OR owns any NFT  
**UI Integration:** AI Assistant component guard

### 9. Set Room Join Price
```solidity
function setRoomJoinPrice(string memory roomId, uint256 newPrice) external
```
**Permission:** Only room creator  
**UI Integration:** Creator dashboard price management  
**Events:** `RoomJoinPriceUpdated`

### 10. Withdraw Room Earnings
```solidity
function withdrawRoomEarnings(string memory roomId) external
```
**Permission:** Only room creator  
**UI Integration:** Creator earnings dashboard  
**Events:** `CreatorEarningsWithdrawn`

---

## 📊 View Functions (Read-only)

### 11. Get NFT Content
```solidity
function getContent(uint256 tokenId) external view returns (NFTContent memory)
```
**Returns:** Complete NFT metadata including IPFS hash, duration, participants

### 12. Room Data Functions
```solidity
function getRoomContent(string memory roomId) external view returns (uint256[] memory)
function getRoomMembers(string memory roomId) external view returns (address[] memory)
function getRoomMemberCount(string memory roomId) external view returns (uint256)
function isRoomMember(string memory roomId, address user) external view returns (bool)
function roomExists(string memory roomId) external view returns (bool)
```

### 13. Access Control
```solidity
function hasAccess(uint256 tokenId, string memory username) external view returns (bool)
```
**Logic:** Check if user can access private NFT content

### 14. Public Variables (automatically readable)
```solidity
mapping(address => bool) public hasAIAccess;
uint256 public aiAccessPrice;
mapping(string => uint256) public roomJoinPrice;
mapping(string => address) public roomCreator;
mapping(string => uint256) public roomEarnings;
mapping(string => address[]) public roomMembers;
```

---

## 🔧 Admin Functions (Owner Only)

### 15. Grant/Revoke AI Access
```solidity
function grantAIAccess(address user) external onlyOwner
function revokeAIAccess(address user) external onlyOwner
```

### 16. Update Settings
```solidity
function setAIAccessPrice(uint256 newPrice) external onlyOwner
function updateRoom(string memory roomId, string memory newName, bool isPublic) external onlyOwner
function updateNFTMetadata(uint256 tokenId, string memory newMetadata) external onlyOwner
```

### 17. Withdraw Platform Fees
```solidity
function withdraw() external onlyOwner
```
**Logic:** Withdraws platform's 20% share, excluding creator earnings

---

## 📡 Complete Events List

### NFT Events
```solidity
event NFTMinted(uint256 indexed tokenId, address indexed creator, string indexed roomId, uint8 contentType, string ipfsHash);
event VoiceNFTCreated(uint256 indexed tokenId, string indexed roomId, string ipfsHash, uint256 duration);
event VideoNFTCreated(uint256 indexed tokenId, string indexed roomId, string ipfsHash, uint256 duration);
```

### Room Events
```solidity
event RoomCreated(string indexed roomId, string name, bool isPublic, address indexed creator);
event RoomUpdated(string indexed roomId, string newName, bool isPublic, address indexed updatedBy);
event RoomActivity(string indexed roomId, string activityType, address user, uint256 timestamp);
event AccessGranted(address indexed user, string indexed roomId, string username);
```

### Monetization Events
```solidity
event RoomJoined(address indexed user, string indexed roomId, uint256 fee, uint256 timestamp);
event RoomJoinPriceUpdated(string indexed roomId, uint256 oldPrice, uint256 newPrice, address indexed updatedBy);
event CreatorEarningsWithdrawn(address indexed creator, string indexed roomId, uint256 amount, uint256 timestamp);
```

### AI Access Events
```solidity
event AIAccessGranted(address indexed user, uint256 payment, uint256 timestamp);
event AIAccessRevoked(address indexed user, address indexed revokedBy, uint256 timestamp);
event AIAccessPriceUpdated(uint256 oldPrice, uint256 newPrice, uint256 timestamp);
```

### Admin Events
```solidity
event WithdrawalMade(address indexed to, uint256 amount, uint256 timestamp);
```

---

## 🎨 UI Integration Guide

### Component Mapping
| Contract Function | UI Component | Purpose |
|------------------|--------------|---------|
| `mintVoiceNFT` | VoiceVideoHub | Record & mint voice |
| `mintVideoNFT` | VoiceVideoHub | Record & mint video |
| `createRoom` | RoomManager | Create workspace room |
| `joinRoom` | RoomManager | Join room with payment |
| `purchaseAIAccess` | AITaskAssistant | Unlock AI features |
| `withdrawRoomEarnings` | CreatorEarningsDashboard | Creator payouts |
| `setRoomJoinPrice` | CreatorEarningsDashboard | Price management |

### Event Tracking Integration
All events should be tracked and displayed in:
- **Activity Feed** - Recent contract interactions
- **Earnings Dashboard** - Payment events
- **Room Analytics** - Room activity metrics
- **NFT Gallery** - Content creation events

### State Management
Key contract state to track in frontend:
- User AI access status (`checkAIAccess`)
- Room membership status (`isRoomMember`)
- Creator earnings (`roomEarnings`)
- Room join prices (`roomJoinPrice`)
- NFT content metadata (`getContent`)

---

## 💡 Business Logic Summary

### Revenue Model
- **AI Access:** 0.0001 ETH one-time payment
- **Room Joins:** Variable price set by creator
- **Revenue Split:** 80% creator, 20% platform
- **Free Access:** NFT holders get free AI access

### Access Control
- **Public Rooms:** Anyone can join
- **Private Rooms:** Farcaster whitelist required
- **NFT Content:** Whitelist or public based on settings
- **AI Features:** Payment required or NFT ownership

### Gas Optimization
- Removed duplicate functions
- Optimized storage patterns
- Efficient event logging
- Minimal external calls

---

## 🚀 Integration Checklist

### ✅ Completed
- [x] Contract deployed on Base Mainnet
- [x] Contract verified on Basescan
- [x] ABI updated with mainnet address
- [x] Room creation UI with join price
- [x] Join room UI with payment
- [x] Creator earnings dashboard
- [x] AI access gate
- [x] Basic monetization features

### 🔄 Next Steps
- [ ] Event tracking and display
- [ ] Activity feed component
- [ ] Room analytics dashboard
- [ ] NFT gallery improvements
- [ ] Mobile responsiveness
- [ ] Error handling improvements
- [ ] Loading state optimizations

This reference document should be updated as new features are added to the contract.
