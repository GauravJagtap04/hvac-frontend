import { useState, useEffect } from "react";
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
  CircularProgress,
  Chip,
  useTheme,
  alpha,
  FormControlLabel,
  Switch,
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
  LocalFireDepartment,
  AspectRatio,
  WaterDrop,
  TrendingUp,
} from "@mui/icons-material";

const VRFPage = () => {
  const theme = useTheme();

  // Define StatusCard component inside VRFPage to access theme
  const StatusCard = ({ title, value, unit, icon }) => (
    <Paper
      sx={{
        p: 3,
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: "blur(10px)",
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      }}
    >
      <Box sx={{ mr: 2 }}>{icon}</Box>
      <Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          {value}
          {unit && (
            <Typography component="span" variant="h6" sx={{ ml: 1 }}>
              {unit}
            </Typography>
          )}
        </Typography>
      </Box>
    </Paper>
  );

  // Local state management
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isSimulationPaused, setIsSimulationPaused] = useState(false);
  
  // Room Parameters State - matching VRFRoomParameters
  const [roomParameters, setRoomParameters] = useState({
    length: 10.0,
    breadth: 8.0,
    height: 3.0,
    current_temp: 25.0,
    target_temp: 23.0,
    external_temp: 35.0,
    wall_insulation: "medium",
    humidity: 50.0,
    num_people: 0,
    heat_gain_external: 0.0,
    mode: "cooling"
  });

  // HVAC Parameters State - matching VRFHVACParameters
  const [hvacParameters, setHvacParameters] = useState({
    max_capacity_kw: 10.0,
    min_capacity_kw: 2.0,
    cop: 3.0,
    zones: { "main": 5.0 },
    heat_recovery: false,
    air_flow_rate: 0.5,
    supply_temp: 12.0,
    fan_speed: 100.0,
    time_interval: 1.0
  });

  // System Status State - matching get_system_status output
  const [systemStatus, setSystemStatus] = useState({
    room_temperature: 25.0,
    target_temperature: 23.0,
    cooling_capacity_kw: 0,
    cooling_capacity_btu: 0,
    energy_consumption_w: 0,
    refrigerant_flow_gs: 0,
    heat_gain_w: 0,
    cop: 3.0,
    mode: "cooling",
    fan_speed: 100,
    humidity: 50,
    num_people: 0,
    external_heat_gain: 0,
    insulation_level: "medium",
    time_interval: 1.0,
    room_size: 80,
    external_temperature: 35,
    time_to_target: 0,
    can_reach_target: true,
    temp_change_rate: 0,
    rated_power_kw: 5
  });

  // ... existing state for temperature data, websocket, etc.
  const [temperatureData, setTemperatureData] = useState([]);
  const [ws, setWs] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [countdownTime, setCountdownTime] = useState(0);

  // Add this helper function near the top of the VRFPage component
  const isInputDisabled = () => isSimulationRunning && !isSimulationPaused;

  // WebSocket message handler
  const handleWebSocketMessage = (data) => {
    if (data.type === "simulation_status") {
      setIsSimulationRunning(data.data.isRunning);
      setIsSimulationPaused(data.data.isPaused);
      setEstimatedTime(data.data.estimatedTimeToTarget);
      setCountdownTime(data.data.estimatedTimeToTarget);
    } else if (data.system_status) {
      setSystemStatus(prevStatus => ({
        ...prevStatus,
        room_temperature: data.system_status.room_temperature,
        cooling_capacity_kw: data.system_status.cooling_capacity_kw,
        cooling_capacity_btu: data.system_status.cooling_capacity_btu,
        energy_consumption_w: data.system_status.energy_consumption_w,
        heat_gain_w: data.system_status.heat_gain_w,
        refrigerant_flow_gs: data.system_status.refrigerant_flow_gs,
        cop: data.system_status.cop,
        mode: data.system_status.mode,
        fan_speed: data.system_status.fan_speed,
        humidity: data.system_status.humidity,
        time_to_target: data.system_status.time_to_target,
        can_reach_target: data.system_status.can_reach_target,
        temp_change_rate: data.system_status.temp_change_rate,
        rated_power_kw: data.system_status.rated_power_kw
      }));

      setTemperatureData(prev => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          temperature: data.system_status.room_temperature,
          target: roomParameters.target_temp,
        }
      ].slice(-20));
    }
  };

  // WebSocket setup effect
  useEffect(() => {
    const websocket = new WebSocket(
      "ws://localhost:8000/ws?system_type=vrf-system&client_id=vrf_system_client"
    );

    websocket.onopen = () => {
      setIsConnected(true);
      console.log("Connected to VRF system simulator");
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    websocket.onclose = () => {
      setIsConnected(false);
      console.log("Disconnected from VRF system simulator");
    };

    setWs(websocket);

    return () => websocket.close();
  }, []);

  // Parameter change handlers
  const handleRoomParameterChange = (parameter) => (event, value) => {
    const newValue = value ?? event.target.value;
    setRoomParameters(prev => ({ ...prev, [parameter]: newValue }));
    ws?.send(JSON.stringify({
      type: "room_parameters",
      data: { 
        ...roomParameters,
        [parameter]: newValue
      }
    }));
  };

  const handleHVACParameterChange = (parameter) => (event, value) => {
    const newValue = value ?? event.target.value;
    setHvacParameters(prev => ({ ...prev, [parameter]: newValue }));
    ws?.send(JSON.stringify({
      type: "hvac_parameters",
      data: {
        ...hvacParameters,
        [parameter]: newValue
      }
    }));
  };

  // Add new status cards for additional parameters
  const additionalStatusCards = [
    {
      title: "Heat Gain",
      value: (systemStatus.heat_gain_w / 1000).toFixed(2),
      unit: "kW",
      icon: <LocalFireDepartment sx={{ fontSize: 48, color: theme.palette.primary.main }} />
    },
    {
      title: "Room Size",
      value: systemStatus.room_size.toFixed(1),
      unit: "m²",
      icon: <AspectRatio sx={{ fontSize: 48, color: theme.palette.primary.main }} />
    },
    {
      title: "Temperature Change",
      value: systemStatus.temp_change_rate.toFixed(2),
      unit: "°C/hr",
      icon: <TrendingUp sx={{ fontSize: 48, color: theme.palette.primary.main }} />
    },
    {
      title: "Humidity",
      value: systemStatus.humidity.toFixed(1),
      unit: "%",
      icon: <WaterDrop sx={{ fontSize: 48, color: theme.palette.primary.main }} />
    }
  ];

  // Add status cards for new parameters
  const statusCards = [
    // ...existing status cards...
    {
      title: "Mode",
      value: systemStatus.mode.charAt(0).toUpperCase() + systemStatus.mode.slice(1),
      unit: "",
      icon: <ThermostatAuto sx={{ fontSize: 48, color: theme.palette.primary.main }} />
    },
    {
      title: "Heat Balance",
      value: (systemStatus.heat_gain_w / 1000).toFixed(2),
      unit: "kW",
      icon: <LocalFireDepartment sx={{ fontSize: 48, color: theme.palette.primary.main }} />
    },
    {
      title: "Capacity",
      value: systemStatus.cooling_capacity_kw.toFixed(2),
      unit: "kW",
      icon: <Power sx={{ fontSize: 48, color: theme.palette.primary.main }} />
    }
  ];

  // Fix simulation control by removing dispatch
  const handleSimulationControl = (action) => {
    const message = {
      type: "simulation_control",
      data: { action }
    };
    ws?.send(JSON.stringify(message));
    if (action === "pause" || action === "resume") {
      setIsSimulationPaused(prev => !prev);
    }
  };

  // ... rest of your existing code (StatusCard component, render method, etc.)

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
            value={systemStatus.room_temperature.toFixed(1)}
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
            value={(systemStatus.energy_consumption_w / 1000).toFixed(2)}
            unit="kW"
            icon={
              <Power sx={{ fontSize: 48, color: theme.palette.primary.main }} />
            }
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <StatusCard
            title="COP"
            value={systemStatus.cop.toFixed(2)}
            unit=""
            icon={
              <Speed sx={{ fontSize: 48, color: theme.palette.primary.main }} />
            }
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <StatusCard
            title="Refrigerant Flow"
            value={systemStatus.refrigerant_flow_gs.toFixed(1)}
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
                  dataKey={(dataPoint) => roomParameters.target_temp}
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
                  disabled={isInputDisabled()}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Width (m)"
                  type="number"
                  value={roomParameters.breadth}
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
                  disabled={isInputDisabled()}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Height (m)"
                  type="number"
                  value={roomParameters.height}
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
                  disabled={isInputDisabled()}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="No. of People"
                  type="number"
                  value={roomParameters.num_people}
                  onChange={(e) =>
                    handleRoomParameterChange("num_people")(
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
                  disabled={isInputDisabled()}
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
                  disabled={isInputDisabled()}
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
                    disabled={isInputDisabled()}
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
                  disabled={isInputDisabled()}
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
                    value={roomParameters.wall_insulation}
                    onChange={(e) =>
                      handleRoomParameterChange("wall_insulation")(
                        e,
                        e.target.value
                      )
                    }
                    disabled={isInputDisabled()}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Current Room Temperature: {roomParameters.current_temp}°C
                </Typography>
                <Slider
                  value={roomParameters.current_temp}
                  onChange={handleRoomParameterChange("current_temp")}
                  min={10}
                  max={40}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={isInputDisabled()}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Target Temperature: {roomParameters.target_temp}°C
                </Typography>
                <Slider
                  value={roomParameters.target_temp}
                  onChange={handleRoomParameterChange("target_temp")}
                  min={16}
                  max={30}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={isInputDisabled()}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  External Temperature: {roomParameters.external_temp}°C
                </Typography>
                <Slider
                  value={roomParameters.external_temp}
                  onChange={handleRoomParameterChange("external_temp")}
                  min={-10}
                  max={45}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={isInputDisabled()}
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
                  Maximum Capacity: {hvacParameters.max_capacity_kw} kW
                </Typography>
                <Slider
                  value={hvacParameters.max_capacity_kw}
                  onChange={handleHVACParameterChange("max_capacity_kw")}
                  min={1}
                  max={10}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={isInputDisabled()}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Minimum Capacity: {hvacParameters.min_capacity_kw} kW
                </Typography>
                <Slider
                  value={hvacParameters.min_capacity_kw}
                  onChange={handleHVACParameterChange("min_capacity_kw")}
                  min={0.5}
                  max={5}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={isInputDisabled()}
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
                  disabled={isInputDisabled()}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>Zone Load Configuration</Typography>
                {Object.entries(hvacParameters.zones).map(([zone, load]) => (
                  <Box key={zone} sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                      label={`${zone} Zone`}
                      type="number"
                      value={load}
                      onChange={(e) => {
                        const newZones = {
                          ...hvacParameters.zones,
                          [zone]: parseFloat(e.target.value)
                        };
                        handleHVACParameterChange("zones")({ target: { value: newZones } });
                      }}
                      inputProps={{ step: 0.1, min: 0 }}
                      sx={{
                        flexGrow: 1,
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": {
                            borderColor: alpha(theme.palette.primary.main, 0.2),
                          },
                          "&:hover fieldset": {
                            borderColor: alpha(theme.palette.primary.main, 0.3),
                          },
                        },
                      }}
                      disabled={isInputDisabled()}
                    />
                    <Typography>kW</Typography>
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  onClick={() => {
                    const zoneName = `Zone ${Object.keys(hvacParameters.zones).length + 1}`;
                    const newZones = {
                      ...hvacParameters.zones,
                      [zoneName]: 0
                    };
                    handleHVACParameterChange("zones")({ target: { value: newZones } });
                  }}
                  sx={{ mt: 2 }}
                  disabled={isInputDisabled()}
                >
                  Add Zone
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Supply Temperature: {hvacParameters.supply_temp}°C
                </Typography>
                <Slider
                  value={hvacParameters.supply_temp}
                  onChange={handleHVACParameterChange("supply_temp")}
                  min={5}
                  max={30}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={isInputDisabled()}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Airflow Rate: {hvacParameters.air_flow_rate} m³/s
                </Typography>
                <Slider
                  value={hvacParameters.air_flow_rate}
                  onChange={handleHVACParameterChange("air_flow_rate")}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  marks
                  valueLabelDisplay="auto"
                  disabled={isInputDisabled()}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Fan Speed: {hvacParameters.fan_speed}%
                </Typography>
                <Slider
                  value={hvacParameters.fan_speed}
                  onChange={handleHVACParameterChange("fan_speed")}
                  min={0}
                  max={100}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  disabled={isInputDisabled()}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={hvacParameters.heat_recovery}
                      onChange={(e) => handleHVACParameterChange("heat_recovery")(e, e.target.checked)}
                      color="primary"
                      disabled={isInputDisabled()}
                    />
                  }
                  label="Heat Recovery"
                  sx={{ mt: 2 }}
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
                    handleSimulationControl(
                      isSimulationRunning
                        ? isSimulationPaused
                          ? "resume"
                          : "pause"
                        : "start"
                    );
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
                    }}
                    sx={{
                      px: 6,
                      py: 2,
                      fontSize: "1.2rem",
                      fontWeight: "bold",
                      borderRadius: 2,
                      textTransform: "none",
                      marginLeft: 2, // Add margin-left for spacing
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
    </Box>
  );
};

// Fix export name to match component name
export default VRFPage;
