import React, { useEffect, useState } from "react";
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
  const [temperatureHistory, setTemperatureHistory] = useState([]);
  const [currentTemp, setCurrentTemp] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");

    ws.onopen = () => setConnectionStatus("connected");
    ws.onmessage = (event) => {
      const temp = parseFloat(event.data.split(": ")[1]); // Extract number from "Temperature: 24.5°C"
      setCurrentTemp(temp);

      setTemperatureHistory((prev) => {
        const updated = [...prev, temp];
        return updated.slice(-11);
      });
    };

    ws.onerror = () => setConnectionStatus("error");
    ws.onclose = () => setConnectionStatus("disconnected");

    return () => ws.close();
  }, []);

  const generateTimeLabels = () => {
    return [...Array(11).keys()].map((i) => `${10 - i}m ago`);
  };

  const data = {
    labels: generateTimeLabels(),
    datasets: [
      {
        label: "Temperature (°C)",
        data: temperatureHistory,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.4,
        yAxisID: "y",
      },
      {
        label: "Target Temperature",
        data: Array(temperatureHistory.length).fill(targetTemp),
        borderColor: "rgb(255, 99, 132)",
        borderDash: [5, 5],
        tension: 0,
        yAxisID: "y",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Real-time Temperature Monitoring" },
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: { display: true, text: "Temperature (°C)" },
        min: Math.floor(Math.min(targetTemp - 5, ...temperatureHistory)),
        max: Math.ceil(Math.max(targetTemp + 5, ...temperatureHistory)),
      },
      x: { title: { display: true, text: "Time" } },
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-lg">
          Status: <span className="font-bold">{connectionStatus}</span>
        </div>
        <div className="text-lg">
          Temperature: {currentTemp ? `${currentTemp.toFixed(1)}°C` : "Loading..."}
        </div>
      </div>
      <div className="h-[300px] mt-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default TemperatureGraph;
