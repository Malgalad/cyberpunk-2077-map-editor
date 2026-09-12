import type { Dispatch, Middleware, MiddlewareAPI } from "redux";

import type { AppState } from "../types/types.ts";
import worker from "../worker.ts";
import { getPersistentState } from "./@selectors.ts";

let callbackId: number | undefined;

export const persistMiddleware: Middleware =
  (api: MiddlewareAPI<Dispatch, AppState>) => (next) => (action) => {
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
