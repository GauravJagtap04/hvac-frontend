import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../components/SupabaseClient";
import { format } from "date-fns";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";

const Dashboard = () => {
  const { isCollapsed } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [simulations, setSimulations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });
  const [weatherData, setWeatherData] = useState(null);
  const [energyStats, setEnergyStats] = useState({
    highestEnergy: 0,
    highestPower: 0,
  });
  const [processedData, setProcessedData] = useState([]);
  const [selectedType, setSelectedType] = useState("all"); // Add this state

  const processSimulationData = (simulationsData) => {
    const energyData = simulationsData.map((sim) => ({
      date: new Date(sim.created_at).toLocaleDateString(),
      energy: sim.parameters.results.energyConsumption / 1000, // Convert to kW
      power: sim.parameters.hvac.power,
      type: sim.type,
    }));

    const highestEnergy = Math.max(...energyData.map((d) => d.energy));
    const highestPower = Math.max(...energyData.map((d) => d.power));

    setEnergyStats({
      highestEnergy: highestEnergy.toFixed(2),
      highestPower: highestPower.toFixed(2),
    });

    setProcessedData(energyData);
  };
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          (err) => reject(err)
        );
      }
    });
  };
  const fetchWeather = async () => {
    try {
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;

      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=64f7ed0f4795b8e14478efa48a22c367&units=metric`
      );
      setWeatherData(response.data);
    } catch (error) {
      console.error("Error fetching weather:", error);
      // Fallback to a default location if geolocation fails
      try {
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=Mumbai&appid=64f7ed0f4795b8e14478efa48a22c367&units=metric`
        );
        setWeatherData(response.data);
      } catch (fallbackError) {
        console.error("Error fetching fallback weather:", fallbackError);
      }
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const userId = localStorage.getItem("user");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        const { data, error } = await supabase
          .from("simulations")
          .select("*")
          .eq("userid", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) {
          setSimulations(data);
          processSimulationData(data);
        }
      } catch (error) {
        console.error("Error fetching simulations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    fetchWeather();
  }, []);

  const filteredSimulations = simulations.filter((sim) =>
    selectedType === "all" ? true : sim.type === selectedType
  );

  const sortedSimulations = [...filteredSimulations].sort((a, b) => {
    if (sortConfig.key === "created_at") {
      return sortConfig.direction === "asc"
        ? new Date(a.created_at) - new Date(b.created_at)
        : new Date(b.created_at) - new Date(a.created_at);
    }
    return 0;
  });

  useEffect(() => {
    if (sortedSimulations.length > 0) {
      processSimulationData(sortedSimulations);
    }
  }, [searchTerm, sortConfig.direction]);

  const handleSort = () => {
    setSortConfig({
      key: "created_at",
      direction: sortConfig.direction === "asc" ? "desc" : "asc",
    });
  };

  const StatCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">
              Highest Energy Consumption
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {energyStats.highestEnergy} kW
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">
              Highest Power Usage
            </div>
            <div className="text-2xl font-bold text-green-600">
              {energyStats.highestPower} kW
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-orange-100 rounded-lg">
            <svg
              className="w-6 h-6 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">
              Current External Temperature
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {weatherData ? `${weatherData.main.temp}°C` : "Loading..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const EnergyGraph = ({ simulations }) => {
    const data = processSimulationData(simulations);

    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Energy & Power Consumption
        </h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="energy"
                stroke="#2563eb"
                name="Energy (kW)"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="power"
                stroke="#16a34a"
                name="Power (kW)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md">
        <div
          className={`transition-all duration-300 ${
            isCollapsed ? "max-w-8xl" : "max-w-7xl"
          } mx-auto px-6 py-6`}
        >
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
      </header>

      <main
        className={`transition-all duration-300 ${
          isCollapsed ? "max-w-8xl" : "max-w-7xl"
        } mx-auto px-6 py-8`}
      >
        <div className="mb-8">
          <StatCards />
        </div>

        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Energy & Power Consumption
            </h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis
                    yAxisId="left"
                    label={{
                      value: "Energy (kW)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    label={{
                      value: "Power (kW)",
                      angle: 90,
                      position: "insideRight",
                    }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="energy"
                    stroke="#2563eb"
                    name="Energy (kW)"
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="power"
                    stroke="#16a34a"
                    name="Power (kW)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <FormControl sx={{ minWidth: 240 }}>
              <InputLabel>Filter by System Type</InputLabel>
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-white"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&:hover fieldset": {
                      borderColor: "#3b82f6",
                    },
                  },
                }}
              >
                <MenuItem value="all">All Systems</MenuItem>
                <MenuItem value="split-system">Split System</MenuItem>
                <MenuItem value="heat-pump-system">Heat Pump System</MenuItem>
                <MenuItem value="chilled-water-system">
                  Chilled Water System
                </MenuItem>
                <MenuItem value="variable-refrigerant-flow-system">
                  VRF System
                </MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" className="text-gray-600 font-medium">
              {filteredSimulations.length} simulation
              {filteredSimulations.length !== 1 ? "s" : ""} found
            </Typography>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Power (kW)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fan Speed (%)
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Air Flow Rate (m³/s)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Temp (°C)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    External Temp (°C)
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wall Insulation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Final Temp (°C)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Energy (kW)
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={handleSort}
                  >
                    Date {sortConfig.direction === "asc" ? "↑" : "↓"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedSimulations.map((sim) => (
                  <tr key={sim.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sim.type}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-mono text-blue-600">
                        {sim.parameters.hvac.power}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-mono text-yellow-600">
                        {sim.parameters.hvac.fanSpeed}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-mono text-indigo-600">
                        {sim.parameters.hvac.airFlowRate}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-mono text-blue-600">
                        {sim.parameters.room.currentTemp}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-mono text-blue-600">
                        {sim.parameters.room.externalTemp}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="capitalize">
                        {sim.parameters.room.wallInsulation}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-mono text-green-600">
                        {sim.parameters.results.finalTemperature.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-mono text-red-600">
                        {(
                          sim.parameters.results.energyConsumption / 1000
                        ).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(sim.created_at), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          sim.is_success
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {sim.is_success ? "Success" : "Failed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
