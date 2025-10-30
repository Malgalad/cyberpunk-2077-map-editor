import { combineSlices, configureStore } from "@reduxjs/toolkit";

import { persistMiddleware } from "./@middleware.ts";
import districtSlice from "./district.ts";
import modalsSlice from "./modals.ts";
import nodesSlice from "./nodes.ts";
import optionsSlice from "./options.ts";
import projectSlice from "./project.ts";

export const combinedReducer = combineSlices(
  districtSlice,
  modalsSlice,
  nodesSlice,
  optionsSlice,
  projectSlice,
);

const store = configureStore({
  reducer: combinedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["nodes/patchNode"],
      },
    }).concat(persistMiddleware),
});

export default store;
