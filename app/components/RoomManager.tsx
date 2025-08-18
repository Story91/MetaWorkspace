"use client";

import { useState, useCallback, useEffect } from "react";
import useMiniKitFeatures from "../hooks/useMiniKitFeatures";
import { Button } from "./DemoComponents";
import { Icon } from "./DemoComponents";
// Blockchain service import removed as not used in current implementation
import { type WorkspaceRoom } from "../services/blockchainStorage";
import { 
  Transaction, 
  TransactionButton, 
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel 
} from "@coinbase/onchainkit/transaction";
import { useAccount } from "wagmi";
import { METAWORKSPACE_NFT_ABI } from "../constants/contractABI";
import { getCurrentChainConfig } from "../config/chains";
import { encodeFunctionData } from "viem";
import { parseEther } from "viem";

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
  const { address } = useAccount();
  
  const [rooms, setRooms] = useState<WorkspaceRoom[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [currentUserFid] = useState("metaworkspace.eth");
  const [roomTransactionCalls, setRoomTransactionCalls] = useState<Array<{ to: `0x${string}`; data: `0x${string}` }>>([]);
  
  // Room creation form
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomWhitelist, setNewRoomWhitelist] = useState("");
  const [isPublicRoom, setIsPublicRoom] = useState(false);
  const [joinPrice, setJoinPrice] = useState("0");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Removed unused blockchainServiceInstance

  // Prepare room creation transaction calls for OnchainKit
  const prepareRoomCreation = useCallback(async (
    roomId: string,
    name: string, 
    farcasterWhitelist: string[],
    isPublic: boolean,
    joinPriceEth: string
  ) => {
    if (!address) return [];
    
    try {
      const chainConfig = getCurrentChainConfig();
      const joinPriceWei = parseEther(joinPriceEth);
      
      const contractCall = {
        to: chainConfig.contractAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: METAWORKSPACE_NFT_ABI,
          functionName: 'createRoom',
          args: [
            roomId,
            name,
            farcasterWhitelist,
            isPublic,
            joinPriceWei
          ]
        })
      };
      
      return [contractCall];
    } catch (error) {
      console.error('Error preparing room creation:', error);
      return [];
    }
  }, [address]);

  // Transaction success handler for OnchainKit
  const handleRoomTransactionSuccess = useCallback(async (response: unknown) => {
    console.log('✅ Room Creation Transaction successful:', response);
    
    setIsCreatingRoom(false);
    
    await notification({
      title: "🎉 Room Created Successfully!",
      body: "Your workspace room has been deployed on the blockchain!"
    });
    
    // Reset form
    setNewRoomName("");
    setNewRoomWhitelist("");
    setIsPublicRoom(false);
    setJoinPrice("0");
    setShowCreateForm(false);
    
    // Reload rooms from blockchain with retry mechanism
    let reloadSuccess = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retrying room reload (attempt ${attempt + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
        
        // Fetch updated rooms list
        const response = await fetch('/api/blockchain/rooms');
        if (response.ok) {
          const data = await response.json();
          setRooms(data.rooms || []);
          console.log('🔄 Reloaded rooms after creation');
          reloadSuccess = true;
          break;
        }
      } catch (reloadError) {
        console.warn(`⚠️ Room reload attempt ${attempt + 1} failed:`, reloadError);
      }
    }
    
    if (!reloadSuccess) {
      console.warn('⚠️ Failed to reload rooms after all attempts');
    }
    
    // Clear transaction calls
    setRoomTransactionCalls([]);
  }, [notification]);

  // Transaction error handler for OnchainKit
  const handleRoomTransactionError = useCallback((error: unknown) => {
    console.error('❌ Room Creation Transaction failed:', error);
    setIsCreatingRoom(false);
    
    notification({
      title: "❌ Room Creation Failed",
      body: (error as { message?: string })?.message || "Failed to create room on blockchain"
    });
    
    // Clear transaction calls
    setRoomTransactionCalls([]);
  }, [notification]);

  // Load rooms on component mount
  useEffect(() => {
    const loadRooms = async () => {
      try {
        // Always show mock data for demo
        setRooms([
            {
              roomId: "room_demo_1733012345_abc123",
              name: "🎨 Design Team Hub",
              creator: "0x742d35Cc6635C0532925a3b8D1C9C4F1e9c8e456",
              farcasterWhitelist: ["alice.eth", "bob.eth", "carol.eth", "david.eth"],
              isPublic: false,
              createdAt: Date.now() - 86400000, // 1 day ago
              settings: {
                maxRecordingDuration: 30,
                allowVoiceNFTs: true,
                allowVideoNFTs: true,
                requireWhitelist: true
              }
            },
            {
              roomId: "room_demo_1733012678_xyz789",
              name: "🚀 Public Workspace",
              creator: "0x742d35Cc6635C0532925a3b8D1C9C4F1e9c8e456",
              farcasterWhitelist: [],
              isPublic: true,
              createdAt: Date.now() - 172800000, // 2 days ago
              settings: {
                maxRecordingDuration: 60,
                allowVoiceNFTs: true,
                allowVideoNFTs: true,
                requireWhitelist: false
              }
            },
            {
              roomId: "room_demo_1733013000_def456",
              name: "💼 Product Team",
              creator: "0x742d35Cc6635C0532925a3b8D1C9C4F1e9c8e456",
              farcasterWhitelist: ["john.eth", "sarah.eth", "mike.eth"],
              isPublic: false,
              createdAt: Date.now() - 259200000, // 3 days ago
              settings: {
                maxRecordingDuration: 45,
                allowVoiceNFTs: true,
                allowVideoNFTs: false,
                requireWhitelist: true
              }
            }
        ]);
      } catch (error) {
        console.error('Error setting mock rooms:', error);
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

    if (!address) {
      await notification({
        title: "❌ Wallet Not Connected",
        body: "Please connect your wallet to create a room"
      });
      return;
    }

    setIsCreatingRoom(true);
    
    try {
      await notification({
        title: "🏗️ Step 1/3: Preparing Room",
        body: "Setting up room parameters..."
      });

      const whitelistArray = newRoomWhitelist
        .split(',')
        .map(username => username.trim())
        .filter(username => username.length > 0);

      // Generate unique room ID
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      await notification({
        title: "⛓️ Step 2/3: Preparing Transaction",
        body: "Encoding smart contract call..."
      });

      console.log('🔗 About to prepare room creation with:', {
        roomId,
        name: newRoomName,
        farcasterWhitelist: whitelistArray,
        isPublic: isPublicRoom,
        joinPriceEth: joinPrice || "0"
      });
      
      const transactionCalls = await prepareRoomCreation(
        roomId,
        newRoomName,
        whitelistArray,
        isPublicRoom,
        joinPrice || "0"
      );
      
      if (transactionCalls.length > 0) {
        console.log('✅ Room creation transaction prepared successfully');
        setRoomTransactionCalls(transactionCalls);
        setIsCreatingRoom(false); // Stop the loading animation, now showing transaction UI
        
        await notification({
          title: "🚀 Step 3/3: Transaction Ready!",
          body: "Click the button below to create your room on the blockchain"
        });
      } else {
        throw new Error("Failed to prepare room creation transaction");
      }
    } catch (error) {
      console.error('Room creation preparation failed:', error);
      await notification({
        title: "❌ Room Creation Failed",
        body: error instanceof Error ? error.message : "Failed to prepare room creation"
      });
      setIsCreatingRoom(false);
    }
  }, [newRoomName, newRoomWhitelist, isPublicRoom, joinPrice, notification, address, prepareRoomCreation]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddToWhitelist = useCallback(async (roomId: string, username: string) => {
    try {
      await notification({
        title: "📝 Adding to Whitelist",
        body: `Adding ${username} to room whitelist... (Coming soon)`
      });

      // TODO: Implement addToWhitelist blockchain transaction with OnchainKit
      // This will need the same pattern as createRoom: prepare transaction calls, then use Transaction component
      
      await notification({
        title: "🚧 Feature Coming Soon",
        body: "Whitelist management via blockchain transactions will be available soon"
      });
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
    // TODO: Implement blockchain access check
    console.log('Checking room access for:', { roomId, currentUserFid });
    return true; // For now, allow access
  }, [currentUserFid]);

  const handleJoinRoom = useCallback(async (roomId: string) => {
    try {
      await notification({
        title: "💳 Joining Room",
        body: `Processing payment for room ${roomId}...`
      });

      // This will be implemented with blockchain service
      // For now, show success
      await new Promise(resolve => setTimeout(resolve, 2000));

      await notification({
        title: "🎉 Successfully Joined Room!",
        body: `You can now access room ${roomId} content`
      });
    } catch (error) {
      console.error('Failed to join room:', error);
      await notification({
        title: "❌ Failed to Join Room",
        body: "Please check your wallet and try again"
      });
    }
  }, [notification]);

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

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--app-foreground)]">
                  💰 Join Price (ETH)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={joinPrice}
                  onChange={(e) => setJoinPrice(e.target.value)}
                  placeholder="0 (free) or 0.001 (paid room)"
                  className="w-full neu-input text-sm"
                  disabled={isCreatingRoom}
                />
                <div className="text-xs text-[var(--app-foreground-muted)]">
                  {joinPrice === "0" || !joinPrice ? (
                    "🆓 Free room - anyone can join for free"
                  ) : (
                    `💳 Paid room - users pay ${joinPrice} ETH to join (80% goes to you)`
                  )}
                </div>
              </div>
              
              {/* Loading Animation */}
              {isCreatingRoom && (
                <div className="bg-gradient-to-r from-blue-500/20 to-green-500/20 p-4 rounded-lg border-2 border-blue-500/30 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div>
                      <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        🏗️ Preparing Room Creation...
                      </div>
                      <div className="text-xs text-blue-500/80">
                        Setting up blockchain transaction • Please wait...
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction UI for Room Creation */}
              {roomTransactionCalls.length > 0 && (
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 p-4 rounded-lg border-2 border-green-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                        🚀 Ready to Create Room
                      </div>
                      <div className="text-xs text-green-500/80">
                        Click to deploy your workspace room on Base blockchain
                      </div>
                    </div>
                  </div>
                  
                  <Transaction
                    calls={roomTransactionCalls}
                    onSuccess={handleRoomTransactionSuccess}
                    onError={handleRoomTransactionError}
                  >
                    <TransactionButton 
                      text="🏗️ Create Room on Blockchain"
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    />
                    <TransactionStatus>
                      <TransactionStatusAction />
                      <TransactionStatusLabel />
                    </TransactionStatus>
                  </Transaction>
                </div>
              )}

              {/* Create Room Button - only show when not preparing transaction */}
              {!isCreatingRoom && roomTransactionCalls.length === 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateRoom}
                  disabled={!newRoomName.trim()}
                  icon={<Icon name="plus" size="sm" />}
                  className="w-full"
                >
                  Prepare Room Creation
                </Button>
              )}
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
              <div key={room.roomId} className="bg-gradient-to-br from-white/60 to-white/40 dark:from-gray-800/60 dark:to-gray-800/40 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md hover:scale-[1.01] transition-all duration-200 backdrop-blur-sm">
                {/* Room Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-base">{room.name.includes('Design') ? '🎨' : room.name.includes('Public') ? '🚀' : '📋'}</span>
                      <h3 className="text-sm font-semibold text-[var(--app-foreground)]">
                        {room.name}
                      </h3>
                    </div>
                    <div className="text-xs text-[var(--app-foreground-muted)] mb-1">
                      <span>Room ID: {room.roomId.slice(0, 20)}...</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-[var(--app-foreground-muted)]">
                      <span>Created: {new Date(room.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
                      <span>• Creator: {room.creator.slice(0, 6)}...{room.creator.slice(-4)}</span>
                      <span>• Members: {!room.isPublic ? room.farcasterWhitelist.length : '12'}</span>
                    </div>
                    {!room.isPublic && (
                      <div className="mt-1">
                        <span className="text-xs text-orange-600 dark:text-orange-400">💰 Join Price: 0.001 ETH</span>
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    room.isPublic 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {room.isPublic ? '🌐 Public' : '🔒 Private'}
                  </span>
                </div>

                {/* Features Row */}
                <div className="flex items-center space-x-2 mb-2">
                  {room.settings.allowVoiceNFTs && (
                    <div className="flex items-center space-x-1 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded">
                      <span className="text-xs">🎤</span>
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Voice NFTs</span>
                    </div>
                  )}
                  {room.settings.allowVideoNFTs && (
                    <div className="flex items-center space-x-1 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                      <span className="text-xs">📹</span>
                      <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Video NFTs</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700/30 px-2 py-1 rounded">
                    <span className="text-xs">📁</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-400">Files</span>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between">
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => handleJoinRoom(room.roomId)}
                    className="px-4 py-1.5 text-xs"
                    icon={<span>📋</span>}
                  >
                    Join
                  </Button>
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-1.5"
                      onClick={() => notification({
                        title: "👁️ Room Preview",
                        body: `Previewing ${room.name}`
                      })}
                    >
                      👁️
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-1.5"
                      onClick={() => notification({
                        title: "⚙️ Room Settings",
                        body: "Room management coming soon"
                      })}
                    >
                      ⚙️
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="neu-card p-4 text-center group hover:scale-105 transition-transform duration-200">
            <div className="text-2xl mb-1">🏢</div>
            <div className="text-lg font-bold gradient-accent bg-clip-text text-transparent">
              {rooms.length}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Total Rooms</div>
          </div>
          <div className="neu-card p-4 text-center group hover:scale-105 transition-transform duration-200">
            <div className="text-2xl mb-1">🔒</div>
            <div className="text-lg font-bold gradient-coral bg-clip-text text-transparent">
              {rooms.filter(r => !r.isPublic).length}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Private Rooms</div>
          </div>
          <div className="neu-card p-4 text-center group hover:scale-105 transition-transform duration-200">
            <div className="text-2xl mb-1">👥</div>
            <div className="text-lg font-bold gradient-mint bg-clip-text text-transparent">
              {rooms.reduce((total, room) => total + room.farcasterWhitelist.length, 0)}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Team Members</div>
          </div>
          <div className="neu-card p-4 text-center group hover:scale-105 transition-transform duration-200">
            <div className="text-2xl mb-1">🎥</div>
            <div className="text-lg font-bold gradient-purple bg-clip-text text-transparent">
              {rooms.filter(r => r.settings.allowVideoNFTs).length}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">NFT Enabled</div>
          </div>
        </div>


      </div>
    </Card>
  );
}

export default RoomManager;
