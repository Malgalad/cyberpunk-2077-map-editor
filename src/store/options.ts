import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { OptionsState } from "../types/schemas.ts";
import type {
  DistrictView,
  PatternView,
  RevivedAppState,
} from "../types/types.ts";
import { hydrateState } from "./@actions.ts";

const initialState: OptionsState = {
  districtView: "current",
  patternView: "wireframe",
  visibleDistricts: [],
};

const optionsSlice = createSlice({
  name: "options",
  initialState,
  reducers: {
    setDistrictView(state, action: PayloadAction<DistrictView>) {
      state.districtView = action.payload;
    },
    setPatternView(state, action: PayloadAction<PatternView>) {
      state.patternView = action.payload;
    },
    toggleDistrictVisibility(state, action: PayloadAction<string>) {
      const index = state.visibleDistricts.indexOf(action.payload);
      if (index === -1) {
        state.visibleDistricts.push(action.payload);
      } else {
        state.visibleDistricts.splice(index, 1);
      }
    },
  },
  extraReducers: (builder) =>
    builder.addCase(
      hydrateState.fulfilled,
      (_, action: PayloadAction<RevivedAppState>) => action.payload.options,
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
