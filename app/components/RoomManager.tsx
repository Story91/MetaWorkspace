"use client";

import { useState, useCallback, useEffect } from "react";
import useMiniKitFeatures from "../hooks/useMiniKitFeatures";
import { Button } from "./DemoComponents";
import { Icon } from "./DemoComponents";
import { blockchainStorage, type WorkspaceRoom } from "../services/blockchainStorage";

function Card({ 
  title, 
  children, 
  className = "" 
}: { 
  title?: string; 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`neu-card overflow-hidden transition-all duration-300 hover:shadow-xl ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-[var(--app-card-border)] gradient-mint">
          <h3 className="text-lg font-semibold text-[var(--app-foreground)] flex items-center">
            {title}
          </h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

export function RoomManager() {
  const { notification } = useMiniKitFeatures();
  
  const [rooms, setRooms] = useState<WorkspaceRoom[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [currentUserFid] = useState("metaworkspace.eth");
  
  // Room creation form
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomWhitelist, setNewRoomWhitelist] = useState("");
  const [isPublicRoom, setIsPublicRoom] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Load rooms on component mount
  useEffect(() => {
    const loadRooms = async () => {
      try {
        // Fetch real rooms from blockchain API
        const response = await fetch('/api/blockchain/rooms');
        if (response.ok) {
          const data = await response.json();
          setRooms(data.rooms || []);
        } else {
          console.error('Failed to fetch rooms from API');
          // Fallback to empty array
          setRooms([]);
        }
      } catch (error) {
        console.error('Failed to load rooms:', error);
        setRooms([]);
      }
    };

    loadRooms();
  }, []);

  const handleCreateRoom = useCallback(async () => {
    if (!newRoomName.trim()) {
      await notification({
        title: "❌ Invalid Room Name",
        body: "Please enter a valid room name"
      });
      return;
    }

    setIsCreatingRoom(true);
    
    try {
      await notification({
        title: "🏗️ Creating Workspace Room",
        body: "Deploying room contract on Base L2..."
      });

      const whitelistArray = newRoomWhitelist
        .split(',')
        .map(username => username.trim())
        .filter(username => username.length > 0);

      const room = await blockchainStorage.createWorkspaceRoom(
        newRoomName,
        whitelistArray,
        isPublicRoom,
        {
          maxRecordingDuration: 30,
          allowVoiceNFTs: true,
          allowVideoNFTs: true,
          requireWhitelist: !isPublicRoom
        }
      );

      setRooms(prev => [room, ...prev]);
      
      // Reset form
      setNewRoomName("");
      setNewRoomWhitelist("");
      setIsPublicRoom(false);
      setShowCreateForm(false);

      await notification({
        title: "🎉 Room Created Successfully!",
        body: `${room.name} is ready for voice/video NFTs`
      });
    } catch (error) {
      console.error('Room creation failed:', error);
      await notification({
        title: "❌ Room Creation Failed",
        body: "Please try again or check your wallet connection"
      });
    } finally {
      setIsCreatingRoom(false);
    }
  }, [newRoomName, newRoomWhitelist, isPublicRoom, notification]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddToWhitelist = useCallback(async (roomId: string, username: string) => {
    try {
      await notification({
        title: "📝 Adding to Whitelist",
        body: `Adding ${username} to room whitelist...`
      });

      const success = await blockchainStorage.addToRoomWhitelist(roomId, username);
      
      if (success) {
        // Update local state
        setRooms(prev => prev.map(room => 
          room.roomId === roomId 
            ? { ...room, farcasterWhitelist: [...room.farcasterWhitelist, username] }
            : room
        ));

        await notification({
          title: "✅ User Added to Whitelist",
          body: `${username} can now access the room`
        });
      }
    } catch (error) {
      console.error('Failed to add to whitelist:', error);
      await notification({
        title: "❌ Whitelist Update Failed",
        body: "Please try again later"
      });
    }
  }, [notification]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const checkUserAccess = useCallback(async (roomId: string) => {
    const hasAccess = await blockchainStorage.checkRoomAccess(roomId, currentUserFid);
    return hasAccess;
  }, [currentUserFid]);

  return (
    <Card title="🏢 Workspace Room Manager">
      <div className="space-y-5">
        {/* Create Room Section */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Icon name="plus" className="text-green-500" />
              <span className="text-sm font-medium text-[var(--app-foreground)]">Create New Room</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
              icon={<Icon name="plus" size="sm" />}
            >
              {showCreateForm ? 'Cancel' : 'New Room'}
            </Button>
          </div>

          {showCreateForm && (
            <div className="space-y-3 mt-4">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name (e.g., 'Design Team Workspace')"
                className="w-full neu-input text-sm"
                disabled={isCreatingRoom}
              />
              
              <textarea
                value={newRoomWhitelist}
                onChange={(e) => setNewRoomWhitelist(e.target.value)}
                placeholder="Farcaster usernames (comma separated): alice.eth, bob.eth, carol.eth"
                rows={2}
                className="w-full neu-input text-sm resize-none"
                disabled={isCreatingRoom}
              />
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublicRoom}
                  onChange={(e) => setIsPublicRoom(e.target.checked)}
                  disabled={isCreatingRoom}
                  className="rounded"
                />
                <label htmlFor="isPublic" className="text-sm text-[var(--app-foreground)]">
                  Make room public (anyone can join)
                </label>
              </div>
              
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateRoom}
                disabled={isCreatingRoom || !newRoomName.trim()}
                icon={isCreatingRoom ? 
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div> :
                  <Icon name="plus" size="sm" />
                }
                className="w-full"
              >
                {isCreatingRoom ? 'Creating Room...' : 'Create Workspace Room'}
              </Button>
            </div>
          )}
        </div>

        {/* Existing Rooms */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="star" className="text-blue-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Your Workspace Rooms</span>
          </div>

          <div className="space-y-3">
            {rooms.map((room) => (
              <div key={room.roomId} className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-[var(--app-foreground)]">
                        {room.name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        room.isPublic 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {room.isPublic ? '🌐 Public' : '🔒 Private'}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--app-foreground-muted)] mb-1">
                      Room ID: {room.roomId}
                    </div>
                    <div className="text-xs text-[var(--app-foreground-muted)]">
                      Created: {new Date(room.createdAt).toLocaleDateString()} • 
                      Max Recording: {room.settings.maxRecordingDuration}s
                    </div>
                  </div>
                </div>

                {/* Whitelist Info */}
                {!room.isPublic && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-[var(--app-foreground)] mb-1">
                      Whitelisted Users ({room.farcasterWhitelist.length}):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {room.farcasterWhitelist.slice(0, 5).map((username, index) => (
                        <span 
                          key={index}
                          className="text-xs bg-[var(--app-accent-light)] px-2 py-1 rounded-full text-[var(--app-accent)]"
                        >
                          {username}
                        </span>
                      ))}
                      {room.farcasterWhitelist.length > 5 && (
                        <span className="text-xs text-[var(--app-foreground-muted)]">
                          +{room.farcasterWhitelist.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Room Features */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex space-x-2 text-xs">
                    {room.settings.allowVoiceNFTs && <span>🎤 Voice NFTs</span>}
                    {room.settings.allowVideoNFTs && <span>📹 Video NFTs</span>}
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm">
                      👁️
                    </Button>
                    <Button variant="ghost" size="sm">
                      ⚙️
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="neu-card p-3 text-center">
            <div className="text-lg font-bold gradient-accent bg-clip-text text-transparent">
              {rooms.length}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Total Rooms</div>
          </div>
          <div className="neu-card p-3 text-center">
            <div className="text-lg font-bold gradient-coral bg-clip-text text-transparent">
              {rooms.filter(r => !r.isPublic).length}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Private</div>
          </div>
          <div className="neu-card p-3 text-center">
            <div className="text-lg font-bold gradient-mint bg-clip-text text-transparent">
              {rooms.reduce((total, room) => total + room.farcasterWhitelist.length, 0)}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Members</div>
          </div>
        </div>

        {/* Integration Status */}
        <div className="text-xs text-center text-[var(--app-foreground-muted)] bg-[var(--app-accent-light)] p-2 rounded">
          🔗 Blockchain Features: Room Contracts • Farcaster Whitelist • NFT Access Control • IPFS Storage
        </div>
      </div>
    </Card>
  );
}

export default RoomManager;
