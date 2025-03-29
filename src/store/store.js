import { configureStore } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";

const initialState = {
  selectedSystem: "split system", // or "variable refrigernat flow system", "heat pump system", "chilled water system"
  systems: {
    splitSystem: {
      roomParameters: {
        length: 5.0,
        breadth: 4.0,
        height: 3.0,
        currentTemp: 25.0,
        targetTemp: 22.0,
        externalTemp: 35.0,
        wallInsulation: "medium",
        numPeople: 0,
        mode: "cooling",
      },
      hvacParameters: {
        power: 3.5,
        cop: 3.0,
        airFlowRate: 0.5,
        fanSpeed: 50.0,
      },
      systemStatus: {
        roomTemperature: 25.0,
        targetTemperature: 22.0,
        coolingCapacityKw: 0,
        coolingCapacityBtu: 0,
        energyConsumptionW: 0,
        refrigerantFlowGs: 0,
        heatGainW: 0,
        cop: 3.0,
      },
    },
    vrfSystem: {
      roomParameters: {
        length: 5.0,
        breadth: 4.0,
        height: 3.0,
        currentTemp: 25.0,
        targetTemp: 22.0,
        externalTemp: 35.0,
        wallInsulation: "medium",
        humidity: 50.0,
        numPeople: 0,
        heatGainExternal: 0.0,
        mode: "cooling",
      },
      hvacParameters: {
        power: 3.5,
        maxCapacityKw: 14.0,
        minCapacityKw: 3.0,
        cop: 3.0,
        zones: { Main: 5.0 },
        heatRecovery: false,
        airFlowRate: 0.5,
        supplyTemp: 12.0,
        fanSpeed: 50.0,
        timeInterval: 1.0,
      },
      systemStatus: {
        roomTemperature: 25.0,
        targetTemperature: 22.0,
        coolingCapacityKw: 0,
        coolingCapacityBtu: 0,
        energyConsumptionW: 0,
        refrigerantFlowGs: 0,
        heatGainW: 0,
        cop: 3.0,
        mode: "cooling",
        fanSpeed: 50,
        humidity: 50,
        numPeople: 0,
        externalHeatGain: 0,
        insulationLevel: "medium",
        timeInterval: 1.0,
        roomSize: 80,
        externalTemp: 35,
        timeToTarget: 0,
        canReachTarget: true,
        tempChangeRate: 0,
        ratedPowerKw: 5,
      },
    },
    heatPumpSystem: {
      roomParameters: {
        length: 5.0,
        breadth: 4.0,
        height: 3.0,
        currentTemp: 25.0,
        targetTemp: 22.0,
        externalTemp: 35.0,
        wallInsulation: "medium",
        humidity: 50.0,
        numPeople: 0,
        heatGainExternal: 0.0,
        mode: "cooling",
        humidity: 50.0,
        heatGainExternal: 0.0,
      },
      hvacParameters: {
        power: 3.5,
        copRated: 3.5,
        copMin: 1.5,
        airFlowRate: 0.5,
        supplyTempCooling: 12.0,
        supplyTempHeating: 45.0,
        fanSpeed: 50.0,
        timeInterval: 1.0,
        defrostTempThreshold: 5.0,
        defrostCycleTime: 600,
        defrostInterval: 3600,
        refrigerantType: "R410A",
      },
      systemStatus: {
        roomTemperature: 25.0,
        targetTemperature: 22.0,
        coolingCapacityKw: 0,
        coolingCapacityBtu: 0,
        heatingCapacityKw: 0,
        heatingCapacityBtu: 0,
        energyConsumptionW: 0,
        refrigerantFlowGs: 0,
        heatGainW: 0,
        ratedCop: 3.0,
        actualCop: 3.0,
        copReductionFactor: 0,
        mode: "cooling",
        defrostActive: false,
        defrostRemainingTime: 0,
        timeSinceDefrost: 0,
        fanSpeed: 50,
        humidity: 50,
        numPeople: 0,
        externalHeatGain: 0,
        insulationLevel: "medium",
        timeInterval: 1.0,
        roomSize: 80,
        canReachTarget: true,
        timeToTarget: 0,
        tempChangeRate: 0,
        ratedPowerKw: 5,
        refrigerantType: "R410A",
        supplyTemperature: 12.0,
      },
    },
    chilledWaterSystem: {
      roomParameters: {
        length: 5.0,
        breadth: 4.0,
        height: 3.0,
        currentTemp: 25.0,
        targetTemp: 22.0,
        externalTemp: 35.0,
        wallInsulation: "medium",
        numPeople: 0,
        mode: "cooling",
        fanCoilUnits: 1,
      },
      hvacParameters: {
        power: 3.5,
        cop: 3.0,
        airFlowRate: 0.5,
        fanSpeed: 50.0,
        chilledWaterFlowRate: 0.5,
        chilledWaterSupplyTemp: 7.0,
        chilledWaterReturnTemp: 12.0,
        pumpPower: 0.75,
        primarySecondaryLoop: true,
        glycolPercentage: 0,
        heatExchangerEfficiency: 0.85,
      },
      systemStatus: {
        roomTemperature: 25.0,
        targetTemperature: 22.0,
        coolingCapacityKw: 0,
        coolingCapacityBtu: 0,
        energyConsumptionW: 0,
        refrigerantFlowGs: 0,
        heatGainW: 0,
        cop: 3.0,
        waterFlowRate: 0.5,
        chilledWaterSupplyTemp: 7.0,
        chilledWaterReturnTemp: 12.0,
        pumpPowerW: 0,
        primarySecondaryLoop: true,
        glycolPercentage: 0,
        heatExchangerEfficiency: 0.85,
      },
    },
  },
  isConnected: false,
  isSimulationRunning: false,
  isSimulationPaused: false,
};

const hvacSlice = createSlice({
  name: "hvac",
  initialState,
  reducers: {
    updateRoomParameters: (state, action) => {
      const { system, parameters } = action.payload;
      state.systems[system].roomParameters = {
        ...state.systems[system].roomParameters,
        ...parameters,
      };
    },
    updateHVACParameters: (state, action) => {
      const { system, parameters } = action.payload;
      state.systems[system].hvacParameters = {
        ...state.systems[system].hvacParameters,
        ...parameters,
      };
    },
    updateSystemStatus: (state, action) => {
      const { system, status } = action.payload;
      state.systems[system].systemStatus = {
        ...state.systems[system].systemStatus,
        ...status,
      };
    },

    setConnectionStatus: (state, action) => {
      state.isConnected = action.payload;
    },
    setSimulationStatus: (state, action) => {
      state.isSimulationRunning = action.payload;
    },
    setSimulationPaused: (state, action) => {
      state.isSimulationPaused = action.payload;
    },
    setSelectedSystem: (state, action) => {
      state.selectedSystem = action.payload;
    },
  },
});

export const {
  updateRoomParameters,
  updateHVACParameters,
  updateSystemStatus,
  setConnectionStatus,
  setSimulationStatus,
  setSimulationPaused,
  setSelectedSystem,
} = hvacSlice.actions;

export const store = configureStore({
  reducer: {
    hvac: hvacSlice.reducer,
    auth: authReducer,
  },
});
