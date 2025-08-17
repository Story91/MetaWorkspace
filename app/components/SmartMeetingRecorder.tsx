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

export function SmartMeetingRecorder() {
  const { notification } = useMiniKitFeatures();
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordings] = useState([
    {
      id: 1,
      title: "Team Planning Session",
      duration: "45:32",
      date: "2024-12-20",
      summary: "Discussed Q1 roadmap, assigned tasks to team members, set deadlines for MVP features",
      actionItems: [
        "Alice: Design wireframes by Friday",
        "Bob: Set up development environment",
        "Carol: Research competitor analysis"
      ],
      participants: ["alice.eth", "bob.eth", "carol.eth"]
    },
    {
      id: 2,
      title: "Client Presentation",
      duration: "30:15",
      date: "2024-12-19",
      summary: "Presented MetaWorkspace AI features, received positive feedback, discussed integration timeline",
      actionItems: [
        "Follow up with technical specifications",
        "Schedule next demo for Q1",
        "Prepare deployment documentation"
      ],
      participants: ["team@metaworkspace.ai", "client@company.com"]
    }
  ]);

  const [currentRecording, setCurrentRecording] = useState({
    duration: "00:00",
    participants: 0,
    audioLevel: 0
  });

  const handleStartRecording = useCallback(async () => {
    setIsRecording(true);
    setCurrentRecording(prev => ({ ...prev, participants: 1 }));
    
    await notification({
      title: "🎤 Recording Started!",
      body: "Smart AI transcription and analysis active"
    });

    // Simulate recording progress
    const interval = setInterval(() => {
      setCurrentRecording(prev => {
        const seconds = parseInt(prev.duration.split(':')[1]) + 1;
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;
        return {
          ...prev,
          duration: `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`,
          audioLevel: Math.random() * 100
        };
      });
    }, 1000);

    // Auto-stop after demo
    setTimeout(() => {
      clearInterval(interval);
      handleStopRecording();
    }, 10000);
  }, [notification]);

  const handleStopRecording = useCallback(async () => {
    setIsRecording(false);
    setCurrentRecording({ duration: "00:00", participants: 0, audioLevel: 0 });
    
    await notification({
      title: "✅ Recording Complete!",
      body: "AI is processing meeting summary and action items..."
    });

    // Simulate AI processing
    setTimeout(async () => {
      await notification({
        title: "🤖 AI Summary Ready!",
        body: "Meeting transcription, summary, and action items generated"
      });
    }, 3000);
  }, [notification]);

  const handleViewSummary = useCallback(async (recordingId: number) => {
    const recording = recordings.find(r => r.id === recordingId);
    if (recording) {
      await notification({
        title: "📄 Summary Opened",
        body: `Viewing summary for: ${recording.title}`
      });
    }
  }, [recordings, notification]);

  return (
    <Card title="🎤 Smart Meeting Recorder">
      <div className="space-y-5">
        {/* Recording Controls */}
        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="text-sm font-medium text-[var(--app-foreground)]">
                {isRecording ? "Recording Active" : "Ready to Record"}
              </span>
              {isRecording && (
                <span className="text-lg font-mono text-red-500">{currentRecording.duration}</span>
              )}
            </div>
            
            {!isRecording ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleStartRecording}
                icon={<Icon name="plus" size="sm" />}
              >
                🎤 Start Recording
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="md"
                onClick={handleStopRecording}
                icon={<Icon name="check" size="sm" />}
              >
                ⏹️ Stop Recording
              </Button>
            )}
          </div>

          {isRecording && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--app-foreground-muted)]">
                <span>Participants: {currentRecording.participants}</span>
                <span>Audio Level: {Math.round(currentRecording.audioLevel)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-green-500 h-1 rounded-full transition-all duration-300" 
                  style={{ width: `${currentRecording.audioLevel}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* AI Features */}
        <div className="grid grid-cols-3 gap-3">
          <div className="neu-card p-4 text-center gradient-accent text-white">
            <Icon name="star" className="mx-auto mb-2 text-yellow-300" />
            <div className="text-sm font-medium">AI Transcription</div>
            <div className="text-xs opacity-90 mt-1">Real-time</div>
          </div>
          <div className="neu-card p-4 text-center gradient-coral text-white">
            <Icon name="check" className="mx-auto mb-2 text-green-300" />
            <div className="text-sm font-medium">Action Items</div>
            <div className="text-xs opacity-90 mt-1">Auto-generated</div>
          </div>
          <div className="neu-card p-4 text-center gradient-mint">
            <Icon name="heart" className="mx-auto mb-2 text-purple-600" />
            <div className="text-sm font-medium text-[var(--app-foreground)]">Team Sync</div>
            <div className="text-xs text-[var(--app-foreground-muted)] mt-1">Blockchain logs</div>
          </div>
        </div>

        {/* Recent Recordings */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="star" className="text-blue-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Recent Recordings</span>
          </div>
          
          <div className="space-y-3">
            {recordings.map((recording) => (
              <div key={recording.id} className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--app-foreground)] mb-1">
                      {recording.title}
                    </div>
                    <div className="text-xs text-[var(--app-foreground-muted)] mb-2">
                      {recording.date} • {recording.duration} • {recording.participants.length} participants
                    </div>
                    <div className="text-xs text-[var(--app-foreground-muted)] mb-2">
                      {recording.summary}
                    </div>
                    <div className="text-xs">
                      <span className="font-medium text-[var(--app-accent)]">Action Items:</span>
                      <ul className="mt-1 ml-2">
                        {recording.actionItems.slice(0, 2).map((item, index) => (
                          <li key={index} className="text-[var(--app-foreground-muted)]">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewSummary(recording.id)}
                    icon={<Icon name="arrow-right" size="sm" />}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Status */}
        <div className="text-xs text-center text-[var(--app-foreground-muted)] bg-[var(--app-accent-light)] p-2 rounded">
          🤖 AI Features: Whisper Transcription • GPT-4 Summarization • Auto Action Items • Blockchain Logging
        </div>
      </div>
    </Card>
  );
}

export default SmartMeetingRecorder;
