import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Button, CircularProgress, Box, Tooltip } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { getCurrentLocationWeather } from "../../utilities/weatherService";
// import { weatherService } from "@/utilities/weatherService";
import { updateRoomParameters } from "../store/store";

const WeatherIntegration = ({
  systemType,
  websocket,
  disabled,
  currentTemp,
  onWeatherFetched,
  onError,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const dispatch = useDispatch();

  const fetchWeather = async () => {
    if (disabled) return;

    setIsLoading(true);
    try {
      const weatherData = await getCurrentLocationWeather();

      if (weatherData.success) {
        // Update Redux State
        dispatch(
          updateRoomParameters({
            system: systemType,
            parameters: { externalTemp: weatherData.temperature },
          })
        );

        // Send to backend
        websocket?.send(
          JSON.stringify({
            type: "room_parameters",
            data: { externalTemp: weatherData.temperature },
          })
        );

        // Update weather location
        const locationString = `${weatherData.city}, ${weatherData.country}`;
        setLocation(locationString);

        console.log(
          `Updated external temperature to ${weatherData.temperature}°C from ${weatherData.city}`
        );

        if (onSuccess) {
          onSuccess(locationString, weatherData.temperature);
        }

        // Callback for parent component
        if (onWeatherFetched) {
          onWeatherFetched(weatherData);
        }
      } else {
        if (onError) {
          onError(weatherData.error || "Failed to fetch weather data");
        }
      }
    } catch (error) {
      console.error("Error fetching weather data:", error);
      if (onError) {
        onError(error.message || "Failed to fetch weather data");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={
          isLoading ? <CircularProgress size={16} /> : <LocationOnIcon />
        }
        onClick={fetchWeather}
        disabled={isLoading || disabled}
        sx={{ ml: 2, height: 32 }}
      >
        {isLoading ? "Loading..." : "Get Local Weather"}
      </Button>
    </>
  );
};

export default WeatherIntegration;
