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

const Header = ({ isCollapsed, name, Icon }) => {
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
    <>
      <header
        className={`bg-background/40 mx-6 p-2 dark:shadow-primary dark:shadow-[0px_0px_1px_0px_rgba(0,0,0,0.5)] shadow-md backdrop-blur-sm fixed top-3 rounded-2xl ${
          isCollapsed ? "left-[80px]" : "left-[250px]"
        } right-0 z-30`}
      >
        <div className="px-3 py-2 sm:p-4 flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2">
            {Icon && <Icon className="h-6 w-6 text-gray-800 dark:text-white" />}
            <h1 className="text-base sm:text-xl font-semibold ml-1 sm:ml-3 text-gray-800 dark:text-white truncate">
              {name}
            </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`w-13 h-7 border border-input p-0.5 bg-background dark:bg-background/70 rounded-full relative flex items-center cursor-pointer hover:border-primary/50 transition-all duration-200`}
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
                <TooltipContent sideOffset={5} className="z-50">
                  <p>{theme === "dark" ? "Light mode" : "Dark mode"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>
      <div className={`w-full h-[77px]`} />
    </>
  );
};

export default Header;
