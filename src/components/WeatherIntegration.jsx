import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { updateRoomParameters } from "../store/store";
import { getCurrentLocationWeather } from "@/utilities/WeatherService";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MapPin, Loader2 } from "lucide-react";

const WeatherIntegration = ({
  systemType,
  websocket,
  disabled,
  currentTemp,
  onWeatherFetched,
  onError,
  onSuccess,
  onWeatherFetch,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const dispatch = useDispatch();

  const fetchWeather = async () => {
    setIsLoading(true);
    if (disabled) return;

    if (onWeatherFetch) {
      onWeatherFetch();
    }

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

        const locationString = `${weatherData.city}, ${weatherData.country}`;
        setLocation(locationString);

        console.log(
          `Updated external temperature to ${weatherData.temperature}°C from ${weatherData.city}`
        );

        if (onSuccess) {
          onSuccess(locationString, weatherData.temperature);
        }

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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchWeather}
            disabled={isLoading || disabled}
            className="ml-2 h-8 w-8 bg-background dark:bg-background"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Get local weather</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default WeatherIntegration;
