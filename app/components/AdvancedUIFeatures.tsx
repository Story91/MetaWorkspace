"use client";

import { useState, useCallback } from "react";
import useMiniKitFeatures from "../hooks/useMiniKitFeatures";
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

export function AdvancedUIFeatures() {
  const { notification, shareURL } = useMiniKitFeatures();
  
  // File Upload State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Productivity Stats
  const [productivityData] = useState({
    todayTasks: 12,
    completedTasks: 8,
    focusTime: "4h 32m",
    teamCollabs: 6,
    aiSuggestions: 15,
    blockchainTxs: 3
  });

  // Team Activity Feed
  const [activityFeed] = useState([
    { id: 1, user: "alice.eth", action: "completed task", item: "UI Design Review", time: "5m ago", type: "task" },
    { id: 2, user: "bob.eth", action: "uploaded file", item: "project-specs.pdf", time: "12m ago", type: "file" },
    { id: 3, user: "carol.eth", action: "created meeting", item: "Design Sprint", time: "1h ago", type: "meeting" },
    { id: 4, user: "AI Assistant", action: "generated summary", item: "Weekly Progress", time: "2h ago", type: "ai" }
  ]);

  // Quick Tools
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleFileUpload = useCallback(async () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    await notification({
      title: "📁 File Upload Started",
      body: "Uploading to IPFS decentralized storage..."
    });

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          notification({
            title: "✅ Upload Complete",
            body: "File secured on blockchain with hash verification"
          });
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  }, [notification]);

  const handleQuickShare = useCallback(async () => {
    await shareURL({
      url: window.location.href,
      title: "🚀 Check out my MetaWorkspace AI productivity!",
      text: `I completed ${productivityData.completedTasks} tasks today with AI assistance!`
    });
    
    await notification({
      title: "📤 Productivity Shared!",
      body: "Your achievement has been broadcast to the network"
    });
  }, [shareURL, notification, productivityData]);

  const handleAIAssistRequest = useCallback(async (type: string) => {
    setSelectedTool(type);
    
    const requests = {
      'optimize': 'Analyzing your workflow for optimization opportunities...',
      'summarize': 'Creating intelligent summary of your work progress...',
      'translate': 'Translating content with context awareness...',
      'analyze': 'Performing deep analysis of team productivity patterns...'
    };

    await notification({
      title: `🤖 AI ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      body: requests[type as keyof typeof requests] || 'Processing your request...'
    });

    // Simulate AI processing
    setTimeout(async () => {
      await notification({
        title: "✨ AI Processing Complete",
        body: `${type.charAt(0).toUpperCase() + type.slice(1)} results are ready in your dashboard`
      });
      setSelectedTool(null);
    }, 3000);
  }, [notification]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task': return '✅';
      case 'file': return '📁';
      case 'meeting': return '🎤';
      case 'ai': return '🤖';
      default: return '💼';
    }
  };

  return (
    <Card title="🚀 Advanced Features">
      <div className="space-y-5">
        {/* Productivity Dashboard */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="star" className="text-indigo-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Today&apos;s Productivity</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="neu-card p-3 text-center">
              <div className="text-lg font-bold gradient-accent bg-clip-text text-transparent">
                {productivityData.completedTasks}/{productivityData.todayTasks}
              </div>
              <div className="text-xs text-[var(--app-foreground-muted)]">Tasks</div>
            </div>
            <div className="neu-card p-3 text-center">
              <div className="text-lg font-bold gradient-coral bg-clip-text text-transparent">
                {productivityData.focusTime}
              </div>
              <div className="text-xs text-[var(--app-foreground-muted)]">Focus</div>
            </div>
            <div className="neu-card p-3 text-center">
              <div className="text-lg font-bold gradient-mint bg-clip-text text-transparent">
                {productivityData.teamCollabs}
              </div>
              <div className="text-xs text-[var(--app-foreground-muted)]">Collabs</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-[var(--app-foreground-muted)]">
              🤖 {productivityData.aiSuggestions} AI suggestions • ⛓️ {productivityData.blockchainTxs} blockchain verifications
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickShare}
              icon={<Icon name="arrow-right" size="sm" />}
            >
              📤 Share
            </Button>
          </div>
        </div>

        {/* File Upload & Storage */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="check" className="text-green-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Decentralized Storage</span>
          </div>

          <div className="space-y-3">
            {isUploading ? (
              <div>
                <div className="flex items-center justify-between text-xs text-[var(--app-foreground-muted)] mb-1">
                  <span>Uploading to IPFS...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFileUpload}
                  icon={<Icon name="plus" size="sm" />}
                >
                  📁 Upload File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => notification({
                    title: "🔗 IPFS Browser",
                    body: "Opening decentralized file explorer..."
                  })}
                  icon={<Icon name="arrow-right" size="sm" />}
                >
                  🌐 Browse IPFS
                </Button>
              </div>
            )}

            <div className="text-xs text-[var(--app-foreground-muted)] text-center">
              🔒 Files encrypted • 🌐 Globally accessible • ⛓️ Blockchain verified
            </div>
          </div>
        </div>

        {/* AI Quick Tools */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="star" className="text-orange-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">AI Quick Tools</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'optimize', icon: '⚡', label: 'Optimize' },
              { id: 'summarize', icon: '📄', label: 'Summarize' },
              { id: 'translate', icon: '🌍', label: 'Translate' },
              { id: 'analyze', icon: '📊', label: 'Analyze' }
            ].map((tool) => (
              <Button
                key={tool.id}
                variant={selectedTool === tool.id ? "primary" : "outline"}
                size="sm"
                onClick={() => handleAIAssistRequest(tool.id)}
                disabled={selectedTool === tool.id}
                icon={selectedTool === tool.id ? 
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div> :
                  <span className="text-sm">{tool.icon}</span>
                }
              >
                {selectedTool === tool.id ? 'Processing...' : tool.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="heart" className="text-gray-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Live Activity Feed</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>

          <div className="space-y-2 max-h-32 overflow-y-auto">
            {activityFeed.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <span className="text-sm">{getActivityIcon(activity.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[var(--app-foreground)]">
                    <span className="font-medium">{activity.user}</span> {activity.action} {activity.item}
                  </div>
                  <div className="text-xs text-[var(--app-foreground-muted)]">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Status */}
        <div className="text-xs text-center text-[var(--app-foreground-muted)] bg-[var(--app-accent-light)] p-2 rounded">
          🔧 Connected: IPFS Storage • AI Processing • Blockchain Verification • Real-time Sync
        </div>
      </div>
    </Card>
  );
}

export default AdvancedUIFeatures;
