"use client";

import { useState } from "react";
import { WorkspaceOverview, WorkspaceFeatures } from "./DemoComponents";
import SocialWorkspaceManager from "./SocialWorkspaceManager";
import AdvancedCollaborationPanel from "./AdvancedCollaborationPanel";
import SmartMeetingRecorder from "./SmartMeetingRecorder";
import VoiceVideoHub from "./VoiceVideoHub";
import AdvancedUIFeatures from "./AdvancedUIFeatures";
import RoomManager from "./RoomManager";
import AboutGuide from "./AboutGuide";

export function MetaWorkspaceDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <WorkspaceOverview setActiveTab={setActiveTab} />;
      case "features":
        return <WorkspaceFeatures setActiveTab={setActiveTab} />;
      case "social":
        return <SocialWorkspaceManager />;
      case "collaboration":
        return <AdvancedCollaborationPanel />;
      case "meetings":
        return <SmartMeetingRecorder />;
      case "voice":
        return <VoiceVideoHub />;
      case "advanced":
        return <AdvancedUIFeatures />;
      case "rooms":
        return <RoomManager />;
      case "about":
        return <AboutGuide />;
      default:
        return <WorkspaceOverview setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Navigation Tabs - Two Rows */}
      <div className="mb-2 space-y-1">
        {/* First Row */}
        <div className="flex justify-between gap-1 p-2 neu-card w-full">
          {[
            { id: "dashboard", icon: "🏢" },
            { id: "voice", icon: "🎤" },
            { id: "social", icon: "🌐" },
            { id: "collaboration", icon: "🤝" },
            { id: "meetings", icon: "📹" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 h-10 rounded-lg transition-all duration-300 flex items-center justify-center text-sm ${
                activeTab === tab.id
                  ? "gradient-accent text-white shadow-lg"
                  : "bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/50 hover:scale-105"
              }`}
              title={tab.id}
            >
              {tab.icon}
            </button>
          ))}
        </div>
        
        {/* Second Row */}
        <div className="flex justify-between gap-1 p-2 neu-card w-full">
          {[
            { id: "rooms", icon: "🏛️" },
            { id: "advanced", icon: "⚡" },
            { id: "features", icon: "🚀" },
            { id: "about", icon: "📖" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 h-10 rounded-lg transition-all duration-300 flex items-center justify-center text-sm ${
                activeTab === tab.id
                  ? "gradient-accent text-white shadow-lg"
                  : "bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/50 hover:scale-105"
              }`}
              title={tab.id}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[400px]">
        {renderContent()}
      </div>


    </div>
  );
}

export default MetaWorkspaceDashboard;
