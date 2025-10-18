import type { Middleware, MiddlewareAPI } from "redux";

import { saveJSON } from "../opfs.ts";
import type { AppDispatch, AppState } from "../types.ts";
import { getPersistentState } from "./@selectors.ts";

export const persistMiddleware: Middleware =
  (api: MiddlewareAPI<AppDispatch, AppState>) => (next) => (action) => {
    const response = next(action);

    const afterState = api.getState();
    const persistentState = getPersistentState(afterState);

    if (afterState.project.name) {
      void saveJSON(`projects/${afterState.project.name}`, persistentState);
    }

    return response;
  };
