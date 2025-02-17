import React from "react";
import { useOutletContext } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Chart options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: "rgba(0, 0, 0, 0.1)",
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
};

// Generate dummy data
const generateDummyData = () => {
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  return {
    labels: hours,
    datasets: [
      {
        label: "Temperature (°C)",
        data: Array.from({ length: 24 }, () => Math.random() * 10 + 20),
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
      {
        label: "Humidity (%)",
        data: Array.from({ length: 24 }, () => Math.random() * 30 + 40),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
      },
    ],
  };
};

const Dashboard = () => {
  const { isCollapsed } = useOutletContext();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div
          className={`transition-all duration-300 ${
            isCollapsed ? "max-w-8xl" : "max-w-7xl"
          } mx-auto px-4 sm:px-6 lg:px-8 py-4`}
        >
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        </div>
      </header>

      <main
        className={`transition-all duration-300 ${
          isCollapsed ? "max-w-8xl" : "max-w-7xl"
        } mx-auto px-4 sm:px-6 lg:px-8 py-8`}
      >
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="System Temperature"
            value="23.5°C"
            change="+2.1°C"
            trend="up"
            icon="🌡️"
          />
          <MetricCard
            title="Energy Usage"
            value="456 kWh"
            change="-5.2%"
            trend="down"
            icon="⚡"
          />
          <MetricCard
            title="System Efficiency"
            value="94%"
            change="+2%"
            trend="up"
            icon="📈"
          />
          <MetricCard
            title="Active Units"
            value="12/15"
            change="+1"
            trend="up"
            icon="🔧"
          />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Main Chart */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  System Performance
                </h2>
                <select className="form-select rounded-md border-gray-300 text-sm">
                  <option>Last 24 Hours</option>
                  <option>Last Week</option>
                  <option>Last Month</option>
                </select>
              </div>
              <div className="h-80">
                <Line options={chartOptions} data={generateDummyData()} />
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                System Status
              </h2>
              <div className="space-y-4">
                <StatusItem name="Main Cooling Unit" status="operational" />
                <StatusItem name="Ventilation System" status="operational" />
                <StatusItem name="Heat Exchanger" status="warning" />
                <StatusItem name="Backup Generator" status="error" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Recent Alerts
              </h2>
              <div className="space-y-4">
                {[
                  {
                    title: "Temperature Threshold Exceeded",
                    time: "10 minutes ago",
                    type: "warning",
                  },
                  {
                    title: "Maintenance Required",
                    time: "2 hours ago",
                    type: "error",
                  },
                  {
                    title: "System Update Available",
                    time: "5 hours ago",
                    type: "info",
                  },
                ].map((alert, index) => (
                  <AlertItem key={index} {...alert} />
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="col-span-12">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Recent Activity
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[1, 2, 3, 4].map((item) => (
                      <tr key={item} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          System Configuration Updated
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Completed
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          2 hours ago
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          Admin
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const MetricCard = ({ title, value, change, trend, icon }) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center justify-between">
      <span className="text-2xl">{icon}</span>
      <span
        className={`text-sm font-medium ${
          trend === "up" ? "text-green-600" : "text-red-600"
        }`}
      >
        {change}
      </span>
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mt-4">{value}</h3>
    <p className="text-sm text-gray-500 mt-1">{title}</p>
  </div>
);

const StatusItem = ({ name, status }) => {
  const statusColors = {
    operational: "bg-green-400",
    warning: "bg-yellow-400",
    error: "bg-red-400",
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{name}</span>
      <div className="flex items-center">
        <div
          className={`w-2 h-2 rounded-full ${statusColors[status]} mr-2`}
        ></div>
        <span className="text-sm text-gray-500 capitalize">{status}</span>
      </div>
    </div>
  );
};

const AlertItem = ({ title, time, type }) => {
  const typeColors = {
    warning: "text-yellow-600 bg-yellow-50",
    error: "text-red-600 bg-red-50",
    info: "text-blue-600 bg-blue-50",
  };

  return (
    <div className={`p-3 rounded-lg ${typeColors[type]}`}>
      <div className="flex justify-between items-start">
        <h4 className="text-sm font-medium">{title}</h4>
        <span className="text-xs opacity-75">{time}</span>
      </div>
    </div>
  );
};

export default Dashboard;
