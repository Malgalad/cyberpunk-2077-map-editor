import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import * as THREE from "three";

import type {
  DistrictCenter,
  DistrictData,
  PersistentAppState,
} from "../types.ts";
import { hydrateState } from "./@actions.ts";

interface DistrictState {
  districts: DistrictData[];
  current: string | undefined;
}

const initialState: DistrictState = {
  districts: [],
  current: undefined,
};

const districtSlice = createSlice({
  name: "district",
  initialState,
  reducers: {
    addDistrict(state, action: PayloadAction<DistrictData>) {
      state.districts.push(action.payload);
    },
    selectDistrict(state, action: PayloadAction<string | undefined>) {
      state.current = action.payload;
    },
  },
  extraReducers: (builder) =>
    builder.addCase(
      hydrateState,
      (_, action: PayloadAction<PersistentAppState>) => action.payload.district,
    ),
  selectors: {
    getDistrict: (state) =>
      state.current != null
        ? state.districts.find((district) => district.name === state.current)
        : undefined,
    getAllDistricts: (state) => state.districts,
    getDistrictCenter: createSelector(
      [
        (sliceState: DistrictState): DistrictData | undefined =>
          districtSlice.getSelectors().getDistrict(sliceState),
      ],
      (districtData): DistrictCenter | undefined => {
        if (!districtData) return undefined;

        const minMax = new THREE.Vector4()
          .fromArray(districtData.transMax)
          .sub(new THREE.Vector4().fromArray(districtData.transMin));
        const origin = new THREE.Vector3()
          .fromArray(districtData.position)
          .add(new THREE.Vector4().fromArray(districtData.transMin));
        const center = origin.clone().add(minMax.clone().multiplyScalar(0.5));

        return {
          center,
          minMax,
          origin,
        };
      },
    ),
  },
});

export const DistrictActions = districtSlice.actions;
export const DistrictSelectors = districtSlice.selectors;
export default districtSlice;
