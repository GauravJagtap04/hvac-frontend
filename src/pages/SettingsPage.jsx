import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";

const SettingsPage = () => {
  const { isCollapsed } = useOutletContext();
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", name: "General Settings" },
    { id: "system", name: "System Configuration" },
    { id: "notifications", name: "Notifications" },
    { id: "security", name: "Security & Privacy" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div
          className={`transition-all duration-300 ${
            isCollapsed ? "max-w-8xl" : "max-w-7xl"
          } mx-auto px-4 sm:px-6 lg:px-8 py-4`}
        >
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
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
