import { createSlice } from "@reduxjs/toolkit";

import { KNOWN_MESHES } from "../constants.ts";
import type { AppState, DistrictView, PatternView } from "../types/types.ts";
import { hydrateState } from "./@actions.ts";

interface OptionsState {
  districtView: DistrictView;
  patternView: PatternView;
  visibleDistricts: string[];
  visibleMeshes: string[];
}

const initialState: OptionsState = {
  districtView: "current",
  patternView: "wireframe",
  visibleDistricts: [],
  visibleMeshes: KNOWN_MESHES,
};

const optionsSlice = createSlice({
  name: "options",
  initialState,
  reducers: (create) => ({
    setDistrictView: create.reducer<DistrictView>((state, action) => {
      state.districtView = action.payload;
    }),
    setPatternView: create.reducer<PatternView>((state, action) => {
      state.patternView = action.payload;
    }),
    toggleDistrictVisibility: create.reducer<string>((state, action) => {
      const index = state.visibleDistricts.indexOf(action.payload);
      if (index === -1) {
        state.visibleDistricts.push(action.payload);
      } else {
        state.visibleDistricts.splice(index, 1);
      }
    }),
    toggleMeshVisibility: create.reducer<string>((state, action) => {
      const index = state.visibleMeshes.indexOf(action.payload);
      if (index === -1) {
        state.visibleMeshes.push(action.payload);
      } else {
        state.visibleMeshes.splice(index, 1);
      }
    }),
  }),
  extraReducers: (builder) =>
    builder.addCase(
      hydrateState.fulfilled,
      (_, action) => action.payload.options,
    ),
});

const getSlice = (state: AppState) => state.present[optionsSlice.reducerPath];
export const OptionsActions = optionsSlice.actions;
export const OptionsSelectors = {
  getDistrictView: (state: AppState) => getSlice(state).districtView,
  getPatternView: (state: AppState) => getSlice(state).patternView,
  getVisibleDistricts: (state: AppState) => getSlice(state).visibleDistricts,
  getVisibleMeshes: (state: AppState) => getSlice(state).visibleMeshes,
};
export default optionsSlice;
