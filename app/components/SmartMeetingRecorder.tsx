"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import useMiniKitFeatures from "../hooks/useMiniKitFeatures";
import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { Button } from "./DemoComponents";
import { Icon } from "./DemoComponents";
import { blockchainService, type VideoNFT } from "../services/blockchainService";
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
  const { composeCast } = useComposeCast();
  const { address } = useAccount();
  
  // const [isRecording, setIsRecording] = useState(false); // Unused
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  
  // Video Recording State
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoNFTs, setVideoNFTs] = useState<VideoNFT[]>([]);
  const [currentRoomId] = useState("metaworkspace-meeting-room");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [playingNFTId, setPlayingNFTId] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [videoTransactionCalls, setVideoTransactionCalls] = useState<Array<{ to: `0x${string}`; data: `0x${string}` }>>([]);
  
  // Modal and camera preview states
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [modalVideoSrc, setModalVideoSrc] = useState<string>("");
  const [modalVideoTitle, setModalVideoTitle] = useState<string>("");
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  
  const ipfsService = useMemo(() => new IPFSStorageService(), []);
  
  // Video recording refs
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  // const videoElement = useRef<HTMLVideoElement | null>(null); // Unused - using modal instead
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const processVideoForMintingRef = useRef<((blob: Blob) => Promise<void>) | null>(null);
  
  // Utility function for formatting duration
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Prepare NFT minting transaction calls for OnchainKit
  const prepareVideoNFTMinting = useCallback(async (ipfsHash: string, duration: number, roomId: string, description: string) => {
    console.log('🔗 prepareVideoNFTMinting called with:', { ipfsHash, duration, roomId, description, address });
    
    if (!address) {
      console.error('❌ No address available for minting');
      return [];
    }
    
    try {
      const chainConfig = getCurrentChainConfig();
      console.log('🔗 Chain config:', chainConfig);
      
      const contractCall = {
        to: chainConfig.contractAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: METAWORKSPACE_NFT_ABI,
          functionName: 'mintVideoNFT',
          args: [
            address, // to
            ipfsHash,
            BigInt(duration),
            roomId,
            [address || 'unknown'], // participants - array of strings
            description, // summary
            [] // whitelistedUsers - public recording
          ]
        })
      };
      
      console.log('✅ Contract call prepared:', contractCall);
      return [contractCall];
    } catch (error) {
      console.error('❌ Error preparing Video NFT minting:', error);
      return [];
    }
  }, [address]);

  // Process video blob for minting
  const processVideoForMinting = useCallback(async (videoBlob: Blob) => {
    try {
      console.log('✅ Processing video blob for minting:', {
        size: videoBlob.size,
        type: videoBlob.type,
        duration: recordingDuration
      });

      if (videoBlob.size === 0) {
        throw new Error("Video blob is empty - no video data captured");
      }

      // Step 1: Check Wallet
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
        body: `Uploading ${(videoBlob.size / 1024 / 1024).toFixed(1)}MB video to IPFS...`
      });
      
      console.log('Starting IPFS upload with video blob size:', videoBlob.size);
      
      const currentDate = new Date();
      const ipfsResult = await ipfsService.uploadFile(videoBlob, {
        type: 'video-meeting',
        name: `Video Recording ${currentDate.toISOString()}`,
        description: `Meeting video recording from MetaWorkspace - ${formatDuration(recordingDuration)} duration`,
        roomId: currentRoomId,
        creator: address || '',
        duration: recordingDuration,
        transcription: `Video recording from ${currentDate.toLocaleString()}`,
        participants: [address || 'unknown']
      });

      console.log('✅ IPFS upload result:', {
        fullHash: ipfsResult.hash,
        hashLength: ipfsResult.hash.length,
        size: `${(ipfsResult.size / 1024 / 1024).toFixed(1)}MB`,
        url: ipfsResult.url,
        nativeUrl: ipfsResult.nativeUrl
      });
      
      await notification({
        title: "✅ IPFS Upload Complete",
        body: `Hash: ${ipfsResult.hash} • Size: ${(ipfsResult.size / 1024 / 1024).toFixed(1)}MB`
      });

      // Step 3: AI Processing
      await notification({
        title: "🤖 Step 3/4: AI Processing",
        body: "Generating metadata and analysis..."
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 4: Prepare Blockchain Transaction
      await notification({
        title: "⛓️ Step 4/4: Preparing NFT Transaction",
        body: "Preparing Video NFT minting transaction..."
      });
      
      const description = `Meeting video recording from ${new Date().toLocaleString()}`;
      
      console.log('🔗 About to call prepareVideoNFTMinting with:', {
        ipfsHash: ipfsResult.hash,
        duration: recordingDuration,
        roomId: currentRoomId,
        description,
        address
      });
      
      const transactionCalls = await prepareVideoNFTMinting(
        ipfsResult.hash,
        recordingDuration,
        currentRoomId,
        description
      );
      
      console.log('🔗 prepareVideoNFTMinting returned:', transactionCalls);
      
      if (transactionCalls.length > 0) {
        console.log('✅ Video NFT Transaction prepared successfully');
        setVideoTransactionCalls(transactionCalls);
        setIsMinting(false); // Stop the minting animation, now showing transaction UI
        
        await notification({
          title: "🚀 Transaction Ready!",
          body: "Click the button below to mint your Video NFT"
        });
      } else {
        throw new Error("Failed to prepare Video NFT minting transaction");
      }
    } catch (error) {
      console.error('Video minting process failed:', error);
      await notification({
        title: "❌ Video Minting Failed",
        body: error instanceof Error ? error.message : "Video saved locally. Please try minting again."
      });
    } finally {
      setIsMinting(false);
    }
  }, [notification, recordingDuration, currentRoomId, address, ipfsService, formatDuration, prepareVideoNFTMinting]);

  // Update ref when function changes
  processVideoForMintingRef.current = processVideoForMinting;

  // Transaction success handler for OnchainKit
  const handleVideoNFTTransactionSuccess = useCallback(async (response: unknown) => {
    console.log('✅ Video NFT Transaction successful:', response);
    
    setIsMinting(false);
    
    await notification({
      title: "🎉 Video NFT Minted!",
      body: "Your video recording has been minted as an NFT!"
    });

    // Auto-suggest sharing after successful mint (viral moment!)
    setTimeout(() => {
      notification({
        title: "📱 Share Your Achievement!",
        body: "Tap the 📱 button to share your new video NFT on Farcaster"
      });
    }, 2000);
    
    // Reload NFTs from blockchain with retry mechanism
    let reloadSuccess = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retrying Video NFT reload (attempt ${attempt + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
        
        const nfts = await blockchainService.getVideoNFTsByRoom(currentRoomId);
        setVideoNFTs(nfts);
        
        console.log('🔄 Reloaded Video NFTs after minting:', nfts.length, 'NFTs found');
        reloadSuccess = true;
        break;
      } catch (reloadError) {
        console.warn(`⚠️ Video NFT reload attempt ${attempt + 1} failed:`, reloadError);
      }
    }
    
    if (!reloadSuccess) {
      console.warn('⚠️ Failed to reload Video NFTs after all attempts');
    }
    
    // Clear transaction calls
    setVideoTransactionCalls([]);
  }, [notification, currentRoomId]);

  // Transaction error handler for OnchainKit
  const handleVideoNFTTransactionError = useCallback((error: unknown) => {
    console.error('❌ Video NFT Transaction failed:', error);
    console.error('❌ Full error object:', JSON.stringify(error, null, 2));
    setIsMinting(false);
    
    const errorMessage = (error as { message?: string })?.message || 
                        (error as { reason?: string })?.reason ||
                        JSON.stringify(error) ||
                        "Failed to mint Video NFT";
    
    notification({
      title: "❌ Video NFT Minting Failed",
      body: errorMessage
    });
    
    // Clear transaction calls
    setVideoTransactionCalls([]);
  }, [notification]);
  
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

  // Load recordings and video NFTs from blockchain/IPFS
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

    // Load existing Video NFTs from blockchain with retry mechanism
    const loadVideoNFTs = async (retryCount = 0) => {
      try {
        console.log(`🔄 Loading Video NFTs (attempt ${retryCount + 1})...`);
        const nfts = await blockchainService.getVideoNFTsByRoom(currentRoomId);
        setVideoNFTs(nfts);
        console.log(`✅ Loaded ${nfts.length} Video NFTs successfully`);
      } catch (error) {
        console.error('Failed to load video NFTs:', error);
        
        // Check if it's a rate limit error
        if (error instanceof Error && error.message.includes('rate limit')) {
          const maxRetries = 3;
          const retryDelay = (retryCount + 1) * 2000; // 2s, 4s, 6s
          
          if (retryCount < maxRetries) {
            console.log(`⏳ Rate limited. Retrying in ${retryDelay/1000}s... (${retryCount + 1}/${maxRetries})`);
            setTimeout(() => {
              loadVideoNFTs(retryCount + 1);
            }, retryDelay);
          } else {
            console.warn('❌ Max retries reached. Using cached Video NFTs if available.');
          }
        } else {
          // For other errors, just log and keep existing NFTs
          console.warn('⚠️ Non-rate-limit error, keeping existing Video NFTs:', error instanceof Error ? error.message : String(error));
        }
      }
    };

    loadRecordings();
    
    // Initial load with small delay to avoid immediate rate limiting
    const initialTimeout = setTimeout(() => {
      loadVideoNFTs();
    }, 1500);

    return () => {
      clearTimeout(initialTimeout);
    };
  }, [currentRoomId]);

  // const [currentRecording, setCurrentRecording] = useState({
  //   duration: "00:00",
  //   participants: 0,
  //   audioLevel: 0
  // }); // Unused

  // Video Recording Handlers
  const handleStartVideoRecording = useCallback(async () => {
    try {
      console.log('🎥 Starting video recording...');
      setIsRecordingVideo(true);
      setRecordingDuration(0);
      setRecordedVideoBlob(null);
      setShowCameraPreview(true);
    
    await notification({
        title: "🎥 Video Recording Started",
        body: "Recording 15-second video for NFT minting..."
      });

      // Get user media with video and audio
      videoStream.current = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user' // Front camera on mobile
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Set up preview video element
      if (previewVideoRef.current && videoStream.current) {
        previewVideoRef.current.srcObject = videoStream.current;
        previewVideoRef.current.play();
      }

      // Initialize MediaRecorder
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
        audioBitsPerSecond: 128000   // 128 kbps for audio
      };

      mediaRecorder.current = new MediaRecorder(videoStream.current, options);
      const recordedChunks: Blob[] = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        console.log('📹 Video recording complete, blob details:', {
          size: blob.size,
          type: blob.type,
          timestamp: new Date().toISOString()
        });
        console.log('📹 recordedChunks length:', recordedChunks.length);
        console.log('📹 About to set recordedVideoBlob to:', blob);
        
        // Force immediate state update and continue processing
        setRecordedVideoBlob(blob);
        
        // Start processing immediately with the blob we just created
        setTimeout(() => {
          if (processVideoForMintingRef.current) {
            processVideoForMintingRef.current(blob);
          }
        }, 500); // Short delay to ensure state update
      };

      mediaRecorder.current.start();

      // Start duration timer (15 seconds max)
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          // Auto-stop at 15 seconds - using direct state update to avoid dependency
          if (newDuration >= 15) {
            // Trigger stop recording without direct function call
            setIsRecordingVideo(false);
            setShowCameraPreview(false);
            
            // Clean up in next tick
            setTimeout(() => {
              if (recordingInterval.current) {
                clearInterval(recordingInterval.current);
              }
              if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
                mediaRecorder.current.stop();
              }
              if (previewVideoRef.current) {
                previewVideoRef.current.srcObject = null;
              }
              if (videoStream.current) {
                videoStream.current.getTracks().forEach(track => track.stop());
              }
            }, 0);
          }
          return newDuration;
        });
      }, 1000);

    } catch (error) {
      console.error('Failed to start video recording:', error);
    await notification({
        title: "❌ Video Recording Failed",
        body: "Please allow camera and microphone access to record videos"
      });
      setIsRecordingVideo(false);
      setShowCameraPreview(false);
    }
  }, [notification]);

  const handleStopVideoRecording = useCallback(async () => {
    setIsRecordingVideo(false);
    setShowCameraPreview(false);
    
    // Clean up timers
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
    }
    
    // Stop recording
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    
    // Clean up preview video
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
    
    // Clean up media stream
    if (videoStream.current) {
      videoStream.current.getTracks().forEach(track => track.stop());
    }
    
      await notification({
      title: "✅ Video Recording Complete",
      body: `${recordingDuration}s recorded • Starting minting process...`
    });

    // Start minting animation
    setIsMinting(true);

    // Process the recorded video for IPFS upload - wait for blob to be ready
    const waitForBlob = async () => {
      console.log('🔄 Waiting for recorded video blob...');
      
      // Wait up to 5 seconds for the blob to be ready
      for (let i = 0; i < 50; i++) {
        if (recordedVideoBlob) {
          console.log('✅ Blob found after', i * 100, 'ms');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('🔄 Final recordedVideoBlob check:', recordedVideoBlob);
      console.log('🔄 Current recordingDuration:', recordingDuration);
      
      if (recordedVideoBlob) {
        try {
          console.log('✅ Found recordedVideoBlob, about to upload:', {
            size: recordedVideoBlob.size,
            type: recordedVideoBlob.type,
            duration: recordingDuration
          });

          if (recordedVideoBlob.size === 0) {
            throw new Error("Video blob is empty - no video data captured");
          }

          // Step 1: Check Wallet
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
            body: `Uploading ${(recordedVideoBlob.size / 1024 / 1024).toFixed(1)}MB video to IPFS...`
          });
          
          console.log('Starting IPFS upload with video blob size:', recordedVideoBlob.size);
          
          const currentDate = new Date();
          const ipfsResult = await ipfsService.uploadFile(recordedVideoBlob, {
            type: 'video-meeting',
            name: `Video Recording ${currentDate.toISOString()}`,
            description: `Meeting video recording from MetaWorkspace - ${formatDuration(recordingDuration)} duration`,
            roomId: currentRoomId,
            creator: address || '',
            duration: recordingDuration,
            transcription: `Video recording from ${currentDate.toLocaleString()}`,
            participants: [address || 'unknown']
          });

          console.log('✅ IPFS upload result:', {
            fullHash: ipfsResult.hash,
            hashLength: ipfsResult.hash.length,
            size: `${(ipfsResult.size / 1024 / 1024).toFixed(1)}MB`,
            url: ipfsResult.url,
            nativeUrl: ipfsResult.nativeUrl
          });
          
          await notification({
            title: "✅ IPFS Upload Complete",
            body: `Hash: ${ipfsResult.hash} • Size: ${(ipfsResult.size / 1024 / 1024).toFixed(1)}MB`
          });

          // Step 3: AI Processing
          await notification({
            title: "🤖 Step 3/4: AI Processing",
            body: "Generating metadata and analysis..."
          });

          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Step 4: Prepare Blockchain Transaction
          await notification({
            title: "⛓️ Step 4/4: Preparing NFT Transaction",
            body: "Preparing Video NFT minting transaction..."
          });
          
          const description = `Meeting video recording from ${new Date().toLocaleString()}`;
          
          console.log('🔗 About to call prepareVideoNFTMinting with:', {
            ipfsHash: ipfsResult.hash,
            duration: recordingDuration,
            roomId: currentRoomId,
            description,
            address
          });
          
          const transactionCalls = await prepareVideoNFTMinting(
            ipfsResult.hash,
            recordingDuration,
            currentRoomId,
            description
          );
          
          console.log('🔗 prepareVideoNFTMinting returned:', transactionCalls);
          
          if (transactionCalls.length > 0) {
            console.log('✅ Video NFT Transaction prepared successfully');
            setVideoTransactionCalls(transactionCalls);
            setIsMinting(false); // Stop the minting animation, now showing transaction UI
            
            await notification({
              title: "🚀 Transaction Ready!",
              body: "Click the button below to mint your Video NFT"
            });
          } else {
            throw new Error("Failed to prepare Video NFT minting transaction");
          }
        } catch (error) {
          console.error('Video minting process failed:', error);
          await notification({
            title: "❌ Video Minting Failed",
            body: error instanceof Error ? error.message : "Video saved locally. Please try minting again."
          });
        } finally {
          setIsMinting(false);
        }
      } else {
        console.error('❌ No recordedVideoBlob found in timeout!');
        console.log('🔍 Trying to get blob from recorder:', mediaRecorder.current);
        
        // Try to get blob directly from mediaRecorder if state wasn't set
        const blobFromRecorder = mediaRecorder.current ? 
          (mediaRecorder.current as MediaRecorder & { getBlob?: () => Blob | null }).getBlob?.() || null : null;
        
        console.log('🔍 Blob from recorder:', blobFromRecorder);
        
        setIsMinting(false);
        await notification({
          title: "❌ No Video Found",
          body: "Unable to find recorded video for minting"
        });
      }
    };
    
    // Start the blob waiting process
    waitForBlob();
  }, [notification, recordingDuration, currentRoomId, recordedVideoBlob, address, ipfsService, formatDuration, prepareVideoNFTMinting]);

  const handlePlayVideoNFT = useCallback(async (nft: VideoNFT) => {
    try {
      // Open video in modal instead of inline playback
      setModalVideoTitle(`Video NFT #${nft.tokenId}`);
      setPlayingNFTId(nft.tokenId);
      
      await notification({
        title: "🔍 Loading Video...",
        body: "Loading video recording from IPFS..."
      });

      console.log('Playing real IPFS video in modal:', {
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

      let videoLoaded = false;
      
      for (const gateway of ipfsGateways) {
        if (videoLoaded) break;
        
        try {
          console.log(`🎥 Trying to load video from: ${gateway}`);
          
          // Test if video loads before showing modal
          const testVideo = document.createElement('video');
          testVideo.crossOrigin = 'anonymous';
          testVideo.preload = 'metadata';
          
          const loadPromise = new Promise<boolean>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timeout loading video'));
            }, 10000); // 10 second timeout for video
            
            testVideo.addEventListener('canplaythrough', () => {
              clearTimeout(timeout);
              resolve(true);
            }, { once: true });
            
            testVideo.addEventListener('error', (e) => {
              clearTimeout(timeout);
              console.warn(`Failed to load from ${gateway}:`, e);
              reject(new Error('Video load error'));
            }, { once: true });
          });
          
          testVideo.src = gateway;
          await loadPromise;
          
          // If video loads successfully, set modal source and show modal
          setModalVideoSrc(gateway);
          setShowVideoModal(true);
          videoLoaded = true;
          
          console.log(`✅ Successfully loaded video from: ${gateway}`);
          
          await notification({
            title: "🎥 Video Ready",
            body: `Playing ${formatDuration(nft.duration)} video in modal`
          });
          
        } catch (error) {
          console.warn(`Gateway ${gateway} failed:`, error);
          continue;
        }
      }
      
      if (!videoLoaded) {
        throw new Error('All IPFS gateways failed to load video');
      }
      
    } catch (error) {
      console.error('Error playing video NFT:', error);
      setPlayingNFTId(null);
      await notification({
        title: "❌ Video Playback Error",
        body: "Unable to load video from IPFS. The file might still be processing."
      });
    }
  }, [notification, formatDuration]);

  const handleCloseVideoModal = useCallback(() => {
    setShowVideoModal(false);
    setModalVideoSrc("");
    setModalVideoTitle("");
    setPlayingNFTId(null);
  }, []);

  const handleShareVideoNFT = useCallback((nft: VideoNFT) => {
    try {
      const shareText = `🎥 Just minted my ${formatDuration(nft.duration)}s video as an NFT! Check out my creation on MetaWorkspace 🚀`;
      
      composeCast({
        text: shareText,
        embeds: [
          window.location.href, // App URL for discovery
          `https://basescan.org/nft/0x3e9747E50635bC453071504cf959CFbdD3F736e4/${nft.tokenId}` // NFT link
        ]
      });

      notification({
        title: "📱 Farcaster Cast Opened",
        body: "Share your video NFT with the world!"
      });
    } catch (error) {
      console.error('Failed to compose cast:', error);
      notification({
        title: "❌ Sharing Failed",
        body: "Unable to open Farcaster composer"
      });
    }
  }, [composeCast, formatDuration, notification]);

  const handleViewVideoTransaction = useCallback((nft: VideoNFT) => {
    const contractAddress = '0x3e9747E50635bC453071504cf959CFbdD3F736e4';
    const basescanUrl = `https://basescan.org/nft/${contractAddress}/${nft.tokenId}`;
    
    console.log(`Opening Basescan Video NFT page: ${basescanUrl}`);
    window.open(basescanUrl, '_blank');
    
    notification({
      title: "🔗 Opening Basescan",
      body: `Viewing Video NFT #${nft.tokenId} on Base blockchain explorer`
    });
  }, [notification]);

  // const handleStopRecording = useCallback(async () => {
  //   setIsRecording(false);
  //   setCurrentRecording({ duration: "00:00", participants: 0, audioLevel: 0 });
  //   
  //   await notification({
  //     title: "✅ Recording Complete!",
  //     body: "AI is processing meeting summary and action items..."
  //   });

  //   // Simulate AI processing
  //   setTimeout(async () => {
  //     await notification({
  //       title: "🤖 AI Summary Ready!",
  //       body: "Meeting transcription, summary, and action items generated"
  //     });
  //   }, 3000);
  // }, [notification]); // Unused

  // const handleStartRecording = useCallback(async () => {
  //   setIsRecording(true);
  //   setCurrentRecording(prev => ({ ...prev, participants: 1 }));
  //   
  //   await notification({
  //     title: "🎤 Recording Started!",
  //     body: "Smart AI transcription and analysis active"
  //   });

  //   // Simulate recording progress
  //   const interval = setInterval(() => {
  //     setCurrentRecording(prev => {
  //       const seconds = parseInt(prev.duration.split(':')[1]) + 1;
  //       const minutes = Math.floor(seconds / 60);
  //       const displaySeconds = seconds % 60;
  //       return {
  //         ...prev,
  //         duration: `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`,
  //         audioLevel: Math.random() * 100
  //       };
  //     });
  //   }, 1000);

  //   // Auto-stop after demo
  //   setTimeout(() => {
  //     clearInterval(interval);
  //     handleStopRecording();
  //   }, 10000);
  // }, [notification]); // Unused

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
        {/* Video Recording Section */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="star" className="text-purple-500" />
            <span className="text-sm font-medium text-[var(--app-foreground)]">Video NFT Recording</span>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${isRecordingVideo ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="text-sm text-[var(--app-foreground)]">
                {isRecordingVideo ? `Recording: ${formatDuration(recordingDuration)} / 15s` : "Ready to record (15s max)"}
              </span>
            </div>
            
            {!isRecordingVideo ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartVideoRecording}
                disabled={isMinting}
                icon={<Icon name="plus" size="sm" />}
              >
                🎥 Start Recording
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStopVideoRecording}
                icon={<Icon name="check" size="sm" />}
              >
                ⏹️ Stop Recording
              </Button>
            )}
          </div>

          {isRecordingVideo && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-[var(--app-foreground-muted)] mb-1">
                <span>Recording Progress</span>
                <span>{Math.round((recordingDuration / 15) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-150 ${
                    recordingDuration > 12 ? 'bg-red-500' : recordingDuration > 8 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${(recordingDuration / 15) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-center text-[var(--app-foreground-muted)] mt-2">
                🎥 Recording: {formatDuration(recordingDuration)} / 15s max • 720p HD with audio
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
                    🎥 Minting Your Video NFT...
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

          {/* Transaction UI for Video NFT Minting */}
          {videoTransactionCalls.length > 0 && (
            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 p-4 rounded-lg border-2 border-green-500/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                    🚀 Ready to Mint Video NFT
                  </div>
                  <div className="text-xs text-green-500/80">
                    Click to mint your video recording as an NFT
                  </div>
                </div>
              </div>
              
              <Transaction
                calls={videoTransactionCalls}
                onSuccess={handleVideoNFTTransactionSuccess}
                onError={handleVideoNFTTransactionError}
              >
                <TransactionButton 
                  text="🎥 Mint Video NFT"
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                />
                <TransactionStatus>
                  <TransactionStatusAction />
                  <TransactionStatusLabel />
                </TransactionStatus>
              </Transaction>
            </div>
          )}

          {/* Camera Preview during recording */}
          {showCameraPreview && (
            <div className="mb-4">
              <div className="text-xs font-medium text-[var(--app-foreground)] mb-2">
                📹 Camera Preview
              </div>
              <div className="relative rounded-lg overflow-hidden border-2 border-blue-500 bg-black">
                <video
                  ref={previewVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-48 object-cover rounded-lg"
                  style={{ transform: 'scaleX(-1)' }} // Mirror effect like selfie camera
                />
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  🔴 REC {formatDuration(recordingDuration)}
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2">
                    <div className="flex justify-between items-center">
                      <div className="text-white text-xs">
                        Recording in progress...
                      </div>
                      <button
                        onClick={handleStopVideoRecording}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-xs font-medium transition-colors"
                      >
                        ⏹️ Stop
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--app-foreground)] mb-2">
              Video NFTs in Room: ({videoNFTs.length})
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {videoNFTs
                .sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId))
                .map((nft) => (
                <div key={nft.tokenId} className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">🎥</span>
                    <div>
                      <div className="text-sm font-medium text-[var(--app-foreground)]">
                        Video NFT #{nft.tokenId}
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
                      onClick={() => handlePlayVideoNFT(nft)}
                      title={playingNFTId === nft.tokenId ? "Stop playback" : "Play video recording"}
                      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      disabled={isMinting}
                    >
                      {playingNFTId === nft.tokenId ? "⏸️" : "▶️"}
                    </button>
                    <button 
                      onClick={() => handleViewVideoTransaction(nft)}
                      title="View NFT on Basescan"
                      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      🔗
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {videoNFTs.length === 0 && (
              <div className="text-xs text-center text-[var(--app-foreground-muted)] p-4 bg-[var(--app-accent-light)] rounded-lg">
                📭 No video NFTs yet. Record your first 15-second video to create an NFT!
              </div>
            )}
          </div>
        </div>



        {/* Video Meetings Section */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-3 rounded-lg border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-1 mb-3">
            <span className="text-blue-500 text-xs">⭐</span>
            <span className="text-xs font-medium text-[var(--app-foreground)]">Video Meetings</span>
          </div>

          <div className="space-y-2">
            {videoMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between p-2 bg-white/40 dark:bg-gray-800/40 rounded-md border border-gray-200/30 dark:border-gray-700/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1 mb-1">
                    <span className="text-xs font-medium text-[var(--app-foreground)] truncate">{meeting.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      meeting.status === 'live' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                      meeting.status === 'scheduled' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {meeting.status === 'live' ? 'Live' : 
                       meeting.status === 'scheduled' ? 'Soon' : 'Later'}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--app-foreground-muted)] truncate">
                    {meeting.participants} participants • {meeting.time}
                  </div>
                </div>
                <div className="ml-2 flex-shrink-0">
                  {meeting.status === 'live' && (
                    <button
                      className="text-[10px] px-2 py-1 rounded-md bg-blue-500 text-white hover:bg-blue-600 flex items-center space-x-1 transition-colors"
                      onClick={() => handleJoinVideoCall(meeting.id)}
                    >
                      <span className="text-[10px]">📹</span>
                      <span className="text-[10px]">Join</span>
                    </button>
                  )}
                  {meeting.status === 'scheduled' && (
                    <button className="text-[10px] px-2 py-1 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 flex items-center space-x-1 transition-colors">
                      <span className="text-[10px]">🔔</span>
                      <span className="text-[10px]">Remind</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video Quick Actions */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-1 mb-3">
            <span className="text-green-500 text-xs">✅</span>
            <span className="text-xs font-medium text-[var(--app-foreground)]">Video Quick Actions</span>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5">
            <button
              className="flex items-center justify-center p-2 bg-white/40 dark:bg-gray-800/40 rounded-md border border-gray-200/30 dark:border-gray-700/30 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors"
              onClick={handleStartScreenShare}
            >
              <div className="text-center">
                <div className="text-xs mb-1">🖥️ Share</div>
                <div className="text-xs mb-1">Screen</div>
                <span className="text-[9px] bg-yellow-200 text-yellow-700 px-1 rounded dark:bg-yellow-900/30 dark:text-yellow-400">Soon</span>
              </div>
            </button>
            
            <button
              className="flex items-center justify-center p-2 bg-white/40 dark:bg-gray-800/40 rounded-md border border-gray-200/30 dark:border-gray-700/30 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors"
              onClick={() => notification({
                title: "📱 Instant Meeting",
                body: "Creating new video room..."
              })}
            >
              <div className="text-center">
                <div className="text-xs mb-1">📹 Start</div>
                <div className="text-xs mb-1">Meeting</div>
                <span className="text-[9px] bg-yellow-200 text-yellow-700 px-1 rounded dark:bg-yellow-900/30 dark:text-yellow-400">Soon</span>
              </div>
            </button>
            
            <button
              className="flex items-center justify-center p-2 bg-white/40 dark:bg-gray-800/40 rounded-md border border-gray-200/30 dark:border-gray-700/30 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors"
              onClick={() => notification({
                title: "📞 Voice Call",
                body: "Calling team members..."
              })}
            >
              <div className="text-center">
                <div className="text-xs mb-1">📞 Voice</div>
                <div className="text-xs mb-1">Call</div>
                <span className="text-[9px] bg-yellow-200 text-yellow-700 px-1 rounded dark:bg-yellow-900/30 dark:text-yellow-400">Soon</span>
              </div>
            </button>
            
            <button
              className="flex items-center justify-center p-2 bg-white/40 dark:bg-gray-800/40 rounded-md border border-gray-200/30 dark:border-gray-700/30 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors"
              onClick={handleStartVideoRecording}
              disabled={isRecordingVideo || isMinting}
            >
              <div className="text-center">
                <div className="text-xs mb-1">🎥 Record</div>
                <div className="text-xs mb-1">Video NFT</div>
                <span className="text-[9px] bg-purple-200 text-purple-700 px-1 rounded dark:bg-purple-900/30 dark:text-purple-400">Live</span>
              </div>
            </button>
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
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-3 rounded-lg border border-[var(--app-accent-light)]">
          <div className="flex items-center space-x-1 mb-3">
            <span className="text-blue-500 text-xs">⭐</span>
            <span className="text-xs font-medium text-[var(--app-foreground)]">Recent Recordings</span>
          </div>
          
          <div className="space-y-2">
            {recordings.map((recording) => (
              <div key={recording.id} className="bg-white/40 dark:bg-gray-800/40 p-2 rounded-md border border-gray-200/30 dark:border-gray-700/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[var(--app-foreground)] mb-1 truncate">
                      {recording.title} (soon)
                    </div>
                    <div className="text-[10px] text-[var(--app-foreground-muted)] mb-1">
                      {recording.date} • {recording.duration} • {recording.participants.length} participants
                    </div>
                    <div className="text-[10px] text-[var(--app-foreground-muted)] mb-1 truncate">
                      {recording.summary}
                    </div>
                    <div className="text-[10px]">
                      <span className="font-medium text-[var(--app-accent)]">Action Items:</span>
                      <div className="text-[var(--app-foreground-muted)] truncate">
                        • {recording.actionItems[0]} (soon)
                    </div>
                  </div>
                  </div>
                  <button
                    className="text-[10px] px-2 py-1 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors ml-2 flex-shrink-0"
                    onClick={() => handleViewSummary(recording.id)}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>


      </div>

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full h-full max-w-4xl max-h-[90vh] m-4">
            {/* Modal Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                <h3 className="text-lg font-semibold">{modalVideoTitle}</h3>
                <button
                  onClick={handleCloseVideoModal}
                  className="bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Video Player */}
            <div className="w-full h-full flex items-center justify-center">
              {modalVideoSrc && (
                <video
                  src={modalVideoSrc}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain rounded-lg"
                  onEnded={() => {
                    notification({
                      title: "✅ Video Finished",
                      body: "Video playback completed"
                    });
                  }}
                  onError={(e) => {
                    console.error('Video playback error:', e);
                    notification({
                      title: "❌ Video Error",
                      body: "Failed to play video"
                    });
                  }}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-4">
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={handleCloseVideoModal}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (playingNFTId) {
                      // Find the current NFT being played
                      const currentNFT = videoNFTs.find(nft => nft.tokenId === playingNFTId);
                      if (currentNFT) {
                        handleShareVideoNFT(currentNFT);
                      }
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  📱 Share on Farcaster
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default SmartMeetingRecorder;
