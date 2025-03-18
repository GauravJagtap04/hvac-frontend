import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Container,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const SimulationsPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const simulations = [
    {
      id: "split-system",
      title: "Split System HVAC",
      description:
        "Simulate and analyze split system HVAC performance and efficiency",
      icon: "🌡️",
      path: "/simulations/split-system",
      color: "#4CAF50",
    },
    {
      id: "variable-refrigerant-flow",
      title: "Variable Refrigerant Flow",
      description: "VRF system simulation and analysis for energy efficiency",
      icon: "❄️",
      path: "/simulations/variable-refrigerant-flow",
      color: "#2196F3",
    },
    {
      id: "heat-pump-system",
      title: "Heat Pump System",
      description: "Comprehensive heat pump system simulation and analysis",
      icon: "♨️",
      path: "/simulations/heat-pump-system",
      color: "#FF5722",
    },
    {
      id: "chilled-water-system",
      title: "Chilled Water System",
      description:
        "Chilled water system simulation and analysis for HVAC design",
      icon: "💧",
      path: "/simulations/chilled-water-system",
      color: "#9C27B0",
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
        py: 6,
      }}
    >
      <Container maxWidth="xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography
            variant="h3"
            sx={{
              mb: 4,
              fontWeight: 700,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textAlign: "center",
            }}
          >
            HVAC Simulations
          </Typography>
        </motion.div>

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
                  onClick={() => navigate(simulation.path)}
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
    </Box>
  );
};

export default SimulationsPage;
