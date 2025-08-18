"use client";

import { useState, useCallback, useEffect } from "react";
import Image from 'next/image';
import useMiniKitFeatures from "../hooks/useMiniKitFeatures";
import { Button } from "./DemoComponents";
import { Icon } from "./DemoComponents";
import { useAccount } from "wagmi";
import { 
  Transaction, 
  TransactionButton, 
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel 
} from "@coinbase/onchainkit/transaction";
import { METAWORKSPACE_NFT_ABI } from "../constants/contractABI";
import { getCurrentChainConfig } from "../config/chains";
import { encodeFunctionData } from "viem";

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

export function SocialWorkspaceManager() {
  const {
    userProfile,
    generateQR,
    shareURL,
    notification,
    composeCast
  } = useMiniKitFeatures();
  
  const { address } = useAccount();
  const [contractStats, setContractStats] = useState({
    totalSupply: 0,
    totalUsers: 0,
    totalContent: 0
  });
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [signedMessage, setSignedMessage] = useState("");
  const [workProofCalls, setWorkProofCalls] = useState<Array<{ to: `0x${string}`; data: `0x${string}` }>>([]);

  // Load real contract statistics
  useEffect(() => {
    const loadContractStats = async () => {
      try {
        const response = await fetch('/api/blockchain/statistics');
        if (response.ok) {
          const stats = await response.json();
                   setContractStats({
           totalSupply: stats.totalSupply || 0,
           totalUsers: stats.uniqueCreators || stats.totalUsers || 0, // Use uniqueCreators as active users
           totalContent: stats.totalContent || 0
         });
        }
      } catch (error) {
        console.error('Failed to load contract stats:', error);
      }
    };

    loadContractStats();
  }, []);

  // Prepare work proof transaction (using voice NFT as proof of work)
  const prepareWorkProof = useCallback(async () => {
    if (!address) return [];
    
    try {
      const chainConfig = getCurrentChainConfig();
      
      // Create a proof-of-work NFT with current timestamp
      const currentDate = new Date();
      const proofData = {
        type: 'work-proof',
        timestamp: currentDate.toISOString(),
        worker: address,
        sessionHash: `proof_${Date.now()}`
      };
      
      const contractCall = {
        to: chainConfig.contractAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: METAWORKSPACE_NFT_ABI,
          functionName: 'mintVoiceNFT',
          args: [
            address,
            `work_proof_${Date.now()}`, // Using timestamp as IPFS hash
            BigInt(3600), // 1 hour of work
            'work-verification',
            [], // No whitelist - public proof
            JSON.stringify(proofData) // Work proof metadata
          ]
        })
      };
      
      return [contractCall];
    } catch (error) {
      console.error('Error preparing work proof:', error);
      return [];
    }
  }, [address]);

  const handleGenerateTeamQR = useCallback(async () => {
    setIsGeneratingQR(true);
    try {
      const qrData = await generateQR({
        type: "workspace_invite",
        workspaceId: "metaworkspace-ai",
        inviter: (userProfile as { username?: string })?.username || "anonymous"
      });
      console.log("Team QR generated:", qrData);
      setQrCodeData(qrData); // Save QR data to state
      
      await notification({
        title: "📱 QR Code Generated!",
        body: "Team invitation QR ready to share"
      });
    } catch (error) {
      console.error("QR generation failed:", error);
    } finally {
      setIsGeneratingQR(false);
    }
  }, [generateQR, userProfile, notification]);

  const handleSignWorkProof = useCallback(async () => {
    if (!address) {
      await notification({
        title: "❌ Wallet Required",
        body: "Please connect your wallet to sign work proof"
      });
      return;
    }

    try {
      await notification({
        title: "🔗 Preparing Work Proof",
        body: "Creating blockchain proof of work..."
      });

      const calls = await prepareWorkProof();
      if (calls.length > 0) {
        setWorkProofCalls(calls);
        
        await notification({
          title: "🚀 Work Proof Ready",
          body: "Click to mint your work verification NFT"
        });
      } else {
        throw new Error("Failed to prepare work proof transaction");
      }
    } catch (error) {
      console.error("Work proof preparation failed:", error);
      await notification({
        title: "❌ Preparation Failed",
        body: "Could not prepare work proof transaction"
      });
    }
  }, [address, prepareWorkProof, notification]);

  // Transaction handlers for work proof
  const handleWorkProofSuccess = useCallback(async (response: unknown) => {
    console.log('✅ Work proof transaction successful:', response);
    
    setSignedMessage("work_proof_verified");
    setWorkProofCalls([]);
    
    await notification({
      title: "🎉 Work Proof Verified!",
      body: "Your work has been recorded on the blockchain permanently"
    });
  }, [notification]);

  const handleWorkProofError = useCallback((error: unknown) => {
    console.error('❌ Work proof transaction failed:', error);
    setWorkProofCalls([]);
    
    notification({
      title: "❌ Work Proof Failed",
      body: (error as { message?: string })?.message || "Transaction failed"
    });
  }, [notification]);

  const handleShareOnFarcaster = useCallback(async () => {
    try {
      const userName = (userProfile as { username?: string; displayName?: string })?.username || 
                      (userProfile as { username?: string; displayName?: string })?.displayName || 
                      'Someone';
      
      const shareText = `🚀 ${userName} invited you to join MetaWorkspace AI!
      
Decentralized workspace with:
• AI-powered task management
• Blockchain-verified work NFTs  
• Farcaster team collaboration
• Voice & video meeting records

Join the future of work! 🤖⛓️`;

      const embeds = qrCodeData 
        ? [window.location.href, qrCodeData] as [string, string]
        : [window.location.href] as [string];

      composeCast({
        text: shareText,
        embeds: embeds
      });

      await notification({
        title: "📱 Shared on Farcaster!",
        body: "Workspace invitation posted to your feed"
      });

    } catch (error) {
      console.error('Farcaster share failed:', error);
      await notification({
        title: "❌ Share Failed",
        body: "Could not post to Farcaster. Please try again."
      });
    }
  }, [composeCast, userProfile, qrCodeData, notification]);

  const handleShareWorkspace = useCallback(async () => {
    try {
      // First try Farcaster sharing (better for viral growth)
      const userName = (userProfile as { username?: string; displayName?: string })?.username || 
                      (userProfile as { username?: string; displayName?: string })?.displayName || 
                      'Someone';

      composeCast({
        text: `Just joined MetaWorkspace AI! 🚀

AI-powered workspace for the future:
• Blockchain-verified productivity 
• Decentralized team collaboration
• Voice NFTs & meeting records

Join ${userName} and build the future of work! 🤖⛓️`,
        embeds: [window.location.href] as [string]
      });

      await notification({
        title: "📱 Shared on Farcaster!",
        body: "Posted your workspace invitation"
      });

    } catch (error) {
      console.error("Farcaster sharing failed, trying fallback:", error);
      
      // Fallback to native sharing
      try {
        const shareData = {
          url: window.location.href,
          title: "🚀 Join my MetaWorkspace AI team!",
          text: "Revolutionary AI-powered decentralized workspace for team collaboration"
        };
        await shareURL(shareData);
        
        await notification({
          title: "📤 Workspace Shared!",
          body: "Team invitation sent successfully"
        });
      } catch (fallbackError) {
        console.error("All sharing methods failed:", fallbackError);
      }
    }
  }, [composeCast, shareURL, notification, userProfile]);

  return (
    <Card title="🌐 Social Workspace Hub">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="neu-card p-4 gradient-accent text-white text-center">
            <div className="text-xl font-bold">{contractStats.totalSupply}</div>
            <div className="text-xs opacity-90 mt-1">Total NFTs</div>
            <div className="text-xs opacity-75 mt-1">On-chain</div>
          </div>
          <div className="neu-card p-4 gradient-coral text-white text-center">
            <div className="text-xl font-bold">{contractStats.totalUsers}</div>
            <div className="text-xs opacity-90 mt-1">Active Users</div>
            <div className="text-xs opacity-75 mt-1">Real-time</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-3">
            <Icon name="heart" className="text-purple-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Social Features</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateTeamQR}
              disabled={isGeneratingQR}
              icon={isGeneratingQR ? 
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div> :
                <Icon name="plus" size="sm" />
              }
            >
              {isGeneratingQR ? "Generating..." : "QR Invite"}
            </Button>
            
                         <Button
               variant="outline" 
               size="sm"
               onClick={handleShareWorkspace}
               icon={<Icon name="arrow-right" size="sm" />}
             >
               Share WorkBase
             </Button>
          </div>
        </div>

        {/* QR Code Display */}
        {qrCodeData && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
            <div className="flex items-center space-x-2 mb-3">
              <Icon name="check" className="text-blue-500" />
              <span className="text-sm font-medium text-[var(--app-foreground)]">Team Invitation QR Code</span>
            </div>
            <div className="flex justify-center mb-3">
              <Image 
                src={qrCodeData} 
                alt="Team Invitation QR Code" 
                width={192}
                height={192}
                className="border-2 border-gray-300 rounded-lg bg-white shadow-md"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-48 h-48 border-2 border-gray-300 rounded-lg bg-white flex items-center justify-center">
                        <div class="text-center text-gray-600">
                          <div class="text-2xl mb-2">📱</div>
                          <div class="text-xs">QR Code</div>
                          <div class="text-xs">Generation Failed</div>
                        </div>
                      </div>
                    `;
                  }
                }}
              />
            </div>
            <div className="text-center space-y-2">
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => navigator.clipboard.writeText(qrCodeData)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  📋 Copy QR Data
                </button>
                <span className="text-xs text-gray-400">•</span>
                <button
                  onClick={handleShareOnFarcaster}
                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                >
                  📱 Share on Farcaster
                </button>
              </div>
              <div className="text-xs text-gray-500">
                Invite your team to join MetaWorkspace AI
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-3">
            <Icon name="check" className="text-green-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Cryptographic Verification</span>
          </div>
          <div className="space-y-2">
            {workProofCalls.length > 0 ? (
              <Transaction
                calls={workProofCalls}
                onSuccess={handleWorkProofSuccess}
                onError={handleWorkProofError}
              >
                <TransactionButton 
                  text="🔐 Mint Work Proof NFT"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                />
                <TransactionStatus>
                  <TransactionStatusAction />
                  <TransactionStatusLabel />
                </TransactionStatus>
              </Transaction>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSignWorkProof}
                className="w-full"
                icon={<Icon name="check" size="sm" />}
              >
                🔐 Sign Work Proof
              </Button>
            )}
            {signedMessage && (
              <div className="text-xs bg-[var(--app-accent-light)] p-2 rounded text-center">
                ✅ Work proof verified on blockchain
              </div>
            )}
          </div>
        </div>

{(() => {
          const profile = userProfile as { username?: string; displayName?: string; bio?: string } | null;
          return profile && (
            <div className="neu-card p-4 text-center">
              <div className="text-sm font-medium text-[var(--app-foreground)] mb-1">
                Welcome, {profile.username || profile.displayName}!
              </div>
              <div className="text-xs text-[var(--app-foreground-muted)]">
                Professional workspace member since {new Date().getFullYear()}
              </div>
              <div className="text-xs text-[var(--app-foreground-muted)] mt-1">
                {profile.bio}
              </div>
            </div>
          );
        })()}


      </div>
    </Card>
  );
}

export default SocialWorkspaceManager;
