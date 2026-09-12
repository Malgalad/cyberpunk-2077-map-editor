import { createListenerMiddleware } from "@reduxjs/toolkit";

import { hydrateState } from "./@actions.ts";

export const projectListeners = createListenerMiddleware();

export function onProjectLoaded(listener: () => void) {
  return projectListeners.startListening({
    actionCreator: hydrateState.fulfilled,
    effect: listener,
  });
}
