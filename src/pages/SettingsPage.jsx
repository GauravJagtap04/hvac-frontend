import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "../components/SupabaseClient";

const SettingsPage = () => {
  const { isCollapsed } = useOutletContext();
  const [activeTab, setActiveTab] = useState("general");
  const navigate = useNavigate();

  const tabs = [
    { id: "general", name: "General Settings" },
    { id: "hvac_systems", name: "HVAC Systems" },
    { id: "system", name: "System Configuration" },
    { id: "notifications", name: "Notifications" },
    { id: "security", name: "Security & Privacy" },
  ];
  const goBack = () => {
    navigate(-1);
  };
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-100 dark:bg-gray-800 shadow-lg z-10">
        <div className="px-3 py-2 sm:p-4 flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="flex items-center space-x-2 sm:space-x-4"></div>
            <h1 className="text-base sm:text-xl font-semibold ml-1 sm:ml-3 text-gray-800 dark:text-white truncate">
              Settings
            </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Add additional header items here */}
          </div>
        </div>
      </header>

      <main
        className={`transition-all duration-300 ${
          isCollapsed ? "max-w-8xl" : "max-w-7xl"
        } mx-auto px-4 sm:px-6 lg:px-8 py-8`}
      >
        <div className="grid grid-cols-12 gap-6">
          {/* Settings Navigation */}
          <div className="col-span-12 lg:col-span-3">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="col-span-12 lg:col-span-9">
            <div className="bg-white shadow-sm rounded-lg">
              {activeTab === "general" && <GeneralSettings />}
              {activeTab === "hvac_systems" && <HVACSystemSettings />}
              {activeTab === "system" && <SystemSettings />}
              {activeTab === "notifications" && <NotificationSettings />}
              {activeTab === "security" && <SecuritySettings />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// New HVAC Systems Settings Component
const HVACSystemSettings = () => {
  const [systemSettings, setSystemSettings] = useState({
    is_split: false,
    is_vrf: false,
    is_heat: false,
    is_chilled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      setIsLoading(true);
      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) {
        console.error("No user found in localStorage");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("is_split, is_vrf, is_heat, is_chilled")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSystemSettings({
          is_split: data.is_split || false,
          is_vrf: data.is_vrf || false,
          is_heat: data.is_heat || false,
          is_chilled: data.is_chilled || false,
        });
      }
    } catch (error) {
      console.error("Error fetching user settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (field) => {
    setSystemSettings({
      ...systemSettings,
      [field]: !systemSettings[field],
    });
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      setSaveMessage({ type: "", text: "" });

      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) {
        setSaveMessage({
          type: "error",
          text: "User not found. Please log in again.",
        });
        return;
      }

      const { error } = await supabase
        .from("users")
        .update(systemSettings)
        .eq("id", user.id);

      if (error) throw error;

      setSaveMessage({
        type: "success",
        text: "HVAC system settings saved successfully!",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveMessage({
        type: "error",
        text: "Failed to save settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage({ type: "", text: "" }), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-pulse">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">
          HVAC System Visibility
        </h2>
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className={`px-4 py-2 rounded-md ${
            isSaving
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          } transition-colors`}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {saveMessage.text && (
        <div
          className={`p-3 rounded-md ${
            saveMessage.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      <p className="text-sm text-gray-500">
        Select which HVAC systems you want to see in the application. The
        selected systems will appear in your dashboard and simulations.
      </p>

      <div className="space-y-4">
        <SettingItem
          title="Split System"
          description="Traditional HVAC system with indoor and outdoor units"
        >
          <div className="flex items-center">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={systemSettings.is_split}
                onChange={() => handleToggle("is_split")}
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </SettingItem>

        <SettingItem
          title="VRF System"
          description="Variable Refrigerant Flow system for multiple zones"
        >
          <div className="flex items-center">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={systemSettings.is_vrf}
                onChange={() => handleToggle("is_vrf")}
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </SettingItem>

        <SettingItem
          title="Heat Pump System"
          description="Energy-efficient heating and cooling system"
        >
          <div className="flex items-center">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={systemSettings.is_heat}
                onChange={() => handleToggle("is_heat")}
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </SettingItem>

        <SettingItem
          title="Chilled Water System"
          description="Central cooling system for larger buildings"
        >
          <div className="flex items-center">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={systemSettings.is_chilled}
                onChange={() => handleToggle("is_chilled")}
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </SettingItem>
      </div>
    </div>
  );
};

const GeneralSettings = () => (
  <div className="p-6 space-y-6">
    <h2 className="text-lg font-medium text-gray-900">General Settings</h2>
    <div className="space-y-4">
      <SettingItem
        title="Language"
        description="Select your preferred language"
      >
        <select className="form-select rounded-md border-gray-300">
          <option>English</option>
          <option>Spanish</option>
          <option>French</option>
        </select>
      </SettingItem>
      <SettingItem title="Time Zone" description="Choose your local time zone">
        <select className="form-select rounded-md border-gray-300">
          <option>UTC-5 Eastern Time</option>
          <option>UTC-6 Central Time</option>
          <option>UTC-7 Mountain Time</option>
        </select>
      </SettingItem>
      <SettingItem
        title="Temperature Unit"
        description="Select your preferred temperature unit"
      >
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input type="radio" name="temp-unit" className="form-radio" />
            <span className="ml-2">Celsius</span>
          </label>
          <label className="flex items-center">
            <input type="radio" name="temp-unit" className="form-radio" />
            <span className="ml-2">Fahrenheit</span>
          </label>
        </div>
      </SettingItem>
    </div>
  </div>
);

const SystemSettings = () => (
  <div className="p-6 space-y-6">
    <h2 className="text-lg font-medium text-gray-900">System Configuration</h2>
    <div className="space-y-4">
      <SettingItem
        title="Simulation Update Rate"
        description="Set how frequently the simulation updates"
      >
        <select className="form-select rounded-md border-gray-300">
          <option>Real-time</option>
          <option>Every 5 seconds</option>
          <option>Every 10 seconds</option>
        </select>
      </SettingItem>
      <SettingItem
        title="Data Logging"
        description="Configure system data logging preferences"
      >
        <div className="space-y-2">
          <label className="flex items-center">
            <input type="checkbox" className="form-checkbox" />
            <span className="ml-2">Enable detailed logging</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="form-checkbox" />
            <span className="ml-2">Archive logs weekly</span>
          </label>
        </div>
      </SettingItem>
    </div>
  </div>
);

const NotificationSettings = () => (
  <div className="p-6 space-y-6">
    <h2 className="text-lg font-medium text-gray-900">
      Notification Preferences
    </h2>
    <div className="space-y-4">
      <SettingItem
        title="Alert Settings"
        description="Configure how you receive alerts"
      >
        <div className="space-y-2">
          <label className="flex items-center">
            <input type="checkbox" className="form-checkbox" />
            <span className="ml-2">Email notifications</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="form-checkbox" />
            <span className="ml-2">Push notifications</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="form-checkbox" />
            <span className="ml-2">SMS alerts</span>
          </label>
        </div>
      </SettingItem>
    </div>
  </div>
);

const SecuritySettings = () => (
  <div className="p-6 space-y-6">
    <h2 className="text-lg font-medium text-gray-900">Security & Privacy</h2>
    <div className="space-y-4">
      <SettingItem
        title="Two-Factor Authentication"
        description="Add an extra layer of security"
      >
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Enable 2FA
        </button>
      </SettingItem>
      <SettingItem
        title="Session Timeout"
        description="Set automatic logout time"
      >
        <select className="form-select rounded-md border-gray-300">
          <option>15 minutes</option>
          <option>30 minutes</option>
          <option>1 hour</option>
        </select>
      </SettingItem>
    </div>
  </div>
);

const SettingItem = ({ title, description, children }) => (
  <div className="grid grid-cols-12 gap-4 items-start">
    <div className="col-span-12 sm:col-span-4">
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <div className="col-span-12 sm:col-span-8">{children}</div>
  </div>
);

export default SettingsPage;
