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

function ChatBubble({ message, isUser }: { message: ChatMessage; isUser: boolean }) {
  return (
    <div className={`flex items-start space-x-3 mb-4 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
        isUser 
          ? 'gradient-accent text-white' 
          : 'gradient-coral text-white'
      }`}>
        {isUser ? '👤' : '🤖'}
      </div>
      
      {/* Message Bubble */}
      <div className={`max-w-[80%] p-3 rounded-xl ${
        isUser 
          ? 'bg-[var(--app-accent)] text-white rounded-br-sm' 
          : 'bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-bl-sm'
      }`}>
        <div className={`text-sm ${isUser ? 'text-white' : 'text-[var(--app-foreground)]'}`}>
          {message.content}
        </div>
        <div className={`text-xs mt-1 ${
          isUser ? 'text-white/70' : 'text-[var(--app-foreground-muted)]'
        }`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

export function AITaskAssistant() {
  const { notification } = useMiniKitFeatures();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hi! I\'m your AI Task Assistant. I can help you:\n\n• Generate tasks from conversations\n• Optimize your workflow\n• Transcribe meetings\n• Create project plans\n\nWhat would you like to work on today?',
      timestamp: new Date(),
      avatar: '🤖'
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick action suggestions
  const [quickActions] = useState([
    { id: 'meeting', icon: '🎤', text: 'Transcribe last meeting', action: 'transcribe' },
    { id: 'tasks', icon: '✅', text: 'Generate 5 tasks for today', action: 'generate_tasks' },
    { id: 'optimize', icon: '⚡', text: 'Optimize my workflow', action: 'optimize' },
    { id: 'plan', icon: '📋', text: 'Create project plan', action: 'plan' }
  ]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
            userId: 'metaworkspace.eth',
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
    <Card title="🧠 AI Task Assistant">
      <div className="space-y-4">
        {/* Chat Messages */}
        <div className="h-64 overflow-y-auto bg-gradient-to-b from-[var(--app-accent-light)] to-transparent p-3 rounded-lg border border-[var(--app-card-border)]">
          {messages.map((message) => (
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
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action.action, action.text)}
              disabled={isProcessing}
              className="text-left justify-start"
            >
              <span className="mr-2">{action.icon}</span>
              <span className="text-xs">{action.text}</span>
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
            placeholder="Ask AI to help with tasks, meetings, or planning..."
            disabled={isProcessing}
            className="flex-1 neu-input text-sm"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isProcessing}
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
