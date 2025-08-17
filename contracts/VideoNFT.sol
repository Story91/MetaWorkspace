// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title VideoNFT
 * @dev NFT contract for storing video meetings on MetaWorkspace
 */
contract VideoNFT is ERC721, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    struct VideoData {
        string ipfsHash;
        uint256 duration;
        string roomId;
        address creator;
        string[] participants;
        string summary;
        uint256 timestamp;
        bool isPrivate;
        string[] whitelistedUsers;
    }

    mapping(uint256 => VideoData) private _videoData;
    mapping(string => uint256[]) private _roomToTokenIds;
    mapping(address => uint256[]) private _creatorToTokenIds;

    event VideoNFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string roomId,
        string ipfsHash,
        uint256 duration,
        string[] participants
    );

    constructor() ERC721("MetaWorkspace Video NFT", "MWVIDEO") {}

    /**
     * @dev Mint a new Video NFT
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
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(duration > 0, "Duration must be greater than 0");
        require(bytes(roomId).length > 0, "Room ID cannot be empty");
        require(participants.length > 0, "At least one participant required");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _videoData[tokenId] = VideoData({
            ipfsHash: ipfsHash,
            duration: duration,
            roomId: roomId,
            creator: to,
            participants: participants,
            summary: summary,
            timestamp: block.timestamp,
            isPrivate: whitelistedUsers.length > 0,
            whitelistedUsers: whitelistedUsers
        });

        _roomToTokenIds[roomId].push(tokenId);
        _creatorToTokenIds[to].push(tokenId);

        _safeMint(to, tokenId);

        emit VideoNFTMinted(tokenId, to, roomId, ipfsHash, duration, participants);

        return tokenId;
    }

    /**
     * @dev Get video NFT data
     */
    function getVideoNFT(uint256 tokenId) external view returns (VideoData memory) {
        require(_exists(tokenId), "Token does not exist");
        return _videoData[tokenId];
    }

    /**
     * @dev Get all video NFTs for a room
     */
    function getVideoNFTsByRoom(string memory roomId) external view returns (uint256[] memory) {
        return _roomToTokenIds[roomId];
    }

    /**
     * @dev Get all video NFTs created by an address
     */
    function getVideoNFTsByCreator(address creator) external view returns (uint256[] memory) {
        return _creatorToTokenIds[creator];
    }

    /**
     * @dev Check if user has access to a private video NFT
     */
    function hasAccess(uint256 tokenId, string memory username) external view returns (bool) {
        require(_exists(tokenId), "Token does not exist");
        
        VideoData memory video = _videoData[tokenId];
        
        // Public videos are accessible to everyone
        if (!video.isPrivate) {
            return true;
        }

        // Check if user is in whitelist
        for (uint i = 0; i < video.whitelistedUsers.length; i++) {
            if (keccak256(bytes(video.whitelistedUsers[i])) == keccak256(bytes(username))) {
                return true;
            }
        }

        // Check if user is a participant
        for (uint i = 0; i < video.participants.length; i++) {
            if (keccak256(bytes(video.participants[i])) == keccak256(bytes(username))) {
                return true;
            }
        }

        return false;
    }

    /**
     * @dev Add user to video NFT whitelist (only owner of NFT)
     */
    function addToWhitelist(uint256 tokenId, string memory username) external {
        require(_exists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Only NFT owner can modify whitelist");

        _videoData[tokenId].whitelistedUsers.push(username);
    }

    /**
     * @dev Update video summary (only owner of NFT)
     */
    function updateSummary(uint256 tokenId, string memory newSummary) external {
        require(_exists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Only NFT owner can update summary");

        _videoData[tokenId].summary = newSummary;
    }

    // Required overrides
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
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
