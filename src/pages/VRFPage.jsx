import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { supabase } from "../components/SupabaseClient";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Slider,
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  CircularProgress,
  Chip,
  useTheme,
  alpha,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ThermostatAuto, Speed, Power, Opacity } from "@mui/icons-material";
import {
  updateRoomParameters,
  updateHVACParameters,
  updateSystemStatus,
  setConnectionStatus,
  setSimulationStatus,
  setSimulationPaused,
} from "../store/store";
import WeatherIntegration from "../components/WeatherIntegration";

import VRFSystemModel from "../components/VRFSystemModel";

const SYSTEM_TYPE = "vrfSystem";
const safeObject = (obj) => obj || {};

const SimulationPage = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
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
  const [fanSpeedWarning, setFanSpeedWarning] = useState(false);
  const [invalidParameterMessage, setInvalidParameterMessage] = useState("");
  const [errorStartingSimulation, setErrorStartingSimulation] = useState(false);
  const [invalidFields, setInvalidFields] = useState({
    length: false,
    breadth: false,
    height: false,
  });
  const [sessionError, setSessionError] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const updateSessionStatus = async (sessionId, isActive = false) => {
    try {
      const { error } = await supabase
        .from("sessions")
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating session:", error.message);
    }
  };
  useEffect(() => {
    if (ws && isConnected && !isSimulationRunning) {
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

      const saveSimulationData = async (sessionId, isSuccess) => {
        try {
          const activeUserId = sessionStorage.getItem("activeUserId");
          console.log("Active User ID:", activeUserId);
          // const user = JSON.parse(sessionStorage.getItem(`{user_${activeUserId}`));

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
          const updateSessionStatus = async (sessionId, isActive = false) => {
            try {
              const { error } = await supabase
                .from("sessions")
                .update({
                  is_active: isActive,
                  updated_at: new Date().toISOString(),
                })
                .eq("session_id", sessionId);

              if (error) throw error;
            } catch (error) {
              console.error("Error updating session:", error.message);
            }
          };
          const { data, error } = await supabase
            .from("simulations")
            .insert([simulationData])
            .select();

          if (error) throw error;
          return data;
        } catch (error) {
          console.error("Error saving simulation data:", error.message);
          setSessionError(error.message);
          throw error;
        }
      };
      ws.send(
        JSON.stringify({
          type: "hvac_parameters",
          data: {
            power: hvacParameters.power,
            airFlowRate: hvacParameters.airFlowRate,
            fanSpeed: hvacParameters.fanSpeed,
            maxCapacityKw: hvacParameters.maxCapacityKw,
            minCapacityKw: hvacParameters.minCapacityKw,
            cop: hvacParameters.cop,
            zones: hvacParameters.zones,
            supplyTemp: hvacParameters.supplyTemp,
            heatRecovery: hvacParameters.heatRecovery,
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

      setFanSpeedWarning(hvacParameters.fanSpeed === 0);
    }
  }, [isConnected, ws, isSimulationRunning]);

  useEffect(() => {
    let timer;
    if (isSimulationRunning && !isSimulationPaused && countdownTime > 0) {
      timer = setInterval(() => {
        setCountdownTime((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSimulationRunning, isSimulationPaused, countdownTime]);

  useEffect(() => {
    let timer;
    if (isSimulationRunning && !isSimulationPaused && countdownTime > 0) {
      timer = setInterval(() => {
        setCountdownTime((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSimulationRunning, isSimulationPaused, countdownTime]);

  useEffect(() => {
    if (isSimulationRunning && !isSimulationPaused) {
      const currentTemp = systemStatus.roomTemperature;
      const targetTemp = systemStatus.targetTemperature;

      if (Math.abs(currentTemp - targetTemp) == 0) {
        setTargetReachAlert(true);
        ws?.send(
          JSON.stringify({
            type: "simulation_control",
            data: { action: "stop" },
          })
        );
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

  useEffect(() => {
    // const websocket = new WebSocket(
    //   "ws://localhost:8000/ws?system_type=variable-refrigerant-flow-system"
    // );
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const activeUserId = sessionStorage.getItem("activeUserId");
    const user = JSON.parse(sessionStorage.getItem(`user_${activeUserId}`));
    const websocket = new WebSocket(
      `${protocol}//gauravjagtap.me/ws/${user.id}/variable-refrigerant-flow-system`
    );
    websocket.onopen = () => {
      dispatch(setConnectionStatus(true));
      console.log("Connected to VRF system simulator");
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
        } else if (data.system_status) {
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
                mode: data.system_status.mode,
                fanSpeed: data.system_status.fan_speed,
                humidity: data.system_status.humidity,
                numPeople: data.system_status.num_people,
                externalHeatGain: data.system_status.external_heat_gain,
                insulationLevel: data.system_status.insulation_level,
                timeInterval: data.system_status.time_interval,
                roomSize: data.system_status.room_size,
                externalTemp: data.system_status.external_temperature,
                timeToTarget: data.system_status.time_to_target,
                canReachTarget: data.system_status.can_reach_target,
                tempChangeRate: data.system_status.temp_change_rate,
                ratedPowerKw: data.system_status.rated_power_kw,
                zones: data.system_status.zones,
                totalZoneDemandKw: data.system_status.total_zone_demand_kw,
                heatRecovery: data.system_status.heat_recovery,
                supplyTemp: data.system_status.supply_temp,
              },
            })
          );

          setTemperatureData((prev) =>
            [
              ...prev,
              {
                time: new Date().toLocaleTimeString(),
                temperature: data.system_status.room_temperature,
              },
            ].slice(-20)
          );
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

    websocket.onclose = () => {
      dispatch(setConnectionStatus(false));
      console.log("Disconnected from VRF system simulator");
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [dispatch]);

  const sanitizeNumericInput = (value) => {
    if (value === "") return 0;

    const parsedValue = parseFloat(value);

    if (isNaN(parsedValue)) return 0;

    const sanitized = parseFloat(parsedValue.toString());

    return sanitized;
  };

  const handleWeatherError = (errorMessage) => {
    setWeatherErrorMessage(errorMessage);
    setWeatherErrorOpen(true);
  };

  const handleWeatherSuccess = (location, temperature) => {
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

  const hasInvalidFields = Object.values(invalidFields).some(Boolean);

  const handleHVACParameterChange = (parameter) => (event, value) => {
    let update = {};

    // Special handling for zones object
    if (parameter === "zones") {
      update = { [parameter]: event.target.value };
    } else {
      update = { [parameter]: value };
    }

    dispatch(updateHVACParameters({ system: SYSTEM_TYPE, parameters: update }));
    ws?.send(JSON.stringify({ type: "hvac_parameters", data: update }));

    // Show warning if fan speed is set to zero
    if (parameter === "fanSpeed" && value === 0) {
      setFanSpeedWarning(true);
    } else if (parameter === "fanSpeed" && value > 0) {
      setFanSpeedWarning(false);
    }
  };

  // Define StatusCard component inside VRFPage to access theme
  const StatusCard = ({ title, value, unit, icon }) => (
    <Paper
      sx={{
        p: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: `linear-gradient(135deg, ${alpha(
          theme.palette.primary.main,
          0.05
        )} 0%, ${alpha(theme.palette.primary.main, 0.15)} 100%)`,
        backdropFilter: "blur(10px)",
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        borderRadius: 2,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: `0 8px 24px -4px ${alpha(
            theme.palette.primary.main,
            0.2
          )}`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        },
      }}
    >
      {icon}
      <Typography variant="h6" sx={{ mt: 2, color: "text.secondary" }}>
        {title}
      </Typography>
      <Typography
        variant="h3"
        sx={{
          mt: 2,
          mb: 1,
          color: theme.palette.primary.main,
          fontWeight: "bold",
        }}
      >
        {value}
      </Typography>
      <Typography variant="body1" sx={{ color: "text.secondary" }}>
        {unit}
      </Typography>
    </Paper>
  );

  const createSession = async () => {
    try {
      const activeUserId = sessionStorage.getItem("activeUserId");
      const user = JSON.parse(sessionStorage.getItem(`user_${activeUserId}`));
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data: existingSession, error: fetchError } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!existingSession) {
        const { data, error } = await supabase
          .from("sessions")
          .insert([
            {
              user_id: user.id,
              is_active: true,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        localStorage.setItem("session", JSON.stringify(data));
        return data;
      }

      return existingSession;
    } catch (error) {
      console.error("Error creating session:", error.message);
      setSessionError(error.message);
      return null;
    }
  };

  const saveSimulationData = async (sessionId, isSuccess) => {
    try {
      const activeUserId = sessionStorage.getItem("activeUserId");
      const user = JSON.parse(sessionStorage.getItem(`user_${activeUserId}`));
      if (!user) {
        throw new Error("User not authenticated");
      }

      const simulationData = {
        session_id: sessionId,
        type: "variable-refrigerant-flow-system",
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
        userid: user.id,
        is_success: isSuccess,
      };

      const { data, error } = await supabase
        .from("simulations")
        .insert([simulationData])
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error saving simulation data:", error.message);
      setSessionError(error.message);
      throw error;
    }
  };

  return (
    <Box
      sx={{
        p: 4,
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${
          theme.palette.background.default
        } 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
      }}
    >
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Box
            sx={{
              mb: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              variant="h3"
              sx={{
                color: theme.palette.primary.main,
                fontWeight: "bold",
                letterSpacing: "-0.5px",
              }}
            >
              Variable Refrigerant Flow (VRF) System Simulation Dashboard
            </Typography>
            <Chip
              label={isConnected ? "Connected" : "Disconnected"}
              color={isConnected ? "success" : "error"}
              sx={{
                fontSize: "1rem",
                py: 2.5,
                px: 3,
                borderRadius: 2,
                "& .MuiChip-label": { fontWeight: 500 },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} md={3}>
          <StatusCard
            title="Room Temperature"
            value={(systemStatus?.roomTemperature || 25.0).toFixed(1)}
            unit="°C"
            icon={
              <ThermostatAuto
                sx={{ fontSize: 48, color: theme.palette.primary.main }}
              />
            }
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <StatusCard
            title="Energy Usage"
            value={((systemStatus?.energyConsumptionW || 0) / 1000).toFixed(2)}
            unit="kW"
            icon={
              <Power sx={{ fontSize: 48, color: theme.palette.primary.main }} />
            }
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <StatusCard
            title="COP"
            value={(systemStatus?.cop || 3.0).toFixed(2)}
            unit=""
            icon={
              <Speed sx={{ fontSize: 48, color: theme.palette.primary.main }} />
            }
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <StatusCard
            title="Refrigerant Flow"
            value={(systemStatus?.refrigerantFlowGs || 0).toFixed(1)}
            unit="g/s"
            icon={
              <Opacity
                sx={{ fontSize: 48, color: theme.palette.primary.main }}
              />
            }
          />
        </Grid>

        <Grid item xs={12}>
          <Paper
            sx={{
              p: 4,
              mb: 4,
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: theme.palette.primary.main, fontWeight: "bold" }}
            >
              Temperature History
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={temperatureData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={alpha(theme.palette.text.primary, 0.1)}
                />
                <XAxis
                  dataKey="time"
                  stroke={theme.palette.text.secondary}
                  tick={{ fill: theme.palette.text.secondary }}
                />
                <YAxis
                  stroke={theme.palette.text.secondary}
                  tick={{ fill: theme.palette.text.secondary }}
                />
                <Tooltip
                  contentStyle={{
                    background: alpha(theme.palette.background.paper, 0.9),
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )}`,
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke={theme.palette.primary.main}
                  name="Room Temperature"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey={() => roomParameters.targetTemp}
                  stroke={theme.palette.secondary.main}
                  name="Target Temperature"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 4,
              height: "100%",
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                color: theme.palette.primary.main,
                fontWeight: "bold",
                mb: 3,
              }}
            >
              Room Parameters
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Length (m)"
                  type="number"
                  value={roomParameters.length}
                  error={invalidFields.length}
                  helperText={
                    invalidFields.length
                      ? "Length cannot be zero or negative."
                      : ""
                  }
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    (hasInvalidFields && !invalidFields.length)
                  }
                  onChange={(e) =>
                    handleRoomParameterChange("length")(
                      e,
                      sanitizeNumericInput(e.target.value || 0)
                    )
                  }
                  inputProps={{ step: 0.1, min: 1 }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: invalidFields.length
                          ? theme.palette.error.main
                          : alpha(theme.palette.primary.main, 0.2),
                      },
                      "&:hover fieldset": {
                        borderColor: invalidFields.length
                          ? theme.palette.error.main
                          : alpha(theme.palette.primary.main, 0.3),
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Width (m)"
                  type="number"
                  value={roomParameters.breadth}
                  error={invalidFields.breadth}
                  helperText={
                    invalidFields.breadth
                      ? "Width cannot be zero or negative."
                      : ""
                  }
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    (hasInvalidFields && !invalidFields.breadth)
                  }
                  onChange={(e) =>
                    handleRoomParameterChange("breadth")(
                      e,
                      sanitizeNumericInput(e.target.value || 0)
                    )
                  }
                  inputProps={{ step: 0.1, min: 1 }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: invalidFields.breadth
                          ? theme.palette.error.main
                          : alpha(theme.palette.primary.main, 0.2),
                      },
                      "&:hover fieldset": {
                        borderColor: invalidFields.breadth
                          ? theme.palette.error.main
                          : alpha(theme.palette.primary.main, 0.3),
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Height (m)"
                  type="number"
                  value={roomParameters.height}
                  error={invalidFields.height}
                  helperText={
                    invalidFields.height
                      ? "Height cannot be zero or negative."
                      : ""
                  }
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    (hasInvalidFields && !invalidFields.height)
                  }
                  onChange={(e) =>
                    handleRoomParameterChange("height")(
                      e,
                      sanitizeNumericInput(e.target.value || 0)
                    )
                  }
                  inputProps={{ step: 0.1, min: 1 }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: invalidFields.height
                          ? theme.palette.error.main
                          : alpha(theme.palette.primary.main, 0.2),
                      },
                      "&:hover fieldset": {
                        borderColor: invalidFields.height
                          ? theme.palette.error.main
                          : alpha(theme.palette.primary.main, 0.3),
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="No. of People"
                  type="number"
                  value={roomParameters.numPeople}
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    hasInvalidFields
                  }
                  onChange={(e) =>
                    handleRoomParameterChange("numPeople")(
                      e,
                      sanitizeNumericInput(e.target.value || 0)
                    )
                  }
                  inputProps={{ step: 1, min: 0 }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                      },
                      "&:hover fieldset": {
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                      },
                      "&:hover fieldset": {
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                      },
                    },
                  }}
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    hasInvalidFields
                  }
                >
                  <InputLabel
                    sx={{
                      backgroundColor: theme.palette.background.paper,
                      padding: "0 6px",
                    }}
                  >
                    Mode
                  </InputLabel>
                  <Select
                    value={roomParameters.mode}
                    onChange={(e) =>
                      handleRoomParameterChange("mode")(e, e.target.value)
                    }
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      hasInvalidFields
                    }
                  >
                    <MenuItem value="cooling">Cooling</MenuItem>
                    <MenuItem value="heating">Heating</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                      },
                      "&:hover fieldset": {
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                      },
                    },
                  }}
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    hasInvalidFields
                  }
                >
                  <InputLabel
                    sx={{
                      backgroundColor: theme.palette.background.paper,
                      padding: "0 6px",
                    }}
                  >
                    Wall Insulation Level
                  </InputLabel>
                  <Select
                    value={roomParameters.wallInsulation}
                    onChange={(e) =>
                      handleRoomParameterChange("wallInsulation")(
                        e,
                        e.target.value
                      )
                    }
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      hasInvalidFields
                    }
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>
                  Current Room Temperature: {roomParameters.currentTemp}°C
                </Typography>
                <Slider
                  value={roomParameters.currentTemp}
                  onChange={handleRoomParameterChange("currentTemp")}
                  min={10}
                  max={40}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    hasInvalidFields
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>
                  Target Temperature: {roomParameters.targetTemp}°C
                </Typography>
                <Slider
                  value={roomParameters.targetTemp}
                  onChange={handleRoomParameterChange("targetTemp")}
                  min={16}
                  max={30}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    hasInvalidFields
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>
                  External Temperature: {roomParameters.externalTemp}°C
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
                  />
                </Typography>
                <Slider
                  value={roomParameters.externalTemp}
                  onChange={handleRoomParameterChange("externalTemp")}
                  min={-10}
                  max={45}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    hasInvalidFields
                  }
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 4,
              height: "100%",
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                color: theme.palette.primary.main,
                fontWeight: "bold",
                mb: 3,
              }}
            >
              HVAC Parameters
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <Typography gutterBottom>
                  Maximum Capacity: {hvacParameters.maxCapacityKw} kW
                </Typography>
                <Slider
                  value={hvacParameters.maxCapacityKw}
                  onChange={handleHVACParameterChange("maxCapacityKw")}
                  min={1}
                  max={10}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    hasInvalidFields
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Minimum Capacity: {hvacParameters.minCapacityKw} kW
                </Typography>
                <Slider
                  value={hvacParameters.minCapacityKw}
                  onChange={handleHVACParameterChange("minCapacityKw")}
                  min={0.5}
                  max={5}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    hasInvalidFields
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  COP (Coefficient of Performance): {hvacParameters.cop}
                </Typography>
                <Slider
                  value={hvacParameters.cop}
                  onChange={handleHVACParameterChange("cop")}
                  min={1}
                  max={5}
                  step={0.1}
                  marks
                  valueLabelDisplay="auto"
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    hasInvalidFields
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>Zone Load Configuration</Typography>
                {Object.entries(safeObject(hvacParameters.zones)).map(
                  ([zone, load], index, array) => (
                    <Box
                      key={zone}
                      sx={{
                        mt: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <TextField
                        label={`${zone} Zone`}
                        type="number"
                        value={load}
                        onChange={(e) => {
                          const newZones = {
                            ...hvacParameters.zones,
                            [zone]:
                              sanitizeNumericInput(e.target.value || 0) || 0, // Prevents NaN issues
                          };
                          handleHVACParameterChange("zones")({
                            target: { value: newZones },
                          });
                        }}
                        inputProps={{ step: 0.1, min: 0 }}
                        sx={{
                          flexGrow: 1,
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                              borderColor: alpha(
                                theme.palette.primary.main,
                                0.2
                              ),
                            },
                            "&:hover fieldset": {
                              borderColor: alpha(
                                theme.palette.primary.main,
                                0.3
                              ),
                            },
                          },
                        }}
                        disabled={
                          (isSimulationRunning && !isSimulationPaused) ||
                          hasInvalidFields
                        }
                      />
                      <Typography>kW</Typography>
                    </Box>
                  )
                )}
                <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                  {/* Add Zone Button */}
                  <Button
                    variant="outlined"
                    onClick={() => {
                      // Extract existing zone numbers
                      const existingNumbers = Object.keys(hvacParameters.zones)
                        .map((name) => parseInt(name.replace(/\D/g, ""), 10))
                        .filter((num) => !isNaN(num));

                      // Determine the next available zone number
                      const nextNumber = existingNumbers.length
                        ? Math.max(...existingNumbers) + 1
                        : 1;
                      const zoneName = `Zone ${nextNumber}`;
                      const newZones = {
                        ...hvacParameters.zones,
                        [zoneName]: 0, // New zone starts at 0 kW
                      };
                      handleHVACParameterChange("zones")({
                        target: { value: newZones },
                      });
                    }}
                    disabled={
                      (isSimulationRunning && !isSimulationPaused) ||
                      hasInvalidFields
                    }
                  >
                    Add Zone
                  </Button>
                  {/* Remove Zone Button */}
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      const zoneKeys = Object.keys(hvacParameters.zones);
                      if (zoneKeys.length > 1) {
                        const newZones = { ...hvacParameters.zones };
                        delete newZones[zoneKeys[zoneKeys.length - 1]]; // Removes the last zone
                        handleHVACParameterChange("zones")({
                          target: { value: newZones },
                        });
                      }
                    }}
                    disabled={
                      Object.keys(hvacParameters.zones).length <= 1 ||
                      (isSimulationRunning && !isSimulationPaused) ||
                      hasInvalidFields
                    }
                  >
                    Remove Zone
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Supply Temperature: {hvacParameters.supplyTemp}°C
                </Typography>
                <Slider
                  value={hvacParameters.supplyTemp}
                  onChange={handleHVACParameterChange("supplyTemp")}
                  min={5}
                  max={30}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    hasInvalidFields
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Airflow Rate: {hvacParameters.airFlowRate} m³/s
                </Typography>
                <Slider
                  value={hvacParameters.airFlowRate}
                  onChange={handleHVACParameterChange("airFlowRate")}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  marks
                  valueLabelDisplay="auto"
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    hasInvalidFields
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Fan Speed: {hvacParameters.fanSpeed}%
                </Typography>
                <Slider
                  value={hvacParameters.fanSpeed}
                  onChange={handleHVACParameterChange("fanSpeed")}
                  min={0}
                  max={100}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  disabled={
                    (isSimulationRunning && !isSimulationPaused) ||
                    hasInvalidFields
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={hvacParameters.heatRecovery}
                      onChange={(e) =>
                        handleHVACParameterChange("heatRecovery")(
                          e,
                          e.target.checked
                        )
                      }
                      color="primary"
                      disabled={
                        (isSimulationRunning && !isSimulationPaused) ||
                        hasInvalidFields
                      }
                    />
                  }
                  label="Heat Recovery"
                  sx={{ mt: 2 }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {isSimulationRunning && !isSimulationPaused && (
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 4,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: "blur(10px)",
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              }}
            >
              <VRFSystemModel
                roomParameters={roomParameters}
                hvacParameters={hvacParameters}
                systemStatus={systemStatus}
                isSimulationRunning={isSimulationRunning}
              />
            </Paper>
          </Grid>
        )}

        <Grid item xs={12}>
          <Paper
            sx={{
              p: 4,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Grid item xs={12} container>
                <Button
                  variant="contained"
                  size="large"
                  color={isSimulationRunning ? "error" : "primary"}
                  startIcon={
                    isSimulationRunning && !isSimulationPaused ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : null
                  }
                  disabled={hasInvalidFields}
                  onClick={async () => {
                    try {
                      const action = isSimulationRunning
                        ? isSimulationPaused
                          ? "resume"
                          : "pause"
                        : "start";

                      if (action === "start") {
                        const sessionData = await createSession();
                        if (!sessionData) {
                          return;
                        }
                      }

                      const message = {
                        type: "simulation_control",
                        data: { action },
                      };

                      ws?.send(JSON.stringify(message));

                      if (action === "start") {
                        dispatch(setSimulationStatus(true));
                        dispatch(setSimulationPaused(false));
                      } else if (action === "pause") {
                        dispatch(setSimulationPaused(true));
                      } else if (action === "resume") {
                        dispatch(setSimulationPaused(false));
                      }
                    } catch (error) {
                      console.error("Error controlling simulation:", error);
                      setSessionError(error.message);
                    }
                  }}
                  sx={{
                    px: 6,
                    py: 2,
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                    borderRadius: 2,
                    textTransform: "none",
                    boxShadow: isSimulationRunning
                      ? `0 0 20px ${alpha(theme.palette.error.main, 0.4)}`
                      : `0 0 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                    opacity: hasInvalidFields ? 0.6 : 1,
                    mr: 2, // Add margin to separate buttons
                  }}
                >
                  {isSimulationRunning
                    ? isSimulationPaused
                      ? "Resume Simulation"
                      : "Pause Simulation"
                    : "Start Simulation"}
                </Button>
                {isSimulationRunning ? (
                  <Button
                    variant="contained"
                    size="large"
                    color="error"
                    onClick={async () => {
                      try {
                        const message = {
                          type: "simulation_control",
                          data: { action: "stop" },
                        };

                        const currentSessionData = JSON.parse(
                          localStorage.getItem("session")
                        );
                        if (currentSessionData) {
                          // Calculate if simulation was successful
                          const isSuccess =
                            Math.abs(
                              systemStatus.roomTemperature -
                                roomParameters.targetTemp
                            ) <= 0.5;

                          // Save simulation data
                          await saveSimulationData(
                            currentSessionData.session_id,
                            isSuccess
                          );

                          // Update session status
                          await updateSessionStatus(
                            currentSessionData.session_id,
                            false
                          );

                          // Clear session from localStorage
                          localStorage.removeItem("session");
                          setCurrentSession(null);
                        }

                        ws?.send(JSON.stringify(message));
                        dispatch(setSimulationStatus(false));
                        dispatch(setSimulationPaused(false));
                      } catch (error) {
                        console.error("Error stopping simulation:", error);
                        setSessionError(error.message);
                      }
                    }}
                    sx={{
                      px: 6,
                      py: 2,
                      fontSize: "1.2rem",
                      fontWeight: "bold",
                      borderRadius: 2,
                      textTransform: "none",
                      boxShadow: `0 0 20px ${alpha(
                        theme.palette.error.main,
                        0.4
                      )}`,
                      opacity: hasInvalidFields ? 0.6 : 1,
                    }}
                  >
                    Stop Simulation
                  </Button>
                ) : null}
              </Grid>
              {countdownTime > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )}`,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    Time to Target:
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color: theme.palette.primary.main,
                      fontWeight: "bold",
                    }}
                  >
                    {Math.floor(countdownTime / 60)}:
                    {String(Math.floor(countdownTime % 60)).padStart(2, "0")}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
      <Snackbar
        open={invalidParameterOpen}
        autoHideDuration={5000}
        onClose={() => setInvalidParameterOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setInvalidParameterOpen(false)}
        >
          {invalidParameterMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={targetReachAlert}
        autoHideDuration={6000}
        onClose={() => setTargetReachAlert(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setTargetReachAlert(false)}
        >
          Target temperature reached! Simulation successful.
        </Alert>
      </Snackbar>
      <Snackbar
        open={weatherSuccessOpen}
        autoHideDuration={5000}
        onClose={() => setWeatherSuccessOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setWeatherSuccessOpen(false)}
        >
          {weatherSuccessMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={weatherErrorOpen}
        autoHideDuration={6000}
        onClose={() => setWeatherErrorOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setWeatherErrorOpen(false)}
        >
          {weatherErrorMessage ||
            "Error fetching weather data. Please try again."}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SimulationPage;
