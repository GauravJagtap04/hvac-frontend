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
import SimulationPage from "./pages/SimulationPage";
import Login from "./components/Login";
import AnalyticsPage from "./pages/AnalyticsPage";
import TrainingPage from "./pages/TrainingPage";
import Tools from "./pages/Tools";
import SettingsPage from "./pages/SettingsPage";

// Create router with all routes
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/simulations" element={<SimulationsPage />} />
        <Route path="/simulations/split-system" element={<SimulationPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/tools" element={<Tools />} />
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
