"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import useMiniKitFeatures from "../hooks/useMiniKitFeatures";
import { Button } from "./DemoComponents";
import { Icon } from "./DemoComponents";
import { blockchainService, type VoiceNFT } from "../services/blockchainService";
import { IPFSStorageService } from "../services/ipfsStorage";
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
  const { address } = useAccount();
  
  // Voice Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceNFTs, setVoiceNFTs] = useState<VoiceNFT[]>([]);
  const [currentRoomId] = useState("metaworkspace-main-room");
  // Remove unused isWalletConnected state
  // const [isWalletConnected, setIsWalletConnected] = useState(false);
  const ipfsService = useMemo(() => new IPFSStorageService(), []);
  
  // Voice Rooms State (mockup)
  const [voiceRooms] = useState([
    { id: 1, name: "General Voice Chat", participants: 3, status: "active", isPrivate: false },
    { id: 2, name: "Private Discussion", participants: 2, status: "active", isPrivate: true },
    { id: 3, name: "AI Voice Training", participants: 0, status: "empty", isPrivate: false }
  ]);
  
  // Real Audio Recording
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [playingNFTId, setPlayingNFTId] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [nftTransactionCalls, setNftTransactionCalls] = useState<Array<{ to: `0x${string}`; data: `0x${string}` }>>([]);

  // Utility function for formatting duration
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Prepare NFT minting transaction calls for OnchainKit
  const prepareNFTMinting = useCallback(async (ipfsHash: string, duration: number, roomId: string, transcription: string) => {
    if (!address) return [];
    
    try {
      const chainConfig = getCurrentChainConfig();
      
      const contractCall = {
        to: chainConfig.contractAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: METAWORKSPACE_NFT_ABI,
          functionName: 'mintVoiceNFT',
          args: [
            address, // to
            ipfsHash,
            BigInt(duration),
            roomId,
            [], // whitelistedUsers - public recording
            transcription
          ]
        })
      };
      
      return [contractCall];
    } catch (error) {
      console.error('Error preparing NFT minting:', error);
      return [];
    }
  }, [address]);

  // Transaction success handler for OnchainKit
  const handleNFTTransactionSuccess = useCallback(async (response: unknown) => {
    console.log('✅ NFT Transaction successful:', response);
    
    setIsMinting(false);
    
    await notification({
      title: "🎉 Voice NFT Minted!",
      body: "Your voice recording has been minted as an NFT!"
    });
    
    // Reload NFTs from blockchain with retry mechanism
    let reloadSuccess = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retrying NFT reload (attempt ${attempt + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
        
        const nfts = await blockchainService.getVoiceNFTsByRoom(currentRoomId);
        setVoiceNFTs(nfts);
        
        console.log('🔄 Reloaded NFTs after minting:', nfts.length, 'NFTs found');
        reloadSuccess = true;
        break;
      } catch (reloadError) {
        console.warn(`⚠️ NFT reload attempt ${attempt + 1} failed:`, reloadError);
      }
    }
    
    if (!reloadSuccess) {
      console.warn('⚠️ Failed to reload NFTs after all attempts');
    }
    
    // Clear transaction calls
    setNftTransactionCalls([]);
  }, [notification, currentRoomId]);

  // Transaction error handler for OnchainKit
  const handleNFTTransactionError = useCallback((error: unknown) => {
    console.error('❌ NFT Transaction failed:', error);
    setIsMinting(false);
    
    notification({
      title: "❌ NFT Minting Failed",
      body: (error as { message?: string })?.message || "Failed to mint NFT"
    });
    
    // Clear transaction calls
    setNftTransactionCalls([]);
  }, [notification]);

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

          // Step 1: Check Wallet (using MiniKit)
          await notification({
            title: "🔗 Step 1/4: Checking Wallet",
            body: "Using Farcaster wallet connection..."
          });

          if (!address) {
            throw new Error("Please connect your wallet in the app first");
          }
          
          await notification({
            title: "✅ Wallet Ready",
            body: "Proceeding to upload..."
          });
          
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
            creator: address || '',
            duration: recordingDuration,
            transcription: `Voice recording from ${currentDate.toLocaleString()}`,
            participants: [address || 'unknown']
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
          
          // Step 4: Prepare Blockchain Transaction
          await notification({
            title: "⛓️ Step 4/4: Preparing NFT Transaction",
            body: "Preparing Voice NFT minting transaction..."
          });
          
          console.log('🔗 About to prepare NFT minting with IPFS hash:', {
            ipfsHash: ipfsResult.hash,
            duration: recordingDuration,
            roomId: currentRoomId,
            transcription: `Voice recording from ${new Date().toLocaleString()}`
          });
          
          const transcription = `Voice recording from ${new Date().toLocaleString()}`;
          const transactionCalls = await prepareNFTMinting(
            ipfsResult.hash,
            recordingDuration,
            currentRoomId,
            transcription
          );
          
          if (transactionCalls.length > 0) {
            console.log('✅ Transaction prepared successfully');
            setNftTransactionCalls(transactionCalls);
            setIsMinting(false); // Stop the minting animation, now showing transaction UI
            
            await notification({
              title: "🚀 Transaction Ready!",
              body: "Click the button below to mint your Voice NFT"
            });
          } else {
            throw new Error("Failed to prepare NFT minting transaction");
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
  }, [notification, recordingDuration, currentRoomId, recordedBlob, address, ipfsService, formatDuration, prepareNFTMinting]);

  const handleJoinVoiceRoom = useCallback(async (roomId: number) => {
    const room = voiceRooms.find((r) => r.id === roomId);
    
    await notification({
      title: "🎤 Joining Voice Room",
      body: `Connecting to ${room?.name}...`
    });

    // Simulate connection
    setTimeout(async () => {
      await notification({
        title: "🟢 Voice Room Connected",
        body: `You're now in ${room?.name} with ${room?.participants} others`
      });
    }, 1500);
  }, [voiceRooms, notification]);

  const handleStartVoiceTranslation = useCallback(async () => {
    await notification({
      title: "🌍 Voice Translation Started",
      body: "Real-time voice translation activated"
    });
  }, [notification]);

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
  }, [playingNFTId, notification, formatDuration]);

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

          {/* Transaction UI for NFT Minting */}
          {nftTransactionCalls.length > 0 && (
            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 p-4 rounded-lg border-2 border-green-500/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                    🚀 Ready to Mint NFT
                  </div>
                  <div className="text-xs text-green-500/80">
                    Click to mint your voice recording as an NFT
                  </div>
                </div>
              </div>
              
              <Transaction
                calls={nftTransactionCalls}
                onSuccess={handleNFTTransactionSuccess}
                onError={handleNFTTransactionError}
              >
                <TransactionButton 
                  text="🎤 Mint Voice NFT"
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                />
                <TransactionStatus>
                  <TransactionStatusAction />
                  <TransactionStatusLabel />
                </TransactionStatus>
              </Transaction>
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

        {/* Voice Rooms Section */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-3 rounded-lg border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-1 mb-3">
            <span className="text-orange-500 text-xs">⭐</span>
            <span className="text-xs font-medium text-[var(--app-foreground)]">Voice Rooms</span>
          </div>

          <div className="space-y-2">
            {voiceRooms.map((room) => (
              <div key={room.id} className="flex items-center justify-between p-2 bg-white/40 dark:bg-gray-800/40 rounded-md border border-gray-200/30 dark:border-gray-700/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1 mb-1">
                    <span className="text-xs font-medium text-[var(--app-foreground)] truncate">{room.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      room.status === 'active' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {room.status === 'active' ? 'Active' : 'Empty'}
                    </span>
                    {room.isPrivate && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 flex-shrink-0">
                        Private
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--app-foreground-muted)] truncate">
                    {room.participants} participants • {room.isPrivate ? 'Invite only' : 'Open to all'}
                  </div>
                </div>
                <div className="ml-2 flex-shrink-0">
                  <button
                    className={`text-[10px] px-2 py-1 rounded-md flex items-center space-x-1 transition-colors ${
                      room.status === 'active' 
                        ? 'bg-blue-500 text-white hover:bg-blue-600' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => handleJoinVoiceRoom(room.id)}
                  >
                    <span className="text-[10px]">→</span>
                    <span className="text-[10px]">🎤</span>
                    <span className="text-[10px]">Join</span>
                    <span className="ml-1 text-[9px] bg-yellow-200 text-yellow-700 px-1 rounded dark:bg-yellow-900/30 dark:text-yellow-400">Soon</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Voice Features */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-1 mb-3">
            <span className="text-green-500 text-xs">✅</span>
            <span className="text-xs font-medium text-[var(--app-foreground)]">Voice Features</span>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5">
            <button
              className="flex items-center justify-center p-2 bg-white/40 dark:bg-gray-800/40 rounded-md border border-gray-200/30 dark:border-gray-700/30 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors"
              onClick={handleStartVoiceTranslation}
            >
              <div className="text-center">
                <div className="text-xs mb-1">🌍 Live</div>
                <div className="text-xs mb-1">Translation</div>
                <span className="text-[9px] bg-yellow-200 text-yellow-700 px-1 rounded dark:bg-yellow-900/30 dark:text-yellow-400">Soon</span>
              </div>
            </button>
            
            <button
              className="flex items-center justify-center p-2 bg-white/40 dark:bg-gray-800/40 rounded-md border border-gray-200/30 dark:border-gray-700/30 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors"
              onClick={() => notification({
                title: "🎭 Voice AI Clone",
                body: "Creating your AI voice clone..."
              })}
            >
              <div className="text-center">
                <div className="text-xs mb-1">🎭 AI</div>
                <div className="text-xs mb-1">Voice Clone</div>
                <span className="text-[9px] bg-yellow-200 text-yellow-700 px-1 rounded dark:bg-yellow-900/30 dark:text-yellow-400">Soon</span>
              </div>
            </button>
            
            <button
              className="flex items-center justify-center p-2 bg-white/40 dark:bg-gray-800/40 rounded-md border border-gray-200/30 dark:border-gray-700/30 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors"
              onClick={() => notification({
                title: "🎵 Voice to Music",
                body: "Converting voice to melody..."
              })}
            >
              <div className="text-center">
                <div className="text-xs mb-1">🎵 Voice</div>
                <div className="text-xs mb-1">to Music</div>
                <span className="text-[9px] bg-yellow-200 text-yellow-700 px-1 rounded dark:bg-yellow-900/30 dark:text-yellow-400">Soon</span>
              </div>
            </button>
            
            <button
              className="flex items-center justify-center p-2 bg-white/40 dark:bg-gray-800/40 rounded-md border border-gray-200/30 dark:border-gray-700/30 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors"
              onClick={() => notification({
                title: "🔊 Voice Enhancement",
                body: "AI-powered voice quality boost activated"
              })}
            >
              <div className="text-center">
                <div className="text-xs mb-1">🔊 Voice</div>
                <div className="text-xs mb-1">Enhance</div>
                <span className="text-[9px] bg-purple-200 text-purple-700 px-1 rounded dark:bg-purple-900/30 dark:text-purple-400">Beta</span>
              </div>
            </button>
          </div>
        </div>




      </div>
    </Card>
  );
}

export default VoiceVideoHub;
