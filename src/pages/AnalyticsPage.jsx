import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../components/SupabaseClient";
import Header from "@/components/Header";
import { format } from "date-fns";
import axios from "axios";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Label } from "@/components/ui/label";

import { ChevronDown, ChevronUp, Loader } from "lucide-react";

// Colors for pie chart
const COLORS = [
  "#E6E5E5",
  "#BCBCBD",
  "#939395",
  "#6A6A6C",
  "#414144",
  "#5DADE2",
];

const Dashboard = () => {
  const { isCollapsed } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [simulations, setSimulations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userName, setUserName] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });
  const [weatherData, setWeatherData] = useState(null);
  const [energyStats, setEnergyStats] = useState({
    highestEnergy: 0,
    highestPower: 0,
    averageCOP: 0,
    successRate: 0,
  });
  const [processedData, setProcessedData] = useState([]);
  const [systemTypeData, setSystemTypeData] = useState([]);
  const [selectedType, setSelectedType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const processSimulationData = (simulationsData) => {
    const energyData = simulationsData.map((sim) => ({
      date: new Date(sim.created_at).toLocaleDateString(),
      energy: parseFloat(
        (sim.parameters.results.energyConsumption / 1000).toFixed(2)
      ),
      power: sim.parameters.hvac.power,
      type: sim.type,
      cop:
        sim.parameters.results.cop ||
        sim.parameters.results.energyConsumption /
          1000 /
          sim.parameters.hvac.power,
    }));

    const highestEnergy = Math.max(...energyData.map((d) => d.energy));
    const highestPower = Math.max(...energyData.map((d) => d.power));

    // Calculate average COP and success rate
    const averageCOP = (
      energyData.reduce((sum, item) => sum + (item.cop || 0), 0) /
      (energyData.length || 1)
    ).toFixed(2);

    const successRate = (
      (simulationsData.filter((sim) => sim.is_success).length /
        (simulationsData.length || 1)) *
      100
    ).toFixed(1);

    setEnergyStats({
      highestEnergy: highestEnergy.toFixed(2),
      highestPower: highestPower.toFixed(2),
      averageCOP,
      successRate,
    });

    setProcessedData(energyData);

    // Calculate system type distribution - like in AnalyticsPage
    const typeCount = simulationsData.reduce((acc, sim) => {
      acc[sim.type] = (acc[sim.type] || 0) + 1;
      return acc;
    }, {});

    const systemTypeData = Object.entries(typeCount).map(([name, value]) => ({
      name: name
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      value,
    }));

    setSystemTypeData(systemTypeData);
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
    const fetchUserData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user")); // Parse the string into an object
        console.log("User from localStorage:", user);
        if (user && user.id) {
          const { data, error } = await supabase
            .from("users")
            .select("name")
            .eq("id", user.id)
            .single();

          if (error) throw error;
          if (data) {
            console.log("Username:", data.name);
            setUserName(data.name);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
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

  const paginatedSimulations = sortedSimulations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedSimulations.length / itemsPerPage);

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

  const MetricCard = ({ title, value, unit }) => (
    <Card className="w-full h-full min-w-[160px] bg-background">
      <CardContent className="flex flex-col items-center p-6">
        <CardTitle className="mt-4 text-muted-foreground">{title}</CardTitle>
        <span className="mt-2 mb-1 text-4xl font-bold text-primary">
          {value}
        </span>
        <p className="text-sm text-muted-foreground">{unit}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-primary w-full max-w-full">
      <Header isCollapsed={isCollapsed} name="Analytics" />

      <main
        className={`relative transition-all duration-300 ${
          isCollapsed ? "max-w-8xl" : "max-w-7xl"
        } mx-auto px-4 sm:px-6 py-8`}
      >
        {loading ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <Loader className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
              <MetricCard
                title="Highest Energy Consumption"
                value={energyStats.highestEnergy}
                unit="kW"
              />
              <MetricCard
                title="Highest Power Usage"
                value={energyStats.highestPower}
                unit="kW"
              />
              <MetricCard
                title="Average COP"
                value={energyStats.averageCOP}
                unit=""
              />
              <MetricCard
                title="Current External Temperature"
                value={weatherData ? weatherData.main.temp : "Loading..."}
                unit="°C"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 mt-6">
              <Card className="md:col-span-2 bg-background text-primary border border-input">
                <CardHeader>
                  <CardTitle>Energy & Power Consumption</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    className="flex items-center justify-center"
                  >
                    <LineChart data={processedData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--accent)"
                      />
                      <XAxis
                        dataKey="date"
                        stroke="var(--border)"
                        tick={{ fill: "var(--primary)" }}
                      />
                      <YAxis
                        yAxisId="left"
                        label={{
                          value: "Energy (kWh)",
                          angle: -90,
                          position: "insideLeft",
                        }}
                        stroke="var(--border)"
                        tick={{ fill: "var(--primary)" }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{
                          value: "Power (kW)",
                          angle: 90,
                          position: "insideRight",
                        }}
                        stroke="var(--border)"
                        tick={{ fill: "var(--primary)" }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "rgba(var(--background-rgb), 0.75)",
                          border: "2px solid var(--border)",
                          borderRadius: "8px",
                          color: "var(--primary)",
                          backdropFilter: "blur(8px)",
                          minWidth: "13rem",
                          WebkitBackdropFilter: "blur(8px)",
                        }}
                        formatter={(value) => value.toFixed(2)}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="energy"
                        stroke="#0ea5e9"
                        name="Energy (kWh)"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="power"
                        stroke="var(--primary)"
                        name="Power (kW)"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-background text-primary border border-input">
                <CardHeader>
                  <CardTitle>System Type Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={systemTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                        label
                        stroke="none"
                        strokeWidth={0}
                      >
                        {systemTypeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "rgba(var(--background-rgb), 0.75)",
                          border: "2px solid var(--border)",
                          borderRadius: "8px",
                          backdropFilter: "blur(8px)",
                          minWidth: "13rem",
                          WebkitBackdropFilter: "blur(8px)",
                        }}
                        labelStyle={{ color: "var(--primary)" }}
                        itemStyle={{ color: "var(--primary)" }}
                        formatter={(value, name) => [value.toFixed(2), name]}
                      />

                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="w-full mt-6">
              <Card className="w-full bg-background border border-input">
                <CardHeader>
                  <CardTitle>Simulation History</CardTitle>
                </CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-center px-6">
                  <div className="w-full flex flex-col md:flex-row lg:flex-row sm:w-60 space-y-1.5">
                    <Label
                      htmlFor="systemType"
                      className="whitespace-nowrap pr-4"
                    >
                      Filter by System Type
                    </Label>
                    <Select
                      value={selectedType}
                      onValueChange={setSelectedType}
                    >
                      <SelectTrigger id="systemType" className="bg-white">
                        <SelectValue placeholder="Select a system type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Systems</SelectItem>
                        <SelectItem value="split-system">
                          Split System
                        </SelectItem>
                        <SelectItem value="heat-pump-system">
                          Heat Pump System
                        </SelectItem>
                        <SelectItem value="chilled-water-system">
                          Chilled Water System
                        </SelectItem>
                        <SelectItem value="variable-refrigerant-flow-system">
                          VRF System
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm font-medium text-ring">
                    {filteredSimulations.length} simulation
                    {filteredSimulations.length !== 1 ? "s" : ""} found
                  </p>
                </div>

                <div className="w-full px-4">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-break-spaces font-semibold">
                          Type
                        </TableHead>
                        <TableHead className="whitespace-break-spaces font-semibold">
                          Power (kW)
                        </TableHead>
                        <TableHead className="whitespace-break-spaces font-semibold">
                          Current Temp (°C)
                        </TableHead>
                        <TableHead className="whitespace-break-spaces font-semibold">
                          External Temp (°C)
                        </TableHead>
                        <TableHead className="whitespace-break-spaces font-semibold">
                          Wall Insulation
                        </TableHead>
                        <TableHead className="whitespace-break-spaces font-semibold">
                          Final Temp (°C)
                        </TableHead>
                        <TableHead className="whitespace-break-spaces font-semibold">
                          Energy (kWh)
                        </TableHead>
                        <TableHead className="whitespace-break-spaces font-semibold">
                          COP
                        </TableHead>
                        <TableHead
                          onClick={handleSort}
                          className="cursor-pointer font-semibold flex flex-row items-center justify-center"
                        >
                          Date{" "}
                          {sortConfig.direction === "asc" ? (
                            <ChevronUp />
                          ) : (
                            <ChevronDown />
                          )}
                        </TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSimulations.map((sim) => {
                        const energy = (
                          sim.parameters.results.energyConsumption / 1000
                        ).toFixed(2);
                        const power = sim.parameters.hvac.power;
                        const cop = (energy / power || 0).toFixed(2);

                        return (
                          <TableRow
                            key={sim.id}
                            className="hover:bg-accent/5 bg-background text-primary whitespace-break-spaces"
                          >
                            <TableCell className="font-medium">
                              {sim.type
                                .split("-")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                )
                                .join(" ")}
                            </TableCell>
                            <TableCell>{power}</TableCell>
                            <TableCell>
                              {sim.parameters.room.currentTemp}
                            </TableCell>
                            <TableCell>
                              {sim.parameters.room.externalTemp}
                            </TableCell>
                            <TableCell className="capitalize">
                              {sim.parameters.room.wallInsulation}
                            </TableCell>
                            <TableCell>
                              {sim.parameters.results.finalTemperature.toFixed(
                                2
                              )}
                            </TableCell>
                            <TableCell>{energy}</TableCell>
                            <TableCell>{cop}</TableCell>
                            <TableCell>
                              {format(
                                new Date(sim.created_at),
                                "MMM d, yyyy HH:mm"
                              )}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  sim.is_success
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {sim.is_success ? "Success" : "Failed"}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className="cursor-pointer"
                      />
                    </PaginationItem>
                    <PaginationItem className="text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="cursor-pointer"
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
