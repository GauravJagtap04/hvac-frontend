import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
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
import {
  ThermostatAuto,
  Speed,
  Power,
  Opacity,
  People,
} from "@mui/icons-material";
import {
  updateRoomParameters,
  updateHVACParameters,
  updateSystemStatus,
  setConnectionStatus,
  setSimulationStatus,
  setSimulationPaused,
} from "../store/store";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SYSTEM_TYPE = "splitSystem";

const SimulationPage = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { isConnected, isSimulationRunning, isSimulationPaused } = useSelector(
    (state) => state.hvac
  );
  const { roomParameters, hvacParameters, systemStatus } = useSelector(
    (state) => state.hvac.systems[SYSTEM_TYPE]
  );

  const { user, session } = useAuth();

  const updateSimulationParameters = async (parameters) => {
    if (!session || !user) {
      console.error("No authenticated user found");
      return;
    }

    const auth_id = user.id;

    const urlSystemType = SYSTEM_TYPE.replace(
      /([a-z])([A-Z])/g,
      "$1-$2"
    ).toLowerCase();

    try {
      const response = await fetch(
        `/api/${auth_id}/simulations/${urlSystemType}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(parameters),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error updating simulation parameters:", error);
      throw error;
    }
  };

  const [temperatureData, setTemperatureData] = useState([]);
  const [ws, setWs] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [countdownTime, setCountdownTime] = useState(0);
  const [targetReachAlert, setTargetReachAlert] = useState(false);
  const [connected, setConnected] = useState(false);

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
    const connectWebSocket = async () => {
      if (!session?.access_token) return;

      const urlSystemType = SYSTEM_TYPE.replace(
        /([a-z])([A-Z])/g,
        "$1-$2"
      ).toLowerCase();

      const wsUrl = `ws://localhost:8000/ws/${user.id}/${urlSystemType}?token=${session.access_token}`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = async () => {
        console.log("WebSocket connection established");
        setWs(socket);
        setConnected(true);
        dispatch(setConnectionStatus(true));

        if (socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "room_parameters",
              data: roomParameters,
            })
          );

          socket.send(
            JSON.stringify({
              type: "hvac_parameters",
              data: hvacParameters,
            })
          );

          // Initialize simulation with current parameters
          await updateSimulationParameters({
            ...roomParameters,
            ...hvacParameters,
          });
        }

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log("Received websocket data:", data); // Debug logging

          try {
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

        socket.onclose = (event) => {
          console.log("WebSocket connection closed:", event);
          setConnected(false);
          dispatch(setConnectionStatus(false));
          setWs(null);

          // Attempt to reconnect after a delay
          setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          setConnected(false);
          dispatch(setConnectionStatus(false));
        };
      };

      return () => {
        if (ws) {
          ws.close();
        }
      };
    };
    connectWebSocket();
  }, [dispatch, session, user, roomParameters, hvacParameters]);

  const handleRoomParameterChange = (parameter) => (event, value) => {
    const update = { [parameter]: value };
    dispatch(
      updateRoomParameters({
        system: SYSTEM_TYPE,
        parameters: update,
      })
    );

    // Use WebSocket for real-time updates
    ws?.send(JSON.stringify({ type: "room_parameters", data: update }));

    // Also send to REST API to persist changes
    updateSimulationParameters({
      ...roomParameters,
      ...update,
    });
  };

  const handleHVACParameterChange = (parameter) => (event, value) => {
    const update = { [parameter]: value };
    dispatch(
      updateHVACParameters({
        system: SYSTEM_TYPE.replace("-", ""),
        parameters: update,
      })
    );

    // Use WebSocket for real-time updates
    ws?.send(JSON.stringify({ type: "hvac_parameters", data: update }));

    // Also send to REST API to persist changes
    updateSimulationParameters({
      ...hvacParameters,
      ...update,
    });
  };

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
        {value !== undefined ? value : "0.0"}
      </Typography>
      <Typography variant="body1" sx={{ color: "text.secondary" }}>
        {unit}
      </Typography>
    </Paper>
  );

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
              Split System HVAC Simulation Dashboard
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
                  dataKey={(dataPoint) => roomParameters.targetTemp}
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
                  disabled={isSimulationRunning && !isSimulationPaused}
                  onChange={(e) =>
                    handleRoomParameterChange("length")(
                      e,
                      parseFloat(e.target.value)
                    )
                  }
                  inputProps={{ step: 0.1, min: 1 }}
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
                <TextField
                  fullWidth
                  label="Width (m)"
                  type="number"
                  value={roomParameters.breadth}
                  disabled={isSimulationRunning && !isSimulationPaused}
                  onChange={(e) =>
                    handleRoomParameterChange("breadth")(
                      e,
                      parseFloat(e.target.value)
                    )
                  }
                  inputProps={{ step: 0.1, min: 1 }}
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
                <TextField
                  fullWidth
                  label="Height (m)"
                  type="number"
                  value={roomParameters.height}
                  disabled={isSimulationRunning && !isSimulationPaused}
                  onChange={(e) =>
                    handleRoomParameterChange("height")(
                      e,
                      parseFloat(e.target.value)
                    )
                  }
                  inputProps={{ step: 0.1, min: 1 }}
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
                <TextField
                  fullWidth
                  label="No. of People"
                  type="number"
                  value={roomParameters.numPeople}
                  disabled={isSimulationRunning && !isSimulationPaused}
                  onChange={(e) =>
                    handleRoomParameterChange("numPeople")(
                      e,
                      parseFloat(e.target.value)
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
                  disabled={isSimulationRunning && !isSimulationPaused}
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
                  disabled={isSimulationRunning && !isSimulationPaused}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  External Temperature: {roomParameters.externalTemp}°C
                </Typography>
                <Slider
                  value={roomParameters.externalTemp}
                  onChange={handleRoomParameterChange("externalTemp")}
                  min={-10}
                  max={45}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={isSimulationRunning && !isSimulationPaused}
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
                  Power: {hvacParameters.power} kW
                </Typography>
                <Slider
                  value={hvacParameters.power}
                  onChange={handleHVACParameterChange("power")}
                  min={1}
                  max={10}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={isSimulationRunning && !isSimulationPaused}
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
                  disabled={isSimulationRunning && !isSimulationPaused}
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
                  disabled={isSimulationRunning && !isSimulationPaused}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

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
                  onClick={() => {
                    const action = isSimulationRunning
                      ? isSimulationPaused
                        ? "resume"
                        : "pause"
                      : "start";

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
                    onClick={() => {
                      const message = {
                        type: "simulation_control",
                        data: {
                          action: "stop",
                        },
                      };
                      ws?.send(JSON.stringify(message));
                      dispatch(setSimulationStatus(false));
                      dispatch(setSimulationPaused(false));
                    }}
                    sx={{
                      px: 6,
                      py: 2,
                      fontSize: "1.2rem",
                      fontWeight: "bold",
                      borderRadius: 2,
                      textTransform: "none",
                      marginLeft: 2,
                      boxShadow: `0 0 20px ${alpha(
                        theme.palette.error.main,
                        0.4
                      )}`,
                    }}
                  >
                    Stop Simulation
                  </Button>
                ) : (
                  ""
                )}
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
    </Box>
  );
};

export default SimulationPage;
