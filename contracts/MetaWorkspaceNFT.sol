// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MetaWorkspaceNFT
 * @dev Single unified NFT contract for MetaWorkspace - handles voice, video, documents + AI Access
 * @notice Optimized for UI compatibility and gas efficiency with full admin controls
 */
contract MetaWorkspaceNFT is ERC721, ERC721Enumerable, Ownable {
    uint256 private _tokenIdCounter;

    enum ContentType { VOICE, VIDEO, DOCUMENT }

    struct NFTContent {
        string ipfsHash;
        ContentType contentType;
        string roomId;
        address creator;
        uint256 duration;
        string[] participants;
        string metadata; // JSON string for transcription/summary
        uint256 timestamp;
        bool isPrivate;
        string[] whitelistedUsers;
    }

    struct RoomStats {
        uint256 totalContent;
        uint256 voiceCount;
        uint256 videoCount;
        uint256 documentCount;
    }

    // Storage mappings
    mapping(uint256 => NFTContent) private _content;
    mapping(string => uint256[]) private _roomToTokenIds;
    mapping(address => uint256[]) private _creatorToTokenIds;
    
    // AI Access Control
    mapping(address => bool) public hasAIAccess;
    uint256 public aiAccessPrice = 0.0001 ether;
    
    // Room Management
    mapping(string => bool) private _roomExists;
    mapping(string => string) private _roomNames;
    mapping(string => string[]) private _roomWhitelist;
    mapping(string => bool) private _roomIsPublic;
    
    // Room Monetization
    mapping(string => uint256) public roomJoinPrice;
    mapping(string => address) public roomCreator;
    mapping(string => uint256) public roomEarnings;
    mapping(string => address[]) public roomMembers;
    


    // Events - wszystkie z indexed dla łatwego query przez Basescan API
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string indexed roomId,
        uint8 contentType,
        string ipfsHash
    );

    event VoiceNFTCreated(
        uint256 indexed tokenId,
        string indexed roomId,
        string ipfsHash,
        uint256 duration
    );

    event VideoNFTCreated(
        uint256 indexed tokenId,
        string indexed roomId,
        string ipfsHash,
        uint256 duration
    );

    event AccessGranted(
        address indexed user,
        string indexed roomId,
        string username
    );

    event RoomActivity(
        string indexed roomId,
        string activityType,
        address user,
        uint256 timestamp
    );

    event AIAccessGranted(
        address indexed user,
        uint256 payment,
        uint256 timestamp
    );

    event AIAccessRevoked(
        address indexed user,
        address indexed revokedBy,
        uint256 timestamp
    );

    event AIAccessPriceUpdated(
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );

    event RoomCreated(
        string indexed roomId,
        string name,
        bool isPublic,
        address indexed creator
    );

    event RoomUpdated(
        string indexed roomId,
        string newName,
        bool isPublic,
        address indexed updatedBy
    );

    event WithdrawalMade(
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    event RoomJoined(
        address indexed user,
        string indexed roomId,
        uint256 fee,
        uint256 timestamp
    );

    event CreatorEarningsWithdrawn(
        address indexed creator,
        string indexed roomId,
        uint256 amount,
        uint256 timestamp
    );

    event RoomJoinPriceUpdated(
        string indexed roomId,
        uint256 oldPrice,
        uint256 newPrice,
        address indexed updatedBy
    );



    constructor() ERC721("MetaWorkspace NFT", "MWNFT") Ownable(msg.sender) {}

    /**
     * @dev Mint Voice NFT - Main function UI calls
     */
    function mintVoiceNFT(
        address to,
        string memory ipfsHash,
        uint256 duration,
        string memory roomId,
        string[] memory whitelistedUsers,
        string memory transcription
    ) external returns (uint256) {
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        require(bytes(roomId).length > 0, "Room ID required");

        uint256 tokenId = _tokenIdCounter++;
        
        string[] memory emptyParticipants;
        
        _content[tokenId] = NFTContent({
            ipfsHash: ipfsHash,
            contentType: ContentType.VOICE,
            roomId: roomId,
            creator: to,
            duration: duration,
            participants: emptyParticipants,
            metadata: transcription,
            timestamp: block.timestamp,
            isPrivate: whitelistedUsers.length > 0,
            whitelistedUsers: whitelistedUsers
        });

        _roomToTokenIds[roomId].push(tokenId);
        _creatorToTokenIds[to].push(tokenId);

        _safeMint(to, tokenId);
        
        // Emit multiple events for better tracking
        emit NFTMinted(tokenId, to, roomId, uint8(ContentType.VOICE), ipfsHash);
        emit VoiceNFTCreated(tokenId, roomId, ipfsHash, duration);
        emit RoomActivity(roomId, "VOICE_RECORDED", to, block.timestamp);
        
        return tokenId;
    }

    /**
     * @dev Mint Video NFT - Main function UI calls
     */
    function mintVideoNFT(
        address to,
        string memory ipfsHash,
        uint256 duration,
        string memory roomId,
        string[] memory participants,
        string memory summary,
        string[] memory whitelistedUsers
    ) external returns (uint256) {
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        require(bytes(roomId).length > 0, "Room ID required");

        uint256 tokenId = _tokenIdCounter++;
        
        _content[tokenId] = NFTContent({
            ipfsHash: ipfsHash,
            contentType: ContentType.VIDEO,
            roomId: roomId,
            creator: to,
            duration: duration,
            participants: participants,
            metadata: summary,
            timestamp: block.timestamp,
            isPrivate: whitelistedUsers.length > 0,
            whitelistedUsers: whitelistedUsers
        });

        _roomToTokenIds[roomId].push(tokenId);
        _creatorToTokenIds[to].push(tokenId);

        _safeMint(to, tokenId);
        
        // Emit multiple events for better tracking
        emit NFTMinted(tokenId, to, roomId, uint8(ContentType.VIDEO), ipfsHash);
        emit VideoNFTCreated(tokenId, roomId, ipfsHash, duration);
        emit RoomActivity(roomId, "VIDEO_RECORDED", to, block.timestamp);
        
        return tokenId;
    }



    // ============ ROOM MANAGEMENT ============

    /**
     * @dev Create room with optional join fee
     */
    function createRoom(
        string memory roomId,
        string memory name,
        string[] memory farcasterWhitelist,
        bool isPublic,
        uint256 joinPrice
    ) external {
        require(!_roomExists[roomId], "Room already exists");
        require(bytes(roomId).length > 0, "Room ID required");
        require(bytes(name).length > 0, "Room name required");

        _roomExists[roomId] = true;
        _roomNames[roomId] = name;
        _roomWhitelist[roomId] = farcasterWhitelist;
        _roomIsPublic[roomId] = isPublic;
        roomJoinPrice[roomId] = joinPrice;
        roomCreator[roomId] = msg.sender;

        // Creator automatically becomes member
        roomMembers[roomId].push(msg.sender);

        emit RoomCreated(roomId, name, isPublic, msg.sender);
        emit RoomActivity(roomId, "ROOM_CREATED", msg.sender, block.timestamp);
    }

    /**
     * @dev Add user to room whitelist
     */
    function addToWhitelist(string memory roomId, string memory username) external {
        require(_roomExists[roomId], "Room doesn't exist");
        
        _roomWhitelist[roomId].push(username);
        
        emit AccessGranted(msg.sender, roomId, username);
        emit RoomActivity(roomId, "USER_WHITELISTED", msg.sender, block.timestamp);
    }

    /**
     * @dev Check if user is whitelisted for room
     */
    function isUserWhitelisted(string memory roomId, string memory username) external view returns (bool) {
        if (_roomIsPublic[roomId]) return true;
        
        string[] memory whitelist = _roomWhitelist[roomId];
        for (uint i = 0; i < whitelist.length; i++) {
            if (keccak256(bytes(whitelist[i])) == keccak256(bytes(username))) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Join room with payment (if required)
     */
    function joinRoom(string memory roomId) external payable {
        require(_roomExists[roomId], "Room doesn't exist");
        require(!_isMember(roomId, msg.sender), "Already a member");
        
        uint256 price = roomJoinPrice[roomId];
        if (price > 0) {
            require(msg.value >= price, "Insufficient payment to join room");
            
            // 80% to room creator, 20% to contract owner
            uint256 creatorShare = (msg.value * 80) / 100;
            uint256 ownerShare = msg.value - creatorShare;
            
            roomEarnings[roomId] += creatorShare;
            // ownerShare stays in contract for withdraw by owner
            
            emit RoomJoined(msg.sender, roomId, msg.value, block.timestamp);
        }
        
        roomMembers[roomId].push(msg.sender);
        emit RoomActivity(roomId, "USER_JOINED", msg.sender, block.timestamp);
    }

    /**
     * @dev Check if user is room member
     */
    function _isMember(string memory roomId, address user) internal view returns (bool) {
        address[] memory members = roomMembers[roomId];
        for (uint i = 0; i < members.length; i++) {
            if (members[i] == user) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Update room join price (only room creator)
     */
    function setRoomJoinPrice(string memory roomId, uint256 newPrice) external {
        require(_roomExists[roomId], "Room doesn't exist");
        require(roomCreator[roomId] == msg.sender, "Only room creator can set price");
        
        uint256 oldPrice = roomJoinPrice[roomId];
        roomJoinPrice[roomId] = newPrice;
        
        emit RoomJoinPriceUpdated(roomId, oldPrice, newPrice, msg.sender);
    }

    // ============ AI ACCESS CONTROL ============

    /**
     * @dev Purchase AI Access with payment
     */
    function purchaseAIAccess() external payable {
        require(msg.value >= aiAccessPrice, "Insufficient payment for AI access");
        hasAIAccess[msg.sender] = true;
        
        emit AIAccessGranted(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Check if user has AI access (payment only)
     */
    function checkAIAccess(address user) external view returns (bool) {
        return hasAIAccess[user];
    }



    // ============ ADMIN FUNCTIONS (ONLY OWNER) ============

    /**
     * @dev Grant AI access for free (only owner)
     */
    function grantAIAccess(address user) external onlyOwner {
        hasAIAccess[user] = true;
        emit AIAccessGranted(user, 0, block.timestamp);
    }

    /**
     * @dev Revoke AI access (only owner)
     */
    function revokeAIAccess(address user) external onlyOwner {
        hasAIAccess[user] = false;
        emit AIAccessRevoked(user, msg.sender, block.timestamp);
    }

    /**
     * @dev Update AI access price (only owner)
     */
    function setAIAccessPrice(uint256 newPrice) external onlyOwner {
        uint256 oldPrice = aiAccessPrice;
        aiAccessPrice = newPrice;
        emit AIAccessPriceUpdated(oldPrice, newPrice, block.timestamp);
    }

    /**
     * @dev Update room settings (only owner)
     */
    function updateRoom(
        string memory roomId,
        string memory newName,
        bool isPublic
    ) external onlyOwner {
        require(_roomExists[roomId], "Room doesn't exist");
        
        _roomNames[roomId] = newName;
        _roomIsPublic[roomId] = isPublic;
        
        emit RoomUpdated(roomId, newName, isPublic, msg.sender);
    }

    /**
     * @dev Emergency: Update NFT metadata (only owner)
     */
    function updateNFTMetadata(uint256 tokenId, string memory newMetadata) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token doesn't exist");
        _content[tokenId].metadata = newMetadata;
    }

    /**
     * @dev Withdraw room earnings (only room creator)
     */
    function withdrawRoomEarnings(string memory roomId) external {
        require(_roomExists[roomId], "Room doesn't exist");
        require(roomCreator[roomId] == msg.sender, "Only room creator can withdraw");
        
        uint256 amount = roomEarnings[roomId];
        require(amount > 0, "No earnings to withdraw");
        
        roomEarnings[roomId] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit CreatorEarningsWithdrawn(msg.sender, roomId, amount, block.timestamp);
    }

    /**
     * @dev Withdraw contract funds (only owner)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        
        // Subtract all room earnings (which belong to creators)
        uint256 reservedForCreators = 0;
        // Note: In production, you might want to track this more efficiently
        
        uint256 ownerBalance = balance - reservedForCreators;
        require(ownerBalance > 0, "No owner funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: ownerBalance}("");
        require(success, "Withdrawal failed");
        
        emit WithdrawalMade(owner(), ownerBalance, block.timestamp);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get complete NFT content
     */
    function getContent(uint256 tokenId) external view returns (NFTContent memory) {
        require(_ownerOf(tokenId) != address(0), "Token doesn't exist");
        return _content[tokenId];
    }





    function hasAccess(uint256 tokenId, string memory username) external view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Token doesn't exist");
        
        NFTContent memory nft = _content[tokenId];
        
        if (!nft.isPrivate) return true;
        
        for (uint i = 0; i < nft.whitelistedUsers.length; i++) {
            if (keccak256(bytes(nft.whitelistedUsers[i])) == keccak256(bytes(username))) {
                return true;
            }
        }
        
        return false;
    }

    function getRoomContent(string memory roomId) external view returns (uint256[] memory) {
        return _roomToTokenIds[roomId];
    }

    function roomExists(string memory roomId) external view returns (bool) {
        return _roomExists[roomId];
    }

    function getRoomMembers(string memory roomId) external view returns (address[] memory) {
        return roomMembers[roomId];
    }

    function getRoomMemberCount(string memory roomId) external view returns (uint256) {
        return roomMembers[roomId].length;
    }

    function isRoomMember(string memory roomId, address user) external view returns (bool) {
        return _isMember(roomId, user);
    }



    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token doesn't exist");
        
        NFTContent memory nft = _content[tokenId];
        
        return string(abi.encodePacked(
            "https://gateway.pinata.cloud/ipfs/",
            nft.ipfsHash
        ));
    }

    // Required overrides for OpenZeppelin 5.x
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}