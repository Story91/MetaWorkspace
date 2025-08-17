"use client";

import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
  useViewProfile,
} from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "./components/DemoComponents";
import { Icon } from "./components/DemoComponents";
import MetaWorkspaceDashboard from "./components/MetaWorkspaceDashboard";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeTab, setActiveTab] = useState("home");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('metaworkspace-dark-mode');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Available MiniKit Hooks
  const addFrame = useAddFrame();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openUrl = useOpenUrl();
  const viewProfile = useViewProfile(); // View current user's profile

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Dark mode toggle effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('metaworkspace-dark-mode', JSON.stringify(isDarkMode));
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev: boolean) => !prev);
  }, []);

  const handleViewProfile = useCallback(() => {
    viewProfile();
  }, [viewProfile]);

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
                  <Button
            variant="ghost"
            size="sm"
            onClick={handleAddFrame}
            className="text-[var(--app-accent)] p-4"
            icon={<Icon name="plus" size="sm" />}
          >
            Add Workspace
          </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Added ✨</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

  return (
    <div className={`flex flex-col min-h-screen font-sans mini-app-theme transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gray-900 text-gray-100' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900'
    }`}>
      <div className="w-full max-w-md mx-auto px-4 py-4">
        <header className="flex justify-between items-center mb-3 h-11">
          <div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isDarkMode 
                    ? "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400" 
                    : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-600"
                }`}
                title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                <span className="text-lg">
                  {isDarkMode ? "☀️" : "🌙"}
                </span>
              </button>
              <button
                onClick={handleViewProfile}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isDarkMode 
                    ? "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400" 
                    : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-600"
                }`}
                title="View your Farcaster profile"
              >
                <span className="text-lg">
                  👤
                </span>
              </button>
              <Wallet className="z-10">
                <ConnectWallet>
                  <Name className="text-inherit" />
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
          <div>{saveFrameButton}</div>
        </header>

        <main className="flex-1">
          <MetaWorkspaceDashboard />
        </main>

        <footer className="mt-4 pt-4 flex justify-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Powered by MetaWorkspace
          </div>
        </footer>
      </div>
    </div>
  );
}
