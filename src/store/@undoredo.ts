import type { UnknownAction } from "@reduxjs/toolkit";
import { shallowEqual } from "react-redux";
import {
  combineFilters,
  type FilterFunction,
  type UndoableOptions,
} from "redux-undo";

import type { AppState } from "../types/types.ts";
import { hydrateStateActionPrefix } from "./@actions.ts";
import modalsSlice from "./modals.ts";
import nodesSlice from "./nodesV2.ts";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getAllPaths = (obj: unknown, parentPath = ""): string[] => {
  if (!isObject(obj)) return [];

  return Object.entries(obj).reduce<string[]>((paths, [key, value]) => {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    const nestedPaths = isObject(value) ? getAllPaths(value, currentPath) : [];
    return [...paths, currentPath, ...nestedPaths];
  }, []);
};

const excludeHydrateState: FilterFunction = (action) =>
  !action.type.startsWith(hydrateStateActionPrefix);

const excludeModalActions: FilterFunction = (action) =>
  action.type !== modalsSlice.actions.setModal.type;

const excludeEmptySelect: FilterFunction<AppState["present"]> = (
  _,
  state,
  history,
) => !shallowEqual(history.past.at(-1)?.nodes.selected, state.nodes.selected);

const filter = combineFilters(
  excludeHydrateState,
  excludeModalActions,
  excludeEmptySelect,
);
const groupBy = (action: UnknownAction) => {
  if (!nodesSlice.actions.editNode.match(action)) return null;

  return `${getAllPaths(action.payload).join("+")}`;
};
const undoRedoConfig: UndoableOptions = {
  limit: 30,
  ignoreInitialState: true,
  filter,
  groupBy,
};

export default undoRedoConfig;
