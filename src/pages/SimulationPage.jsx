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
} from "../store/store";
import { Link } from "react-router-dom";

const SimulationPage = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const {
    roomParameters,
    hvacParameters,
    systemStatus,
    isConnected,
    isSimulationRunning,
  } = useSelector((state) => state.hvac);

  const [temperatureData, setTemperatureData] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const websocket = new WebSocket("ws://localhost:8000/ws");

    websocket.onopen = () => {
      dispatch(setConnectionStatus(true));
      console.log("Connected to HVAC simulator");
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "simulation_status") {
          dispatch(setSimulationStatus(data.data.isRunning));
        } else if (data.system_status) {
          dispatch(
            updateSystemStatus({
              roomTemperature: data.system_status.room_temperature,
              coolingCapacityKw: data.system_status.cooling_capacity_kw,
              energyConsumptionW: data.system_status.energy_consumption_w,
              heatGainW: data.system_status.heat_gain_w,
              cop: data.system_status.cop,
              refrigerantFlowGs: data.system_status.refrigerant_flow_gs,
            })
          );

          setTemperatureData((prev) =>
            [
              ...prev,
              {
                time: new Date().toLocaleTimeString(),
                temperature: data.system_status.room_temperature,
                target: roomParameters.targetTemp,
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
      console.log("Disconnected from HVAC simulator");
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [dispatch]);

  const handleRoomParameterChange = (parameter) => (event, value) => {
    const update = { [parameter]: value };
    dispatch(updateRoomParameters(update));
    ws?.send(JSON.stringify({ type: "room_parameters", data: update }));
  };

  const handleHVACParameterChange = (parameter) => (event, value) => {
    const update = { [parameter]: value };
    dispatch(updateHVACParameters(update));
    ws?.send(JSON.stringify({ type: "hvac_parameters", data: update }));
  };

  const StatusCard = ({ title, value, unit, icon }) => (
    <Paper
      sx={{
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: alpha(theme.palette.primary.main, 0.1),
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-5px)",
          boxShadow: theme.shadows[4],
        },
      }}
    >
      {icon}
      <Typography variant="h6" sx={{ mt: 1 }}>
        {title}
      </Typography>
      <Typography
        variant="h4"
        sx={{ mt: 1, color: theme.palette.primary.main }}
      >
        {value}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {unit}
      </Typography>
    </Paper>
  );

  return (
    <Box
      sx={{
        p: 3,
        minHeight: "100vh",
        background: theme.palette.background.default,
      }}
    >
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box
            sx={{
              mb: 3,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h4" sx={{ color: theme.palette.primary.main }}>
              HVAC Simulation Dashboard
            </Typography>
            <Chip
              label={isConnected ? "Connected" : "Disconnected"}
              color={isConnected ? "success" : "error"}
              sx={{ fontSize: "1rem", py: 2 }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} md={3}>
          <StatusCard
            title="Room Temperature"
            value={systemStatus.roomTemperature.toFixed(1)}
            unit="°C"
            icon={
              <ThermostatAuto
                sx={{ fontSize: 40, color: theme.palette.primary.main }}
              />
            }
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <StatusCard
            title="Energy Usage"
            value={(systemStatus.energyConsumptionW / 1000).toFixed(2)}
            unit="kW"
            icon={
              <Power sx={{ fontSize: 40, color: theme.palette.primary.main }} />
            }
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <StatusCard
            title="COP"
            value={systemStatus.cop.toFixed(2)}
            unit=""
            icon={
              <Speed sx={{ fontSize: 40, color: theme.palette.primary.main }} />
            }
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <StatusCard
            title="Refrigerant Flow"
            value={systemStatus.refrigerantFlowGs.toFixed(1)}
            unit="g/s"
            icon={
              <Opacity
                sx={{ fontSize: 40, color: theme.palette.primary.main }}
              />
            }
          />
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Temperature History
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temperatureData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke={theme.palette.primary.main}
                  name="Room Temperature"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke={theme.palette.secondary.main}
                  name="Target Temperature"
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: "blur(10px)",
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: theme.palette.primary.main }}
            >
              Room Parameters
            </Typography>
            <Grid container spacing={3}>
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
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Mode</InputLabel>
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
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: "blur(10px)",
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: theme.palette.primary.main }}
            >
              HVAC Parameters
            </Typography>
            <Grid container spacing={3}>
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
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: "blur(10px)",
            }}
          >
            <Button
              variant="contained"
              size="large"
              color={isSimulationRunning ? "error" : "primary"}
              startIcon={
                isSimulationRunning ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
              onClick={() => {
                const message = {
                  type: "simulation_control",
                  data: { action: isSimulationRunning ? "stop" : "start" },
                };
                ws?.send(JSON.stringify(message));
              }}
              sx={{ px: 4, py: 1.5, fontSize: "1.1rem" }}
            >
              {isSimulationRunning ? "Stop" : "Start"} Simulation
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SimulationPage;
