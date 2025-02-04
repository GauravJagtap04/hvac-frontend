import React, { useState } from "react";

const UserParameters = ({ onSubmit }) => {
  const [parameters, setParameters] = useState({
    length: "5",
    breadth: "4",
    width: "2.5",
    simulationTime: "4",
    hvacPower: "5",
    temperature: "22",
    fanMode: "auto",
  });

  const handleChange = (e) => {
    setParameters({
      ...parameters,
      [e.target.name]: e.target.value,
    });
  };

  const handleTempChange = (e) => {
    const temp = e.target.value;
    setParameters((prev) => ({
      ...prev,
      temperature: temp,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(parameters);
  };

  // Calculate color based on temperature
  const getTempColor = (temp) => {
    if (temp < 18) return "#00b4d8";
    if (temp > 26) return "#ef476f";
    return "#06d6a0";
  };

  const tempColor = getTempColor(parameters.temperature);

  const fanModes = [
    { value: "auto", label: "Auto", icon: "🔄" },
    { value: "low", label: "Low", icon: "🌡️" },
    { value: "medium", label: "Medium", icon: "💨" },
    { value: "high", label: "High", icon: "🌪️" },
    { value: "turbo", label: "Turbo", icon: "⚡" },
  ];

  const adjustTemperature = (increment) => {
    setParameters((prev) => ({
      ...prev,
      temperature: Math.min(
        32,
        Math.max(16, Number(prev.temperature) + increment)
      ).toString(),
    }));
  };

  const calculateRoomSize = () => {
    return (
      parseFloat(parameters.length) *
      parseFloat(parameters.breadth) *
      parseFloat(parameters.width)
    ).toFixed(2);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-700 mb-6">
        Input Parameters
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Add Fan Mode Selection before thermostat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fan Mode
            </label>
            <div className="grid grid-cols-5 gap-2">
              {fanModes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() =>
                    setParameters({ ...parameters, fanMode: mode.value })
                  }
                  className={`p-2 rounded-lg flex flex-col items-center justify-center transition-colors
                    ${
                      parameters.fanMode === mode.value
                        ? "bg-blue-100 border-blue-500 border-2 text-blue-700"
                        : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                    }`}
                >
                  <span className="text-xl mb-1">{mode.icon}</span>
                  <span className="text-xs font-medium">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Improved Thermostat Control */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Temperature Control
            </label>
            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => adjustTemperature(-0.5)}
                className="w-12 h-12 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center text-blue-600 text-2xl font-bold transition-colors"
              >
                -
              </button>

              <div className="relative w-40 h-40">
                <div
                  className="absolute inset-0 rounded-full shadow-lg"
                  style={{
                    background: `conic-gradient(${tempColor} ${
                      (parameters.temperature - 16) * 9
                    }deg, #e5e7eb 0deg)`,
                  }}
                />
                <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                  <div className="text-center">
                    <span
                      className="text-5xl font-bold"
                      style={{ color: tempColor }}
                    >
                      {parameters.temperature}
                    </span>
                    <span
                      className="text-2xl ml-1"
                      style={{ color: tempColor }}
                    >
                      °C
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      Target Temperature
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => adjustTemperature(0.5)}
                className="w-12 h-12 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 text-2xl font-bold transition-colors"
              >
                +
              </button>
            </div>

            <div className="flex justify-between text-sm text-gray-500 mt-4 px-4">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                <span>Cooling</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                <span>Heating</span>
              </div>
            </div>
          </div>

          {/* Room Dimensions */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Length (m)
              </label>
              <input
                type="number"
                name="length"
                min="1"
                max="20"
                step="0.1"
                value={parameters.length}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Breadth (m)
              </label>
              <input
                type="number"
                name="breadth"
                min="1"
                max="20"
                step="0.1"
                value={parameters.breadth}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Height (m)
              </label>
              <input
                type="number"
                name="width"
                min="1"
                max="10"
                step="0.1"
                value={parameters.width}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="text-sm text-gray-600 text-right">
            Room Volume: {calculateRoomSize()} m³
          </div>

          {/* Simulation Time Control */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Simulation Time
              </label>
              <span className="text-sm text-gray-600">
                {parameters.simulationTime} hours
              </span>
            </div>
            <input
              type="range"
              name="simulationTime"
              min="1"
              max="24"
              step="0.5"
              value={parameters.simulationTime}
              onChange={handleChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 hour</span>
              <span>24 hours</span>
            </div>
          </div>

          {/* HVAC Power Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HVAC Power (kW)
            </label>
            <input
              type="number"
              name="hvacPower"
              min="1"
              max="20"
              step="0.5"
              value={parameters.hvacPower}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Start Simulation
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserParameters;
