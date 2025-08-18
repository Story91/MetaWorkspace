"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import useMiniKitFeatures from "../hooks/useMiniKitFeatures";
import { Button } from "./DemoComponents";
import { Icon } from "./DemoComponents";
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

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  avatar?: string;
}

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
        <div className="px-4 py-3 border-b border-[var(--app-card-border)] bg-gradient-to-r from-green-600 to-cyan-600">
          <h3 className="text-sm font-mono font-bold text-white flex items-center">
            <span className="mr-2 text-green-300">⚡</span>
            {title}
            <span className="ml-2 text-green-300">⚡</span>
          </h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

function ChatBubble({ message, isUser }: { message: ChatMessage; isUser: boolean }) {
  return (
    <div className={`flex items-start mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* AI Avatar (left side for AI messages) */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full gradient-coral text-white flex items-center justify-center text-sm mr-3">
          🤖
        </div>
      )}
      
      {/* Message Bubble */}
      <div className={`max-w-[75%] p-3 rounded-xl ${
        isUser 
          ? 'bg-[var(--app-accent)] text-white rounded-br-sm' 
          : 'bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-bl-sm'
      }`}>
        <div className={`text-sm ${isUser ? 'text-white' : 'text-[var(--app-foreground)]'}`}>
          <MessageContent content={message.content} isUser={isUser} />
        </div>
        <div className={`text-xs mt-1 ${
          isUser ? 'text-white/70' : 'text-[var(--app-foreground-muted)]'
        }`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* User Avatar (right side for user messages) */}
      {isUser && (
        <div className="w-8 h-8 rounded-full gradient-accent text-white flex items-center justify-center text-sm ml-3">
          👤
        </div>
      )}
    </div>
  );
}

function MessageContent({ content }: { content: string; isUser: boolean }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (codeContent: string, index: number) => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format message content with proper spacing and code blocks
  const formatContent = (text: string) => {
    // Split by code blocks first
    const parts = text.split(/```(\w*)\n?([\s\S]*?)```/g);
    const elements: React.ReactNode[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 3 === 0) {
        // Regular text - format with line breaks and bullets
        const textPart = parts[i];
        if (textPart.trim()) {
          const formattedText = textPart
            .split('\n')
            .map((line, lineIdx) => {
              const trimmedLine = line.trim();
              const uniqueKey = `text-${i}-${lineIdx}`;
              
              if (!trimmedLine) return <br key={uniqueKey} />;
              
              // Handle bullet points
              if (trimmedLine.startsWith('• ') || trimmedLine.startsWith('- ')) {
                return (
                  <div key={uniqueKey} className="ml-2 my-1">
                    <span className="text-green-400 mr-1">•</span>
                    {trimmedLine.substring(2)}
                  </div>
                );
              }
              
              // Handle numbered lists
              if (/^\d+\./.test(trimmedLine)) {
                return (
                  <div key={uniqueKey} className="ml-2 my-1">
                    {trimmedLine}
                  </div>
                );
              }
              
              // Handle headers (### Key Fields:)
              if (trimmedLine.startsWith('### ')) {
                return (
                  <div key={uniqueKey} className="font-bold mt-3 mb-2 text-green-300">
                    {trimmedLine.substring(4)}
                  </div>
                );
              }
              
              // Regular paragraph
              return (
                <div key={uniqueKey} className="my-2">
                  {trimmedLine}
                </div>
              );
            });
          elements.push(...formattedText);
        }
      } else if (i % 3 === 1) {
        // Language identifier
        continue;
      } else if (i % 3 === 2) {
        // Code block content
        const codeContent = parts[i];
        const language = parts[i - 1] || 'text';
        elements.push(
          <div key={i} className="my-3 p-3 bg-gray-900 rounded border border-green-500/30 overflow-x-auto relative">
            <div className="flex justify-between items-center mb-1">
              <div className="text-xs text-green-400 font-mono">{language}</div>
              <button
                onClick={() => handleCopy(codeContent, i)}
                className="text-xs text-green-300 hover:text-green-100 hover:bg-green-800/30 px-2 py-1 rounded transition-colors"
                title="Copy to clipboard"
              >
                {copiedIndex === i ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
            <pre className="text-xs font-mono text-green-100 whitespace-pre-wrap">
              {codeContent}
            </pre>
          </div>
        );
      }
    }
    
    return elements;
  };

  return <div className="leading-relaxed">{formatContent(content)}</div>;
}

export function AITaskAssistant() {
  const { notification, userProfile, fetchUserProfile, context } = useMiniKitFeatures();
  const { address } = useAccount();
  const [isClientMounted, setIsClientMounted] = useState(false);
  
  // AI Access Control
  const [hasAIAccess, setHasAIAccess] = useState<boolean | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false); // Start as false
  const [isPurchasingAccess, setIsPurchasingAccess] = useState(false);
  const [aiAccessPrice, setAiAccessPrice] = useState<string>("0");

  // Prepare transaction calls for OnchainKit
  const prepareAIAccessPurchase = useCallback(async () => {
    if (!address) return [];
    
    try {
      const chainConfig = getCurrentChainConfig();
      
      // Get the current AI access price from contract
      const response = await fetch('/api/blockchain/work-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchaseAIAccess',
          userAddress: address
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiAccessPrice(data.value);
        
        const contractCall = {
          to: chainConfig.contractAddress as `0x${string}`,
          data: encodeFunctionData({
            abi: METAWORKSPACE_NFT_ABI,
            functionName: 'purchaseAIAccess',
            args: []
          }),
          value: BigInt(data.value)
        };
        
        return [contractCall];
      }
    } catch (error) {
      console.error('Error preparing AI access purchase:', error);
    }
    
    return [];
  }, [address]);

  // Transaction calls for OnchainKit
  const [transactionCalls, setTransactionCalls] = useState<Array<{ to: `0x${string}`; data: `0x${string}` }>>([]);

  const getDefaultMessages = (): ChatMessage[] => [
    {
      id: 'default-welcome-message',
      type: 'ai',
      content: `Hi Developer! I'm your Base + Farcaster Mini Apps Expert. I have access to official documentation and specialize in:\n\n• Base Manifest (/.well-known/farcaster.json)\n• @farcaster/miniapp-sdk methods\n• Quick Auth & wallet signatures\n• Base App discovery & embeds\n\nHow can I help you build your Mini App?`,
      timestamp: new Date('2024-12-20T12:00:00Z'),
      avatar: '🤖'
    }
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(getDefaultMessages);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick action suggestions - User-focused
  const [quickActions] = useState([
    { id: 'manifest-helper', icon: '📋', text: 'Manifest helper', action: 'Create a complete /.well-known/farcaster.json manifest for MetaWorkspace Mini App' },
    { id: 'voice-recording', icon: '🎤', text: 'Record voice', action: 'How do I record my voice and save it as NFT in MetaWorkspace?' },
    { id: 'create-room', icon: '🏛️', text: 'Create room', action: 'How do I create a new workspace room?' },
    { id: 'get-help', icon: '❓', text: 'Get help', action: 'What can I do in MetaWorkspace? Show me the main features.' }
  ]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      // Smooth scroll to latest message without expanding the container
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end',
        inline: 'nearest'
      });
    }
  }, []);

  // Client-side mounting effect to load stored messages
  useEffect(() => {
    setIsClientMounted(true);
    try {
      const stored = localStorage.getItem('metaworkspace-chat-messages');
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedMessages = parsed.map((msg: { id: string; type: string; content: string; timestamp: string; avatar?: string }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(storedMessages);
      }
    } catch (error) {
      console.error('Failed to load stored messages:', error);
    }
  }, []);

  // Initialize client mount state and check access
  useEffect(() => {
    setIsClientMounted(true);
    // Initialize access check
    if (!address) {
      setHasAIAccess(false);
      setIsCheckingAccess(false);
    }
  }, [address]);



  // Save messages to localStorage whenever messages change (only after client mount)
  useEffect(() => {
    if (isClientMounted && messages.length > 0) {
      try {
        localStorage.setItem('metaworkspace-chat-messages', JSON.stringify(messages));
      } catch (error) {
        console.error('Failed to save messages:', error);
      }
    }
  }, [messages, isClientMounted]);

  // Auto-scroll to latest message when messages change
  useEffect(() => {
    // Only scroll when new messages are added (not on initial load)
    if (messages.length > 1) {
      setTimeout(() => {
        scrollToBottom();
      }, 100); // Small delay to ensure message is rendered
    }
  }, [messages, scrollToBottom]);

  // Check AI Access on component mount
  const checkAIAccess = useCallback(async () => {
    if (!address) {
      console.log('🔒 No wallet connected - AI access locked');
      setHasAIAccess(false);
      setIsCheckingAccess(false);
      return;
    }

    console.log(`🔍 Checking AI access for ${address.slice(0, 6)}...${address.slice(-4)}`);
    setIsCheckingAccess(true);

    try {
      const response = await fetch('/api/blockchain/work-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkAIAccess',
          userAddress: address
        })
      });

      if (response.ok) {
        const data = await response.json();
        const hasAccess = data.hasAccess;
        
        console.log(`${hasAccess ? '✅' : '❌'} AI Access check result: ${hasAccess ? 'ACTIVE' : 'LOCKED'}`);
        
        setHasAIAccess(hasAccess);
        
        // Notify user about their current status (only log, no toast to avoid spam)
        if (hasAccess) {
          console.log('🎉 User has AI access - full features available');
        } else {
          console.log('🔒 User needs to purchase AI access');
        }
      } else {
        console.error(`❌ API call failed with status: ${response.status}`);
        setHasAIAccess(false);
      }
    } catch (error) {
      console.error('❌ Error checking AI access:', error);
      setHasAIAccess(false);
    } finally {
      setIsCheckingAccess(false);
    }
  }, [address]);

  // Prepare transaction for OnchainKit
  const handlePrepareTransaction = useCallback(async () => {
    if (!address || isPurchasingAccess) return;

    console.log(`💳 Preparing AI access purchase for ${address.slice(0, 6)}...${address.slice(-4)}`);
    setIsPurchasingAccess(true);
    
    try {
      notification({
        title: "💳 Preparing Transaction",
        body: "Getting AI access price from contract..."
      });
      
      const calls = await prepareAIAccessPurchase();
      if (calls.length > 0) {
        setTransactionCalls(calls);
        const priceETH = (BigInt(aiAccessPrice) / BigInt(10**18)).toString();
        
        notification({
          title: "🚀 Transaction Ready",
          body: `Ready to purchase AI access for ${priceETH} ETH`
        });
      } else {
        throw new Error("Failed to prepare transaction");
      }
    } catch (error) {
      console.error('❌ Error preparing AI access purchase:', error);
      notification({
        title: "❌ Preparation Failed",
        body: error instanceof Error ? error.message : "Unknown error"
      });
      setIsPurchasingAccess(false);
    }
  }, [address, prepareAIAccessPurchase, aiAccessPrice, notification, isPurchasingAccess]);

  // Fetch user profile on component mount
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Check AI access when address changes
  useEffect(() => {
    if (address) {
      checkAIAccess();
    } else {
      setHasAIAccess(false);
      setIsCheckingAccess(false);
    }
  }, [address, checkAIAccess]);

  // Verify transaction using Basescan API
  const verifyTransactionAndGrantAccess = useCallback(async (transactionHash: string) => {
    if (!address) return;

    try {
      console.log(`🔍 Starting transaction verification for tx: ${transactionHash}`);
      
      notification({
        title: "🔍 Verifying Transaction",
        body: "Checking transaction confirmation on blockchain..."
      });

      // Poll for transaction verification with exponential backoff
      let attempts = 0;
      const maxAttempts = 8; // Reduced from 10
      const baseDelay = 3000; // Increased to 3 seconds
      const maxDelay = 30000; // Maximum 30 seconds between attempts

      const pollVerification = async (): Promise<boolean> => {
        attempts++;
        console.log(`🔍 Verification attempt ${attempts}/${maxAttempts} for tx: ${transactionHash}`);
        
        try {
          const response = await fetch('/api/blockchain/work-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'verifyAIAccessTransaction',
              userAddress: address,
              transactionHash
            })
          });

          if (!response.ok) {
            console.error(`API call failed with status: ${response.status}`);
            throw new Error(`API call failed: ${response.status}`);
          }

          const data = await response.json();
          
          if (data.verified && data.hasAccess) {
            console.log('🎉 SUCCESS: Transaction verified and AI access granted!');
            setHasAIAccess(true);
            setIsPurchasingAccess(false);
            
            notification({
              title: "🎉 AI Access Activated!",
              body: "Transaction verified. You now have lifetime AI access!"
            });
            
            console.log('✅ Refreshing AI access status from contract...');
            checkAIAccess(); // Refresh state
            return true;
          } else if (attempts < maxAttempts) {
            // Exponential backoff with max delay cap
            const delay = Math.min(baseDelay * Math.pow(2, attempts - 1), maxDelay);
            console.log(`❌ Transaction not confirmed yet, retrying in ${delay}ms (attempt ${attempts}/${maxAttempts})`);
            
            return new Promise(resolve => {
              setTimeout(() => {
                pollVerification().then(resolve).catch(resolve);
              }, delay);
            });
          } else {
            console.error(`❌ Transaction verification timeout after ${maxAttempts} attempts`);
            throw new Error('Transaction verification timeout - please check Basescan manually');
          }
        } catch (apiError) {
          console.error('API Error during verification:', apiError);
          if (attempts < maxAttempts) {
            const delay = Math.min(baseDelay * Math.pow(2, attempts - 1), maxDelay);
            console.log(`🔄 API error, retrying in ${delay}ms...`);
            
            return new Promise(resolve => {
              setTimeout(() => {
                pollVerification().then(resolve).catch(resolve);
              }, delay);
            });
          } else {
            throw new Error('API calls failed - verification timeout');
          }
        }
      };

      await pollVerification();

    } catch (error) {
      console.error('Error verifying transaction:', error);
      setIsPurchasingAccess(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      notification({
        title: "⚠️ Verification Failed", 
        body: `${errorMessage}. Check your transaction hash on Basescan.`
      });
      
      // Emergency: Check access directly from contract
      console.log('🆘 Emergency access check...');
      setTimeout(() => {
        checkAIAccess();
      }, 5000);
    }
  }, [address, notification, checkAIAccess]);

  // Transaction success handler for OnchainKit
  const handleTransactionSuccess = useCallback((response: unknown) => {
    console.log('✅ Transaction successful:', response);
    
    if ((response as { transactionHash?: string })?.transactionHash) {
      console.log('🔍 Starting Basescan verification process...');
      
      notification({
        title: "✅ Transaction Confirmed",
        body: "Now verifying with Basescan API..."
      });
      
      verifyTransactionAndGrantAccess((response as { transactionHash: string }).transactionHash);
    } else {
      console.log('🎉 AI access granted!');
      setHasAIAccess(true);
      setIsPurchasingAccess(false);
      
      notification({
        title: "🎉 AI Access Activated!",
        body: "You now have lifetime AI access!"
      });
      
      checkAIAccess(); // Refresh state
    }
  }, [verifyTransactionAndGrantAccess, notification, checkAIAccess]);

  // Transaction error handler for OnchainKit
  const handleTransactionError = useCallback((error: unknown) => {
    console.error('❌ Transaction failed:', error);
    setIsPurchasingAccess(false);
    
    notification({
      title: "❌ Transaction Failed",
      body: (error as { message?: string })?.message || "Transaction failed"
    });
    
    console.log('💡 User can try again or check wallet connection');
  }, [notification]);

  const callRealAI = useCallback(async (userMessage: string): Promise<string> => {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context: {
            roomId: 'metaworkspace-main-room',
            userId: context?.user?.fid || 'metaworkspace.eth',
            userProfile: userProfile,
            farcasterId: context?.user?.fid,
            previousMessages: messages.slice(-5).map(m => ({
              role: m.type === 'user' ? 'user' : 'assistant',
              content: m.content
            }))
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();
      return data.response || data.message || 'AI response received successfully.';
    } catch (error) {
      console.error('AI API call failed:', error);
      // Fallback to mock for demo purposes
      return `🔧 AI Service temporarily unavailable. Mock response: I understand you're asking about "${userMessage}". I can help you with task generation, meeting analysis, workflow optimization, and progress tracking. What specific aspect would you like to explore?`;
    }
  }, [messages, context?.user?.fid, userProfile]);

  const handleSendMessage = useCallback(async (message?: string) => {
    const messageToSend = message || inputValue.trim();
    if (!messageToSend || isProcessing || !isClientMounted) return;

    // Check AI access before sending message
    if (!hasAIAccess) {
      notification({
        title: "🚫 AI Access Required",
        body: "Please purchase access to continue."
      });
      return;
    }

    setIsProcessing(true);
    setInputValue('');

    // Add user message with stable ID generation
    const userMessage: ChatMessage = {
      id: `user-${messages.length + 1}-${Math.random().toString(36).substring(2, 15)}`,
      type: 'user',
      content: messageToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Show typing indicator
    setIsTyping(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    setIsTyping(false);

    // Generate AI response using real API
    try {
      const aiResponseContent = await callRealAI(messageToSend);
      const aiResponse: ChatMessage = {
        id: `ai-${messages.length + 2}-${Math.random().toString(36).substring(2, 15)}`,
        type: 'ai',
        content: aiResponseContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorResponse: ChatMessage = {
        id: `ai-error-${messages.length + 2}-${Math.random().toString(36).substring(2, 15)}`,
        type: 'ai',
        content: '❌ Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    }
    
    setIsProcessing(false);

    // Send notification
    await notification({
      title: "🤖 AI Assistant",
      body: "New response ready in your task assistant"
    });

    // Focus input for next message
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [inputValue, isProcessing, hasAIAccess, callRealAI, notification, isClientMounted, messages.length]);

  const handleQuickAction = useCallback(async (action: string, text: string) => {
    await handleSendMessage(text);
  }, [handleSendMessage]);

  const handlePurchaseAIAccess = useCallback(async () => {
    await handlePrepareTransaction();
  }, [handlePrepareTransaction]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // AI Access Loading
  if (isCheckingAccess) {
    return (
      <Card title="🤖 AI Task Assistant">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[var(--app-foreground-muted)]">Checking AI access...</span>
          </div>
        </div>
      </Card>
    );
  }

  // AI Access Gate
  if (!hasAIAccess) {
    return (
      <Card title="🤖 AI Task Assistant">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-500 to-cyan-500 rounded-full flex items-center justify-center text-2xl">
            🤖
          </div>
          
          <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-2">
            Unlock AI Assistant
          </h3>
          
          <p className="text-[var(--app-foreground-muted)] mb-6 max-w-md mx-auto">
            Get access to your personal AI assistant for task management, meeting planning, 
            and workspace optimization. Pay once and use forever!
          </p>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800 mb-6">
            <div className="text-2xl font-bold text-green-600 mb-1">
              0.0001 ETH
            </div>
            <div className="text-sm text-green-700 dark:text-green-300 mb-3">
              One-time payment • Lifetime access
            </div>
            <div className="text-xs text-green-600 space-y-1">
              <div>✅ Unlimited AI conversations</div>
              <div>✅ Task management & planning</div>
              <div>✅ Meeting organization</div>
              <div>✅ Workspace optimization tips</div>
            </div>
          </div>

          {transactionCalls.length > 0 ? (
            <Transaction
              calls={transactionCalls}
              onSuccess={handleTransactionSuccess}
              onError={handleTransactionError}
            >
              <TransactionButton 
                text="💳 Buy AI Access"
                className="bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700"
              />
              <TransactionStatus>
                <TransactionStatusAction />
                <TransactionStatusLabel />
              </TransactionStatus>
            </Transaction>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handlePurchaseAIAccess}
              disabled={isPurchasingAccess}
              icon={isPurchasingAccess ? 
                <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin"></div> :
                <span>💳</span>
              }
              className="bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700"
            >
              {isPurchasingAccess ? 'Preparing Transaction...' : 'Prepare AI Access Purchase'}
            </Button>
          )}

          <div className="text-xs text-[var(--app-foreground-muted)] mt-4">
            💡 One-time payment • Lifetime access to AI assistant
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-3">
        {/* AI Access Status Badge */}
        {address && (
          <div className="flex justify-between items-center p-2 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-[var(--app-foreground)]">AI Access Status:</span>
              {isCheckingAccess ? (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-[var(--app-foreground-muted)]">Checking...</span>
                </div>
              ) : hasAIAccess ? (
                <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900 rounded-full">
                  <span className="text-green-600 dark:text-green-400 text-xs">✅</span>
                  <span className="text-green-700 dark:text-green-300 text-xs font-medium">Active</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded-full">
                  <span className="text-gray-600 dark:text-gray-400 text-xs">🔒</span>
                  <span className="text-gray-700 dark:text-gray-300 text-xs font-medium">Locked</span>
                </div>
              )}
            </div>
            {hasAIAccess && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                💎 Lifetime Access
              </span>
            )}
          </div>
        )}

        {/* Chat Messages */}
        <div className="h-80 max-h-80 overflow-y-auto bg-gradient-to-b from-green-900/20 to-transparent p-3 rounded-lg border border-green-500/30 font-mono text-xs">
          {messages.slice(-10).map((message) => (
            <ChatBubble 
              key={message.id} 
              message={message} 
              isUser={message.type === 'user'} 
            />
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-8 h-8 rounded-full gradient-coral text-white flex items-center justify-center text-sm">
                🤖
              </div>
              <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] p-3 rounded-xl rounded-bl-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[var(--app-accent)] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[var(--app-accent)] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-[var(--app-accent)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-1">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action.action, action.text)}
              disabled={isProcessing || !isClientMounted || !hasAIAccess}
              className="text-left justify-start border-green-500/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 py-1 px-2 h-8 disabled:opacity-50"
            >
              <span className="mr-1 text-xs">{action.icon}</span>
              <span className="text-[10px] font-mono">{action.text}</span>
            </Button>
          ))}
        </div>

        {/* Message Input */}
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={hasAIAccess ? "Enter command for AI assistant..." : "AI Access required to chat"}
            disabled={isProcessing || !isClientMounted || !hasAIAccess}
            className="flex-1 neu-input text-sm font-mono border-green-500/30 focus:border-green-500 disabled:opacity-50"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isProcessing || !isClientMounted || !hasAIAccess}
            className="bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700"
            icon={isProcessing ? 
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div> :
              <Icon name="arrow-right" size="sm" />
            }
          >
            {isProcessing ? 'Processing...' : 'Send'}
          </Button>
        </div>


      </div>
    </Card>
  );
}

export default AITaskAssistant;
