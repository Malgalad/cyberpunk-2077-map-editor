import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { District, RevivedAppState } from "../types/types.ts";
import { hydrateState } from "./@actions.ts";

interface DistrictState {
  districts: District[];
  current: string | null;
}

const initialState: DistrictState = {
  districts: [],
  current: null,
};

const districtSlice = createSlice({
  name: "district",
  initialState,
  reducers: {
    addDistrict(state, action: PayloadAction<District>) {
      state.districts.push(action.payload);
    },
    selectDistrict(state, action: PayloadAction<string | null>) {
      state.current = action.payload;
    },
  },
  extraReducers: (builder) =>
    builder.addCase(
      hydrateState.fulfilled,
      (_, action: PayloadAction<RevivedAppState>) => action.payload.district,
    ),
  selectors: {
    getDistrict: (state) =>
      state.current != null
        ? state.districts.find((district) => district.name === state.current)
        : undefined,
    getAllDistricts: (state) => state.districts,
  },
});

export const DistrictActions = districtSlice.actions;
export const DistrictSelectors = districtSlice.selectors;
export default districtSlice;
