// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title VoiceNFT
 * @dev NFT contract for storing voice recordings on MetaWorkspace
 */
contract VoiceNFT is ERC721, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    struct VoiceData {
        string ipfsHash;
        uint256 duration;
        string roomId;
        address creator;
        uint256 timestamp;
        bool isPrivate;
        string[] whitelistedUsers;
        string transcription;
    }

    mapping(uint256 => VoiceData) private _voiceData;
    mapping(string => uint256[]) private _roomToTokenIds;
    mapping(address => uint256[]) private _creatorToTokenIds;

    event VoiceNFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string roomId,
        string ipfsHash,
        uint256 duration
    );

    constructor() ERC721("MetaWorkspace Voice NFT", "MWVOICE") {}

    /**
     * @dev Mint a new Voice NFT
     */
    function mintVoiceNFT(
        address to,
        string memory ipfsHash,
        uint256 duration,
        string memory roomId,
        string[] memory whitelistedUsers,
        string memory transcription
    ) external returns (uint256) {
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(duration > 0, "Duration must be greater than 0");
        require(bytes(roomId).length > 0, "Room ID cannot be empty");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _voiceData[tokenId] = VoiceData({
            ipfsHash: ipfsHash,
            duration: duration,
            roomId: roomId,
            creator: to,
            timestamp: block.timestamp,
            isPrivate: whitelistedUsers.length > 0,
            whitelistedUsers: whitelistedUsers,
            transcription: transcription
        });

        _roomToTokenIds[roomId].push(tokenId);
        _creatorToTokenIds[to].push(tokenId);

        _safeMint(to, tokenId);

        emit VoiceNFTMinted(tokenId, to, roomId, ipfsHash, duration);

        return tokenId;
    }

    /**
     * @dev Get voice NFT data
     */
    function getVoiceNFT(uint256 tokenId) external view returns (VoiceData memory) {
        require(_exists(tokenId), "Token does not exist");
        return _voiceData[tokenId];
    }

    /**
     * @dev Get all voice NFTs for a room
     */
    function getVoiceNFTsByRoom(string memory roomId) external view returns (uint256[] memory) {
        return _roomToTokenIds[roomId];
    }

    /**
     * @dev Get all voice NFTs created by an address
     */
    function getVoiceNFTsByCreator(address creator) external view returns (uint256[] memory) {
        return _creatorToTokenIds[creator];
    }

    /**
     * @dev Check if user has access to a private voice NFT
     */
    function hasAccess(uint256 tokenId, string memory username) external view returns (bool) {
        require(_exists(tokenId), "Token does not exist");
        
        VoiceData memory voice = _voiceData[tokenId];
        
        // Public voices are accessible to everyone
        if (!voice.isPrivate) {
            return true;
        }

        // Check if user is in whitelist
        for (uint i = 0; i < voice.whitelistedUsers.length; i++) {
            if (keccak256(bytes(voice.whitelistedUsers[i])) == keccak256(bytes(username))) {
                return true;
            }
        }

        return false;
    }

    /**
     * @dev Add user to voice NFT whitelist (only owner of NFT)
     */
    function addToWhitelist(uint256 tokenId, string memory username) external {
        require(_exists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Only NFT owner can modify whitelist");

        _voiceData[tokenId].whitelistedUsers.push(username);
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
