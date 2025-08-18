"use client";

import { useState } from "react";

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
    <div className={`neu-card ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-blue-200/30 dark:border-gray-600/30">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

function GuideSection({ 
  icon, 
  title, 
  steps, 
  tips 
}: { 
  icon: string; 
  title: string; 
  steps: string[]; 
  tips?: string[];
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      
      <div className="space-y-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">📋 How to do it:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            {steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
        
        {tips && tips.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">💡 Pro Tips:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
              {tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function AboutGuide() {
  const [activeSection, setActiveSection] = useState("getting-started");

  const sections = [
    { id: "getting-started", label: "🚀 Start", icon: "🚀" },
    { id: "ai-assistant", label: "🤖 AI", icon: "🤖" },
    { id: "voice-video", label: "🎤 Audio/Video", icon: "🎤" },
    { id: "blockchain", label: "⛓️ Blockchain", icon: "⛓️" },
    { id: "social", label: "🌐 Social", icon: "🌐" },
    { id: "rooms", label: "🏛️ Rooms", icon: "🏛️" }
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case "getting-started":
        return (
          <div>
            <GuideSection
              icon="🏢"
              title="Getting Started with MetaWorkspace"
              steps={[
                "Connect your wallet by clicking the wallet button in the top right corner",
                "Select the tab corresponding to the function you want to use",
                "Explore different features using the navigation at the top",
                "All data is saved on blockchain for security and ownership"
              ]}
              tips={[
                "MetaWorkspace works best with Base and Ethereum wallets",
                "Your data is always under your control thanks to Web3 technology",
                "You can switch between light and dark mode using the button next to the wallet"
              ]}
            />
            
            <GuideSection
              icon="📱"
              title="Navigating the Application"
              steps={[
                "Use the 9 buttons at the top to switch between functions",
                "🏢 Dashboard - main view and statistics",
                "🎤 Voice - voice recording and NFT creation",
                "🌐 Social - social features and networking",
                "🤝 Collaboration - team collaboration tools",
                "📹 Meetings - intelligent meeting recording",
                "🏛️ Rooms - workspace room management",
                "⚡ Advanced - advanced AI tools",
                "🚀 Features - overview of all capabilities",
                "📖 About - complete user guide and tutorials"
              ]}
              tips={[
                "Each section has different features tailored to specific purposes",
                "All changes are automatically synchronized",
                "The app works on all mobile devices and browsers"
              ]}
            />
          </div>
        );

      case "ai-assistant":
        return (
          <div>
            <GuideSection
              icon="🤖"
              title="AI Task Assistant - Your Intelligent Assistant"
              steps={[
                "Click the text field in the AI Task Manager section",
                "Describe your task or paste meeting notes",
                "Click 'AI Generate' to let AI process your text",
                "AI automatically creates structured tasks",
                "Manage tasks using checkboxes and action buttons"
              ]}
              tips={[
                "AI understands context - the more details, the better tasks",
                "You can paste entire meeting notes - AI will extract tasks",
                "AI learns from your preferences and work style",
                "All tasks are saved on blockchain for permanence"
              ]}
            />
            
            <GuideSection
              icon="⚡"
              title="Advanced AI Tools"
              steps={[
                "Go to the '⚡ Advanced' tab",
                "Choose a tool: Optimize, Summarize, Translate, or Analyze",
                "Paste the text you want to process",
                "Click the appropriate button to run AI processing",
                "Get professional results in real-time"
              ]}
              tips={[
                "Optimize - improves workflow and productivity",
                "Summarize - creates concise summaries of long texts",
                "Translate - professional translations for international teams",
                "Analyze - deep content analysis and insight extraction"
              ]}
            />
          </div>
        );

      case "voice-video":
        return (
          <div>
            <GuideSection
              icon="🎤"
              title="Record Voice as an NFT"
              steps={[
                "Go to the '🎤 Voice' tab",
                "Click 'Start Recording' to begin",
                "Speak clearly — up to 30 seconds per recording",
                "Click 'Stop & Create NFT' to finish",
                "AI will process the audio and mint an NFT on-chain",
                "Your NFT appears in the list below with a transcript"
              ]}
              tips={[
                "Each recording becomes a unique NFT with your voice",
                "AI automatically transcribes your voice to text",
                "NFT metadata is stored on IPFS for decentralization",
                "You can share recordings with selected people",
                "Recordings are accessible inside Farcaster rooms"
              ]}
            />
            
            <GuideSection
              icon="📹"
              title="Smart Video Meetings"
              steps={[
                "Go to the '📹 Meetings' tab",
                "Click 'Start Meeting' to create a session",
                "Share the link with participants",
                "Use 'Smart Recording' for automatic transcription",
                "AI extracts action items and a summary automatically",
                "The meeting is saved on-chain as a video NFT"
              ]}
              tips={[
                "AI detects action items during the meeting",
                "Live transcription is available",
                "You can share screen and presentations",
                "Meeting history is stored securely"
              ]}
            />
          </div>
        );

      case "blockchain":
        return (
          <div>
            <GuideSection
              icon="⛓️"
              title="Blockchain Work Logger - Work Verification"
              steps={[
                "In the Dashboard, open 'Blockchain Workspace Logs'",
                "Your tasks are automatically recorded on Base L2",
                "Click 'Verify Work Achievement' to confirm completion",
                "The transaction is stored on-chain as proof of work",
                "You'll get a success notification"
              ]}
              tips={[
                "Your work history is tamper-proof thanks to blockchain",
                "You can prove achievements across companies",
                "Your data belongs to you, not the platform",
                "The system tracks time, tasks, and achievements automatically"
              ]}
            />
            
            <GuideSection
              icon="🏆"
              title="Achievement NFTs and Tokens"
              steps={[
                "Each completed task can mint an achievement token",
                "Large projects can be minted as portfolio NFTs",
                "Achievements become part of your Web3 reputation",
                "You can trade or showcase your professional NFTs"
              ]}
              tips={[
                "Achievement NFTs are your on-chain professional CV",
                "Soulbound tokens are non-transferable identity",
                "NFT collections showcase your career and skills",
                "Others can verify your achievements on-chain"
              ]}
            />
          </div>
        );

      case "social":
        return (
          <div>
            <GuideSection
              icon="🌐"
              title="Social Workspace Manager - Networking"
              steps={[
                "Go to the '🌐 Social' tab",
                "View your social stats (followers, following)",
                "Click 'Generate Team QR' to create an invite code",
                "Share the QR to invite people to your team",
                "Use 'Share Workspace' to promote your project"
              ]}
              tips={[
                "QR codes are the fastest way to invite teammates",
                "The social graph shows your Web3 connections",
                "Build reputation through cross-DAO collaboration",
                "The system tracks your social professional milestones"
              ]}
            />
            
            <GuideSection
              icon="🔐"
              title="Cryptographic Work Verification"
              steps={[
                "In Social, click 'Sign Work Proof'",
                "The system creates a cryptographic proof of your work",
                "The signature includes time, tasks, and a timestamp",
                "Use it as proof for clients or employers"
              ]}
              tips={[
                "Cryptographic signatures are unfalsifiable",
                "This is the industry’s highest security standard",
                "You can verify work without revealing details",
                "Compliant with Web3 best practices"
              ]}
            />
          </div>
        );

      case "rooms":
        return (
          <div>
            <GuideSection
              icon="🏛️"
              title="Room Manager - Farcaster Workspace Rooms"
              steps={[
                "Go to the '🏛️ Rooms' tab",
                "Click 'Create New Room' to create a workspace",
                "Set room name and whether it should be public/private",
                "Add Farcaster usernames to the whitelist",
                "Configure recording settings (voice/video NFT)",
                "Room will be saved on blockchain with access control"
              ]}
              tips={[
                "Only whitelisted users can join private rooms",
                "Each room has its unique recording NFTs",
                "You can manage permissions in real-time",
                "Public rooms are open to all Farcaster users"
              ]}
            />
            
            <GuideSection
              icon="⚙️"
              title="Access Control and Permissions Management"
              steps={[
                "In room details click 'Manage Whitelist'",
                "Add new users by entering their Farcaster username",
                "Remove users by clicking the 'Remove' button",
                "Change room settings (max recording time, features)",
                "All changes are saved on blockchain"
              ]}
              tips={[
                "Whitelist changes are immediate",
                "You can grant different permissions to different users",
                "Change history is recorded on blockchain",
                "Room owner has full control over settings"
              ]}
            />
          </div>
        );

      default:
        return <div>Select a section to view the guide</div>;
    }
  };

  return (
    <Card title="📖 MetaWorkspace - Complete User Guide">
      {/* Section Navigation */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeSection === section.id
                ? "gradient-accent text-white shadow-lg"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">{section.icon}</span>
              <span className="text-xs">{section.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {renderSectionContent()}
      </div>

      {/* Footer */}
      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🚀 MetaWorkspace - The Future of Work</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          World&apos;s first AI-powered, blockchain-verified, socially-viral workspace platform. 
          Your work, your data, your control - everything in one application.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded">🤖 AI Assistant</span>
          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded">⛓️ Blockchain Verified</span>
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded">🌐 Social Web3</span>
          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 rounded">🎤 Voice NFTs</span>
        </div>
      </div>
    </Card>
  );
}

export default AboutGuide;
