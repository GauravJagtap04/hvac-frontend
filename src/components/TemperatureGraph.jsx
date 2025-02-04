import React from "react";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TemperatureGraph = ({ targetTemp }) => {
  // Generate last 10 minutes of data points
  const generateTimeLabels = () => {
    const labels = [];
    for (let i = 10; i >= 0; i--) {
      labels.push(`${i}m ago`);
    }
    return labels;
  };

  // Simulate temperature fluctuation around target
  const generateTempData = (target) => {
    return Array(11)
      .fill(0)
      .map(() => target + (Math.random() - 0.5) * 2);
  };

  const data = {
    labels: generateTimeLabels(),
    datasets: [
      {
        label: "Current Temperature",
        data: generateTempData(targetTemp),
        borderColor: "rgb(75, 192, 192)",
        tension: 0.4,
      },
      {
        label: "Target Temperature",
        data: Array(11).fill(targetTemp),
        borderColor: "rgb(255, 99, 132)",
        borderDash: [5, 5],
        tension: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Real-time Temperature Monitoring",
      },
    },
    scales: {
      y: {
        min: Math.floor(targetTemp - 5),
        max: Math.ceil(targetTemp + 5),
        title: {
          display: true,
          text: "Temperature (°C)",
        },
      },
      x: {
        title: {
          display: true,
          text: "Time",
        },
      },
    },
  };

  return (
    <div className="h-[300px] mt-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <Line data={data} options={options} />
    </div>
  );
};

export default TemperatureGraph;
