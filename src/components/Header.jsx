import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setTheme } from "../store/store";
import { Sun, Moon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Header = ({ isCollapsed }) => {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.hvac.theme);

  useEffect(() => {
    const rootElement = document.getElementById("root");
    if (theme === "dark") {
      rootElement.classList.add("dark");
    } else {
      rootElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleThemeChange = (e) => {
      const newTheme = e.matches ? "dark" : "light";
      dispatch(setTheme(newTheme));
    };

    mediaQuery.addEventListener("change", handleThemeChange);

    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, [dispatch]);

  const handleThemeChange = () => {
    dispatch(setTheme(theme === "light" ? "dark" : "light"));
  };

  return (
    <header
      className={`bg-blue-100 dark:bg-gray-800 shadow-lg fixed top-0 ${
        isCollapsed ? "left-[80px]" : "left-[250px]"
      } right-0 z-10 transition-all duration-300`}
    >
      <div className="px-3 py-2 sm:p-4 flex items-center justify-between">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <h1 className="text-base sm:text-xl font-semibold ml-1 sm:ml-3 text-gray-800 dark:text-white truncate">
            Analytics
          </h1>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`w-13 h-7 border border-input p-0.5 bg-background rounded-full relative flex items-center cursor-pointer hover:border-primary/50 transition-all duration-200 inset-shadow-sm shadow-primary inset-shadow-primary/20 dark:inset-shadow-primary/20 dark:shadow-primary/10 dark:shadow-sm`}
                  onClick={handleThemeChange}
                >
                  <div
                    className={`w-6 h-6 bg-primary rounded-full absolute flex items-center justify-center transition-transform duration-300 ${
                      theme === "dark" ? "translate-x-6" : "translate-x-0"
                    }`}
                  >
                    {theme === "dark" ? (
                      <Moon className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <Sun className="h-3.5 w-3.5 text-background" />
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{theme === "dark" ? "Light mode" : "Dark mode"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
};

export default Header;
