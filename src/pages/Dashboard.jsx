import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../components/SupabaseClient";
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
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

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

const Dashboard = () => {
  const { isCollapsed } = useOutletContext();
  const [stats, setStats] = useState({
    totalSimulations: 0,
    successRate: 0,
    activeUsers: 0,
    recentSimulations: [],
    previousTotal: 0,
    previousRate: 0,
    previousActive: 0,
  });

  const [simulationData, setSimulationData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const userId = localStorage.getItem("user");
      console.log("Current userId:", userId);

      if (!userId) {
        console.error("No userId found in localStorage");
        setLoading(false);
        return;
      }

      try {
        // First verify if we can connect to Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error("Auth error:", authError);
          setLoading(false);
          return;
        }

        console.log("Fetching simulations for user:", userId);
        
        const { data: simulations, error } = await supabase
          .from("simulations")
          .select(`
            id,
            type,
            parameters,
            created_at,
            is_success,
            session_id
          `)
          .eq("userid", user.id)
          .order("created_at", { ascending: false });

        console.log("Raw response:", { simulations, error });

        if (error) {
          console.error("Database error:", error);
          throw error;
        }

        if (!simulations) {
          console.log("No simulations found");
          setStats({
            totalSimulations: 0,
            successRate: 0,
            activeUsers: 0,
            recentSimulations: [],
            previousTotal: 0,
            previousRate: 0,
            previousActive: 0,
          });
          setLoading(false);
          return;
        }

        console.log("Fetched simulations:", simulations);

        const successCount = simulations.filter((sim) => sim.is_success).length;
        const successRate = (successCount / simulations.length) * 100 || 0;

        setSimulationData(simulations);
        setStats({
          totalSimulations: simulations.length,
          successRate: Math.round(successRate),
          activeUsers: 1,
          recentSimulations: simulations,
          previousTotal: 0,
          previousRate: 0,
          previousActive: 0,
        });
      } catch (error) {
        console.error("Error in fetchDashboardData:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard data...</div>
      </div>
    );
  }

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Simulations"
            value={stats.totalSimulations}
            change={`+${stats.totalSimulations - stats.previousTotal}`}
            trend="up"
            icon="🔄"
          />
          <MetricCard
            title="Success Rate"
            value={`${stats.successRate}%`}
            change={`${
              stats.successRate > stats.previousRate ? "+" : "-"
            }${Math.abs(stats.successRate - stats.previousRate)}%`}
            trend={stats.successRate > stats.previousRate ? "up" : "down"}
            icon="📊"
          />
          <MetricCard
            title="Active Sessions"
            value={stats.activeUsers}
            change={`+${stats.activeUsers - stats.previousActive}`}
            trend="up"
            icon="👥"
          />
          <MetricCard
            title="Simulation Types"
            value="2"
            change="Basic/Advanced"
            trend="info"
            icon="🔧"
          />
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Recent Simulations
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="w-1/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="w-1/4 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parameters
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentSimulations.map((sim) => (
                      <tr key={sim.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sim.type}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
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
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(sim.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                          <ParametersView parameters={sim.parameters} />
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

const ParametersView = ({ parameters }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value).map(([subKey, subValue]) => (
        <div key={subKey} className="flex flex-col space-y-1">
          <div className="flex flex-col p-2 bg-gray-50 rounded">
            <span className="text-sm font-medium text-gray-600 mb-1">{subKey}</span>
            <span className={`text-sm font-mono px-2 py-1 rounded break-all ${
              typeof subValue === 'number' 
                ? 'bg-blue-100 text-blue-700' 
                : typeof subValue === 'boolean'
                ? subValue 
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {typeof subValue === 'object' ? JSON.stringify(subValue) : subValue.toString()}
            </span>
          </div>
        </div>
      ));
    }
    return <span className="text-gray-600 break-all">{JSON.stringify(value)}</span>;
  };

  return (
    <div className="relative flex justify-center">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors duration-200"
      >
        {isExpanded ? (
          <ChevronDownIcon className="h-4 w-4 mr-2 text-gray-600" />
        ) : (
          <ChevronRightIcon className="h-4 w-4 mr-2 text-gray-600" />
        )}
        <span className="text-sm font-medium text-gray-700">View</span>
      </button>
      
      {isExpanded && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[600px] z-50">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <div className="text-lg font-semibold text-gray-700">Parameters</div>
              <button 
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[500px]">
              <div className="space-y-3">
                {renderValue(parameters)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
