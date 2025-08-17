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

export function AdvancedCollaborationPanel() {
  const {
    viewCast,
    shareURL,
    notification,
    context,
    isAvailable
  } = useMiniKitFeatures();
  
  const [meetingCasts] = useState([
    { id: 1, hash: "0x123...abc", title: "Monday Team Standup", author: "alice.eth", timestamp: "2h ago" },
    { id: 2, hash: "0x456...def", title: "Project Planning Session", author: "bob.eth", timestamp: "1d ago" },
    { id: 3, hash: "0x789...ghi", title: "Design Review", author: "carol.eth", timestamp: "3d ago" }
  ]);

  const [collaborationMetrics] = useState({
    activeProjects: 7,
    teamMeetings: 15,
    sharedDocuments: 42,
    crossDaoConnections: 8
  });

  const handleViewMeetingCast = useCallback(async (castHash: string, title: string) => {
    try {
      await viewCast({ castHash });
      await notification({
        title: "📺 Meeting Cast Opened",
        body: `Viewing: ${title}`
      });
    } catch (error) {
      console.error("Failed to view cast:", error);
    }
  }, [viewCast, notification]);

  const handleShareProject = useCallback(async (projectTitle: string) => {
    try {
      await shareURL({
        url: `${window.location.href}#project-${encodeURIComponent(projectTitle)}`,
        title: `🚀 ${projectTitle} - MetaWorkspace AI`,
        text: "Check out our latest decentralized project collaboration!"
      });
      
      await notification({
        title: "🚀 Project Shared!",
        body: `${projectTitle} shared with your network`
      });
    } catch (error) {
      console.error("Failed to share project:", error);
    }
  }, [shareURL, notification]);

  const handleCreateMeeting = useCallback(async () => {
    await notification({
      title: "📅 Meeting Created!",
      body: "New collaboration session scheduled"
    });
  }, [notification]);

  return (
    <Card title="🤝 Advanced Collaboration Center">
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-2">
          <div className="neu-card p-3 text-center">
            <div className="text-lg font-bold gradient-accent bg-clip-text text-transparent">
              {collaborationMetrics.activeProjects}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Projects</div>
          </div>
          <div className="neu-card p-3 text-center">
            <div className="text-lg font-bold gradient-coral bg-clip-text text-transparent">
              {collaborationMetrics.teamMeetings}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Meetings</div>
          </div>
          <div className="neu-card p-3 text-center">
            <div className="text-lg font-bold gradient-mint bg-clip-text text-transparent">
              {collaborationMetrics.sharedDocuments}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Docs</div>
          </div>
          <div className="neu-card p-3 text-center">
            <div className="text-lg font-bold gradient-accent bg-clip-text text-transparent">
              {collaborationMetrics.crossDaoConnections}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">DAOs</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-3">
            <Icon name="star" className="text-blue-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Recent Meeting Casts</span>
          </div>
          <div className="space-y-2">
            {meetingCasts.map((cast) => (
              <div key={cast.id} className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--app-foreground)]">{cast.title}</div>
                  <div className="text-xs text-[var(--app-foreground-muted)]">
                    by {cast.author} • {cast.timestamp}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewMeetingCast(cast.hash, cast.title)}
                  icon={<Icon name="arrow-right" size="sm" />}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Icon name="heart" className="text-emerald-500" />
              <span className="text-sm font-medium text-[var(--app-foreground)]">Active Collaborations</span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareProject("AI Integration Project")}
                icon={<Icon name="plus" size="sm" />}
              >
                Share
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateMeeting}
                icon={<Icon name="plus" size="sm" />}
              >
                Meeting
              </Button>
            </div>
          </div>
          <div className="text-xs text-[var(--app-foreground-muted)]">
            🌐 Connected to {collaborationMetrics.crossDaoConnections} DAOs across ecosystem
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="star" className="text-orange-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Smart Meeting Recorder</span>
          </div>
          <div className="text-xs text-[var(--app-foreground-muted)] mb-3">
            AI generates summaries, action items, and deadlines automatically
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              🎤 Start Recording
            </Button>
            <Button variant="outline" size="sm">
              📝 View Summaries
            </Button>
          </div>
        </div>

        {context && (
          <div className="neu-card p-3 text-center">
            <div className="text-xs text-[var(--app-foreground-muted)]">
              Frame Context: {context.client?.name || "Farcaster"} • Advanced collaboration ready
            </div>
          </div>
        )}

        <div className="text-xs text-center text-[var(--app-foreground-muted)] bg-[var(--app-accent-light)] p-2 rounded">
          🚀 Collaboration Status: Sharing ✅ | Cast Viewing {isAvailable.socialGraph ? "✅" : "🔧"} | Notifications ✅
        </div>
      </div>
    </Card>
  );
}

export default AdvancedCollaborationPanel;
