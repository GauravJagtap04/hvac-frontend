import axios from "axios";

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const BASE_URL = "https://api.openweathermap.org/data/2.5";

export const getCurrentLocationWeather = async () => {
  try {
    // Get user's geolocation
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      });
    });

    const { latitude, longitude } = position.coords;

    // Fetch weather data
    const response = await axios.get(
      `${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`
    );

    return {
      temperature: response.data.main.temp,
      city: response.data.name,
      country: response.data.sys.country,
      success: true,
    };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
