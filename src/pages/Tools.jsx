import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";

const Tools = () => {
  const { isCollapsed } = useOutletContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { id: "all", name: "All Tools" },
    { id: "calculation", name: "Calculations" },
    { id: "diagnostic", name: "Diagnostics" },
    { id: "conversion", name: "Conversions" },
    { id: "analysis", name: "Analysis" },
  ];

  const tools = [
    {
      id: 1,
      name: "Load Calculator",
      description: "Calculate heating and cooling loads for spaces",
      category: "calculation",
      icon: "📊",
    },
    {
      id: 2,
      name: "System Analyzer",
      description: "Analyze HVAC system performance metrics",
      category: "analysis",
      icon: "📈",
    },
    {
      id: 3,
      name: "Fault Diagnostic",
      description: "Identify and troubleshoot system issues",
      category: "diagnostic",
      icon: "🔍",
    },
    {
      id: 4,
      name: "Unit Converter",
      description: "Convert between different measurement units",
      category: "conversion",
      icon: "🔄",
    },
    {
      id: 5,
      name: "Energy Calculator",
      description: "Calculate energy consumption and costs",
      category: "calculation",
      icon: "⚡",
    },
    {
      id: 6,
      name: "Efficiency Analyzer",
      description: "Analyze and optimize system efficiency",
      category: "analysis",
      icon: "📉",
    },
  ];

  const filteredTools = tools.filter(
    (tool) =>
      (activeCategory === "all" || tool.category === activeCategory) &&
      tool.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div
          className={`transition-all duration-300 ${
            isCollapsed ? "max-w-8xl" : "max-w-7xl"
          } mx-auto px-4 sm:px-6 lg:px-8 py-4`}
        >
          <h1 className="text-2xl font-semibold text-gray-900">HVAC Tools</h1>
        </div>
      </header>

      <main
        className={`transition-all duration-300 ${
          isCollapsed ? "max-w-8xl" : "max-w-7xl"
        } mx-auto px-4 sm:px-6 lg:px-8 py-8`}
      >
        {/* Search and Filter Section */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search tools..."
                className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-3 top-2.5">🔍</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                    activeCategory === category.id
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start space-x-4">
                <div className="text-4xl">{tool.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {tool.description}
                  </p>
                  <div className="mt-4 flex items-center space-x-3">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Launch Tool
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-500">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Tools;
