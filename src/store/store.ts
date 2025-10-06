import { combineSlices, configureStore } from "@reduxjs/toolkit";

import districtSlice from "./district.ts";
import modalsSlice from "./modals";
import nodesSlice from "./nodes";

export const combinedReducer = combineSlices(
  districtSlice,
  modalsSlice,
  nodesSlice,
);

const store = configureStore({
  reducer: combinedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["nodes/patchNode", "district/setDistrict"],
        ignoredPaths: ["district.districtData.imageData"],
      },
    }),
});

export default store;
