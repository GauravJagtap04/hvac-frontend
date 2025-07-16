import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import Dashboard from "./pages/Dashboard";
import SimulationsPage from "./pages/SimulationsPage";
import SplitSystemPage from "./pages/SplitSystemPage";
import VRFPage from "./pages/VRFPage";
import HeatPumpPage from "./pages/HeatPumpPage";
import ChilledWaterPage from "./pages/ChilledWaterPage";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import AnalyticsPage from "./pages/AnalyticsPage";
import "./utils/ocrTest.js";
import TrainingPage from "./pages/TrainingPage";
import SettingsPage from "./pages/SettingsPage";
import ChatbotPage from "./pages/ChatbotPage";

// Create router with all routes
import ProtectedRoute from "./components/ProtectedRoute";

// ...existing imports...

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/simulations" element={<SimulationsPage />} />
        <Route path="/simulations/split-system" element={<SplitSystemPage />} />
        <Route
          path="/simulations/variable-refrigerant-flow-system"
          element={<VRFPage />}
        />
        <Route
          path="/simulations/heat-pump-system"
          element={<HeatPumpPage />}
        />
        <Route
          path="/simulations/chilled-water-system"
          element={<ChilledWaterPage />}
        />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  )
);

const App = () => {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
};

export default App;
