"use client";

import { 
  useMiniKit,
  useAddFrame,
  useOpenUrl,
  useNotification,
  useViewProfile
} from "@coinbase/onchainkit/minikit";
import { useCallback, useState } from "react";

export function useMiniKitFeatures() {
  // Core MiniKit functionality (available)
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  
  // Available hooks
  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();
  const notification = useNotification();
  const viewProfile = useViewProfile(); // Current user's profile
  
  // Real API data state
  const [socialData, setSocialData] = useState<unknown>(null);
  const [userProfile, setUserProfile] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Real API functions
  const fetchUserProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Try to get FID from MiniKit context first
      if (context?.user?.fid) {
        const response = await fetch(`/api/farcaster/profile?fid=${context.user.fid}`);
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
          return;
        }
      }
      
      // Fallback to general profile endpoint
      const response = await fetch('/api/farcaster/profile');
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [context?.user?.fid]);

  const fetchSocialGraph = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/farcaster/social-graph');
      if (response.ok) {
        const data = await response.json();
        setSocialData(data);
      }
    } catch (error) {
      console.error('Failed to fetch social graph:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mock implementations for advanced features
  const mockViewCast = useCallback(async (params: { castHash: string }) => {
    console.log("Mock viewCast:", params);
    // Future: Real cast viewing implementation
    await new Promise(resolve => setTimeout(resolve, 500));
  }, []);

  const mockSignMessage = useCallback(async (_params: { message: string }) => {
    // Future: Real message signing with wallet
    return `signed_${Date.now()}`;
  }, []);

  const mockGenerateQR = useCallback(async (data: unknown) => {
    console.log("Mock QR generation:", data);
    // Future: Real QR code generation
    return `qr_data_${Date.now()}`;
  }, []);

  const mockShareURL = useCallback(async (data: { url: string; title: string; text: string }) => {
    console.log("Mock share:", data);
    // Future: Native sharing API
    if (navigator.share) {
      return navigator.share(data);
    }
    // Fallback: Copy to clipboard
    await navigator.clipboard.writeText(data.url);
  }, []);

  return {
    // Real available hooks
    setFrameReady,
    isFrameReady,
    context,
    addFrame,
    openUrl,
    notification,
    viewProfile, // View current user's profile
    
    // Real API data and functions
    socialGraph: socialData,
    userProfile: userProfile,
    fetchUserProfile,
    fetchSocialGraph,
    isLoading,
    
    // Mock implementations (ready for real implementation)
    viewCast: mockViewCast,
    signMessage: mockSignMessage,
    generateQR: mockGenerateQR,
    shareURL: mockShareURL,
    
    // Status flags
    isAvailable: {
      notifications: true,
      frames: true,
      socialGraph: true, // Now using real API
      profileView: true, // Real profile viewing
      messageSign: false, // Mock until available
      qrGeneration: false, // Mock until available
      urlSharing: true // Partial support
    }
  };
}

export default useMiniKitFeatures;
