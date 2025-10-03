import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import * as THREE from "three";

import mapData from "../mapData.min.json";
import type { Districts } from "../types.ts";

interface GlobalState {
  district: keyof Districts | undefined;
}

const initialState = {
  district: undefined,
} satisfies GlobalState as GlobalState;

const globalsSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setDistrict(state, action: PayloadAction<GlobalState["district"]>) {
      state.district = action.payload;
    },
  },
  selectors: {
    getDistrict(state) {
      return state.district;
    },
    getDistrictData: createSelector(
      [(sliceState: GlobalState) => sliceState.district],
      (district) => {
        if (!district) return null;

        const data = mapData.soup[district];
        const minMax = new THREE.Vector4()
          .fromArray(data.transMax)
          .sub(new THREE.Vector4().fromArray(data.transMin));
        const origin = new THREE.Vector3()
          .fromArray(data.position)
          .add(new THREE.Vector4().fromArray(data.transMin));
        const center = origin.clone().add(minMax.clone().multiplyScalar(0.5));

        return {
          origin,
          minMax,
          center,
          cubeSize: data.cubeSize,
        };
      },
    ),
  },
});

export const Actions = globalsSlice.actions;
export const Selectors = globalsSlice.selectors;
export default globalsSlice;
