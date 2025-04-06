import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../components/SupabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Box,
  Typography,
  Card,
  Grid,
  Chip,
  CircularProgress,
  alpha,
  useTheme,
} from "@mui/material";
import {
  BoltOutlined,
  PowerOutlined,
  ThermostatAuto,
  Speed,
} from "@mui/icons-material";

const AnalyticsPage = () => {
  const { isCollapsed } = useOutletContext();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    energyData: [],
    systemTypeData: [],
    stats: {
      totalEnergy: 0,
      averagePower: 0,
      successRate: 0,
      averageCOP: 0,
    },
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const activeUserId = sessionStorage.getItem("activeUserId");
        const { data, error } = await supabase
          .from("simulations")
          .select("*")
          .eq("userid", activeUserId);

        if (error) throw error;

        // Process data for analytics
        const energyData = data.map((sim) => ({
          date: new Date(sim.created_at).toLocaleDateString(),
          energy: sim.parameters.results.energyConsumption / 1000,
          power: sim.parameters.hvac.power,
          type: sim.type,
        }));

        // Calculate system type distribution
        const typeCount = data.reduce((acc, sim) => {
          acc[sim.type] = (acc[sim.type] || 0) + 1;
          return acc;
        }, {});

        const systemTypeData = Object.entries(typeCount).map(
          ([name, value]) => ({
            name: name
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" "),
            value,
          })
        );

        // Updated stats calculation to handle NaN
        const stats = {
          totalEnergy: energyData
            .reduce((sum, item) => sum + item.energy, 0)
            .toFixed(2),
          averagePower: (
            energyData.reduce((sum, item) => sum + item.power, 0) /
            (energyData.length || 1)
          ).toFixed(2),
          successRate: (
            (data.filter((sim) => sim.is_success).length / (data.length || 1)) *
            100
          ).toFixed(1),
          averageCOP:
            (
              data.reduce((sum, sim) => {
                const cop = sim.parameters.results.cop || 0;
                return sum + cop;
              }, 0) / (data.length || 1)
            ).toFixed(2) || "0.00",
        };

        setAnalytics({ energyData, systemTypeData, stats });
        setLoading(false);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
  ];
  const goBack = () => {
    navigate(-1);
  };

  const MetricCard = ({ title, value, icon, color }) => (
    <Card
      sx={{
        p: 3,
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(
          color,
          0.15
        )} 100%)`,
        backdropFilter: "blur(10px)",
        border: `1px solid ${alpha(color, 0.2)}`,
        transition: "transform 0.3s, box-shadow 0.3s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: `0 8px 24px -4px ${alpha(color, 0.2)}`,
        },
      }}
    >
      {icon}
      <Box sx={{ ml: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" sx={{ color }}>
          {value}
        </Typography>
      </Box>
    </Card>
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: 3,
        pt: "84px", // Add padding top to account for fixed header
        bgcolor: "background.default",
        background: `linear-gradient(135deg, ${
          theme.palette.background.default
        } 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
      }}
    >
      <header
        className={`bg-blue-100 dark:bg-gray-800 shadow-lg fixed top-0 ${
          isCollapsed ? "left-[80px]" : "left-[250px]"
        } right-0 z-10 transition-all duration-300`}
      >
        <div className="px-3 py-2 sm:p-4 flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* <button
                onClick={goBack}
                className="p-1 sm:p-2 group rounded-full bg-transparent hover:bg-blue-500 dark:hover:bg-gray-700 focus:outline-none transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 group-hover:text-white dark:text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button> */}
            </div>
            <h1 className="text-base sm:text-xl font-semibold ml-1 sm:ml-3 text-gray-800 dark:text-white truncate">
              Analytics
            </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Add additional header items here */}
          </div>
        </div>
      </header>

      <Grid container spacing={3}>
        {/* Remove the Grid item for header and continue with metrics */}
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Total Energy Consumption"
            value={`${analytics.stats.totalEnergy} kWh`}
            icon={
              <BoltOutlined
                sx={{ fontSize: 40, color: theme.palette.primary.main }}
              />
            }
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Average Power"
            value={`${analytics.stats.averagePower} kW`}
            icon={
              <PowerOutlined
                sx={{ fontSize: 40, color: theme.palette.secondary.main }}
              />
            }
            color={theme.palette.secondary.main}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Success Rate"
            value={`${analytics.stats.successRate}%`}
            icon={
              <ThermostatAuto
                sx={{ fontSize: 40, color: theme.palette.success.main }}
              />
            }
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Average COP"
            value={analytics.stats.averageCOP}
            icon={
              <Speed sx={{ fontSize: 40, color: theme.palette.warning.main }} />
            }
            color={theme.palette.warning.main}
          />
        </Grid>

        {/* Updated Chart Cards */}
        <Grid item xs={12} md={8}>
          <Card
            sx={{
              p: 4,
              height: "450px",
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              transition: "transform 0.3s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: `0 8px 24px -4px ${alpha(
                  theme.palette.primary.main,
                  0.2
                )}`,
              },
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: theme.palette.primary.main, fontWeight: "bold" }}
            >
              Energy Consumption Trend
            </Typography>
            <ResponsiveContainer>
              <LineChart data={analytics.energyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis
                  yAxisId="left"
                  label={{
                    value: "Energy (kWh)",
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
                  stroke={theme.palette.primary.main}
                  name="Energy"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="power"
                  stroke={theme.palette.secondary.main}
                  name="Power"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              p: 4,
              height: "450px",
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              transition: "transform 0.3s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: `0 8px 24px -4px ${alpha(
                  theme.palette.primary.main,
                  0.2
                )}`,
              },
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: theme.palette.primary.main, fontWeight: "bold" }}
            >
              System Type Distribution
            </Typography>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={analytics.systemTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {analytics.systemTypeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Added Analytics Table */}
        <Grid item xs={12}>
          <Card
            sx={{
              p: 4,
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: theme.palette.primary.main, fontWeight: "bold" }}
            >
              Detailed Analytics
            </Typography>
            <Box sx={{ overflowX: "auto" }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      System Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Energy (kW)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Power (kW)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      COP
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Efficiency
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.energyData.map((data, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {data.type
                          .split("-")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-mono text-blue-600">
                          {data.energy.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-mono text-green-600">
                          {data.power.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-mono text-purple-600">
                          {(data.energy / data.power || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-mono text-indigo-600">
                          {(data.energy / (data.power * 100) || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            data.energy < data.power
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {data.energy < data.power
                            ? "Inefficient"
                            : "Efficient"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsPage;
