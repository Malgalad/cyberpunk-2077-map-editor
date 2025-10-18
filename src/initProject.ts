import { PROJECT_VERSION } from "./constants.ts";
import { loadJSON } from "./opfs.ts";
import { hydrateState } from "./store/@actions.ts";
import { ModalsActions } from "./store/modals.ts";
import store from "./store/store.ts";
import type { PersistentAppState } from "./types.ts";

export default async function initProject() {
  try {
    const persistent = await loadJSON("persistentData");

    if (persistent.project) {
      const state: PersistentAppState = await loadJSON(
        `projects/${persistent.project}`,
      );

      if (state.project.version === PROJECT_VERSION) {
        store.dispatch(hydrateState(state));
        return;
      }
    }
  } catch {
    // noop
  }

  store.dispatch(ModalsActions.openModal("project"));
}
