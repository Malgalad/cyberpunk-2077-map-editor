import { createSlice } from "@reduxjs/toolkit";

import type { DistrictView, PatternView } from "../types/types.ts";
import { hydrateState } from "./@actions.ts";

interface OptionsState {
  districtView: DistrictView;
  patternView: PatternView;
  visibleDistricts: string[];
}

const initialState: OptionsState = {
  districtView: "current",
  patternView: "wireframe",
  visibleDistricts: [],
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
  }),
  extraReducers: (builder) =>
    builder.addCase(
      hydrateState.fulfilled,
      (_, action) => action.payload.options,
    ),
  selectors: {
    getDistrictView: (state) => state.districtView,
    getPatternView: (state) => state.patternView,
    getVisibleDistricts: (state) => state.visibleDistricts,
  },
});

export const OptionsActions = optionsSlice.actions;
export const OptionsSelectors = optionsSlice.selectors;
export default optionsSlice;
