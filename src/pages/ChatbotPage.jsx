import React from "react";
import HVACChatbot from "../components/HVACChatbot";

const ChatbotPage = () => {
  return (
    <div className="container mx-auto p-6 h-screen flex flex-col bg-background">
      {/* <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">
          HVAC Manual Assistant (beta)
        </h1>
        <p className="text-muted-foreground">
          Upload HVAC manuals and ask technical questions using AI-powered
          assistance
        </p>
      </div> */}

      <div className="flex-1 min-h-0">
        <HVACChatbot />
      </div>
    </div>
  );
};

export default ChatbotPage;
