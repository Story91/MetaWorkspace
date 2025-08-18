"use client";

import { type ReactNode, useState, useEffect } from "react";
import { useAccount } from "wagmi";
import AITaskAssistant from "./AITaskAssistant";

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  icon?: ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
  disabled = false,
  type = "button",
  icon,
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:pointer-events-none neu-button";

  const variantClasses = {
    primary:
      "gradient-accent text-white hover:shadow-lg",
    secondary:
      "gradient-mint text-[var(--app-foreground)]",
    outline:
      "border border-[var(--app-accent)] hover:gradient-accent hover:text-white text-[var(--app-accent)]",
    ghost:
      "hover:gradient-mint text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]",
  };

  const sizeClasses = {
    sm: "text-xs px-3 py-2 rounded-xl",
    md: "text-sm px-5 py-3 rounded-xl",
    lg: "text-base px-7 py-4 rounded-xl",
  };

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="flex items-center mr-2">{icon}</span>}
      {children}
    </button>
  );
}

type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

function Card({
  title,
  children,
  className = "",
  onClick,
}: CardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`neu-card overflow-hidden transition-all duration-300 hover:shadow-xl ${className} ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
    >
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

type WorkspaceFeaturesProps = {
  setActiveTab: (tab: string) => void;
};

export function WorkspaceFeatures({ setActiveTab }: WorkspaceFeaturesProps) {
  return (
    <div className="space-y-5 animate-fade-in">
      <Card title="⚡ Advanced MetaWorkspace Features">
        <div className="space-y-5">
          <div className="neu-card p-5 gradient-accent text-white">
            <div className="flex items-center space-x-3 mb-3">
              <Icon name="star" className="text-yellow-300" />
              <span className="font-bold text-lg">AI Task Assistant</span>
            </div>
            <ul className="text-sm space-y-1 opacity-90">
              <li>• Automatic task creation from meetings/conversations</li>
              <li>• Real-time priority optimization</li>
              <li>• Smart work distribution suggestions</li>
              <li>• Automated progress reports</li>
            </ul>
          </div>
          
          <div className="neu-card p-5 gradient-mint">
            <div className="flex items-center space-x-3 mb-3">
              <Icon name="check" className="text-green-600" />
              <span className="font-bold text-lg text-[var(--app-foreground)]">Blockchain Workspace Logs</span>
            </div>
            <ul className="text-sm space-y-1 text-[var(--app-foreground-muted)]">
              <li>• Every task & decision recorded on Base L2</li>
              <li>• Complete work history transparency</li>
              <li>• Team achievement tokens & rewards</li>
              <li>• Immutable IP ownership proofs</li>
            </ul>
          </div>
          
          <div className="neu-card p-5 gradient-coral text-white">
            <div className="flex items-center space-x-3 mb-3">
              <Icon name="heart" className="text-pink-200" />
              <span className="font-bold text-lg">Decentralized Collaboration</span>
            </div>
            <ul className="text-sm space-y-1 opacity-90">
              <li>• IPFS/Arweave document management</li>
              <li>• Cross-DAO team integration</li>
              <li>• Smart Meeting Recorder with AI summaries</li>
              <li>• Global decentralized teams support</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-[var(--app-card-border)]">
          <Button variant="secondary" onClick={() => setActiveTab("home")} className="w-full">
            ← Return to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}

type WorkspaceOverviewProps = {
  setActiveTab: (tab: string) => void;
};

export function WorkspaceOverview({ }: WorkspaceOverviewProps) {
  return (
    <div className="space-y-5 animate-fade-in">
      <AITaskAssistant />
      <BlockchainWorkLogger />
    </div>
  );
}

type IconProps = {
  name: "heart" | "star" | "check" | "plus" | "arrow-right";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Icon({ name, size = "md", className = "" }: IconProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const icons = {
    heart: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Heart</title>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    star: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Star</title>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    check: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Check</title>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    plus: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Plus</title>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    "arrow-right": (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Arrow Right</title>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    ),
  };

  return (
    <span className={`inline-block ${sizeClasses[size]} ${className}`}>
      {icons[name]}
    </span>
  );
}

// Type Todo removed - replaced by AITaskAssistant
// type Todo = {
//   id: number;
//   text: string;
//   completed: boolean;
// }

// AITaskManager function removed - replaced by AITaskAssistant component


export function BlockchainWorkLogger() {
  const { address } = useAccount();
  // const [workHours, setWorkHours] = useState(0); // Using sessionHours instead
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [nftProofs, setNftProofs] = useState(0);
  // const [totalUsers, setTotalUsers] = useState(0); // Unused in display
  const [hasAIAccess, setHasAIAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // const [isVerified] = useState(false); // Unused
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionHours, setSessionHours] = useState(0);

  // Session time tracking
  useEffect(() => {
    if (address && !sessionStartTime) {
      // Start session when wallet connects
      const startTime = new Date();
      setSessionStartTime(startTime);
      
      // Load previous TOTAL session time from localStorage
      const savedTotalTime = localStorage.getItem(`total-session-time-${address}`);
      if (savedTotalTime) {
        setSessionHours(parseFloat(savedTotalTime));
      }
    }
  }, [address, sessionStartTime]);

  // Update session timer every 10 seconds for real-time display
  useEffect(() => {
    if (!sessionStartTime || !address) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentSessionHours = (now.getTime() - sessionStartTime.getTime()) / (1000 * 60 * 60);
      
      // Get previous TOTAL time (not adding current session multiple times)
      const savedTotalTime = localStorage.getItem(`total-session-time-${address}`);
      const previousTotalHours = savedTotalTime ? parseFloat(savedTotalTime) : 0;
      
      // Display current session + previous total
      const displayHours = previousTotalHours + currentSessionHours;
      setSessionHours(displayHours);
      
    }, 10000); // Update every 10 seconds for real-time feel

    return () => clearInterval(interval);
  }, [sessionStartTime, address]);

  // Save session when component unmounts or wallet disconnects
  useEffect(() => {
    return () => {
      if (sessionStartTime && address) {
        const now = new Date();
        const currentSessionHours = (now.getTime() - sessionStartTime.getTime()) / (1000 * 60 * 60);
        
        // Add current session to total and save
        const savedTotalTime = localStorage.getItem(`total-session-time-${address}`);
        const previousTotalHours = savedTotalTime ? parseFloat(savedTotalTime) : 0;
        const newTotalHours = previousTotalHours + currentSessionHours;
        
        localStorage.setItem(`total-session-time-${address}`, newTotalHours.toString());
        saveSessionToDatabase(address, newTotalHours);
      }
    };
  }, [sessionStartTime, address]);

  const saveSessionToDatabase = async (walletAddress: string, hours: number) => {
    try {
      await fetch('/api/blockchain/work-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateSessionTime',
          userAddress: walletAddress,
          sessionHours: hours
        })
      });
    } catch (error) {
      console.error('Failed to save session time:', error);
    }
  };



  // Load real data from blockchain
  useEffect(() => {
    const loadBlockchainData = async () => {
      if (!address) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Fetch real data directly from contract
        console.log(`📊 Loading blockchain data for ${address}`);
        
        const response = await fetch(`/api/blockchain/statistics?user=${address}`);
        console.log(`🌐 API Response status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const contractStats = await response.json();
        console.log('📋 Contract stats received:', contractStats);
        
        if (contractStats.error) {
          throw new Error(`Contract error: ${contractStats.error}`);
        }

        // Use real contract data
        const userNFTs = contractStats.userBalance || 0;
        // const totalSupply = contractStats.totalSupply || 0; // Not used for display
        const hasAIAccess = contractStats.userHasAIAccess || false;
        
        setNftProofs(userNFTs);
        setHasAIAccess(hasAIAccess);
        // setTotalUsers(totalSupply); // Not needed for display
        
        // Calculate realistic metrics from NFT count
        const estimatedTasks = userNFTs; // Each NFT = completed task
        
        // setWorkHours(Math.round(estimatedHours * 10) / 10); // Using sessionHours instead
        setTasksCompleted(estimatedTasks);
        // isVerified is now read-only
        
        console.log(`✅ Loaded data: ${userNFTs} NFTs, AI Access: ${contractStats.userHasAIAccess}, Total Supply: ${contractStats.totalSupply}`);

      } catch (error) {
        console.error('Failed to load blockchain data:', error);
        // Set to 0 when API fails - no mock data
        // setWorkHours(0); // Not used anymore
        setTasksCompleted(0);
        setNftProofs(0);
        // setTotalUsers(0); // Not used anymore
        setHasAIAccess(false);
        // isVerified is now read-only
      } finally {
        setIsLoading(false);
      }
    };

    loadBlockchainData();
  }, [address]);

  // Remove transaction calls - this component only shows statistics

  // Remove notification handling - this component only shows statistics

  return (
    <Card title="⛓️ Meta WorkBase Logs">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="neu-card p-4 text-center">
            {isLoading ? (
              <div className="text-2xl font-bold text-[var(--app-foreground-muted)]">...</div>
            ) : (
              <div className="text-2xl font-bold gradient-accent bg-clip-text text-transparent">{Math.round(sessionHours * 10) / 10}h</div>
            )}
            <div className="text-xs text-[var(--app-foreground-muted)] mt-1">Session Time</div>
            <div className="w-full bg-[var(--app-accent-light)] rounded-full h-1 mt-2">
              <div className="gradient-accent h-1 rounded-full" style={{width: `${Math.min((sessionHours / 8) * 100, 100)}%`}}></div>
            </div>
          </div>
          <div className="neu-card p-4 text-center">
            {isLoading ? (
              <div className="text-2xl font-bold text-[var(--app-foreground-muted)]">...</div>
            ) : (
              <div className="text-2xl font-bold gradient-coral bg-clip-text text-transparent">{tasksCompleted}</div>
            )}
            <div className="text-xs text-[var(--app-foreground-muted)] mt-1">Tasks Done</div>
            <div className="w-full bg-[var(--app-accent-light)] rounded-full h-1 mt-2">
              <div className="gradient-coral h-1 rounded-full" style={{width: `${Math.min((tasksCompleted / 25) * 100, 100)}%`}}></div>
            </div>
          </div>
          <div className="neu-card p-4 text-center">
            {isLoading ? (
              <div className="text-2xl font-bold text-[var(--app-foreground-muted)]">...</div>
            ) : (
              <div className="text-2xl font-bold gradient-mint bg-clip-text text-transparent">{nftProofs}</div>
            )}
            <div className="text-xs text-[var(--app-foreground-muted)] mt-1">NFT Proofs</div>
            <div className="w-full bg-[var(--app-accent-light)] rounded-full h-1 mt-2">
              <div className="gradient-mint h-1 rounded-full" style={{width: `${Math.min((nftProofs / 100) * 100, 100)}%`}}></div>
            </div>
          </div>
          <div className="neu-card p-4 text-center">
            {isLoading ? (
              <div className="text-2xl font-bold text-[var(--app-foreground-muted)]">...</div>
            ) : (
              <div className={`text-lg font-bold ${hasAIAccess ? 'text-green-500' : 'text-gray-400'}`}>
                {hasAIAccess ? '✅' : '🔒'}
              </div>
            )}
            <div className="text-xs text-[var(--app-foreground-muted)] mt-1">AI Access</div>
            <div className="w-full bg-[var(--app-accent-light)] rounded-full h-1 mt-3">
              <div className={`h-1 rounded-full ${hasAIAccess ? 'bg-green-500' : 'bg-gray-300'}`} style={{width: hasAIAccess ? '100%' : '0%'}}></div>
            </div>
          </div>
        </div>

      </div>
    </Card>
  );
}
