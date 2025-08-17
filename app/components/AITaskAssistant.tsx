"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import useMiniKitFeatures from "../hooks/useMiniKitFeatures";
import { Button } from "./DemoComponents";
import { Icon } from "./DemoComponents";

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
  const { notification, userProfile, fetchUserProfile, context, viewProfile } = useMiniKitFeatures();
  
  // Load messages from localStorage on component mount
  const loadStoredMessages = (): ChatMessage[] => {
    if (typeof window === 'undefined') return defaultMessages;
    try {
      const stored = localStorage.getItem('metaworkspace-chat-messages');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((msg: { id: string; type: string; content: string; timestamp: string; avatar?: string }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load stored messages:', error);
    }
    return defaultMessages;
  };

  const getWelcomeMessage = () => {
    const userName = userProfile ? 
      (userProfile as { username?: string; displayName?: string }).username || 
      (userProfile as { username?: string; displayName?: string }).displayName || 
      'Developer' : 'Developer';
    
    return `Hi ${userName}! I'm your Base + Farcaster Mini Apps Expert. I have access to official documentation and specialize in:\n\n• Base Manifest (/.well-known/farcaster.json)\n• @farcaster/miniapp-sdk methods\n• Quick Auth & wallet signatures\n• Base App discovery & embeds\n\nHow can I help you build your Mini App?`;
  };

  const defaultMessages: ChatMessage[] = [
    {
      id: '1',
      type: 'ai',
      content: getWelcomeMessage(),
      timestamp: new Date(),
      avatar: '🤖'
    }
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(loadStoredMessages);
  
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

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        localStorage.setItem('metaworkspace-chat-messages', JSON.stringify(messages));
      } catch (error) {
        console.error('Failed to save messages:', error);
      }
    }
  }, [messages]);

  // Auto-scroll to latest message when messages change
  useEffect(() => {
    // Only scroll when new messages are added (not on initial load)
    if (messages.length > 1) {
      setTimeout(() => {
        scrollToBottom();
      }, 100); // Small delay to ensure message is rendered
    }
  }, [messages, scrollToBottom]);

  // Fetch user profile on component mount
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

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
  }, [messages]);

  const handleSendMessage = useCallback(async (message?: string) => {
    const messageToSend = message || inputValue.trim();
    if (!messageToSend || isProcessing) return;

    setIsProcessing(true);
    setInputValue('');

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
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
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponseContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
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
  }, [inputValue, isProcessing, callRealAI, notification]);

  const handleQuickAction = useCallback(async (action: string, text: string) => {
    await handleSendMessage(text);
  }, [handleSendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <Card>
      <div className="space-y-3">
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
              disabled={isProcessing}
              className="text-left justify-start border-green-500/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 py-1 px-2 h-8"
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
            placeholder="Enter command for AI assistant..."
            disabled={isProcessing}
            className="flex-1 neu-input text-sm font-mono border-green-500/30 focus:border-green-500"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isProcessing}
            className="bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700"
            icon={isProcessing ? 
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div> :
              <Icon name="arrow-right" size="sm" />
            }
          >
            {isProcessing ? 'Processing...' : 'Transact'}
          </Button>
        </div>


      </div>
    </Card>
  );
}

export default AITaskAssistant;
