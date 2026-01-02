import type { UnknownAction } from "@reduxjs/toolkit";
import { combineFilters, type UndoableOptions } from "redux-undo";

import { hydrateStateActionPrefix } from "./@actions.ts";
import modalsSlice from "./modals.ts";
import nodesSlice from "./nodes.ts";

const excludeHydrateState = (action: UnknownAction) =>
  !action.type.startsWith(hydrateStateActionPrefix);

const excludeModalActions = (action: UnknownAction) =>
  action.type !== modalsSlice.actions.setModal.type;

const filter = combineFilters(excludeHydrateState, excludeModalActions);
const groupBy = (action: UnknownAction) => {
  if (!nodesSlice.actions.editNode.match(action)) return null;
  if (!action.payload.patches.length) return null;

  return `${action.payload.node.id}-${action.payload.patches[0].path.join(".")}`;
};
const undoRedoConfig: UndoableOptions = {
  limit: 30,
  ignoreInitialState: true,
  filter,
  groupBy,
};

export default undoRedoConfig;
