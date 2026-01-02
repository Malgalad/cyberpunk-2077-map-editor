import { combineSlices, configureStore } from "@reduxjs/toolkit";
import undoable from "redux-undo";

import { persistMiddleware } from "./@middleware.ts";
import undoRedoConfig from "./@undoredo.ts";
import districtSlice from "./district.ts";
import modalsSlice from "./modals.ts";
import nodesSlice from "./nodes.ts";
import optionsSlice from "./options.ts";
import projectSlice from "./project.ts";

export const combinedReducer = undoable(
  combineSlices(
    districtSlice,
    modalsSlice,
    nodesSlice,
    optionsSlice,
    projectSlice,
  ),
  undoRedoConfig,
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
