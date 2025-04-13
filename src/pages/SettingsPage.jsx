import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../components/SupabaseClient";
import Header from "@/components/Header";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { toast } from "sonner";

import { Loader } from "lucide-react";

const HVACSettingsPage = () => {
  const { isCollapsed } = useOutletContext();
  const [systemSettings, setSystemSettings] = useState({
    is_split: false,
    is_vrf: false,
    is_heat: false,
    is_chilled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const theme = localStorage.getItem("theme") || "light";

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      setIsLoading(true);
      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) {
        console.error("No user found in localStorage");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("is_split, is_vrf, is_heat, is_chilled")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSystemSettings({
          is_split: data.is_split || false,
          is_vrf: data.is_vrf || false,
          is_heat: data.is_heat || false,
          is_chilled: data.is_chilled || false,
        });
      }
    } catch (error) {
      console.error("Error fetching user settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (field) => {
    setSystemSettings({
      ...systemSettings,
      [field]: !systemSettings[field],
    });
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);

      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) {
        toast.error("User not found. Please log in again.");
        return;
      }

      const { error } = await supabase
        .from("users")
        .update(systemSettings)
        .eq("id", user.id);

      if (error) throw error;

      toast.success("HVAC Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const hvacSystems = [
    {
      id: "is_split",
      name: "Split System",
      description:
        "Traditional HVAC system with indoor and outdoor units for efficient temperature control",
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      id: "is_vrf",
      name: "VRF System",
      description:
        "Variable Refrigerant Flow system for precise zoning and simultaneous heating and cooling",
      gradient: "from-purple-500 to-pink-600",
    },
    {
      id: "is_heat",
      name: "Heat Pump System",
      description:
        "Energy-efficient heating and cooling system that transfers heat between indoor and outdoor air",
      gradient: "from-orange-500 to-red-600",
    },
    {
      id: "is_chilled",
      name: "Chilled Water System",
      description:
        "Central cooling system for larger buildings using water as a medium for heat transfer",
      gradient: "from-teal-500 to-green-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header isCollapsed={isCollapsed} name="Settings" />

      <main
        className={`transition-all duration-300 ${
          isCollapsed ? "max-w-8xl" : "max-w-7xl"
        } mx-auto px-4 sm:px-6 lg:px-8 py-8`}
      >
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <Loader className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-primary">
                HVAC Systems
              </h1>
              <Button
                onClick={saveSettings}
                disabled={isSaving}
                className="px-4 py-2"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            <p className="text-muted-foreground mb-6">
              Select which HVAC systems you want to use in the application. The
              selected systems will appear in your dashboard and simulations.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 place-items-center justify-items-center">
              {hvacSystems.map((system) => (
                <div
                  key={system.id}
                  onClick={() => handleToggle(system.id)}
                  className="cursor-pointer relative"
                >
                  <Card
                    className={`h-80 overflow-hidden transition-all duration-500 hover:shadow-lg rounded-2xl max-w-sm relative ${
                      systemSettings[system.id] ? "" : "grayscale"
                    }`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${system.gradient} opacity-70 rounded-2xl`}
                    />

                    <CardContent className="p-0 h-full flex flex-col justify-between">
                      <div className="relative z-10 p-6 grow">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {system.name}
                        </h3>
                        <p className="text-white/80 text-sm leading-relaxed">
                          {system.description}
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="relative z-10 p-4 pt-0 flex justify-end">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          systemSettings[system.id]
                            ? "bg-white border-white"
                            : "border-white/50"
                        }`}
                      >
                        {systemSettings[system.id] && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-indigo-600"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
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

export default HVACSettingsPage;
