import { combineSlices, configureStore } from "@reduxjs/toolkit";

import globalsSlice from "./globals.ts";
import modalsSlice from "./modals";
import nodesSlice from "./nodes";

export const combinedReducer = combineSlices(
  globalsSlice,
  modalsSlice,
  nodesSlice,
);

const store = configureStore({
  reducer: combinedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["nodes/patchNode", "global/setDistrict"],
        ignoredPaths: ["global.district.imageData"],
      },
    }),
});

export default store;
