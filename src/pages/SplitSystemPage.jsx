import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { supabase } from "../components/SupabaseClient";
import { useNavigate } from "react-router-dom";
import SplitSystemModel from "../components/Models/SplitSystemModel";
import WeatherIntegration from "../components/WeatherIntegration";

import DraggableBox from "../components/moveable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Toaster } from "sonner";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";

import { Sun, Moon } from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  updateRoomParameters,
  updateHVACParameters,
  updateSystemStatus,
  setConnectionStatus,
  setSimulationStatus,
  setSimulationPaused,
  setTheme,
} from "../store/store";

const SYSTEM_TYPE = "splitSystem";

const SimulationPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isConnected, isSimulationRunning, isSimulationPaused } = useSelector(
    (state) => state.hvac
  );
  const { roomParameters, hvacParameters, systemStatus } = useSelector(
    (state) => state.hvac.systems[SYSTEM_TYPE]
  );

  const [temperatureData, setTemperatureData] = useState([]);
  const [ws, setWs] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [countdownTime, setCountdownTime] = useState(0);
  const [targetReachAlert, setTargetReachAlert] = useState(false);
  const [weatherSuccessOpen, setWeatherSuccessOpen] = useState(false);
  const [weatherSuccessMessage, setWeatherSuccessMessage] = useState("");
  const [weatherErrorOpen, setWeatherErrorOpen] = useState(false);
  const [weatherErrorMessage, setWeatherErrorMessage] = useState("");
  const [invalidParameterOpen, setInvalidParameterOpen] = useState(false);
  const [invalidParameterMessage, setInvalidParameterMessage] = useState("");
  const [errorStartingSimulation, setErrorStartingSimulation] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionError, setSessionError] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [failureAlert, setFailureAlert] = useState(false);
  const [failureQueue, setFailureQueue] = useState([]);
  const [failureData, setFailureData] = useState(null);
  const [showFailureBox, setShowFailureBox] = useState(false);
  const [invalidFields, setInvalidFields] = useState({
    length: false,
    breadth: false,
    height: false,
  });

  const theme = useSelector((state) => state.hvac.theme);

  // theme state
  useEffect(() => {
    const rootElement = document.getElementById("root");
    if (theme === "dark") {
      rootElement.classList.add("dark");
    } else {
      rootElement.classList.remove("dark");
    }
  }, [theme]);

  // system theme changes useeffect
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleThemeChange = (e) => {
      const newTheme = e.matches ? "dark" : "light";
      dispatch(setTheme(newTheme));
    };

    mediaQuery.addEventListener("change", handleThemeChange);

    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, [dispatch]);

  // fan speed toast
  useEffect(() => {
    let fanSpeedToast;
    if (hvacParameters.fanSpeed === 0) {
      fanSpeedToast = toast.warning(
        "Fan speed is set to 0%. The system may not function effectively.",
        {
          duration: 5000,
        }
      );
    }
    toast.dismiss(fanSpeedToast);
  }, [hvacParameters.fanSpeed]);

  // target temperature reached toast
  useEffect(() => {
    if (targetReachAlert) {
      toast.success("Target temperature reached successfully.", {
        duration: 5000,
      });
    }
    setTargetReachAlert(false);
  }, [targetReachAlert]);

  // sending data to backend
  useEffect(() => {
    if (
      ws &&
      isConnected &&
      !isSimulationRunning &&
      ws.readyState === WebSocket.OPEN
    ) {
      ws.send(
        JSON.stringify({
          type: "room_parameters",
          data: {
            length: roomParameters.length,
            breadth: roomParameters.breadth,
            height: roomParameters.height,
            numPeople: roomParameters.numPeople,
            mode: roomParameters.mode,
            wallInsulation: roomParameters.wallInsulation,
            currentTemp: roomParameters.currentTemp,
            targetTemp: roomParameters.targetTemp,
            externalTemp: roomParameters.externalTemp,
          },
        })
      );

      ws.send(
        JSON.stringify({
          type: "hvac_parameters",
          data: {
            power: hvacParameters.power,
            airFlowRate: hvacParameters.airFlowRate,
            fanSpeed: hvacParameters.fanSpeed,
          },
        })
      );

      const newInvalidFields = {
        length: roomParameters.length <= 0,
        breadth: roomParameters.breadth <= 0,
        height: roomParameters.height <= 0,
      };

      setInvalidFields(newInvalidFields);
      setErrorStartingSimulation(Object.values(newInvalidFields).some(Boolean));
    }
  }, [isConnected, ws, isSimulationRunning]);

  // time to target timer
  useEffect(() => {
    let timer;
    if (isSimulationRunning && !isSimulationPaused && countdownTime > 0) {
      timer = setInterval(() => {
        setCountdownTime((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSimulationRunning, isSimulationPaused, countdownTime]);

  // session creation and status update
  useEffect(() => {
    if (isSimulationRunning && !isSimulationPaused) {
      const currentTemp = systemStatus.roomTemperature;
      const targetTemp = systemStatus.targetTemperature;

      const activeUserId = sessionStorage.getItem("activeUserId");
      const user = JSON.parse(sessionStorage.getItem(`user_${activeUserId}`));

      if (Math.abs(currentTemp - targetTemp) == 0) {
        setTargetReachAlert(true);
        ws?.send(
          JSON.stringify({
            type: "simulation_control",
            data: { action: "stop" },
          })
        );

        const currentSessionData = JSON.parse(
          sessionStorage.getItem(`${user.id}_session`)
        );

        if (currentSessionData) {
          saveSimulationData(currentSessionData.session_id, true)
            .then(() => {
              // Update session status after saving simulation data
              return updateSessionStatus(currentSessionData.session_id, false);
            })
            .then(() => {
              // Clear session from sessionStorage
              sessionStorage.removeItem(`${user.id}_session`);
              setCurrentSession(null);
            })
            .catch((error) => {
              console.error("Error saving simulation data:", error);
              setSessionError(error.message);
            });
        }

        dispatch(setSimulationStatus(false));
        dispatch(setSimulationPaused(false));
      }
    }
  }, [
    systemStatus.roomTemperature,
    roomParameters.targetTemp,
    isSimulationRunning,
    isSimulationPaused,
  ]);

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const activeUserId = sessionStorage.getItem("activeUserId");

    if (!activeUserId) {
      console.error("No active user ID found");
      setAuthError("User not authenticated. Please log in.");
      navigate("/login");
      return;
    }

    const user = JSON.parse(sessionStorage.getItem(`user_${activeUserId}`));

    if (!user || !user.id) {
      console.error("No user data found");
      setAuthError("User not authenticated. Please log in.");
      navigate("/login");
      return;
    }

    // Determine the WebSocket protocol based on the page's protocol
    const websocket = new WebSocket(
      `${protocol}//gauravjagtap.me/ws/${user.id}/split-system`
    );

    websocket.onopen = () => {
      setAuthError(null);
      dispatch(setConnectionStatus(true));
      console.log("Connected to split system HVAC simulator");
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received websocket data:", data); // Debug logging

        // Handle simulation control responses
        if (data.type === "simulation_status") {
          dispatch(setSimulationStatus(data.data.isRunning));
          dispatch(setSimulationPaused(data.data.isPaused));
          if (data.data.estimatedTimeToTarget) {
            setEstimatedTime(data.data.estimatedTimeToTarget);
            setCountdownTime(data.data.estimatedTimeToTarget);
          }
        }
        // Handle temperature+status updates from main loop
        else if (data.system_status) {
          // Mapping backend snake_case to frontend camelCase
          dispatch(
            updateSystemStatus({
              system: SYSTEM_TYPE,
              status: {
                roomTemperature: data.system_status.room_temperature,
                targetTemperature: data.system_status.target_temperature,
                coolingCapacityKw: data.system_status.cooling_capacity_kw,
                coolingCapacityBtu: data.system_status.cooling_capacity_btu,
                energyConsumptionW: data.system_status.energy_consumption_w,
                refrigerantFlowGs: data.system_status.refrigerant_flow_gs,
                heatGainW: data.system_status.heat_gain_w,
                cop: data.system_status.cop,
              },
            })
          );

          // Add temperature data point
          setTemperatureData((prev) =>
            [
              ...prev,
              {
                time: new Date().toLocaleTimeString(),
                temperature: data.system_status.room_temperature,
              },
            ].slice(-20)
          );

          // Handle failure scenarios from backend
          if (data.system_status) {
            // Check if failures exist in the system status
            if (
              data.system_status.failures &&
              Object.keys(data.system_status.failures).length > 0
            ) {
              const failuresArray = Object.entries(
                data.system_status.failures
              ).map(([key, value]) => ({
                id: key,
                message: value.message,
                severity: value.severity,
                solution: value.solution,
                probability: value.probability,
              }));

              if (failuresArray.length > 0) {
                // If we're not currently showing a failure alert, show the first one
                if (!failureAlert) {
                  setFailureData(failuresArray[0]);
                  setFailureAlert(true);

                  // Add any remaining failures to the queue
                  if (failuresArray.length > 1) {
                    setFailureQueue(failuresArray.slice(1));
                  }
                } else {
                  // If we're already showing a failure alert, just add new failures to the queue
                  setFailureQueue((prev) => [...prev, ...failuresArray]);
                }
              }
            } else {
              // No failures present in the system status - clear all failures
              setFailureData(null);
              setFailureAlert(false);
              setFailureQueue([]);
            }
          }
        } else if (data.temperature) {
          // Handle simple temperature updates
          setTemperatureData((prev) =>
            [
              ...prev,
              {
                time: new Date().toLocaleTimeString(),
                temperature: data.temperature,
              },
            ].slice(-20)
          );
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      dispatch(setConnectionStatus(false));
      setAuthError("Connection error. Please try again.");
    };

    websocket.onclose = () => {
      dispatch(setConnectionStatus(false));
      console.log("Disconnected from split system HVAC simulator");
    };

    setWs(websocket);

    return () => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [dispatch]);

  const sanitizeNumericInput = (value) => {
    if (value === "") return 0;

    const parsedValue = parseFloat(value);

    if (isNaN(parsedValue)) return 0;

    const sanitized = parseFloat(parsedValue.toString());

    return sanitized;
  };

  const getAlertSeverity = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
      case "high":
        return "error";
      case "warning":
      case "medium":
        return "warning";
      case "info":
      case "low":
        return "info";
      default:
        return "error";
    }
  };

  const toggleFailureBox = () => {
    setShowFailureBox((prev) => !prev);
  };

  const createSession = async () => {
    try {
      const activeUserId = sessionStorage.getItem("activeUserId");
      console.log("Creating session for user ID:", activeUserId);

      const user = JSON.parse(sessionStorage.getItem(`user_${activeUserId}`));

      if (!user) {
        console.error("No user found in sessionStorage");
        throw new Error("User not authenticated");
      }

      console.log("User data found:", user.id);

      const { data: existingSessions, error: fetchError } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (fetchError) {
        console.error("Error checking for existing session:", fetchError);
        throw fetchError;
      }

      if (existingSessions && existingSessions.length > 0) {
        const existingSession = existingSessions[0];

        console.log("Found existing active session:", existingSession);
        sessionStorage.setItem(
          `${user.id}_session`,
          JSON.stringify(existingSession)
        );
        return existingSession;
      }

      console.log("Creating new session for user:", user.id);
      const { data, error } = await supabase
        .from("sessions")
        .insert([
          {
            user_id: user.id,
            is_active: true,
          },
        ])
        .select();

      if (error) {
        console.error("Error creating session:", error);
        throw error;
      }

      if (data && data.length > 0) {
        const newSession = data[0];
        console.log("New session created successfully:", newSession);
        sessionStorage.setItem(
          `${user.id}_session`,
          JSON.stringify(newSession)
        );
        return newSession;
      } else {
        throw new Error("No session data returned after insert");
      }
    } catch (error) {
      console.error("Error creating session:", error.message);
      setSessionError(error.message);
      return null;
    }
  };

  const updateSessionStatus = async (sessionId, isActive = false) => {
    try {
      console.log(`Updating session ${sessionId} to is_active=${isActive}`);

      const { error } = await supabase
        .from("sessions")
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId);

      if (error) {
        console.log("Error updating session status:", error);
        throw error;
      }

      console.log("Session status updated successfully");
    } catch (error) {
      console.error("Error updating session:", error.message);
      setSessionError(error.message);
    }
  };

  const saveSimulationData = async (sessionId, isSuccess) => {
    try {
      const activeUserId = sessionStorage.getItem("activeUserId");
      console.log("Saving simulation data for session:", sessionId);
      console.log("User ID:", activeUserId);

      if (!sessionId) {
        throw new Error("Invalid session ID");
      }

      const simulationData = {
        session_id: sessionId,
        type: "split-system",
        parameters: {
          room: {
            length: roomParameters.length,
            breadth: roomParameters.breadth,
            height: roomParameters.height,
            numPeople: roomParameters.numPeople,
            mode: roomParameters.mode,
            wallInsulation: roomParameters.wallInsulation,
            currentTemp: roomParameters.currentTemp,
            targetTemp: roomParameters.targetTemp,
            externalTemp: roomParameters.externalTemp,
          },
          hvac: {
            power: hvacParameters.power,
            airFlowRate: hvacParameters.airFlowRate,
            fanSpeed: hvacParameters.fanSpeed,
          },
          results: {
            finalTemperature: systemStatus.roomTemperature,
            energyConsumption: systemStatus.energyConsumptionW,
            cop: systemStatus.cop,
            refrigerantFlow: systemStatus.refrigerantFlowGs,
          },
        },
        userid: activeUserId,
        is_success: isSuccess,
      };

      console.log("Simulation data to be saved:", simulationData);

      const { data, error } = await supabase
        .from("simulations")
        .insert([simulationData])
        .select();

      if (error) {
        console.error("Error inserting simulation data:", error);
        throw error;
      }

      console.log("Simulation data saved successfully:", data);

      return data;
    } catch (error) {
      console.error("Error saving simulation data:", error.message);
      setSessionError(error.message);
      throw error;
    }
  };

  const handleWeatherError = (errorMessage) => {
    toast.dismiss("weather-loading");
    toast.error(`Failed to fetch weather: ${errorMessage}`, {
      duration: 3000,
      id: "weather-error",
    });
    setWeatherErrorMessage(errorMessage);
    setWeatherErrorOpen(true);
  };

  const handleWeatherSuccess = (location, temperature) => {
    toast.dismiss("weather-loading");
    toast.success(`Weather fetched: ${temperature}°C in ${location}`, {
      duration: 3000,
      id: "weather-success",
    });
    setWeatherSuccessMessage(
      `Weather fetched successfully: ${temperature}°C in ${location}`
    );
    setWeatherSuccessOpen(true);
  };

  const handleRoomParameterChange = (parameter) => (event, value) => {
    const update = { [parameter]: value };
    const newInvalidFields = { ...invalidFields };

    if (["length", "breadth", "height"].includes(parameter)) {
      // For direct numeric inputs like from TextField, handle empty values
      let actualValue =
        typeof event.target?.value !== "undefined"
          ? event.target.value === ""
            ? 0
            : sanitizeNumericInput(event.target.value)
          : value;

      // Convert NaN to 0 for better UX
      if (isNaN(actualValue)) actualValue = 0;

      // Zero or negative values are invalid
      if (actualValue <= 0) {
        newInvalidFields[parameter] = true;

        // Show error message for this field
        let paramName =
          parameter.charAt(0).toUpperCase() + parameter.substring(1);
        if (parameter === "breadth") paramName = "Width";

        setInvalidParameterOpen(true);
        setInvalidParameterMessage(`${paramName} cannot be zero or negative.`);

        // Update the field value to 0 if it was empty
        if (event.target?.value === "") {
          // Force a value of 0 instead of letting it be empty
          event.target.value = "0";
        }

        // Don't send invalid value to backend, but update the UI
        setInvalidFields(newInvalidFields);

        // Update Redux with the value for display purposes
        dispatch(
          updateRoomParameters({
            system: SYSTEM_TYPE,
            parameters: { [parameter]: actualValue },
          })
        );
        return;
      } else {
        // Clear the error for this field
        newInvalidFields[parameter] = false;
      }
    } else if (parameter === "numPeople") {
      let actualValue =
        typeof event.target?.value !== "undefined"
          ? event.target.value === ""
            ? 0
            : parseFloat(event.target.value)
          : value;

      // Convert NaN to 0 for better UX
      if (isNaN(actualValue)) actualValue = 0;

      // For numPeople, negative values are invalid (zero is valid)
      if (actualValue < 0) {
        newInvalidFields[parameter] = true;
        setInvalidParameterOpen(true);
        setInvalidParameterMessage("Number of people cannot be negative.");
        setInvalidFields(newInvalidFields);

        // Update Redux with the value for display purposes
        dispatch(
          updateRoomParameters({
            system: SYSTEM_TYPE,
            parameters: { [parameter]: actualValue },
          })
        );
        return;
      } else {
        newInvalidFields[parameter] = false;
      }
    }

    // Update invalid fields state
    setInvalidFields(newInvalidFields);

    // Only proceed with sending to backend if no invalid fields
    dispatch(updateRoomParameters({ system: SYSTEM_TYPE, parameters: update }));
    if (!Object.values(newInvalidFields).some(Boolean)) {
      ws?.send(JSON.stringify({ type: "room_parameters", data: update }));
    }
    setErrorStartingSimulation(Object.values(newInvalidFields).some(Boolean));
  };

  const handleHVACParameterChange = (parameter) => (event, value) => {
    const update = { [parameter]: value };
    dispatch(updateHVACParameters({ system: SYSTEM_TYPE, parameters: update }));
    ws?.send(JSON.stringify({ type: "hvac_parameters", data: update }));
  };

  const StatusCard = ({ title, value, unit, icon }) => (
    <Card className="w-full h-full min-w-[160px] bg-background">
      <CardContent className="flex flex-col items-center p-6">
        {icon}
        <CardTitle className="mt-4 text-muted-foreground">{title}</CardTitle>
        <span className="mt-2 mb-1 text-4xl font-bold text-primary">
          {value !== undefined ? value : "0.0"}
        </span>
        <p className="text-sm text-muted-foreground">{unit}</p>
      </CardContent>
    </Card>
  );

  const hasInvalidFields = Object.values(invalidFields).some(Boolean);

  return (
    <div className="w-full overflow-x-hidden bg-background">
      <div className="py-6 px-3 sm:px-6 md:px-6 lg-px-8 bg-background shadow-md w-full mx-auto">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-3xl font-[900] mb-6 font-rubik text-primary">
            Split System Simulator
          </h1>
          <div>
            {/* Connection status */}
            <div className="mb-4 flex items-center">
              <Badge
                variant={isConnected ? "success" : "destructive"}
                className="mr-2 rounded-sm text-sm py-2 px-4"
              >
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>

              <div className="flex justify-center mr-2">
                <Button
                  variant="outline"
                  onClick={toggleFailureBox}
                  className="flex items-center h-[38] gap-2 text-primary bg-background dark:bg-background hover:bg-primary dark:hover:bg-primary hover:text-background transition-all duration-400"
                >
                  {showFailureBox ? "Hide" : "Show"} Failure Log
                </Button>
              </div>

              <div className="flex justify-center mr-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`w-13 h-7 border border-input p-0.5 bg-background rounded-full relative flex items-center cursor-pointer hover:border-primary/50 transition-all duration-200 inset-shadow-sm shadow-primary inset-shadow-primary/20 dark:inset-shadow-primary/20 dark:shadow-primary/10 dark:shadow-sm`}
                        onClick={() =>
                          dispatch(
                            setTheme(theme === "light" ? "dark" : "light")
                          )
                        }
                      >
                        <div
                          className={`w-6 h-6 bg-primary rounded-full absolute flex items-center justify-center transition-transform duration-300 ${
                            theme === "dark" ? "translate-x-6" : "translate-x-0"
                          }`}
                        >
                          {theme === "dark" ? (
                            <Moon className="h-4 w-4 text-primary-foreground" />
                          ) : (
                            <Sun className="h-3.5 w-3.5 text-background" />
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{theme === "dark" ? "Light mode" : "Dark mode"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {authError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Authentication Error</AlertTitle>
                  <AlertDescription>{authError}</AlertDescription>
                  <Button onClick={navigate("/login")}>Login</Button>
                </Alert>
              )}
            </div>
          </div>
        </div>

        {/* System Status Section */}
        <div className="w-full mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-4 w-full overflow-x-auto pb-2">
            <StatusCard
              title="Room Temperature"
              value={(systemStatus?.roomTemperature || 25.0).toFixed(1)}
              unit="°C"
            />
            <StatusCard
              title="Energy Usage"
              value={((systemStatus?.energyConsumptionW || 0) / 1000).toFixed(
                2
              )}
              unit="kW"
            />
            <StatusCard
              title="COP"
              value={(systemStatus?.cop || 3.0).toFixed(2)}
              unit=""
            />
            <StatusCard
              title="Refrigerant Flow"
              value={(systemStatus?.refrigerantFlowGs || 0).toFixed(1)}
              unit="g/s"
            />
          </div>
        </div>

        {/* { Temperature History Section } */}
        <div className="w-full mt-6">
          <Card className="p-6 bg-background/80 rounded-lg border border-primary/10">
            <CardHeader className="p-0 pb-4">
              <CardTitle>Temperature History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ResponsiveContainer
                width="100%"
                height={400}
                className="flex items-center justify-center"
              >
                <LineChart data={temperatureData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--accent)" />
                  <XAxis
                    dataKey="time"
                    stroke="var(--border)"
                    tick={{ fill: "rgba(156, 163, 175, 0.8)" }}
                  />
                  <YAxis
                    stroke="var(--border)"
                    tick={{ fill: "rgba(156, 163, 175, 0.8)" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "rgba(var(--background-rgb), 0.75)",
                      border: "2px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--primary)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                  />

                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="var(--primary)"
                    name="Room Temperature"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 8, fill: "var(--primary)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey={() => roomParameters.targetTemp}
                    stroke="var(--primary)"
                    name="Target Temperature"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* {Simulation Model} */}
        {isSimulationRunning && !isSimulationPaused && (
          <div className="flex justify-center items-center mt-8 text-primary">
            <SplitSystemModel
              roomParameters={roomParameters}
              hvacParameters={hvacParameters}
              systemStatus={systemStatus}
              isSimulationRunning={isSimulationRunning}
            />
          </div>
        )}

        {/* {Control Panels} */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Room Parameters Card */}
          <Card className="bg-background">
            <CardHeader>
              <CardTitle>Room Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="room-length">Length (m)</Label>
                  <Input
                    id="room-length"
                    type="number"
                    value={Number(roomParameters.length)}
                    onChange={(e) =>
                      handleRoomParameterChange("length")(
                        e,
                        sanitizeNumericInput(e.target.value || 0)
                      )
                    }
                    className={`${
                      invalidFields.length ? "border-destructive" : ""
                    }`}
                    min="1"
                    step="0.1"
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      (hasInvalidFields && !invalidFields.length)
                    }
                  />
                  {invalidFields.length && (
                    <p className="text-sm text-destructive">
                      Length cannot be zero or negative
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="room-breadth">Width (m)</Label>
                  <Input
                    id="room-breadth"
                    type="number"
                    value={Number(roomParameters.breadth)}
                    onChange={(e) =>
                      handleRoomParameterChange("breadth")(
                        e,
                        sanitizeNumericInput(e.target.value || 0)
                      )
                    }
                    className={
                      invalidFields.breadth ? "border-destructive" : ""
                    }
                    min="1"
                    step="0.1"
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      (hasInvalidFields && !invalidFields.breadth)
                    }
                  />
                  {invalidFields.breadth && (
                    <p className="text-sm text-destructive">
                      Width cannot be zero or negative
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="room-height">Height (m)</Label>
                  <Input
                    id="room-height"
                    type="number"
                    value={Number(roomParameters.height)}
                    onChange={(e) =>
                      handleRoomParameterChange("height")(
                        e,
                        sanitizeNumericInput(e.target.value || 0)
                      )
                    }
                    className={invalidFields.height ? "border-destructive" : ""}
                    min="1"
                    step="0.1"
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      (hasInvalidFields && !invalidFields.height)
                    }
                  />
                  {invalidFields.height && (
                    <p className="text-sm text-destructive">
                      Height cannot be zero or negative
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="num-people">No. of People</Label>
                  <Input
                    id="num-people"
                    type="number"
                    value={Number(roomParameters.numPeople)}
                    onChange={(e) =>
                      handleRoomParameterChange("numPeople")(
                        e,
                        sanitizeNumericInput(e.target.value || 0)
                      )
                    }
                    min="0"
                    step="1"
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      hasInvalidFields
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="room-mode">Mode</Label>
                  <Select
                    defaultValue={roomParameters.mode}
                    onValueChange={(value) => {
                      handleRoomParameterChange("mode")(null, value);
                    }}
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      hasInvalidFields
                    }
                  >
                    <SelectTrigger id="room-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="cooling">Cooling</SelectItem>
                        <SelectItem value="heating">Heating</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wall-insulation">Wall Insulation Level</Label>
                  <Select
                    value={roomParameters.wallInsulation}
                    onValueChange={(value) =>
                      handleRoomParameterChange("wallInsulation")(null, value)
                    }
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      hasInvalidFields
                    }
                  >
                    <SelectTrigger id="wall-insulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="current-temperature">
                      Current Room Temperature:{" "}
                    </Label>
                    <span>{roomParameters.currentTemp}°C</span>
                  </div>
                  <Slider
                    id="current-temperature"
                    min={10}
                    max={40}
                    step={0.5}
                    value={[Number(roomParameters.currentTemp)]}
                    onValueChange={(values) => {
                      if (values && values.length > 0) {
                        handleRoomParameterChange("currentTemp")(
                          null,
                          values[0]
                        );
                      }
                    }}
                    className="relative h-4"
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      hasInvalidFields
                    }
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="target-temperature">
                      Target Temperature:{" "}
                    </Label>
                    <span>{roomParameters.targetTemp}°C</span>
                  </div>
                  <Slider
                    id="target-temperature"
                    min={16}
                    max={30}
                    step={0.5}
                    value={[Number(roomParameters.targetTemp)]}
                    onValueChange={(values) => {
                      if (values && values.length > 0) {
                        handleRoomParameterChange("targetTemp")(
                          null,
                          values[0]
                        );
                      }
                    }}
                    className="relative h-4"
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      hasInvalidFields
                    }
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <div className="flex items-center w-full">
                    <Label
                      htmlFor="external-temperature"
                      className="whitespace-nowrap mr-2"
                    >
                      External Temperature:{" "}
                    </Label>
                    <div className="flex justify-end w-full items-center">
                      <span>{roomParameters.externalTemp}°C</span>
                      {/* WeatherIntegration component */}
                      <WeatherIntegration
                        systemType={SYSTEM_TYPE}
                        websocket={ws}
                        disabled={
                          (isSimulationRunning && !isSimulationPaused) ||
                          hasInvalidFields
                        }
                        currentTemp={roomParameters.externalTemp}
                        onError={handleWeatherError}
                        onSuccess={handleWeatherSuccess}
                        onWeatherFetch={() => {
                          toast.loading("Fetching weather data...", {
                            duration: 2000,
                            id: "weather-loading",
                          });
                        }}
                      />
                    </div>
                  </div>
                  <Slider
                    id="external-temperature"
                    value={[Number(roomParameters.externalTemp)]}
                    min={-10}
                    max={45}
                    step={0.5}
                    onValueChange={(values) => {
                      if (values && values.length > 0) {
                        handleRoomParameterChange("externalTemp")(
                          null,
                          values[0]
                        );
                      }
                    }}
                    className="relative h-4"
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      hasInvalidFields
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HVAC Parameters Card */}
          <Card className="bg-background">
            <CardHeader>
              <CardTitle>HVAC Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="power">Power: </Label>
                    <span>{hvacParameters.power}kW</span>
                  </div>
                  <Slider
                    id="power"
                    min={1}
                    max={10}
                    step={0.5}
                    value={[Number(hvacParameters.power)]}
                    onValueChange={(values) => {
                      if (values && values.length > 0) {
                        handleHVACParameterChange("power")(null, values[0]);
                      }
                    }}
                    className="relative h-4"
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      hasInvalidFields
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="airflow-rate">Airflow Rate: </Label>
                    <span>{hvacParameters.airFlowRate}m³/s</span>
                  </div>
                  <Slider
                    id="airflow-rate"
                    min={0.1}
                    max={2.0}
                    step={0.1}
                    value={[Number(hvacParameters.airFlowRate)]}
                    onValueChange={(values) => {
                      if (values && values.length > 0) {
                        handleHVACParameterChange("airFlowRate")(
                          null,
                          values[0]
                        );
                      }
                    }}
                    className="relative h-4"
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      hasInvalidFields
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="fan-speed">Fan Speed: </Label>
                    <span>{hvacParameters.fanSpeed}%</span>
                  </div>
                  <Slider
                    id="fan-speed"
                    min={0}
                    max={100}
                    step={1}
                    value={[Number(hvacParameters.fanSpeed)]}
                    onValueChange={(values) => {
                      if (values && values.length > 0) {
                        handleHVACParameterChange("fanSpeed")(null, values[0]);
                      }
                    }}
                    className="relative h-4"
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      hasInvalidFields
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {showFailureBox && !isSimulationRunning && !isSimulationPaused && (
          <DraggableBox
            data={
              <div className="text-sm">
                {failureData ? (
                  <div className="space-y-2">
                    <div className="p-2 border-input rounded-sm dark:bg-black/20 bg-black/10">
                      <p className="font-medium">Current Issue:</p>
                      <p className="text-zinc-900 dark:text-yellow-300 font-bold">
                        {failureData.message}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          getAlertSeverity(failureData.severity) === "high"
                            ? "text-red-500"
                            : getAlertSeverity(failureData.severity) ===
                              "medium"
                            ? "text-yellow-300"
                            : "text-primary"
                        }`}
                      >
                        Severity: {failureData.severity}
                      </p>
                      <p className="text-xs">
                        Solution: {failureData.solution}
                      </p>
                    </div>

                    {failureQueue.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium mb-1">
                          Pending Issues ({failureQueue.length}):
                        </p>
                        {failureQueue.map((failure, index) => (
                          <p
                            key={index}
                            className="text-xs dark:text-gray-300 text:primary opacity-80"
                          >
                            {failure.message}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2 border border-green-300/10 rounded dark:bg-black/20 bg-black/10">
                    <p className="dark:text-green-300 text-stone-700">
                      No system failures detected.
                    </p>
                    <p className="text-xs dark:text-green-200/70 text-stone-600 mt-1">
                      System is operating normally.
                    </p>
                  </div>
                )}
              </div>
            }
            onClose={toggleFailureBox}
          />
        )}

        {/* Simulation Controls */}
        <div className="flex justify-center mt-8 space-x-4">
          <Button
            onClick={async () => {
              try {
                const action = isSimulationRunning
                  ? isSimulationPaused
                    ? "resume"
                    : "pause"
                  : "start";

                let loadingToast;

                if (action === "start") {
                  loadingToast = toast.loading("Starting simulation...", {
                    duration: Infinity,
                  });
                  console.log("Starting simulation, creating session...");
                  const sessionData = await createSession();
                  if (!sessionData) {
                    toast.dismiss(loadingToast);
                    toast.error(
                      "Failed to start simulation. Session creation failed.",
                      {
                        duration: 4000,
                      }
                    );
                    console.error(
                      "Session creation failed, cannot start simulation"
                    );
                    setSessionError(
                      "Failed to create session. Please try again."
                    );
                    return; // Don't proceed if session creation failed
                  }
                  console.log("Session created successfully:", sessionData);
                  setCurrentSession(sessionData);
                }

                const message = {
                  type: "simulation_control",
                  data: { action },
                };

                console.log("Sending WebSocket message:", message);

                ws?.send(JSON.stringify(message));

                toast.dismiss(loadingToast);
                toast.success("Simulation started successfully!", {
                  duration: 3000,
                });

                if (action === "start") {
                  dispatch(setSimulationStatus(true));
                  dispatch(setSimulationPaused(false));
                } else if (action === "pause") {
                  dispatch(setSimulationPaused(true));
                  toast.info("Simulation paused", { duration: 2000 });
                } else if (action === "resume") {
                  dispatch(setSimulationPaused(false));
                  toast.info("Simulation resumed", { duration: 2000 });
                }
              } catch (error) {
                console.error("Error controlling simulation:", error);
                toast.error(
                  `Failed to ${
                    isSimulationRunning ? "control" : "start"
                  } simulation: ${error.message}`,
                  {
                    duration: 5000,
                  }
                );
                setSessionError(
                  error.message ||
                    "An error occurred while controlling the simulation"
                );
              }
            }}
            variant={isSimulationRunning ? "destructive" : "success"}
            size="xlg"
            disabled={hasInvalidFields}
            className="min-w-[120px] font-bold transition-all duration-400"
          >
            {isSimulationRunning
              ? isSimulationPaused
                ? "Resume Simulation"
                : "Pause Simulation"
              : "Start Simulation"}
          </Button>
          {isSimulationRunning ? (
            <Button
              onClick={async () => {
                try {
                  toast.loading("Stopping simulation", {
                    duration: Infinity,
                    id: "stop-simulation",
                  });

                  const message = {
                    type: "simulation_control",
                    data: {
                      action: "stop",
                    },
                  };

                  const activeUserId = sessionStorage.getItem("activeUserId");
                  console.log(
                    "Active user ID for stopping simulation:",
                    activeUserId
                  );

                  if (!activeUserId) {
                    toast.dismiss("stop-simulation");
                    toast.error("Error stopping simulation.", {
                      duration: 4000,
                    });
                    throw new Error("No active user found");
                  }

                  const user = JSON.parse(
                    sessionStorage.getItem(`user_${activeUserId}`)
                  );
                  console.log("User data for stopping simulation:", user);

                  // Get current session from sessionStorage
                  const sessionKey = `${user.id}_session`;
                  const sessionData = sessionStorage.getItem(sessionKey);
                  console.log("Session data from storage:", sessionData);

                  if (sessionData) {
                    const currentSession = JSON.parse(sessionData);
                    console.log(
                      "Current session for stopping simulation:",
                      currentSession
                    );

                    // Calculate if simulation was successful (target temperature reached)
                    const isSuccess =
                      Math.abs(
                        systemStatus.roomTemperature - roomParameters.targetTemp
                      ) <= 0.5;

                    console.log("Simulation success status:", isSuccess);

                    try {
                      // Save simulation data
                      console.log("Saving simulation data...");
                      await saveSimulationData(
                        currentSession.session_id,
                        isSuccess
                      );

                      // Update session status
                      console.log("Updating session status...");
                      await updateSessionStatus(
                        currentSession.session_id,
                        false
                      );

                      // Clear session from sessionStorage
                      console.log("Removing session from storage...");
                      sessionStorage.removeItem(sessionKey);
                      setCurrentSession(null);
                      console.log("Session cleared successfully");
                    } catch (saveError) {
                      console.error(
                        "Error during simulation data saving:",
                        saveError
                      );
                    }
                  } else {
                    console.warn(
                      "No active session found when stopping simulation"
                    );
                  }

                  ws?.send(JSON.stringify(message));
                  dispatch(setSimulationStatus(false));
                  dispatch(setSimulationPaused(false));
                  toast.dismiss("stop-simulation");
                  toast.success("Simulation stopped.", {
                    duration: 4000,
                  });
                } catch (error) {
                  console.error("Error stopping simulation:", error);
                  setSessionError(error.message);
                }
              }}
              disabled={!isSimulationRunning}
              variant="destructive"
              className="min-w-[120px] font-bold"
              size="xlg"
            >
              Stop Simulation
            </Button>
          ) : null}
        </div>
        {isSimulationRunning && countdownTime > 0 && (
          <div className="mt-4">
            <p className="text-center text-sm mt-2 text-primary">
              Time to target: {Math.floor(countdownTime / 60)}:
              {String(Math.floor(countdownTime % 60)).padStart(2, "0")}
            </p>
          </div>
        )}
      </div>
      <Toaster
        position="bottom-right"
        theme={theme}
        toastOptions={{
          className: "bg-background text-primary font-rubik",
        }}
      />
    </div>
  );
};

export default SimulationPage;
