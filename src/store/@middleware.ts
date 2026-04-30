import type { Middleware, MiddlewareAPI } from "redux";

import type { AppDispatch, AppState } from "../types/types.ts";
import worker from "../worker.ts";
import { getPersistentState } from "./@selectors.ts";

let callbackId: number | undefined;

export const persistMiddleware: Middleware =
  (api: MiddlewareAPI<AppDispatch, AppState>) => (next) => (action) => {
    const response = next(action);

    const afterState = getPersistentState(api.getState());
    clearTimeout(callbackId);
    callbackId = setTimeout(() => {
      worker.postMessage({
        type: "update",
        state: afterState,
      });
    }, 200);

    return response;
  };
