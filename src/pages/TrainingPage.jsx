import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";

const TrainingPage = () => {
  const { isCollapsed } = useOutletContext();
  const [activeModule, setActiveModule] = useState(0);

  const modules = [
    {
      id: 1,
      title: "HVAC Fundamentals",
      duration: "2 hours",
      progress: 80,
      lessons: ["Basic Principles", "System Components", "Control Systems"],
    },
    {
      id: 2,
      title: "Energy Efficiency",
      duration: "1.5 hours",
      progress: 60,
      lessons: ["Energy Basics", "Optimization Techniques", "Case Studies"],
    },
    {
      id: 3,
      title: "Maintenance & Troubleshooting",
      duration: "3 hours",
      progress: 30,
      lessons: ["Preventive Maintenance", "Common Issues", "Solutions"],
    },
  ];

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
            HVAC Training Portal
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          isCollapsed ? "max-w-8xl" : "max-w-7xl"
        } mx-auto px-4 sm:px-6 lg:px-8 py-8`}
      >
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Module List */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Training Modules
              </h2>
              <div className="space-y-4">
                {modules.map((module, index) => (
                  <div
                    key={module.id}
                    onClick={() => setActiveModule(index)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      activeModule === index
                        ? "bg-blue-50 border-2 border-blue-200"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-900">
                        {module.title}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {module.duration}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${module.progress}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      {module.progress}% Complete
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Module Content */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium text-gray-900">
                  {modules[activeModule].title}
                </h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Continue Learning
                </button>
              </div>

              <div className="space-y-6">
                {modules[activeModule].lessons.map((lesson, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {lesson}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Learn about the core concepts and practical
                          applications
                        </p>
                      </div>
                      <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                        Start
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resources Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Additional Resources
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResourceCard
                  icon="📚"
                  title="Documentation"
                  description="Access comprehensive guides and manuals"
                />
                <ResourceCard
                  icon="🎥"
                  title="Video Tutorials"
                  description="Watch step-by-step video instructions"
                />
                <ResourceCard
                  icon="💡"
                  title="Best Practices"
                  description="Learn industry-standard approaches"
                />
                <ResourceCard
                  icon="🔧"
                  title="Tools & Templates"
                  description="Download useful resources and tools"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const ResourceCard = ({ icon, title, description }) => (
  <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-200 transition-colors">
    <div className="text-2xl mb-2">{icon}</div>
    <h3 className="font-medium text-gray-900">{title}</h3>
    <p className="text-sm text-gray-500">{description}</p>
  </div>
);

export default TrainingPage;
