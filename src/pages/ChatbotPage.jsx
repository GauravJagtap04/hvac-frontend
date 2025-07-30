import React from "react";
import HVACChatbot from "../components/HVACChatbot";

const ChatbotPage = () => {
  return (
    <div className="container mx-auto h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10 p-4 lg:p-6">
      {/* Header Section */}
      {/* <div className="mb-6 flex-shrink-0 animate-in slide-in-from-top duration-500">
        <div className="text-center space-y-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <span className="text-2xl">🤖</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
              HVAC Manual Assistant
            </h1>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
              <span className="text-2xl">📚</span>
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            AI-powered assistant for HVAC technical documentation. Upload
            manuals, ask questions, and get instant answers about
            specifications, troubleshooting, and maintenance procedures.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/30">
            <span className="text-amber-600 dark:text-amber-400 font-medium text-sm">
              ✨ Beta Version
            </span>
          </div>
        </div>
      </div> */}

      <div className="flex-1 min-h-0 animate-in slide-in-from-bottom duration-700">
        <HVACChatbot />
      </div>
    </div>
  );
};

export default ChatbotPage;
