"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import useMiniKitFeatures from "../hooks/useMiniKitFeatures";
import { Button } from "./DemoComponents";
import { Icon } from "./DemoComponents";
import { blockchainService, type VoiceNFT } from "../services/blockchainService";
import { IPFSStorageService } from "../services/ipfsStorage";

// RecordRTC types
interface RecordRTCInstance {
  startRecording(): void;
  stopRecording(callback: () => void): void;
  getBlob(): Blob;
}

declare global {
  interface Window {
    RecordRTC: {
      new (stream: MediaStream, options: unknown): RecordRTCInstance;
      StereoAudioRecorder: unknown;
    };
  }
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

export function VoiceVideoHub() {
  const { notification } = useMiniKitFeatures();
  
  // Voice Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceNFTs, setVoiceNFTs] = useState<VoiceNFT[]>([]);
  const [currentRoomId] = useState("metaworkspace-main-room");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const ipfsService = useMemo(() => new IPFSStorageService(), []);
  
  // Video Meeting State
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  const [videoMeetings] = useState([
    { id: 1, title: "Team Standup", participants: 5, status: "live", time: "Now" },
    { id: 2, title: "Client Demo", participants: 3, status: "scheduled", time: "14:00" },
    { id: 3, title: "Design Review", participants: 8, status: "upcoming", time: "Tomorrow" }
  ]);
  
  // Real Audio Recording
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const recorder = useRef<RecordRTCInstance | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number | null>(null);

  // Load RecordRTC library and fetch NFTs
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/recordrtc@5.6.2/RecordRTC.min.js';
    script.async = true;
    document.head.appendChild(script);

    // Load existing Voice NFTs from blockchain
    const loadVoiceNFTs = async () => {
      try {
        const nfts = await blockchainService.getVoiceNFTsByRoom(currentRoomId);
        setVoiceNFTs(nfts);
      } catch (error) {
        console.error('Failed to load voice NFTs:', error);
      }
    };

    loadVoiceNFTs();

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [currentRoomId]);

  const setupAudioAnalyzer = useCallback((mediaStream: MediaStream): void => {
    try {
      audioContext.current = new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      const source = audioContext.current.createMediaStreamSource(mediaStream);
      source.connect(analyser.current);
      
      analyser.current.fftSize = 256;
      const bufferLength = analyser.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (!analyser.current) return;
        
        analyser.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setAudioLevel(Math.min(100, average * 2));
        
        animationFrame.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Audio analyzer setup failed:', error);
    }
  }, []);

  const handleStartVoiceRecording = useCallback(async () => {
    try {
      setIsRecordingVoice(true);
      setRecordingDuration(0);
      setRecordedBlob(null);
      
      await notification({
        title: "🎤 Voice Recording Started",
        body: "Speak now - recording will be processed by AI"
      });

      // Get user media
      stream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      // Setup audio analyzer for visual feedback
      setupAudioAnalyzer(stream.current);

      // Initialize RecordRTC when library is loaded
      if (window.RecordRTC) {
        recorder.current = new (window.RecordRTC as { new (stream: MediaStream, options: unknown): RecordRTCInstance })(stream.current, {
          type: 'audio',
          mimeType: 'audio/wav',
          recorderType: window.RecordRTC.StereoAudioRecorder,
          numberOfAudioChannels: 1,
          desiredSampRate: 16000,
          timeSlice: 1000,
          ondataavailable: (blob: Blob) => {
            console.log('Audio data available:', blob.size);
          }
        });
        
        recorder.current?.startRecording();
      }

      // Start duration timer
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          // Auto-stop at 30 seconds max
          if (newDuration >= 30) {
            setIsRecordingVoice(false);
            if (recordingInterval.current) {
              clearInterval(recordingInterval.current);
            }
          }
          return newDuration;
        });
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      await notification({
        title: "❌ Recording Failed",
        body: "Please allow microphone access to record voice messages"
      });
      setIsRecordingVoice(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification, setupAudioAnalyzer]);

  const handleStopVoiceRecording = useCallback(async () => {
    setIsRecordingVoice(false);
    
    // Clean up timers and audio
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
    }
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    
    // Stop recording and get blob
    if (recorder.current && window.RecordRTC) {
      recorder.current.stopRecording(() => {
        const blob = recorder.current!.getBlob();
        setRecordedBlob(blob);
        console.log('Recording complete, blob size:', blob.size);
        
        // Create download URL for the recording
        const url = URL.createObjectURL(blob);
        console.log('Recording available at:', url);
      });
    }
    
    // Clean up media stream
    if (stream.current) {
      stream.current.getTracks().forEach(track => track.stop());
    }
    if (audioContext.current) {
      audioContext.current.close();
    }
    
    setAudioLevel(0);
    
    await notification({
      title: "✅ Voice Recording Complete",
      body: `${recordingDuration}s recorded • Ready for blockchain upload`
    });

    // Real blockchain upload if we have a recording
    // Note: recordedBlob is set asynchronously in the recording callback
    // So we check again after a small delay
    setTimeout(async () => {
      const blobToUse = recordedBlob || (recorder.current ? recorder.current.getBlob() : null);
      console.log('Blob to use for upload:', blobToUse?.size);
      
      if (blobToUse) {
        try {
          // Connect wallet if not connected
          if (!isWalletConnected) {
            await notification({
              title: "🔗 Connect Wallet",
              body: "Please connect your wallet to mint NFT"
            });
            
            const account = await blockchainService.connectWallet();
            if (account) {
              setIsWalletConnected(true);
            } else {
              throw new Error("Wallet connection failed");
            }
          }
          
          await notification({
            title: "🤖 AI + Blockchain Processing",
            body: "Transcribing, creating NFT, and uploading to IPFS..."
          });
          
          // Upload to IPFS first
          const ipfsResult = await ipfsService.uploadFile(blobToUse, {
            type: 'voice-recording',
            name: `Voice Recording ${new Date().toISOString()}`,
            roomId: currentRoomId,
            creator: blockchainService.getAccount() || '',
            duration: recordingDuration
          });
          
          // Mint Voice NFT on blockchain
          const result = await blockchainService.mintVoiceNFT(
            ipfsResult.hash,
            recordingDuration,
            currentRoomId,
            [], // Public recording
            `Voice recording from ${new Date().toLocaleString()}` // Transcription
          );
          
          if (result.success) {
            // Reload NFTs from blockchain
            const nfts = await blockchainService.getVoiceNFTsByRoom(currentRoomId);
            setVoiceNFTs(nfts);
            
            await notification({
              title: "🎉 Voice NFT Created!",
              body: `Transaction: ${result.hash.slice(0, 10)}... • IPFS: ${ipfsResult.hash.slice(0, 10)}...`
            });
          } else {
            throw new Error(result.error || "Minting failed");
          }
        } catch (error) {
          console.error('Blockchain upload failed:', error);
          await notification({
            title: "⚠️ Blockchain Upload Failed",
            body: error instanceof Error ? error.message : "Recording saved locally. Please try again."
          });
        }
      }
    }, 1500);
  }, [notification, recordingDuration, currentRoomId, recordedBlob, isWalletConnected, ipfsService]);

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card title="🎤 Voice & Video Hub">
      <div className="space-y-5">
        {/* Voice Recording Section */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="star" className="text-purple-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Voice Messages</span>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${isRecordingVoice ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="text-sm text-[var(--app-foreground)]">
                {isRecordingVoice ? `Recording: ${formatDuration(recordingDuration)}` : "Ready to record"}
              </span>
            </div>
            
            {!isRecordingVoice ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartVoiceRecording}
                icon={<Icon name="plus" size="sm" />}
              >
                🎤 Record
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStopVoiceRecording}
                icon={<Icon name="check" size="sm" />}
              >
                ⏹️ Stop
              </Button>
            )}
          </div>

          {isRecordingVoice && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-[var(--app-foreground-muted)] mb-1">
                <span>Audio Level</span>
                <span>{Math.round(audioLevel)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-150 ${
                    audioLevel > 70 ? 'bg-red-500' : audioLevel > 40 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${audioLevel}%` }}
                ></div>
              </div>
              <div className="text-xs text-center text-[var(--app-foreground-muted)] mt-2">
                🎤 Recording: {formatDuration(recordingDuration)} / 30s max • Real-time audio analysis
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--app-foreground)] mb-2">Voice NFTs in Room:</div>
            {voiceNFTs.slice(0, 3).map((nft) => (
              <div key={nft.tokenId} className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">🎤</span>
                  <div>
                    <div className="text-sm font-medium text-[var(--app-foreground)]">
                      Voice NFT #{nft.tokenId}
                    </div>
                    <div className="text-xs text-[var(--app-foreground-muted)]">
                      {formatDuration(nft.duration)} • {new Date(nft.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-[var(--app-accent)]">
                      IPFS: {nft.ipfsHash.slice(0, 12)}... • {nft.isPrivate ? '🔒 Private' : '🌐 Public'}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm">
                    ▶️
                  </Button>
                  <Button variant="ghost" size="sm">
                    🔗
                  </Button>
                </div>
              </div>
            ))}
            {voiceNFTs.length === 0 && (
              <div className="text-xs text-center text-[var(--app-foreground-muted)] p-4 bg-[var(--app-accent-light)] rounded-lg">
                📭 No voice NFTs yet. Record your first message to create an NFT!
              </div>
            )}
          </div>
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

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-3">
            <Icon name="check" className="text-green-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Quick Actions</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartScreenShare}
              icon={<Icon name="plus" size="sm" />}
            >
              🖥️ Share Screen
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
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => notification({
                title: "🎥 Recording Started",
                body: "Meeting will be auto-transcribed"
              })}
              icon={<Icon name="plus" size="sm" />}
            >
              🎥 Record
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

        {/* AI Integration Status */}
        <div className="text-xs text-center text-[var(--app-foreground-muted)] bg-[var(--app-accent-light)] p-2 rounded">
          🤖 AI Features: Voice Transcription • Meeting Summaries • Auto Task Creation • Real-time Notes
        </div>
      </div>
    </Card>
  );
}

export default VoiceVideoHub;
