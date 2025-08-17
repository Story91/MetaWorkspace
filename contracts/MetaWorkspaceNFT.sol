// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MetaWorkspaceNFT
 * @dev Single unified NFT contract for MetaWorkspace - handles voice, video, and documents
 * @notice Optimized for UI compatibility and gas efficiency
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

    // Storage mappings
    mapping(uint256 => NFTContent) private _content;
    mapping(string => uint256[]) private _roomToTokenIds;
    mapping(address => uint256[]) private _creatorToTokenIds;

    // Events - wszystkie z indexed dla łatwego query przez Basescan API
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        ContentType indexed contentType,
        string roomId,
        string ipfsHash,
        uint256 timestamp
    );

    event VoiceNFTCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string indexed roomId,
        uint256 duration,
        string ipfsHash
    );

    event VideoNFTCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string indexed roomId,
        uint256 duration,
        uint256 participantCount,
        string ipfsHash
    );

    event AccessGranted(
        uint256 indexed tokenId,
        string indexed username,
        address indexed grantedBy
    );

    event RoomActivity(
        string indexed roomId,
        address indexed user,
        string activityType,
        uint256 timestamp
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
        emit NFTMinted(tokenId, to, ContentType.VOICE, roomId, ipfsHash, block.timestamp);
        emit VoiceNFTCreated(tokenId, to, roomId, duration, ipfsHash);
        emit RoomActivity(roomId, to, "VOICE_RECORDED", block.timestamp);
        
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
        emit NFTMinted(tokenId, to, ContentType.VIDEO, roomId, ipfsHash, block.timestamp);
        emit VideoNFTCreated(tokenId, to, roomId, duration, participants.length, ipfsHash);
        emit RoomActivity(roomId, to, "VIDEO_RECORDED", block.timestamp);
        
        return tokenId;
    }

    /**
     * @dev Get Voice NFTs by room - UI needs this
     */
    function getVoiceNFTsByRoom(string memory roomId) external view returns (uint256[] memory) {
        uint256[] memory roomTokens = _roomToTokenIds[roomId];
        uint256 count = 0;
        
        // Count voice NFTs
        for (uint i = 0; i < roomTokens.length; i++) {
            if (_content[roomTokens[i]].contentType == ContentType.VOICE) {
                count++;
            }
        }
        
        // Create result array
        uint256[] memory voiceTokens = new uint256[](count);
        uint256 index = 0;
        
        for (uint i = 0; i < roomTokens.length; i++) {
            if (_content[roomTokens[i]].contentType == ContentType.VOICE) {
                voiceTokens[index++] = roomTokens[i];
            }
        }
        
        return voiceTokens;
    }

    /**
     * @dev Get Video NFTs by room - UI needs this
     */
    function getVideoNFTsByRoom(string memory roomId) external view returns (uint256[] memory) {
        uint256[] memory roomTokens = _roomToTokenIds[roomId];
        uint256 count = 0;
        
        // Count video NFTs
        for (uint i = 0; i < roomTokens.length; i++) {
            if (_content[roomTokens[i]].contentType == ContentType.VIDEO) {
                count++;
            }
        }
        
        // Create result array
        uint256[] memory videoTokens = new uint256[](count);
        uint256 index = 0;
        
        for (uint i = 0; i < roomTokens.length; i++) {
            if (_content[roomTokens[i]].contentType == ContentType.VIDEO) {
                videoTokens[index++] = roomTokens[i];
            }
        }
        
        return videoTokens;
    }

    /**
     * @dev Get Voice NFT data - UI needs this exact format
     */
    function getVoiceNFT(uint256 tokenId) external view returns (
        string memory ipfsHash,
        uint256 duration,
        string memory roomId,
        address creator,
        uint256 timestamp,
        bool isPrivate,
        string[] memory whitelistedUsers,
        string memory transcription
    ) {
        require(_ownerOf(tokenId) != address(0), "Token doesn't exist");
        NFTContent memory nft = _content[tokenId];
        require(nft.contentType == ContentType.VOICE, "Not a voice NFT");
        
        return (
            nft.ipfsHash,
            nft.duration,
            nft.roomId,
            nft.creator,
            nft.timestamp,
            nft.isPrivate,
            nft.whitelistedUsers,
            nft.metadata
        );
    }

    /**
     * @dev Get Video NFT data - UI needs this exact format
     */
    function getVideoNFT(uint256 tokenId) external view returns (
        string memory ipfsHash,
        uint256 duration,
        string memory roomId,
        address creator,
        string[] memory participants,
        string memory summary,
        uint256 timestamp,
        bool isPrivate,
        string[] memory whitelistedUsers
    ) {
        require(_ownerOf(tokenId) != address(0), "Token doesn't exist");
        NFTContent memory nft = _content[tokenId];
        require(nft.contentType == ContentType.VIDEO, "Not a video NFT");
        
        return (
            nft.ipfsHash,
            nft.duration,
            nft.roomId,
            nft.creator,
            nft.participants,
            nft.metadata,
            nft.timestamp,
            nft.isPrivate,
            nft.whitelistedUsers
        );
    }

    /**
     * @dev Check if user has access to NFT
     */
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

    /**
     * @dev Get all NFTs in a room
     */
    function getRoomContent(string memory roomId) external view returns (uint256[] memory) {
        return _roomToTokenIds[roomId];
    }

    /**
     * @dev Get all NFTs by creator
     */
    function getCreatorContent(address creator) external view returns (uint256[] memory) {
        return _creatorToTokenIds[creator];
    }

    /**
     * @dev Room management - check if room has content
     */
    function roomExists(string memory roomId) external view returns (bool) {
        return _roomToTokenIds[roomId].length > 0;
    }

    /**
     * @dev Get room statistics
     */
    function getRoomStats(string memory roomId) external view returns (
        uint256 totalContent,
        uint256 voiceCount,
        uint256 videoCount
    ) {
        uint256[] memory tokens = _roomToTokenIds[roomId];
        totalContent = tokens.length;
        
        for (uint i = 0; i < tokens.length; i++) {
            if (_content[tokens[i]].contentType == ContentType.VOICE) {
                voiceCount++;
            } else if (_content[tokens[i]].contentType == ContentType.VIDEO) {
                videoCount++;
            }
        }
    }

    /**
     * @dev Get NFT metadata - useful for Basescan/Etherscan display
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token doesn't exist");
        
        NFTContent memory nft = _content[tokenId];
        
        // Return IPFS URL for metadata
        return string(abi.encodePacked(
            "https://gateway.pinata.cloud/ipfs/",
            nft.ipfsHash
        ));
    }

    /**
     * @dev Get all token IDs owned by address - for Basescan integration
     */
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokens = new uint256[](tokenCount);
        
        for (uint256 i = 0; i < tokenCount; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokens;
    }

    /**
     * @dev Get content type of NFT
     */
    function getContentType(uint256 tokenId) external view returns (ContentType) {
        require(_ownerOf(tokenId) != address(0), "Token doesn't exist");
        return _content[tokenId].contentType;
    }

    /**
     * @dev Add user to whitelist (only token owner can do this)
     */
    function addToWhitelist(uint256 tokenId, string memory username) external {
        require(ownerOf(tokenId) == msg.sender, "Only token owner can add to whitelist");
        
        _content[tokenId].whitelistedUsers.push(username);
        
        emit AccessGranted(tokenId, username, msg.sender);
    }

    /**
     * @dev Get total supply by content type - for analytics
     */
    function getTotalSupplyByType(ContentType contentType) external view returns (uint256) {
        uint256 total = totalSupply();
        uint256 count = 0;
        
        for (uint256 i = 0; i < total; i++) {
            uint256 tokenId = tokenByIndex(i);
            if (_content[tokenId].contentType == contentType) {
                count++;
            }
        }
        
        return count;
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