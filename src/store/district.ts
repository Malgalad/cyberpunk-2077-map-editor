import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import * as THREE from "three";

import type { DistrictCenter, DistrictData } from "../types.ts";

interface DistrictState {
  current: DistrictData | undefined;
}

const initialState: DistrictState = {
  current: undefined,
};

const districtSlice = createSlice({
  name: "district",
  initialState,
  reducers: {
    setDistrict(state, action: PayloadAction<DistrictData>) {
      state.current = action.payload;
    },
  },
  selectors: {
    getDistrict(state): DistrictData | undefined {
      return state.current;
    },
    getDistrictCenter: createSelector(
      [(sliceState: DistrictState) => sliceState.current],
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
