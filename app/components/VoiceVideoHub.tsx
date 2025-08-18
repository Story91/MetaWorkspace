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
  const [playingNFTId, setPlayingNFTId] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const recorder = useRef<RecordRTCInstance | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);

  // Load RecordRTC library and fetch NFTs with rate limiting
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/recordrtc@5.6.2/RecordRTC.min.js';
    script.async = true;
    document.head.appendChild(script);

    let retryTimeout: NodeJS.Timeout;

    // Load existing Voice NFTs from blockchain with retry mechanism
    const loadVoiceNFTs = async (retryCount = 0) => {
      try {
        console.log(`🔄 Loading Voice NFTs (attempt ${retryCount + 1})...`);
        const nfts = await blockchainService.getVoiceNFTsByRoom(currentRoomId);
        setVoiceNFTs(nfts);
        console.log(`✅ Loaded ${nfts.length} Voice NFTs successfully`);
      } catch (error) {
        console.error('Failed to load voice NFTs:', error);
        
        // Check if it's a rate limit error
        if (error instanceof Error && error.message.includes('rate limit')) {
          const maxRetries = 3;
          const retryDelay = (retryCount + 1) * 2000; // 2s, 4s, 6s
          
          if (retryCount < maxRetries) {
            console.log(`⏳ Rate limited. Retrying in ${retryDelay/1000}s... (${retryCount + 1}/${maxRetries})`);
            retryTimeout = setTimeout(() => {
              loadVoiceNFTs(retryCount + 1);
            }, retryDelay);
          } else {
            console.warn('❌ Max retries reached. Using cached NFTs if available.');
            // Keep existing NFTs instead of clearing them
          }
        } else {
          // For other errors, just log and keep existing NFTs
          console.warn('⚠️ Non-rate-limit error, keeping existing NFTs:', error instanceof Error ? error.message : String(error));
        }
      }
    };

    // Initial load with small delay to avoid immediate rate limiting
    const initialTimeout = setTimeout(() => {
      loadVoiceNFTs();
    }, 1000);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      clearTimeout(initialTimeout);
      clearTimeout(retryTimeout);
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
        console.log('Recording complete, blob details:', {
          size: blob.size,
          type: blob.type,
          timestamp: new Date().toISOString()
        });
        
        // Create download URL for the recording
        const url = URL.createObjectURL(blob);
        console.log('Recording available at:', url);
        
        // Additional debug: Try to play the recorded blob locally
        const testAudio = new Audio(url);
        testAudio.addEventListener('loadedmetadata', () => {
          console.log('Local audio duration:', testAudio.duration);
        });
        testAudio.addEventListener('error', (e) => {
          console.error('Local audio playback error:', e);
        });
      });
    } else {
      console.error('RecordRTC not available or recorder not initialized');
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
      body: `${recordingDuration}s recorded • Starting minting process...`
    });

    // Start minting animation
    setIsMinting(true);

    // Real blockchain upload if we have a recording
    // Note: recordedBlob is set asynchronously in the recording callback
    // So we check again after a small delay
    setTimeout(async () => {
      const blobToUse = recordedBlob || (recorder.current ? recorder.current.getBlob() : null);
      console.log('Blob to use for upload:', blobToUse?.size);
      
      if (blobToUse) {
        try {
          // Debug the blob before upload
          console.log('About to upload blob:', {
            size: blobToUse.size,
            type: blobToUse.type,
            duration: recordingDuration
          });

          // Check if blob is valid
          if (blobToUse.size === 0) {
            throw new Error("Recording blob is empty - no audio data captured");
          }

          if (blobToUse.size < 1000) { // Less than 1KB is probably too small
            console.warn('Warning: Blob size is very small, may not contain valid audio');
          }

          // Step 1: Wallet Connection
          await notification({
            title: "🔗 Step 1/4: Connecting Wallet",
            body: "Preparing blockchain connection..."
          });

          if (!isWalletConnected) {
            const account = await blockchainService.connectWallet();
            if (account) {
              setIsWalletConnected(true);
              await notification({
                title: "✅ Wallet Connected",
                body: "Proceeding to upload..."
              });
            } else {
              throw new Error("Wallet connection failed - required for minting");
            }
          }
          
          // Step 2: IPFS Upload
          await notification({
            title: "📤 Step 2/4: IPFS Upload",
            body: `Uploading ${(blobToUse.size / 1024).toFixed(1)}KB voice recording to IPFS...`
          });
          
          console.log('Starting IPFS upload with blob size:', blobToUse.size);
          
          const currentDate = new Date();
          const ipfsResult = await ipfsService.uploadFile(blobToUse, {
            type: 'voice-recording',
            name: `Voice Recording ${currentDate.toISOString()}`,
            description: `Voice recording from MetaWorkspace - ${formatDuration(recordingDuration)} duration`,
            roomId: currentRoomId,
            creator: blockchainService.getAccount() || '',
            duration: recordingDuration,
            transcription: `Voice recording from ${currentDate.toLocaleString()}`,
            participants: [blockchainService.getAccount() || 'unknown']
          });

          console.log('✅ IPFS upload result:', {
            fullHash: ipfsResult.hash,
            hashLength: ipfsResult.hash.length,
            hashType: ipfsResult.hash.startsWith('Qm') ? 'CIDv0 (SHA-256)' : 'CIDv1',
            size: `${(ipfsResult.size / 1024).toFixed(1)}KB`,
            url: ipfsResult.url,
            nativeUrl: ipfsResult.nativeUrl,
            metadata: ipfsResult.metadata,
            accessUrls: [
              `https://ipfs.io/ipfs/${ipfsResult.hash}`,
              `https://gateway.pinata.cloud/ipfs/${ipfsResult.hash}`,
              `https://cloudflare-ipfs.com/ipfs/${ipfsResult.hash}`
            ]
          });
          
          await notification({
            title: "✅ IPFS Upload Complete",
            body: `Full hash: ${ipfsResult.hash} • Size: ${(ipfsResult.size / 1024).toFixed(1)}KB`
          });

          // Step 3: AI Processing
          await notification({
            title: "🤖 Step 3/4: AI Processing",
            body: "Generating metadata and transcription..."
          });

          // Simulate AI processing time
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Step 4: Blockchain Minting
          await notification({
            title: "⛓️ Step 4/4: Minting NFT",
            body: "Creating your Voice NFT on Base blockchain..."
          });
          
          console.log('🔗 About to mint NFT with IPFS hash:', {
            ipfsHash: ipfsResult.hash,
            duration: recordingDuration,
            roomId: currentRoomId,
            transcription: `Voice recording from ${new Date().toLocaleString()}`
          });
          
          const result = await blockchainService.mintVoiceNFT(
            ipfsResult.hash,
            recordingDuration,
            currentRoomId,
            [], // Public recording
            `Voice recording from ${new Date().toLocaleString()}` // Transcription
          );
          
          console.log('⛓️ Minting result:', {
            success: result.success,
            hash: result.hash,
            error: result.error
          });

          if (result.success) {
            // Reload NFTs from blockchain with retry mechanism
            let reloadSuccess = false;
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                if (attempt > 0) {
                  console.log(`🔄 Retrying NFT reload (attempt ${attempt + 1}/3)...`);
                  await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // 0s, 2s, 4s delay
                }
                
                const nfts = await blockchainService.getVoiceNFTsByRoom(currentRoomId);
                setVoiceNFTs(nfts);
                
                console.log('🔄 Reloaded NFTs after minting:', nfts.length, 'NFTs found');
                
                // Verify the newly minted NFT contains correct IPFS hash
                const newNFT = nfts.find(nft => nft.ipfsHash === ipfsResult.hash);
                if (newNFT) {
                  console.log('✅ NFT verification successful:', {
                    tokenId: newNFT.tokenId,
                    ipfsHash: newNFT.ipfsHash,
                    duration: newNFT.duration,
                    creator: newNFT.creator
                  });
                } else {
                  console.warn('⚠️ Could not find newly minted NFT with matching IPFS hash yet - may need more time to propagate');
                }
                
                reloadSuccess = true;
                break;
              } catch (reloadError) {
                console.warn(`⚠️ NFT reload attempt ${attempt + 1} failed:`, reloadError);
                if (attempt === 2) {
                  console.error('❌ Failed to reload NFTs after all attempts. NFT was minted but may not appear immediately.');
                }
              }
            }
            
            await notification({
              title: "🎉 Voice NFT Minted Successfully!",
              body: `Your voice is now immortalized on blockchain! Transaction: ${result.hash.slice(0, 10)}... IPFS: ${ipfsResult.hash.slice(0, 8)}...${reloadSuccess ? '' : ' (may take a moment to appear)'}`
            });
          } else {
            throw new Error(result.error || "Minting transaction failed");
          }
        } catch (error) {
          console.error('Minting process failed:', error);
          await notification({
            title: "❌ Minting Failed",
            body: error instanceof Error ? error.message : "Recording saved locally. Please try minting again."
          });
        } finally {
          setIsMinting(false);
        }
      } else {
        setIsMinting(false);
        await notification({
          title: "❌ No Recording Found",
          body: "Unable to find recorded audio for minting"
        });
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

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handlePlayVoiceNFT = useCallback(async (nft: VoiceNFT) => {
    try {
      if (playingNFTId === nft.tokenId) {
        // Stop playing
        if (audioElement.current) {
          audioElement.current.pause();
          audioElement.current.currentTime = 0;
        }
        setPlayingNFTId(null);
        return;
      }

      // Stop any currently playing audio
      if (audioElement.current) {
        audioElement.current.pause();
      }

      setPlayingNFTId(nft.tokenId);
      
      await notification({
        title: "🔍 Loading Audio...",
        body: "Loading voice recording from IPFS..."
      });

      console.log('Playing real IPFS audio:', {
        tokenId: nft.tokenId,
        ipfsHash: nft.ipfsHash,
        duration: nft.duration
      });

      // Try multiple IPFS gateways for better compatibility
      const ipfsGateways = [
        `https://ipfs.io/ipfs/${nft.ipfsHash}`,
        `https://gateway.pinata.cloud/ipfs/${nft.ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${nft.ipfsHash}`,
        `https://copper-capable-manatee-313.mypinata.cloud/ipfs/${nft.ipfsHash}`
      ];

      let audioLoaded = false;
      
      for (const gateway of ipfsGateways) {
        if (audioLoaded) break;
        
        try {
          console.log(`🔊 Trying to load audio from: ${gateway}`);
          
          // Create new audio element for this attempt
          const audio = new Audio();
          audio.crossOrigin = 'anonymous'; // Handle CORS
          audio.preload = 'metadata';
          
          // Set up promise for loading
          const loadPromise = new Promise<boolean>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timeout loading audio'));
            }, 10000); // 10 second timeout
            
            audio.addEventListener('canplaythrough', () => {
              clearTimeout(timeout);
              resolve(true);
            }, { once: true });
            
            audio.addEventListener('error', (e) => {
              clearTimeout(timeout);
              console.warn(`Failed to load from ${gateway}:`, e);
              reject(new Error('Audio load error'));
            }, { once: true });
          });
          
          audio.src = gateway;
          
          // Wait for audio to load
          await loadPromise;
          
          // If we get here, audio loaded successfully
          audioElement.current = audio;
          audioLoaded = true;
          
          // Set up event listeners for playback
          audioElement.current.addEventListener('ended', () => {
            setPlayingNFTId(null);
            notification({
              title: "✅ Playback Complete",
              body: `Voice NFT #${nft.tokenId} finished playing`
            });
          });
          
          console.log(`✅ Successfully loaded audio from: ${gateway}`);
          await audioElement.current.play();
          
          await notification({
            title: "🎵 Playing Voice NFT",
            body: `Playing ${formatDuration(nft.duration)} recording from IPFS`
          });
          
        } catch (error) {
          console.warn(`Gateway ${gateway} failed:`, error);
          continue; // Try next gateway
        }
      }
      
      if (!audioLoaded) {
        throw new Error('All IPFS gateways failed to load audio');
      }
      
    } catch (error) {
      console.error('Error playing voice NFT:', error);
      setPlayingNFTId(null);
      await notification({
        title: "❌ Playback Error",
        body: "Unable to load audio from IPFS. The file might still be processing."
      });
    }
  }, [playingNFTId, notification]);

  const handleViewTransaction = useCallback((nft: VoiceNFT) => {
    // Use proper Basescan NFT format: /nft/CONTRACT_ADDRESS/TOKEN_ID
    const contractAddress = '0x3e9747E50635bC453071504cf959CFbdD3F736e4'; // MetaWorkspace NFT Contract on Base Mainnet
    const basescanUrl = `https://basescan.org/nft/${contractAddress}/${nft.tokenId}`;
    
    console.log(`Opening Basescan NFT page: ${basescanUrl}`);
    window.open(basescanUrl, '_blank');
    
    notification({
      title: "🔗 Opening Basescan",
      body: `Viewing Voice NFT #${nft.tokenId} on Base blockchain explorer`
    });
  }, [notification]);

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

          {/* Minting Animation */}
          {isMinting && (
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 rounded-lg border-2 border-blue-500/30 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    🎭 Minting Your Voice NFT...
                  </div>
                  <div className="text-xs text-blue-500/80">
                    Processing blockchain transaction • Please wait...
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-blue-600/70 mb-1">
                  <span>Minting Progress</span>
                  <span>Processing...</span>
                </div>
                <div className="w-full bg-blue-200/30 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--app-foreground)] mb-2">
              Voice NFTs in Room: ({voiceNFTs.length})
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {voiceNFTs
                .sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId)) // Sort by tokenId descending (newest first)
                .map((nft) => (
                <div key={nft.tokenId} className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">🎤</span>
                    <div>
                      <div className="text-sm font-medium text-[var(--app-foreground)]">
                        Voice NFT #{nft.tokenId}
                      </div>
                      <div className="text-xs text-[var(--app-foreground-muted)]">
                        {formatDuration(nft.duration)} • {new Date(nft.timestamp * 1000).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Europe/Warsaw'
                        })}
                      </div>
                      <div className="text-xs text-[var(--app-accent)]">
                        {nft.isPrivate ? '🔒 Private' : '🌐 Public'}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => handlePlayVoiceNFT(nft)}
                      title={playingNFTId === nft.tokenId ? "Stop playback" : "Play voice recording"}
                      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      disabled={isMinting}
                    >
                      {playingNFTId === nft.tokenId ? "⏸️" : "▶️"}
                    </button>
                    <button 
                      onClick={() => handleViewTransaction(nft)}
                      title="View NFT on Basescan"
                      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      🔗
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
