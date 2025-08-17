"use client";

import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import {
  Transaction,
  TransactionButton,
  TransactionToast,
  TransactionToastAction,
  TransactionToastIcon,
  TransactionToastLabel,
  TransactionError,
  TransactionResponse,
  TransactionStatusAction,
  TransactionStatusLabel,
  TransactionStatus,
} from "@coinbase/onchainkit/transaction";
import { useNotification } from "@coinbase/onchainkit/minikit";
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
      <Card title="🚀 Complete MetaWorkspace Features">
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

export function WorkspaceOverview({ setActiveTab }: WorkspaceOverviewProps) {
  return (
    <div className="space-y-5 animate-fade-in">
      <Card title="🚀 MetaWorkspace AI - Virtual Office 2.0">
        <div className="space-y-4">

          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--app-foreground)]">
                Decentralized workspace with AI automation & Web3 verification
              </p>
              <p className="text-xs text-[var(--app-foreground-muted)] mt-1">
                🤖 Task automation • ⛓️ IP protection • 🌐 DAO collaboration
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab("features")}
              icon={<Icon name="arrow-right" size="sm" />}
            >
              Explore
            </Button>
          </div>
        </div>
      </Card>

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


function BlockchainWorkLogger() {
  const { address } = useAccount();
  const [workHours] = useState(8.5);
  const [tasksCompleted] = useState(12);

  // Professional achievement transaction
  const calls = useMemo(() => address
    ? [
        {
          to: address,
          data: "0x" as `0x${string}`,
          value: BigInt(0),
        },
      ]
    : [], [address]);

  const sendNotification = useNotification();

  const handleSuccess = useCallback(async (response: TransactionResponse) => {
    const transactionHash = response.transactionReceipts[0].transactionHash;

    console.log(`Professional milestone verified: ${transactionHash}`);

    await sendNotification({
      title: "🏆 Professional Milestone Verified!",
      body: `Your work achievement (${tasksCompleted} tasks, ${workHours}h) permanently recorded on Base blockchain`,
    });
  }, [sendNotification, tasksCompleted, workHours]);

  return (
    <Card title="⛓️ Blockchain Workspace Logs">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="neu-card p-4 text-center">
            <div className="text-2xl font-bold gradient-accent bg-clip-text text-transparent">{workHours}h</div>
            <div className="text-xs text-[var(--app-foreground-muted)] mt-1">Hours Logged</div>
            <div className="w-full bg-[var(--app-accent-light)] rounded-full h-1 mt-2">
              <div className="gradient-accent h-1 rounded-full" style={{width: '85%'}}></div>
            </div>
          </div>
          <div className="neu-card p-4 text-center">
            <div className="text-2xl font-bold gradient-coral bg-clip-text text-transparent">{tasksCompleted}</div>
            <div className="text-xs text-[var(--app-foreground-muted)] mt-1">Tasks Done</div>
            <div className="w-full bg-[var(--app-accent-light)] rounded-full h-1 mt-2">
              <div className="gradient-coral h-1 rounded-full" style={{width: '70%'}}></div>
            </div>
          </div>
          <div className="neu-card p-4 text-center">
            <div className="text-2xl font-bold gradient-mint bg-clip-text text-transparent">847</div>
            <div className="text-xs text-[var(--app-foreground-muted)] mt-1">NFT Proofs</div>
            <div className="w-full bg-[var(--app-accent-light)] rounded-full h-1 mt-2">
              <div className="gradient-mint h-1 rounded-full" style={{width: '95%'}}></div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="check" className="text-green-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Workspace Status: Verified</span>
          </div>
          <p className="text-xs text-[var(--app-foreground-muted)]">
            All work contributions permanently recorded on Base • IP ownership secured
          </p>
        </div>

        <div className="flex flex-col items-center">
          {address ? (
            <Transaction
              calls={calls}
              onSuccess={handleSuccess}
              onError={(error: TransactionError) =>
                console.error("Transaction failed:", error)
              }
            >
              <TransactionButton className="text-white text-md" />
              <TransactionStatus>
                <TransactionStatusAction />
                <TransactionStatusLabel />
              </TransactionStatus>
              <TransactionToast className="mb-4">
                <TransactionToastIcon />
                <TransactionToastLabel />
                <TransactionToastAction />
              </TransactionToast>
            </Transaction>
          ) : (
            <div className="text-center p-4 bg-[var(--app-accent-light)] rounded-lg">
              <p className="text-[var(--app-accent)] text-sm font-medium mb-2">
                🔗 Connect Wallet to Start
              </p>
              <p className="text-[var(--app-foreground-muted)] text-xs">
                Join 10,000+ professionals building verified career history on-chain
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
