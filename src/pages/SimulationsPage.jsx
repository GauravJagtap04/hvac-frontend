import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { supabase } from "../components/SupabaseClient";
import { useOutletContext } from "react-router-dom";

import Header from "@/components/Header";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader } from "lucide-react";
import { Toaster } from "sonner";
import { toast } from "sonner";

import { motion } from "framer-motion";
import { setSelectedSystem } from "../store/store";

import splitHvacImage from "../assets/images/split-hvac.jpeg";
import vrfHvacImage from "../assets/images/vrf-hvac.jpeg";
import heatPumpHvacImage from "../assets/images/heat-pump-hvac.jpeg";
import chilledWaterHvacImage from "../assets/images/chilled-water-hvac.jpeg";

// Add keyframes for the animation
const fadeInAnimation = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const SimulationsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isCollapsed } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [availableSimulations, setAvailableSimulations] = useState([]);
  const [error, setError] = useState(null);

  const { isSimulationRunning, selectedSystem } = useSelector(
    (state) => state.hvac
  );

  const theme = useSelector((state) => state.hvac.theme);

  // Simulation data
  const simulations = [
    {
      id: "split-system",
      name: "split system",
      path: "/simulations/split-system",
      title: "Split HVAC System",
      description:
        "Separate indoor and outdoor units for flexible temperature control in residential applications.",
      image: splitHvacImage,
      color: "hsl(var(--primary))",
    },
    {
      id: "variable-refrigerant-flow-system",
      name: "variable refrigerant flow system",
      path: "/simulations/variable-refrigerant-flow-system",
      title: "VRF System",
      description:
        "Variable Refrigerant Flow systems providing precise control for multi-zone commercial applications.",
      image: vrfHvacImage,
      color: "hsl(var(--primary))",
    },
    {
      id: "heat-pump-system",
      name: "heat pump system",
      path: "/simulations/heat-pump-system",
      title: "Heat Pump System",
      description:
        "Energy-efficient system that transfers heat between indoor and outdoor environments.",
      image: heatPumpHvacImage,
      color: "hsl(var(--primary))",
    },
    {
      id: "chilled-water-system",
      name: "chilled water system",
      path: "/simulations/chilled-water-system",
      title: "Chilled Water System",
      description:
        "Large capacity system ideal for commercial buildings using water as the cooling medium.",
      image: chilledWaterHvacImage,
      color: "hsl(var(--primary))",
    },
  ];

  // Fetch user data and filter available simulations
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("User not authenticated");
          setLoading(false);
          return;
        }

        // Fetch the user's simulation permissions
        const { data, error } = await supabase
          .from("users")
          .select("is_split, is_vrf, is_heat, is_chilled")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user data:", error);
          setError("Failed to load simulation permissions");
          setLoading(false);
          return;
        }

        // Filter simulations based on user permissions
        const filteredSimulations = simulations.filter((simulation) => {
          if (simulation.id === "split-system" && data.is_split) return true;
          if (
            simulation.id === "variable-refrigerant-flow-system" &&
            data.is_vrf
          )
            return true;
          if (simulation.id === "heat-pump-system" && data.is_heat) return true;
          if (simulation.id === "chilled-water-system" && data.is_chilled)
            return true;
          return false;
        });

        setAvailableSimulations(filteredSimulations);
        setLoading(false);
      } catch (err) {
        console.error("Error in fetchUserData:", err);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSimulationCardClick = (name, id, path) => {
    if (isSimulationRunning && name !== selectedSystem) {
      toast.warning(
        `Please stop the ${selectedSystem} simulation before switching to another system.`
      );
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

  return (
    <div className="min-h-screen bg-background pt-8">
      <style dangerouslySetInnerHTML={{ __html: fadeInAnimation }} />
      <Header isCollapsed={isCollapsed} name="Simulation" />

      <div className="container mx-auto px-4 py-6 flex flex-col justify-center">
        {loading ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <Loader className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : availableSimulations.length === 0 ? (
          <div className="flex justify-center items-center min-h-[60vh] w-fit">
            <Alert>
              <AlertDescription>
                No simulations are available for your account. Please contact
                your administrator.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {availableSimulations.map((simulation, index) => (
              <div key={simulation.id} className="h-full">
                <div
                  className="h-full transform transition-all duration-300 hover:scale-[1.03] hover:shadow-lg"
                  style={{
                    animation: `fadeIn 0.5s ease-out forwards`,
                    animationDelay: `${index * 100}ms`,
                    opacity: 0,
                  }}
                >
                  <Card
                    className="group h-full flex flex-col cursor-pointer overflow-hidden border border-background rounded-md relative min-h-100"
                    onClick={() =>
                      handleSimulationCardClick(
                        simulation.name,
                        simulation.id,
                        simulation.path
                      )
                    }
                    style={{
                      backgroundImage: `url(${simulation.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {/* Overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/30 backdrop-grayscale transition-all duration-300 group-hover:backdrop-grayscale-0 group-hover:from-black/60 group-hover:to-black/20"></div>

                    <div className="relative flex flex-col justify-end h-full w-full z-10">
                      <CardContent className="p-4">
                        <h2 className="text-xl font-semibold text-white mb-2">
                          {simulation.title}
                        </h2>
                        <p className="text-sm text-white/80 leading-relaxed">
                          {simulation.description}
                        </p>
                      </CardContent>
                    </div>
                  </Card>{" "}
                </div>
              </div>
            ))}
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

export default SimulationsPage;
