import { configureStore } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

const initialState = {
  roomParameters: {
    length: 5.0,
    breadth: 4.0,
    height: 3.0,
    currentTemp: 25.0,
    targetTemp: 22.0,
    externalTemp: 35.0,
    wallInsulation: 0.5
  },
  hvacParameters: {
    power: 3.5,
    cop: 3.0,
    airFlowRate: 0.5,
    supplyTemp: 12.0
  },
  systemStatus: {
    roomTemperature: 25.0,
    targetTemperature: 22.0,
    coolingCapacityKw: 0,
    coolingCapacityBtu: 0,
    energyConsumptionW: 0,
    refrigerantFlowGs: 0,
    heatGainW: 0,
    cop: 3.0
  },
  isConnected: false,
  isSimulationRunning: false
};

const hvacSlice = createSlice({
  name: 'hvac',
  initialState,
  reducers: {
    updateRoomParameters: (state, action) => {
      state.roomParameters = { ...state.roomParameters, ...action.payload };
    },
    updateHVACParameters: (state, action) => {
      state.hvacParameters = { ...state.hvacParameters, ...action.payload };
    },
    updateSystemStatus: (state, action) => {
      state.systemStatus = { ...state.systemStatus, ...action.payload };
    },
    setConnectionStatus: (state, action) => {
      state.isConnected = action.payload;
    },
    setSimulationStatus: (state, action) => {
      state.isSimulationRunning = action.payload;
    }
  }
});

export const { 
  updateRoomParameters, 
  updateHVACParameters, 
  updateSystemStatus,
  setConnectionStatus,
  setSimulationStatus
} = hvacSlice.actions;

export const store = configureStore({
  reducer: {
    hvac: hvacSlice.reducer,
    auth: authReducer
  }
});