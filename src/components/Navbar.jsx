import { NavLink } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import logo from "../assets/images/logo.png";

const Navbar = () => {
  return (
    <nav className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg fixed w-full top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <NavLink className="flex items-center space-x-3" to="/dashboard">
              <img className="h-10 w-auto" src={logo} alt="HVAC Simulator" />
              <span className="text-slate-100 text-xl font-semibold">
                HVAC Simulation
              </span>
            </NavLink>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-slate-200 hover:bg-slate-700 rounded-lg transition-colors">
              <FaBell className="w-5 h-5" />
            </button>

            <NavLink
              to="/profile"
              className="flex items-center space-x-2 text-slate-200 hover:bg-slate-700 rounded-lg p-2 transition-colors"
            >
              <img
                className="h-8 w-8 rounded-full border-2 border-slate-500"
                src="https://ui-avatars.com/api/?name=Zaki"
                alt="Profile"
              />
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
