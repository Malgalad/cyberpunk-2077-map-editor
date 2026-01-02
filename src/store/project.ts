import { createSlice } from "@reduxjs/toolkit";

import { PROJECT_VERSION } from "../constants.ts";
import type { AppState, Modes, Tool } from "../types/types.ts";
import { hydrateState } from "./@actions.ts";

interface ProjectState {
  name: string;
  mode: Modes;
  tool: Tool;
  version: number;
}

const initialState: ProjectState = {
  name: "",
  mode: "create",
  tool: "move",
  version: PROJECT_VERSION,
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: (create) => ({
    setMode: create.reducer<Modes>((state, action) => {
      state.mode = action.payload;
    }),
    setTool: create.reducer<Tool>((state, action) => {
      state.tool = action.payload;
    }),
  }),
  extraReducers: (builder) =>
    builder.addCase(
      hydrateState.fulfilled,
      (_, action) => action.payload.project,
    ),
});

const getSlice = (state: AppState) => state.present[projectSlice.reducerPath];
export const ProjectActions = projectSlice.actions;
export const ProjectSelectors = {
  getMode: (state: AppState) => getSlice(state).mode,
  getTool: (state: AppState) => getSlice(state).tool,
  getProjectName: (state: AppState) => getSlice(state).name,
};
export default projectSlice;
