import Header from "@/components/Header";
import HVACChatbot from "../components/HVACChatbot";
import { useOutletContext } from "react-router-dom";

const ChatbotPage = () => {
  const { isCollapsed } = useOutletContext();

  return (
    <div className="mx-auto min-h-screen flex flex-col bg-background p-4 lg:p-6">
      <Header isCollapsed={isCollapsed} name="Assistant" />
      <HVACChatbot />
    </div>
  );
};

export default ChatbotPage;
