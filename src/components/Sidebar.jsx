import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { supabase } from "./SupabaseClient";
import { logout } from "../store/slices/authSlice";
import {
  FaTemperatureHigh,
  FaWind,
  FaChartLine,
  FaCog,
  FaBook,
  FaCalculator,
  FaTools,
  FaChevronLeft,
  FaHome,
  FaSignOutAlt,
} from "react-icons/fa";

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const [activeSubmenu, setActiveSubmenu] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const sidebarClass = isCollapsed
    ? "w-16 transition-all duration-300 ease-in-out"
    : "w-64 transition-all duration-300 ease-in-out";

  const menuItem = (to, icon, text, submenu = null) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center p-3 text-slate-200 hover:bg-slate-700 rounded-lg mb-1 transition-colors ${
          isActive ? "bg-slate-700" : ""
        }`
      }
      onClick={() =>
        submenu && setActiveSubmenu(activeSubmenu === submenu ? "" : submenu)
      }
    >
      <span className="text-xl">{icon}</span>
      {!isCollapsed && (
        <span className="ml-3 text-sm font-medium whitespace-nowrap">
          {text}
        </span>
      )}
    </NavLink>
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      dispatch(logout());
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div
      className={`${sidebarClass} bg-gradient-to-b from-slate-800 to-slate-900 min-h-screen fixed left-0 top-0 z-40 pt-16 px-3 shadow-xl`}
    >
      {/* Logo Section */}
      <div className="flex items-center mb-6 px-2">
        <img src="/logo.svg" alt="HVAC Logo" className="h-8 w-8" />
        {!isCollapsed && (
          <span className="ml-3 text-lg font-bold text-white">
            HVAC Simulation
          </span>
        )}
      </div>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute right-0 top-20 bg-slate-700 p-1 rounded-l-md transform translate-x-full shadow-md hover:bg-slate-600 transition-colors"
      >
        <FaChevronLeft
          className={`text-white transition-transform duration-300 ${
            isCollapsed ? "rotate-180" : ""
          }`}
        />
      </button>

      <div className="space-y-2 mt-6">
        {menuItem("/dashboard", <FaHome />, "Dashboard")}

        <div className="border-t border-slate-700 my-4"></div>

        {/* Simulation Tools */}
        {menuItem("/simulation", <FaCalculator />, "Simulation Tools")}
        {!isCollapsed && activeSubmenu === "sims" && (
          <div className="ml-4 space-y-1">
            {menuItem("/cooling-sim", <FaTemperatureHigh />, "Cooling Systems")}
            {menuItem("/heating-sim", <FaTemperatureHigh />, "Heating Systems")}
            {menuItem("/ventilation-sim", <FaWind />, "Ventilation Design")}
          </div>
        )}

        {/* Analysis Tools */}
        {menuItem("/analytics", <FaChartLine />, "Analytics")}

        {/* Training Resources */}
        {menuItem("/training", <FaBook />, "Training")}

        {/* System Tools */}
        {menuItem("/tools", <FaTools />, "Tools")}

        <div className="border-t border-slate-700 my-4"></div>

        {/* Settings */}
        {menuItem("/settings", <FaCog />, "Settings")}

        <div className="border-t border-slate-700 my-4"></div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`flex items-center p-3 text-slate-200 hover:bg-slate-700 rounded-lg mb-1 transition-colors w-full`}
        >
          <span className="text-xl">
            <FaSignOutAlt />
          </span>
          {!isCollapsed && (
            <span className="ml-3 text-sm font-medium whitespace-nowrap">
              Logout
            </span>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="fixed bottom-4 left-0 right-0 px-3 max-w-[16rem]">
          <div className="bg-slate-950/50 backdrop-blur-sm rounded-lg p-3 text-xs text-slate-300 shadow-lg">
            <div className="font-semibold mb-1">System Status</div>
            <div className="flex justify-between">
              <span>CPU Usage:</span>
              <span>45%</span>
            </div>
            <div className="flex justify-between">
              <span>Memory:</span>
              <span>2.4GB</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
