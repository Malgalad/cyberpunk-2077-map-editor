import { createSlice } from "@reduxjs/toolkit";

import type { AppState, District } from "../types/types.ts";
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
  reducers: (create) => ({
    addDistrict: create.reducer<District>((state, action) => {
      state.districts.push(action.payload);
    }),
    selectDistrict: create.reducer<string | null>((state, action) => {
      state.current = action.payload;
    }),
    updateDistrict: create.reducer<{ name: string; district: District }>(
      (state, action) => {
        const { name, district } = action.payload;

        state.districts.splice(
          state.districts.findIndex((district) => district.name === name),
          1,
          district,
        );

        if (state.current === name && name !== district.name) {
          state.current = district.name;
        }
      },
    ),
    deleteDistrict: create.reducer<string>((state, action) => {
      state.districts.splice(
        state.districts.findIndex(
          (district) => district.name === action.payload,
        ),
        1,
      );
    }),
  }),
  extraReducers: (builder) =>
    builder.addCase(
      hydrateState.fulfilled,
      (_, action) => action.payload.district,
    ),
});

const getSlice = (state: AppState) => state.present[districtSlice.reducerPath];
export const DistrictActions = districtSlice.actions;
export const DistrictSelectors = {
  getDistrict: (state: AppState) => {
    return getSlice(state).current != null
      ? getSlice(state).districts.find(
          (district) => district.name === getSlice(state).current,
        )
      : undefined;
  },
  getAllDistricts: (state: AppState) => getSlice(state).districts,
};
export default districtSlice;
