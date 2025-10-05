import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import * as THREE from "three";

import type { DistrictData } from "../types.ts";

interface GlobalState {
  district: DistrictData | undefined;
}

const initialState = {
  district: undefined,
} satisfies GlobalState as GlobalState;

const globalsSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setDistrict(state, action: PayloadAction<DistrictData>) {
      state.district = action.payload;
    },
  },
  selectors: {
    getDistrict(state): string | undefined {
      return state.district?.name;
    },
    getDistrictData: createSelector(
      [(sliceState: GlobalState) => sliceState.district],
      (district) => {
        if (!district) return undefined;

        const minMax = new THREE.Vector4()
          .fromArray(district.transMax)
          .sub(new THREE.Vector4().fromArray(district.transMin));
        const origin = new THREE.Vector3()
          .fromArray(district.position)
          .add(new THREE.Vector4().fromArray(district.transMin));
        const center = origin.clone().add(minMax.clone().multiplyScalar(0.5));

        return {
          ...district,
          origin,
          minMax,
          center,
        };
      },
    ),
  },
});

export const Actions = globalsSlice.actions;
export const Selectors = globalsSlice.selectors;
export default globalsSlice;
