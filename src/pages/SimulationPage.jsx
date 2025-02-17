import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import Model from "../components/Model";
import Parameters from "../components/Parameters";
import UserParameters from "../components/UserParameters";

const SimulationPage = () => {
  const [simulationData, setSimulationData] = useState(null);
  const { isCollapsed } = useOutletContext();

  const handleParametersChange = (params) => {
    setSimulationData(params);
  };

  const handleUserParametersSubmit = (userParams) => {
    const updatedData = {
      ...simulationData,
      ...userParams,
    };
    setSimulationData(updatedData);

    // Send user parameters to backend for calculations
    fetch("http://localhost:8000/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Calculation result:", data);
        // Optionally handle backend data
      })
      .catch((error) => console.error("Backend error:", error));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div
          className={`transition-all duration-300 ${
            isCollapsed ? "max-w-8xl" : "max-w-7xl"
          } mx-auto px-4 sm:px-6 lg:px-8 py-4`}
        >
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">
              HVAC System Simulation
            </h1>
            <div className="text-sm text-gray-500">
              Session ID: {Math.random().toString(36).substr(2, 9)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          isCollapsed ? "max-w-8xl" : "max-w-7xl"
        } mx-auto px-4 sm:px-6 lg:px-8 py-8`}
      >
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Model & Controls */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Model Viewer */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  System Model
                </h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">3D View</span>
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16m-7 6h7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <Model simulationData={simulationData} />
            </div>

            {/* Parameters Panel */}
            <div className="bg-white rounded-lg shadow-sm">
              <Parameters
                onParametersChange={handleParametersChange}
                simulationData={simulationData}
              />
            </div>
          </div>

          {/* Right Column - User Controls */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-lg shadow-sm sticky top-6">
              <UserParameters onSubmit={handleUserParametersSubmit} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div
          className={`transition-all duration-300 ${
            isCollapsed ? "max-w-8xl" : "max-w-7xl"
          } mx-auto px-4 sm:px-6 lg:px-8 py-4`}
        >
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>HVAC Simulation System v1.0</div>
            <div className="flex items-center space-x-4">
              <span>Status: Online</span>
              <span>•</span>
              <span>Last Updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SimulationPage;
