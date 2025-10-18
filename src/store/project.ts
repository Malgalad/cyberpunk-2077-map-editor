import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { PROJECT_VERSION } from "../constants.ts";
import type { PersistentAppState } from "../types.ts";
import { hydrateState } from "./@actions.ts";

interface ProjectState {
  name: string;
  version: number;
}

const initialState: ProjectState = {
  name: "",
  version: PROJECT_VERSION,
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    setProjectName(state, action: PayloadAction<string>) {
      state.name = action.payload;
    },
  },
  extraReducers: (builder) =>
    builder.addCase(
      hydrateState,
      (_, action: PayloadAction<PersistentAppState>) => action.payload.project,
    ),
  selectors: {
    getProjectName: (state) => state.name,
  },
});

export const ProjectActions = projectSlice.actions;
export const ProjectSelectors = projectSlice.selectors;
export default projectSlice;
