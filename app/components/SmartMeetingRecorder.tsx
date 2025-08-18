"use client";

import { useState, useCallback, useEffect } from "react";
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
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  
  // Video Meetings State
  const [videoMeetings] = useState([
    { id: 1, title: "Team Standup", participants: 5, status: "live", time: "Now" },
    { id: 2, title: "Client Demo", participants: 3, status: "scheduled", time: "14:00" },
    { id: 3, title: "Design Review", participants: 8, status: "upcoming", time: "Tomorrow" }
  ]);
  const [recordings, setRecordings] = useState<Array<{
    id: number;
    title: string;
    duration: string;
    date: string;
    summary: string;
    actionItems: string[];
    participants: string[];
  }>>([]);

  // Load recordings from blockchain/IPFS
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        // Fetch real meeting recordings from blockchain
        const response = await fetch('/api/blockchain/nfts?type=video&room=metaworkspace-main');
        if (response.ok) {
          const data = await response.json();
          // Transform NFT data to recordings format
          const nftRecordings = data.nfts?.map((nft: {
            timestamp: number;
            duration: number;
            summary?: string;
            actionItems?: string[];
            participants?: string[];
          }, index: number) => ({
            id: index + 1,
            title: `Meeting ${new Date(nft.timestamp * 1000).toLocaleDateString()}`,
            duration: `${Math.floor(nft.duration / 60)}:${(nft.duration % 60).toString().padStart(2, '0')}`,
            date: new Date(nft.timestamp * 1000).toISOString().split('T')[0],
            summary: nft.summary || "AI-generated meeting summary",
            actionItems: nft.actionItems || ["Action items extracted by AI"],
            participants: nft.participants || ["Unknown participants"]
          })) || [];
          
          // Add demo data if no real recordings yet
          if (nftRecordings.length === 0) {
            setRecordings([
              {
                id: 1,
                title: "Demo: Team Planning Session",
                duration: "45:32",
                date: "2024-12-20",
                summary: "Demo recording - Discussed Q1 roadmap, assigned tasks to team members, set deadlines for MVP features",
                actionItems: [
                  "Alice: Design wireframes by Friday",
                  "Bob: Set up development environment",
                  "Carol: Research competitor analysis"
                ],
                participants: ["alice.eth", "bob.eth", "carol.eth"]
              }
            ]);
          } else {
            setRecordings(nftRecordings);
          }
        }
      } catch (error) {
        console.error('Failed to load recordings:', error);
        // Fallback to demo data
        setRecordings([
          {
            id: 1,
            title: "Demo: Team Planning Session",
            duration: "45:32",
            date: "2024-12-20",
            summary: "Demo recording - Failed to load from blockchain",
            actionItems: ["Check blockchain connection"],
            participants: ["demo.eth"]
          }
        ]);
      }
    };

    loadRecordings();
  }, []);

  const [currentRecording, setCurrentRecording] = useState({
    duration: "00:00",
    participants: 0,
    audioLevel: 0
  });

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
  }, [notification, handleStopRecording]);

  const handleViewSummary = useCallback(async (recordingId: number) => {
    const recording = recordings.find(r => r.id === recordingId);
    if (recording) {
      await notification({
        title: "📄 Summary Opened",
        body: `Viewing summary for: ${recording.title}`
      });
    }
  }, [recordings, notification]);

  // Video Meeting Handlers
  const handleJoinVideoCall = useCallback(async (meetingId: number) => {
    const meeting = videoMeetings.find((m: { id: number; title: string; participants: number; status: string; time: string }) => m.id === meetingId);
    setIsInVideoCall(true);
    
    await notification({
      title: "📹 Joining Video Call",
      body: `Connecting to ${meeting?.title}...`
    });

    // Simulate connection
    setTimeout(async () => {
      await notification({
        title: "🟢 Video Call Connected",
        body: `You're now in ${meeting?.title} with ${meeting?.participants} participants`
      });
    }, 2000);
  }, [videoMeetings, notification]);

  const handleStartScreenShare = useCallback(async () => {
    await notification({
      title: "🖥️ Screen Share Started",
      body: "Your screen is now being shared with the team"
    });
  }, [notification]);

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



        {/* Video Meetings Section */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="star" className="text-blue-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Video Meetings</span>
          </div>

          <div className="space-y-3">
            {videoMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-[var(--app-foreground)]">{meeting.title}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      meeting.status === 'live' ? 'bg-red-100 text-red-600' :
                      meeting.status === 'scheduled' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {meeting.status === 'live' ? '🔴 Live' : 
                       meeting.status === 'scheduled' ? '⏰ Soon' : '📅 Later'}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--app-foreground-muted)]">
                    {meeting.participants} participants • {meeting.time}
                  </div>
                </div>
                <div className="flex space-x-1">
                  {meeting.status === 'live' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleJoinVideoCall(meeting.id)}
                      icon={<Icon name="arrow-right" size="sm" />}
                    >
                      📹 Join
                    </Button>
                  )}
                  {meeting.status === 'scheduled' && (
                    <Button variant="outline" size="sm">
                      🔔 Remind
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video Quick Actions */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-3">
            <Icon name="check" className="text-green-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Video Quick Actions</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartScreenShare}
              icon={<Icon name="plus" size="sm" />}
            >
              🖥️ Share Screen
              <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1 rounded">Soon</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => notification({
                title: "📱 Instant Meeting",
                body: "Creating new video room..."
              })}
              icon={<Icon name="plus" size="sm" />}
            >
              📹 Start Meeting
              <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1 rounded">Soon</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => notification({
                title: "📞 Voice Call",
                body: "Calling team members..."
              })}
              icon={<Icon name="plus" size="sm" />}
            >
              📞 Voice Call
              <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1 rounded">Soon</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => notification({
                title: "🎥 Video NFT Recording",
                body: "Recording video for blockchain minting..."
              })}
              icon={<Icon name="plus" size="sm" />}
            >
              🎥 Record Video NFT
              <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-1 rounded">Beta</span>
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        {isInVideoCall && (
          <div className="neu-card p-3 gradient-accent text-white text-center">
            <div className="text-sm font-medium mb-1">📹 In Video Call</div>
            <div className="text-xs opacity-90">Connected with 5 participants</div>
            <div className="flex justify-center space-x-2 mt-2">
              <button className="px-2 py-1 bg-white/20 rounded text-xs">🎤 Mute</button>
              <button className="px-2 py-1 bg-white/20 rounded text-xs">📹 Video</button>
              <button 
                className="px-2 py-1 bg-red-500 rounded text-xs"
                onClick={() => setIsInVideoCall(false)}
              >
                📞 Leave
              </button>
            </div>
          </div>
        )}

        {/* Recent Recordings */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
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


      </div>
    </Card>
  );
}

export default SmartMeetingRecorder;
