import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
  FaChevronLeft,
  FaChevronRight,
  FaHome,
  FaSignOutAlt,
  FaCalendarAlt,
  FaMap,
  FaUser,
  FaTrophy,
  FaGraduationCap,
  FaClipboardList,
} from "react-icons/fa";

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const [activeSubmenu, setActiveSubmenu] = useState("");
  const [userName, setUserName] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      sessionStorage.clear();
      await supabase.auth.signOut();
      dispatch(logout());
      localStorage.removeItem("user"); // Clear user data from localStorage
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user")); // Parse the string into an object
        console.log("User from localStorage:", user.id);
        if (user) {
          const { data, error } = await supabase
            .from("users")
            .select("name")
            .eq("id", user.id)
            .single();

          if (error) throw error;
          if (data) {
            setUserName(data.name);
            console.log("User name:", userName);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);
  const MenuItem = ({ to, icon, text }) => {
    const isActive = location.pathname === to;

    return (
      <NavLink
        to={to}
        className={`flex items-center p-2 rounded-lg hover:bg-slate-700 group transition-all duration-200 ${
          isActive
            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
            : ""
        }`}
      >
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
          <span
            className={`text-xl ${isActive ? "text-white" : "text-blue-400"}`}
          >
            {icon}
          </span>
        </div>
        {!isCollapsed && (
          <span
            className={`ml-3 text-sm font-medium whitespace-nowrap transition-opacity ${
              isActive ? "text-white" : "text-gray-300"
            }`}
          >
            {text}
          </span>
        )}
        {isCollapsed && (
          <div className="absolute left-16 scale-0 group-hover:scale-100 transition-all duration-100 bg-gray-800 text-white text-sm py-1 px-2 rounded ml-2 whitespace-nowrap z-50">
            {text}
          </div>
        )}
      </NavLink>
    );
  };

  return (
    <div className="relative h-full ">
      {/* Toggle button */}

      <div
        className={`${
          isCollapsed ? "w-20" : "w-64"
        } h-full flex flex-col transition-all duration-300 ease-in-out bg-gradient-to-b from-slate-800 to-slate-900 min-h-screen fixed left-0 top-0 z-40 pt-8 px-3 shadow-xl border-r border-gray-700`}
      >
        {/* Logo Section */}
        <div
          className={`flex items-center mb-6 px-2 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <div className="flex items-start overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-1 rounded-lg flex items-center justify-center">
              <img src="/logo.svg" alt="HVAC Logo" className="h-6 w-6" />
            </div>
            {!isCollapsed && (
              <span className="ml-2 text-lg font-bold text-white bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                HVAC Simulation
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute top-20 ${
            isCollapsed ? "left-16" : "left-60"
          } z-50 bg-white text-black border-1 border-black rounded-full p-2 shadow-lg focus:outline-none transition-all duration-300 ease-in-out hover:scale-110`}
        >
          {isCollapsed ? (
            <FaChevronRight className="h-4 w-4" />
          ) : (
            <FaChevronLeft className="h-4 w-4" />
          )}
        </button>
        {/* Navigation */}
        <nav className="flex-1 mt-2 overflow-y-auto py-2">
          <div className="px-3 pb-2">
            {!isCollapsed && (
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Main
              </h2>
            )}
          </div>

          <ul className="space-y-1 px-1">
            <li>
              <MenuItem to="/dashboard" icon={<FaHome />} text="Dashboard" />
            </li>
            <li>
              <MenuItem
                to="/simulations"
                icon={<FaCalculator />}
                text="Simulation Tools"
              />
            </li>
            <li>
              <MenuItem
                to="/analytics"
                icon={<FaChartLine />}
                text="Analytics"
              />
            </li>
            <li>
              <MenuItem to="/training" icon={<FaBook />} text="Training" />
            </li>
          </ul>
        </nav>

        {/* Logout button at bottom */}
        <div className="p-1 border-t border-gray-700 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center p-2 rounded-lg hover:bg-slate-700 group transition-all duration-200"
          >
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <span className="text-xl text-red-400">
                <FaSignOutAlt />
              </span>
            </div>
            {!isCollapsed && (
              <span className="ml-3 text-sm font-medium whitespace-nowrap text-red-400">
                Logout
              </span>
            )}
            {isCollapsed && (
              <div className="absolute left-16 scale-0 group-hover:scale-100 transition-all duration-100 bg-gray-800 text-white text-sm py-1 px-2 rounded ml-2 whitespace-nowrap z-50">
                Logout
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
