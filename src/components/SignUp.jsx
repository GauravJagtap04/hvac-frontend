import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useDispatch, useSelector } from "react-redux";
import { supabase } from "./SupabaseClient";
import {
  setUser,
  setAuthError,
  setAuthLoading,
} from "../store/slices/authSlice";

export default function SignUp() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Basic info, Step 2: System preferences

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    is_split: false,
    is_vrf: false,
    is_heat: false,
    is_chilled: false,
  });

  const { loading, error } = useSelector((state) => state.auth);
  const [passwordError, setPasswordError] = useState("");

  const validatePassword = () => {
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }

    if (formData.password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }

    setPasswordError("");
    return true;
  };

  const handleNextStep = (e) => {
    e.preventDefault();

    if (!validatePassword()) return;

    setStep(2);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    dispatch(setAuthLoading(true));

    try {
      // 1. Sign up the user with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
        },
      });

      if (signUpError) throw signUpError;

      // 2. Insert user preferences into custom users table
      if (data.user) {
        const { error: insertError } = await supabase.from("users").insert([
          {
            id: data.user.id,
            name: formData.name,
            is_split: formData.is_split,
            is_vrf: formData.is_vrf,
            is_heat: formData.is_heat,
            is_chilled: formData.is_chilled,
          },
        ]);

        if (insertError) {
          console.error("Error inserting user data:", insertError);
          throw new Error(
            "Failed to set up your user profile. Please contact support."
          );
        }
      }

      // 3. Update Redux store and navigate
      dispatch(setUser(data.user));
      localStorage.setItem("user", JSON.stringify(data.user));

      const userNamespace = `user_${data.user.id}`;
      sessionStorage.setItem(`${userNamespace}`, JSON.stringify(data.user));
      sessionStorage.setItem("activeUserId", data.user.id);

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (error) {
      dispatch(setAuthError(error.message));
    } finally {
      dispatch(setAuthLoading(false));
    }
  };

  const handleCheckboxChange = (field) => {
    setFormData({ ...formData, [field]: !formData[field] });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg">
        <div>
          <h1 className="text-4xl font-bold text-center text-white">
            HVAC Control
          </h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-slate-300">
            Create an Account
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Sign up to access the HVAC Control System
          </p>
        </div>

        {step === 1 ? (
          <form className="mt-8 space-y-6" onSubmit={handleNextStep}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-300"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-white"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-white"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300"
                >
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="block w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-white"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-slate-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-300"
                >
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    className="block w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-white"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>
                {passwordError && (
                  <p className="mt-1 text-sm text-red-400">{passwordError}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50"
            >
              Next
            </button>

            <div className="text-center">
              <Link
                to="/"
                className="text-sm font-medium text-blue-400 hover:text-blue-300"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
            <div>
              <h3 className="text-xl font-medium text-slate-300 mb-4">
                Select System Preferences
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    id="is_split"
                    name="is_split"
                    type="checkbox"
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-slate-700 rounded bg-slate-800"
                    checked={formData.is_split}
                    onChange={() => handleCheckboxChange("is_split")}
                  />
                  <label
                    htmlFor="is_split"
                    className="ml-3 block text-sm text-slate-300"
                  >
                    Split System
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="is_vrf"
                    name="is_vrf"
                    type="checkbox"
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-slate-700 rounded bg-slate-800"
                    checked={formData.is_vrf}
                    onChange={() => handleCheckboxChange("is_vrf")}
                  />
                  <label
                    htmlFor="is_vrf"
                    className="ml-3 block text-sm text-slate-300"
                  >
                    VRF System
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="is_heat"
                    name="is_heat"
                    type="checkbox"
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-slate-700 rounded bg-slate-800"
                    checked={formData.is_heat}
                    onChange={() => handleCheckboxChange("is_heat")}
                  />
                  <label
                    htmlFor="is_heat"
                    className="ml-3 block text-sm text-slate-300"
                  >
                    Heat Pump System
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="is_chilled"
                    name="is_chilled"
                    type="checkbox"
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-slate-700 rounded bg-slate-800"
                    checked={formData.is_chilled}
                    onChange={() => handleCheckboxChange("is_chilled")}
                  />
                  <label
                    htmlFor="is_chilled"
                    className="ml-3 block text-sm text-slate-300"
                  >
                    Chilled Water System
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2 px-4 border border-slate-600 rounded-lg shadow-sm text-sm font-medium text-slate-300 bg-transparent hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-200"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-slate-500">
          HVAC Control System v1.0
        </div>
      </div>
    </div>
  );
}
