import React, { useEffect, useRef, useState } from "react";

const Model = () => {
  const canvasRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [status, setStatus] = useState("idle");

  // HVAC component constants
  const HVAC_CONFIG = {
    ahuX: 50,
    ahuY: 150,
    ahuWidth: 120,
    ahuHeight: 80,
    ductWidth: 20,
    ventSize: 30,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrame;
    let particleOffset = 0;

    const drawAHU = () => {
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        HVAC_CONFIG.ahuX,
        HVAC_CONFIG.ahuY,
        HVAC_CONFIG.ahuWidth,
        HVAC_CONFIG.ahuHeight
      );

      // Fan symbol
      ctx.beginPath();
      ctx.arc(
        HVAC_CONFIG.ahuX + HVAC_CONFIG.ahuWidth / 2,
        HVAC_CONFIG.ahuY + HVAC_CONFIG.ahuHeight / 2,
        15,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    };

    const drawDucts = () => {
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = 2;

      // Supply duct
      ctx.beginPath();
      ctx.moveTo(
        HVAC_CONFIG.ahuX + HVAC_CONFIG.ahuWidth,
        HVAC_CONFIG.ahuY + HVAC_CONFIG.ahuHeight / 4
      );
      ctx.lineTo(500, HVAC_CONFIG.ahuY + HVAC_CONFIG.ahuHeight / 4);
      ctx.stroke();

      // Return duct
      ctx.beginPath();
      ctx.moveTo(
        HVAC_CONFIG.ahuX + HVAC_CONFIG.ahuWidth,
        HVAC_CONFIG.ahuY + (HVAC_CONFIG.ahuHeight * 3) / 4
      );
      ctx.lineTo(500, HVAC_CONFIG.ahuY + (HVAC_CONFIG.ahuHeight * 3) / 4);
      ctx.stroke();
    };

    const drawVents = () => {
      ctx.strokeStyle = "#6b7280";
      const ventLocations = [150, 250, 350, 450];

      ventLocations.forEach((x) => {
        // Supply vent
        ctx.strokeRect(
          x,
          HVAC_CONFIG.ahuY +
            HVAC_CONFIG.ahuHeight / 4 -
            HVAC_CONFIG.ventSize / 2,
          HVAC_CONFIG.ventSize,
          HVAC_CONFIG.ventSize
        );

        // Return vent
        ctx.strokeRect(
          x,
          HVAC_CONFIG.ahuY +
            (HVAC_CONFIG.ahuHeight * 3) / 4 -
            HVAC_CONFIG.ventSize / 2,
          HVAC_CONFIG.ventSize,
          HVAC_CONFIG.ventSize
        );
      });
    };

    const drawAirflow = () => {
      if (!isRunning) return;

      ctx.fillStyle = "#93c5fd";
      const ventLocations = [150, 250, 350, 450];

      ventLocations.forEach((x) => {
        // Animate particles in supply duct
        const particleX = (x + particleOffset) % 500;
        ctx.beginPath();
        ctx.arc(
          particleX,
          HVAC_CONFIG.ahuY + HVAC_CONFIG.ahuHeight / 4,
          3,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawAHU();
      drawDucts();
      drawVents();
      drawAirflow();

      if (isRunning) {
        particleOffset = (particleOffset + 1) % 50;
        animationFrame = requestAnimationFrame(animate);
      }
    };

    if (isRunning) {
      animate();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawAHU();
      drawDucts();
      drawVents();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isRunning, time]);

  const handleSimulationStart = () => {
    setIsRunning(!isRunning);
    if (!isRunning) {
      setStatus("running");
      // Simulate random success/failure after simulation ends
      setTimeout(() => {
        setStatus(Math.random() > 0.2 ? "success" : "failed");
        setIsRunning(false);
      }, time * 1000);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "running":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "success":
        return "Simulation completed successfully";
      case "failed":
        return "Simulation failed";
      case "running":
        return "Simulation in progress...";
      default:
        return "Ready to start simulation";
    }
  };

  return (
    <div className="model-container bg-gray-50 rounded-lg p-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full h-full border border-gray-200 rounded-lg shadow-inner bg-white"
      />

      {/* Status indicator */}
      <div className={`mt-4 p-2 border rounded-md ${getStatusColor()}`}>
        <span className="font-medium">{getStatusMessage()}</span>
      </div>

      <div className="mt-4 flex justify-between text-sm text-gray-600">
        <span>Scale: 1:100</span>
        <span>Unit: Meters</span>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={handleSimulationStart}
          disabled={status === "running"}
          className={`px-4 py-2 bg-blue-500 text-white rounded-lg ${
            status === "running"
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-blue-600"
          }`}
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <span className="text-sm text-gray-600">Time: {time}s</span>
      </div>
    </div>
  );
};

export default Model;
