import React from "react";
import { useOutletContext } from "react-router-dom";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const energyData = [
  { time: "00:00", value: 240 },
  { time: "04:00", value: 180 },
  { time: "08:00", value: 320 },
  { time: "12:00", value: 450 },
  { time: "16:00", value: 380 },
  { time: "20:00", value: 290 },
  { time: "23:59", value: 250 },
];

const temperatureData = [
  { name: "Zone A", value: 23 },
  { name: "Zone B", value: 22 },
  { name: "Zone C", value: 24 },
  { name: "Zone D", value: 21 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const AnalyticsPage = () => {
  const { isCollapsed } = useOutletContext();

  const mockData = {
    energyConsumption: 2847.23,
    efficiency: 87.5,
    costSavings: 12350,
    carbonReduction: 45.8,
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
          <h1 className="text-2xl font-semibold text-gray-900">
            System Analytics
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          isCollapsed ? "max-w-8xl" : "max-w-7xl"
        } mx-auto px-4 sm:px-6 lg:px-8 py-8`}
      >
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Energy Consumption"
            value={`${mockData.energyConsumption} kWh`}
            trend="+2.4%"
            trendDirection="up"
          />
          <MetricCard
            title="System Efficiency"
            value={`${mockData.efficiency}%`}
            trend="+5.1%"
            trendDirection="up"
          />
          <MetricCard
            title="Cost Savings"
            value={`$${mockData.costSavings}`}
            trend="+12.3%"
            trendDirection="up"
          />
          <MetricCard
            title="Carbon Reduction"
            value={`${mockData.carbonReduction} tons`}
            trend="-8.4%"
            trendDirection="down"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Energy Usage Over Time" />
          <ChartCard title="Temperature Distribution" />
        </div>

        {/* Performance Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                System Performance Analysis
              </h2>
              <div className="space-y-4">
                <PerformanceRow
                  title="HVAC Load"
                  value="78%"
                  status="optimal"
                />
                <PerformanceRow
                  title="Air Quality"
                  value="95%"
                  status="excellent"
                />
                <PerformanceRow
                  title="Maintenance Status"
                  value="Good"
                  status="good"
                />
                <PerformanceRow
                  title="Energy Efficiency"
                  value="82%"
                  status="warning"
                />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Recent Alerts
            </h2>
            <div className="space-y-4">
              <Alert
                message="High energy consumption detected"
                type="warning"
                time="2 hours ago"
              />
              <Alert
                message="Maintenance check required"
                type="info"
                time="5 hours ago"
              />
              <Alert
                message="Temperature threshold exceeded"
                type="error"
                time="1 day ago"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const MetricCard = ({ title, value, trend, trendDirection }) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <div className="mt-2 flex items-baseline">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <span
        className={`ml-2 text-sm font-medium ${
          trendDirection === "up" ? "text-green-600" : "text-red-600"
        }`}
      >
        {trend}
      </span>
    </div>
  </div>
);

const ChartCard = ({ title }) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>
    <div className="h-64">
      {title === "Energy Usage Over Time" ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={energyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={temperatureData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}°C`}
            >
              {temperatureData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  </div>
);

const PerformanceRow = ({ title, value, status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "excellent":
        return "text-green-600 bg-green-50";
      case "optimal":
        return "text-blue-600 bg-blue-50";
      case "good":
        return "text-green-600 bg-green-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-600">{title}</span>
      <div className="flex items-center space-x-4">
        <span className="font-medium text-gray-900">{value}</span>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
            status
          )}`}
        >
          {status.toUpperCase()}
        </span>
      </div>
    </div>
  );
};

const Alert = ({ message, type, time }) => {
  const getAlertColor = (type) => {
    switch (type) {
      case "error":
        return "text-red-600 bg-red-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "info":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className={`p-4 rounded-lg ${getAlertColor(type)}`}>
      <div className="flex justify-between items-center">
        <span className="font-medium">{message}</span>
        <span className="text-sm text-gray-500">{time}</span>
      </div>
    </div>
  );
};

export default AnalyticsPage;
