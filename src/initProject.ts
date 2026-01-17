import { hydrateState } from "./store/@actions.ts";
import { ModalsActions } from "./store/modals.ts";
import store from "./store/store.ts";
import { PersistentStateSchema } from "./types/schemas.ts";
import { loadFileAsJSON } from "./utilities/opfs.ts";

export default async function initProject() {
  try {
    store.dispatch(ModalsActions.openModal("loading"));
    const persistent = await loadFileAsJSON("persistentData");

    if (persistent.project) {
      const data = await loadFileAsJSON(`projects/${persistent.project}`);
      const state = PersistentStateSchema.parse(data);

      await store.dispatch(hydrateState(state)).unwrap();
      store.dispatch(ModalsActions.closeModal());
    } else {
      store.dispatch(ModalsActions.openModal("project"));
    }
  } catch (error) {
    console.error(error);
    store.dispatch(ModalsActions.openModal("project"));
  }
}
