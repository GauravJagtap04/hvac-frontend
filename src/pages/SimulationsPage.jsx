import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Container,
  useTheme,
  Snackbar,
  Alert,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedSystem } from "../store/store";
import { useOutletContext } from "react-router-dom";

const SimulationsPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useDispatch();
  const { isCollapsed } = useOutletContext();

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const { isSimulationRunning, selectedSystem } = useSelector(
    (state) => state.hvac
  );

  const simulations = [
    {
      name: "split system",
      id: "split-system",
      title: "Split System HVAC",
      description:
        "Simulate and analyze split system HVAC performance and efficiency",
      icon: "🌡️",
      path: "/simulations/split-system",
      color: "#4CAF50",
    },
    {
      name: "variable refrigerant flow system",
      id: "variable-refrigerant-flow-system",
      title: "Variable Refrigerant Flow System",
      description: "VRF system simulation and analysis for energy efficiency",
      icon: "❄️",
      path: "/simulations/variable-refrigerant-flow-system",
      color: "#2196F3",
    },
    {
      name: "heat pump system",
      id: "heat-pump-system",
      title: "Heat Pump System",
      description: "Comprehensive heat pump system simulation and analysis",
      icon: "♨️",
      path: "/simulations/heat-pump-system",
      color: "#FF5722",
    },
    {
      name: "chilled water system",
      id: "chilled-water-system",
      title: "Chilled Water System",
      description:
        "Chilled water system simulation and analysis for HVAC design",
      icon: "💧",
      path: "/simulations/chilled-water-system",
      color: "#9C27B0",
    },
  ];

  const handleSimulationCardClick = (name, id, path) => {
    if (isSimulationRunning && name !== selectedSystem) {
      setSnackbarMessage(
        `Please stop the ${selectedSystem} simulation before switching to another system.`
      );
      setOpenSnackbar(true);
      return;
    }

    navigate(path);

    if (id === "split-system") {
      dispatch(setSelectedSystem("split system"));
    } else if (id === "variable-refrigerant-flow-system") {
      dispatch(setSelectedSystem("variable refrigerant flow system"));
    } else if (id === "heat-pump-system") {
      dispatch(setSelectedSystem("heat pump system"));
    } else if (id === "chilled-water-system") {
      dispatch(setSelectedSystem("chilled water system"));
    }
  };
  const goBack = () => {
    navigate(-1);
  };
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
        pt: "64px", // Add padding top to account for fixed header
      }}
    >
      <header
        className={`bg-blue-100 dark:bg-gray-800 shadow-lg fixed top-0 ${
          isCollapsed ? "left-[80px]" : "left-[250px]"
        } right-0 z-10 transition-all duration-300`}
      >
        <div className="px-3 py-2 sm:p-4 flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* <button
                onClick={goBack}
                className="p-1 sm:p-2 group rounded-full bg-transparent hover:bg-blue-500 dark:hover:bg-gray-700 focus:outline-none transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 group-hover:text-white dark:text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button> */}
            </div>
            <h1 className="text-base sm:text-xl font-semibold ml-1 sm:ml-3 text-gray-800 dark:text-white truncate">
              Simulation
            </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Add additional header items here */}
          </div>
        </div>
      </header>

      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          {simulations.map((simulation, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={simulation.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  component={motion.div}
                  whileHover={{
                    scale: 1.03,
                    boxShadow: theme.shadows[10],
                  }}
                  whileTap={{ scale: 0.98 }}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: 4,
                    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
                    boxShadow: theme.shadows[4],
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: 4,
                      background: simulation.color,
                    },
                  }}
                  onClick={() =>
                    handleSimulationCardClick(
                      simulation.name,
                      simulation.id,
                      simulation.path
                    )
                  }
                >
                  <Box
                    sx={{
                      p: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `linear-gradient(135deg, ${simulation.color}22 0%, ${simulation.color}11 100%)`,
                    }}
                  >
                    <Typography variant="h2" sx={{ fontSize: "3rem" }}>
                      {simulation.icon}
                    </Typography>
                  </Box>
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Typography
                      gutterBottom
                      variant="h6"
                      component="h2"
                      sx={{
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        mb: 2,
                      }}
                    >
                      {simulation.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.text.secondary,
                        lineHeight: 1.6,
                      }}
                    >
                      {simulation.description}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="warning"
          variant="filled"
          onClose={() => setOpenSnackbar(false)}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SimulationsPage;
