// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RoomManager
 * @dev Contract for managing MetaWorkspace rooms and access control
 */
contract RoomManager is Ownable {
    
    struct Room {
        string name;
        address creator;
        string[] farcasterWhitelist;
        bool isPublic;
        uint256 createdAt;
        RoomSettings settings;
        bool exists;
    }
    
    struct RoomSettings {
        uint256 maxRecordingDuration;
        bool allowVoiceNFTs;
        bool allowVideoNFTs;
        bool requireWhitelist;
    }

    mapping(string => Room) private _rooms;
    mapping(address => string[]) private _userRooms;
    string[] private _allRoomIds;

    event RoomCreated(
        string indexed roomId,
        string name,
        address indexed creator,
        bool isPublic
    );

    event UserAddedToWhitelist(
        string indexed roomId,
        string farcasterUsername,
        address indexed addedBy
    );

    event UserRemovedFromWhitelist(
        string indexed roomId,
        string farcasterUsername,
        address indexed removedBy
    );

    event RoomSettingsUpdated(
        string indexed roomId,
        address indexed updatedBy
    );

    /**
     * @dev Create a new workspace room
     */
    function createRoom(
        string memory roomId,
        string memory name,
        string[] memory farcasterWhitelist,
        bool isPublic,
        RoomSettings memory settings
    ) external {
        require(bytes(roomId).length > 0, "Room ID cannot be empty");
        require(bytes(name).length > 0, "Room name cannot be empty");
        require(!_rooms[roomId].exists, "Room already exists");

        _rooms[roomId] = Room({
            name: name,
            creator: msg.sender,
            farcasterWhitelist: farcasterWhitelist,
            isPublic: isPublic,
            createdAt: block.timestamp,
            settings: settings,
            exists: true
        });

        _userRooms[msg.sender].push(roomId);
        _allRoomIds.push(roomId);

        emit RoomCreated(roomId, name, msg.sender, isPublic);
    }

    /**
     * @dev Add user to room whitelist (only room creator)
     */
    function addToWhitelist(
        string memory roomId,
        string memory farcasterUsername
    ) external {
        require(_rooms[roomId].exists, "Room does not exist");
        require(_rooms[roomId].creator == msg.sender, "Only room creator can modify whitelist");
        require(bytes(farcasterUsername).length > 0, "Username cannot be empty");

        // Check if user is already whitelisted
        require(!isUserWhitelisted(roomId, farcasterUsername), "User already whitelisted");

        _rooms[roomId].farcasterWhitelist.push(farcasterUsername);

        emit UserAddedToWhitelist(roomId, farcasterUsername, msg.sender);
    }

    /**
     * @dev Remove user from room whitelist (only room creator)
     */
    function removeFromWhitelist(
        string memory roomId,
        string memory farcasterUsername
    ) external {
        require(_rooms[roomId].exists, "Room does not exist");
        require(_rooms[roomId].creator == msg.sender, "Only room creator can modify whitelist");

        string[] storage whitelist = _rooms[roomId].farcasterWhitelist;
        
        for (uint i = 0; i < whitelist.length; i++) {
            if (keccak256(bytes(whitelist[i])) == keccak256(bytes(farcasterUsername))) {
                // Move last element to current position and remove last element
                whitelist[i] = whitelist[whitelist.length - 1];
                whitelist.pop();
                emit UserRemovedFromWhitelist(roomId, farcasterUsername, msg.sender);
                return;
            }
        }

        revert("User not found in whitelist");
    }

    /**
     * @dev Check if user is whitelisted for a room
     */
    function isUserWhitelisted(
        string memory roomId,
        string memory farcasterUsername
    ) public view returns (bool) {
        require(_rooms[roomId].exists, "Room does not exist");

        Room memory room = _rooms[roomId];

        // Public rooms don't require whitelist
        if (room.isPublic && !room.settings.requireWhitelist) {
            return true;
        }

        // Check whitelist
        for (uint i = 0; i < room.farcasterWhitelist.length; i++) {
            if (keccak256(bytes(room.farcasterWhitelist[i])) == keccak256(bytes(farcasterUsername))) {
                return true;
            }
        }

        return false;
    }

    /**
     * @dev Check if user can access room
     */
    function canUserAccessRoom(
        string memory roomId,
        string memory farcasterUsername
    ) external view returns (bool) {
        require(_rooms[roomId].exists, "Room does not exist");

        Room memory room = _rooms[roomId];

        // Room creator always has access
        // Note: This would need additional mapping from farcaster to address in production
        
        // Check if public room
        if (room.isPublic && !room.settings.requireWhitelist) {
            return true;
        }

        // Check whitelist
        return isUserWhitelisted(roomId, farcasterUsername);
    }

    /**
     * @dev Get room information
     */
    function getRoom(string memory roomId) external view returns (Room memory) {
        require(_rooms[roomId].exists, "Room does not exist");
        return _rooms[roomId];
    }

    /**
     * @dev Get all room IDs
     */
    function getAllRoomIds() external view returns (string[] memory) {
        return _allRoomIds;
    }

    /**
     * @dev Get rooms created by a user
     */
    function getUserRooms(address user) external view returns (string[] memory) {
        return _userRooms[user];
    }

    /**
     * @dev Get room whitelist
     */
    function getRoomWhitelist(string memory roomId) external view returns (string[] memory) {
        require(_rooms[roomId].exists, "Room does not exist");
        return _rooms[roomId].farcasterWhitelist;
    }

    /**
     * @dev Update room settings (only room creator)
     */
    function updateRoomSettings(
        string memory roomId,
        RoomSettings memory newSettings
    ) external {
        require(_rooms[roomId].exists, "Room does not exist");
        require(_rooms[roomId].creator == msg.sender, "Only room creator can update settings");

        _rooms[roomId].settings = newSettings;

        emit RoomSettingsUpdated(roomId, msg.sender);
    }

    /**
     * @dev Update room visibility (only room creator)
     */
    function updateRoomVisibility(
        string memory roomId,
        bool isPublic
    ) external {
        require(_rooms[roomId].exists, "Room does not exist");
        require(_rooms[roomId].creator == msg.sender, "Only room creator can update visibility");

        _rooms[roomId].isPublic = isPublic;
    }

    /**
     * @dev Get total number of rooms
     */
    function getTotalRooms() external view returns (uint256) {
        return _allRoomIds.length;
    }

    /**
     * @dev Check if room exists
     */
    function roomExists(string memory roomId) external view returns (bool) {
        return _rooms[roomId].exists;
    }
}
