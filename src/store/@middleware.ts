import type { Middleware, MiddlewareAPI } from "redux";

import { saveJSON } from "../opfs.ts";
import type { AppDispatch, AppState } from "../types/types.ts";
import { getPersistentState } from "./@selectors.ts";
import { ProjectSelectors } from "./project.ts";

let callbackId: number | undefined;

export const persistMiddleware: Middleware =
  (api: MiddlewareAPI<AppDispatch, AppState>) => (next) => (action) => {
    const response = next(action);

    const afterState = api.getState();
    clearTimeout(callbackId);
    callbackId = setTimeout(() => {
      const persistentState = getPersistentState(afterState);

      if (ProjectSelectors.getProjectName(afterState)) {
        void saveJSON(
          `projects/${ProjectSelectors.getProjectName(afterState)}`,
          persistentState,
        );
      }
    }, 200);

    return response;
  };
