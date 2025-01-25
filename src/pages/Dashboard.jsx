import React from "react";
import {
  Box,
  Grid,
  Card,
  Typography,
  LinearProgress,
  IconButton,
} from "@mui/material";
import {
  Thermostat,
  WaterDrop,
  Speed,
  Air,
  Power,
  Timeline,
} from "@mui/icons-material";

const Dashboard = () => {
  return (
    <Box sx={{ p: 3, backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        HVAC System Monitor
      </Typography>

      <Grid container spacing={3}>
        {/* Temperature Section */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Thermostat color="primary" />
              <Typography variant="h6" sx={{ ml: 1 }}>
                Temperature
              </Typography>
            </Box>
            <Typography variant="h3" sx={{ mb: 1 }}>
              23.5°C
            </Typography>
            <LinearProgress variant="determinate" value={70} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Target: 22°C
            </Typography>
          </Card>
        </Grid>

        {/* Humidity Section */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <WaterDrop color="info" />
              <Typography variant="h6" sx={{ ml: 1 }}>
                Humidity
              </Typography>
            </Box>
            <Typography variant="h3" sx={{ mb: 1 }}>
              45%
            </Typography>
            <LinearProgress variant="determinate" value={45} color="info" />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Optimal: 40-60%
            </Typography>
          </Card>
        </Grid>

        {/* Pressure Section */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Speed color="warning" />
              <Typography variant="h6" sx={{ ml: 1 }}>
                Pressure
              </Typography>
            </Box>
            <Typography variant="h3" sx={{ mb: 1 }}>
              1.2 kPa
            </Typography>
            <LinearProgress variant="determinate" value={60} color="warning" />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Normal Range
            </Typography>
          </Card>
        </Grid>

        {/* Airflow Section */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Air color="success" />
              <Typography variant="h6" sx={{ ml: 1 }}>
                Airflow
              </Typography>
            </Box>
            <Typography variant="h3" sx={{ mb: 1 }}>
              400 CFM
            </Typography>
            <LinearProgress variant="determinate" value={80} color="success" />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Maximum: 500 CFM
            </Typography>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 2, height: "300px" }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Timeline />
              <Typography variant="h6" sx={{ ml: 1 }}>
                System Performance
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              Performance graph will be rendered here
            </Typography>
          </Card>
        </Grid>

        {/* Controls Section */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, height: "300px" }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Power />
              <Typography variant="h6" sx={{ ml: 1 }}>
                System Controls
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Card variant="outlined" sx={{ p: 1 }}>
                <Typography variant="body1">Main Cooling Unit</Typography>
                <IconButton color="primary">
                  <Power />
                </IconButton>
              </Card>
              <Card variant="outlined" sx={{ p: 1 }}>
                <Typography variant="body1">Ventilation System</Typography>
                <IconButton color="primary">
                  <Power />
                </IconButton>
              </Card>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
