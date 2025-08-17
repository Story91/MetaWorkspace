"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "./DemoComponents";
import { Icon } from "./DemoComponents";

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

interface RoomEarnings {
  roomId: string;
  roomName: string;
  earnings: string; // in ETH
  members: number;
  joinPrice: string; // in ETH
  totalJoins: number;
}

export function CreatorEarningsDashboard() {
  const [earnings, setEarnings] = useState<RoomEarnings[]>([]);
  const [totalEarnings, setTotalEarnings] = useState("0");
  const [isWithdrawing, setIsWithdrawing] = useState<string | null>(null);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);

  // Load earnings data
  useEffect(() => {
    const loadEarnings = async () => {
      try {
        setIsLoadingEarnings(true);
        
        // This will fetch from blockchain service
        // For now, mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockEarnings: RoomEarnings[] = [
          {
            roomId: "premium-team-room",
            roomName: "Premium Team Room",
            earnings: "0.0032",
            members: 4,
            joinPrice: "0.001",
            totalJoins: 4
          },
          {
            roomId: "design-workshop",
            roomName: "Design Workshop",
            earnings: "0.0016",
            members: 2,
            joinPrice: "0.001",
            totalJoins: 2
          }
        ];
        
        setEarnings(mockEarnings);
        
        // Calculate total
        const total = mockEarnings.reduce((sum, room) => 
          sum + parseFloat(room.earnings), 0
        ).toFixed(4);
        setTotalEarnings(total);
        
      } catch (error) {
        console.error('Failed to load earnings:', error);
      } finally {
        setIsLoadingEarnings(false);
      }
    };

    loadEarnings();
  }, []);

  const handleWithdraw = useCallback(async (roomId: string, roomName: string) => {
    setIsWithdrawing(roomId);
    
    try {
      // This will call blockchain service to withdraw earnings
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update local state
      setEarnings(prev => prev.map(room => 
        room.roomId === roomId 
          ? { ...room, earnings: "0" }
          : room
      ));
      
      // Recalculate total
      const newTotal = earnings
        .filter(room => room.roomId !== roomId)
        .reduce((sum, room) => sum + parseFloat(room.earnings), 0)
        .toFixed(4);
      setTotalEarnings(newTotal);
      
      alert(`✅ Successfully withdrew earnings from ${roomName}!`);
      
    } catch (error) {
      console.error('Withdrawal failed:', error);
      alert(`❌ Failed to withdraw from ${roomName}. Please try again.`);
    } finally {
      setIsWithdrawing(null);
    }
  }, [earnings]);

  const handleUpdatePrice = useCallback(async (roomId: string, newPrice: string) => {
    try {
      // This will call blockchain service to update room price
      console.log(`Updating price for room ${roomId} to ${newPrice} ETH`);
      
      // Update local state
      setEarnings(prev => prev.map(room => 
        room.roomId === roomId 
          ? { ...room, joinPrice: newPrice }
          : room
      ));
      
      alert(`✅ Room join price updated to ${newPrice} ETH!`);
      
    } catch (error) {
      console.error('Price update failed:', error);
      alert('❌ Failed to update price. Please try again.');
    }
  }, []);

  if (isLoadingEarnings) {
    return (
      <Card title="💰 Creator Earnings Dashboard">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[var(--app-foreground-muted)]">Loading earnings...</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="💰 Creator Earnings Dashboard">
      <div className="space-y-6">
        {/* Total Earnings Overview */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-[var(--app-accent-light)]">
          <div className="text-center">
            <div className="text-3xl font-bold gradient-mint bg-clip-text text-transparent mb-2">
              {totalEarnings} ETH
            </div>
            <div className="text-sm text-[var(--app-foreground-muted)] mb-4">
              Total Available Earnings
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">
              💡 You earn 80% of all room join fees • 20% goes to platform
            </div>
          </div>
        </div>

        {/* Individual Room Earnings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="star" className="text-yellow-500" />
            <span className="text-lg font-semibold text-[var(--app-foreground)]">Room by Room Breakdown</span>
          </div>

          {earnings.length === 0 ? (
            <div className="text-center py-8 text-[var(--app-foreground-muted)]">
              <Icon name="star" className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <div className="text-lg mb-2">No earnings yet</div>
              <div className="text-sm">Create paid rooms and start earning!</div>
            </div>
          ) : (
            earnings.map((room) => (
              <div key={room.roomId} className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg border border-[var(--app-accent-light)]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-medium text-[var(--app-foreground)] mb-1">
                      {room.roomName}
                    </div>
                    <div className="text-sm text-[var(--app-foreground-muted)] mb-2">
                      Room ID: {room.roomId}
                    </div>
                    
                    {/* Room Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {room.earnings} ETH
                        </div>
                        <div className="text-xs text-[var(--app-foreground-muted)]">Available</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {room.members}
                        </div>
                        <div className="text-xs text-[var(--app-foreground-muted)]">Members</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {room.joinPrice} ETH
                        </div>
                        <div className="text-xs text-[var(--app-foreground-muted)]">Join Price</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-[var(--app-foreground-muted)]">
                    💳 {room.totalJoins} total joins
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPrice = prompt(`Current price: ${room.joinPrice} ETH\nEnter new join price:`, room.joinPrice);
                        if (newPrice && newPrice !== room.joinPrice) {
                          handleUpdatePrice(room.roomId, newPrice);
                        }
                      }}
                    >
                      💰 Update Price
                    </Button>
                    
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={parseFloat(room.earnings) === 0 || isWithdrawing === room.roomId}
                      onClick={() => handleWithdraw(room.roomId, room.roomName)}
                      icon={isWithdrawing === room.roomId ? 
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div> :
                        <Icon name="star" size="sm" />
                      }
                    >
                      {isWithdrawing === room.roomId ? 'Withdrawing...' : 'Withdraw'}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <Icon name="star" className="text-blue-500 mt-1" />
            <div>
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                💡 Creator Tips
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <div>• Set competitive join prices to maximize earnings</div>
                <div>• Higher-quality content attracts more members</div>
                <div>• Withdraw earnings regularly to secure your funds</div>
                <div>• Use room whitelist for exclusive content</div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Info */}
        <div className="text-xs text-center text-[var(--app-foreground-muted)] bg-[var(--app-accent-light)] p-3 rounded">
          🔗 Powered by Base L2 • Smart Contract: {`0x3e9747E5...F736e4`} • Real-time earnings tracking
        </div>
      </div>
    </Card>
  );
}

export default CreatorEarningsDashboard;
