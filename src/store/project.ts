import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { PROJECT_VERSION } from "../constants.ts";
import type { ProjectState } from "../types/schemas.ts";
import type { Modes, RevivedAppState } from "../types/types.ts";
import { hydrateState } from "./@actions.ts";

const initialState: ProjectState = {
  name: "",
  mode: "create",
  version: PROJECT_VERSION,
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<Modes>) {
      state.mode = action.payload;
    },
    setProjectName(state, action: PayloadAction<string>) {
      state.name = action.payload;
    },
  },
  extraReducers: (builder) =>
    builder.addCase(
      hydrateState.fulfilled,
      (_, action: PayloadAction<RevivedAppState>) => action.payload.project,
    ),
  selectors: {
    getMode: (state) => state.mode,
    getProjectName: (state) => state.name,
  },
});

export const ProjectActions = projectSlice.actions;
export const ProjectSelectors = projectSlice.selectors;
export default projectSlice;
