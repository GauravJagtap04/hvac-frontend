import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { supabase } from "./SupabaseClient";
import { logout } from "../store/slices/authSlice";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  LayoutDashboard,
  DiamondPlus,
  ChartPie,
  Book,
  Bolt,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const [userName, setUserName] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      sessionStorage.clear();
      await supabase.auth.signOut();
      dispatch(logout());
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    sessionStorage.setItem("sidebarCollapsed", newState);
  };

  useEffect(() => {
    const savedSidebarState = sessionStorage.getItem("sidebarCollapsed");
    if (savedSidebarState !== null) {
      setIsCollapsed(JSON.parse(savedSidebarState));
    }

    const fetchUserData = async () => {
      try {
        const activeUserId = sessionStorage.getItem("activeUserId");
        const user = JSON.parse(sessionStorage.getItem(`user_${activeUserId}`));

        if (user && user.id) {
          const { data, error } = await supabase
            .from("users")
            .select("name")
            .eq("id", user.id)
            .single();

          if (error) throw error;
          if (data) {
            setUserName(data.name);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [setIsCollapsed]);

  const MenuItem = ({ to, icon, text }) => {
    const isActive = location.pathname === to;

    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isActive ? "default" : "ghost"}
              size={isCollapsed ? "icon" : "default"}
              className={`w-full justify-start mb-1 ${
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
                  : "hover:bg-primary hover:text-background dark:hover:bg-primary dark:hover:text-background text-primary"
              }`}
              onClick={() => navigate(to)}
            >
              {icon}
              {!isCollapsed && (
                <span className="ml-3 text-sm font-medium">{text}</span>
              )}
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent
              side="right"
              className="bg-gray-800 text-white border-gray-700"
            >
              {text}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="relative h-full">
      <div
        className={`${
          isCollapsed ? "w-17" : "w-61"
        }  my-3 ml-3 min-h-[calc(100%-24px)] flex flex-col rounded-2xl ease-in-out bg-background dark:bg-backround fixed left-0 top-0 z-40 pt-8 px-3 pb-3 dark:shadow-primary dark:shadow-[0px_0px_1px_0px_rgba(0,0,0,0.5)] shadow-md backdrop-blur-sm`}
      >
        {/* Logo Section */}
        <div
          className={`flex items-center mb-6 px-2 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <div className="flex items-center overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-1 rounded-lg flex items-center justify-center">
              <img src="/logo.svg" alt="HVAC Logo" className="h-6 w-6" />
            </div>
            {!isCollapsed && (
              <span className="ml-2 text-lg font-bold text-primary bg-clip-text">
                HVAC Simulation
              </span>
            )}
          </div>
        </div>

        {/* Toggle button using shadcn Button */}
        <Button
          size="icon"
          onClick={toggleSidebar}
          className={`absolute top-30 ${
            isCollapsed ? "left-13" : "left-57"
          } z-50 bg-background size-10 text-primary border border-border rounded-full hover:scale-110 transition-all duration-300 ease-in-out hover:text-background`}
        >
          {isCollapsed ? (
            <ChevronRight size={24} strokeWidth={2} />
          ) : (
            <ChevronLeft size={24} strokeWidth={2} />
          )}
        </Button>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <div className="px-3 pb-2">
            {!isCollapsed && (
              <h2 className="text-xs font-semibold text-ring uppercase tracking-wider">
                Main
              </h2>
            )}
          </div>

          <div className="space-y-1 px-1">
            <MenuItem
              to="/dashboard"
              icon={
                <LayoutDashboard
                  size={24}
                  className={isCollapsed ? "mx-auto" : ""}
                />
              }
              text="Dashboard"
              className="bg-primary text-background"
            />
            <MenuItem
              to="/simulations"
              icon={
                <DiamondPlus
                  size={24}
                  className={isCollapsed ? "mx-auto" : ""}
                />
              }
              text="Simulation Tools"
              className="bg-primary text-background"
            />
            <MenuItem
              to="/analytics"
              icon={
                <ChartPie size={24} className={isCollapsed ? "mx-auto" : ""} />
              }
              text="Analytics"
              className="bg-primary text-background"
            />
            <MenuItem
              to="/training"
              icon={<Book size={24} className={isCollapsed ? "mx-auto" : ""} />}
              text="Training"
              className="bg-primary text-background"
            />
            <MenuItem
              to="/chatbot"
              icon={
                <MessageCircle
                  size={24}
                  className={isCollapsed ? "mx-auto" : ""}
                />
              }
              text="HVAC Assistant"
              className="bg-primary text-background"
            />
            <MenuItem
              to="/settings"
              icon={<Bolt size={24} className={isCollapsed ? "mx-auto" : ""} />}
              text="Settings"
              className="bg-primary text-background"
            />
          </div>
        </ScrollArea>

        {/* User info and logout section */}
        <div>
          <Separator className="my-3 bg-ring" />

          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={isCollapsed ? "icon" : "default"}
                  className="w-full justify-start hover:bg-destructive hover:text-background dark:hover:bg-destructive dark:hover:text-primary text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut size={24} className={isCollapsed ? "mx-auto" : ""} />
                  {!isCollapsed && (
                    <span className="ml-3 text-sm font-medium">Logout</span>
                  )}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent
                  side="right"
                  className="bg-gray-800 text-white border-gray-700"
                >
                  Logout
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
