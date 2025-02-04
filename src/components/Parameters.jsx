import React from "react";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";
import TemperatureGraph from "./TemperatureGraph";

const Parameters = ({ onParametersChange, simulationData }) => {
  // Example of how the real-time data would be structured
  const parameters = {
    energyUsage: { value: 850, trend: "up", unit: "kWh" },
    airflow: { value: 1200, trend: "down", unit: "CFM" },
    humidity: { value: 45, trend: "stable", unit: "%" },
    envTemp: { value: 22.5, trend: "up", unit: "°C" },
    powerConsumption: { value: 3200, trend: "up", unit: "W" },
    timeRequired: { value: 8.5, trend: "stable", unit: "hours" },
    targetTemp: { value: 22, trend: "stable", unit: "°C" },
    fanMode: {
      value: simulationData?.fanMode || "auto",
      trend: "stable",
      unit: "",
    },
  };

  const getTrendIcon = (trend) => {
    if (trend === "up") return <ArrowUpIcon className="w-4 h-4 text-red-500" />;
    if (trend === "down")
      return <ArrowDownIcon className="w-4 h-4 text-green-500" />;
    return null;
  };

  // Update parameters if simulationData exists
  React.useEffect(() => {
    if (simulationData) {
      const updatedParameters = {
        ...parameters,
        powerConsumption: {
          value: simulationData.hvacPower * 1000,
          trend: "stable",
          unit: "W",
        },
        timeRequired: {
          value: simulationData.simulationTime,
          trend: "stable",
          unit: "hours",
        },
        targetTemp: {
          value: parseFloat(simulationData.temperature),
          trend: "stable",
          unit: "°C",
        },
        fanMode: {
          value: simulationData.fanMode,
          trend: "stable",
          unit: "",
        },
      };
      onParametersChange(updatedParameters);
    }
  }, [simulationData]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">System Parameters</h2>
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-500">Auto-refresh:</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(parameters).map(([key, data]) => (
          <div
            key={key}
            className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <div className="text-sm font-medium text-gray-600 mb-1">
              {key.replace(/([A-Z])/g, " $1").trim()}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xl font-semibold text-gray-900">
                {data.value}
                <span className="text-sm ml-1 text-gray-500">{data.unit}</span>
              </div>
              {getTrendIcon(data.trend)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <TemperatureGraph
          targetTemp={
            simulationData?.temperature
              ? parseFloat(simulationData.temperature)
              : 22
          }
        />
      </div>
    </div>
  );
};

export default Parameters;
