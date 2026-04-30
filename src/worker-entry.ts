import { ProjectSelectors } from "./store/project.ts";
import type { AppState, PersistentAppState } from "./types/types.ts";
import { saveCompressedJSON } from "./utilities/opfs.ts";

self.addEventListener("message", (event) => {
  if (event.data.type === "update") {
    const persistentState = event.data.state as PersistentAppState;
    const state = { present: persistentState } as AppState;

    if (ProjectSelectors.getProjectName(state)) {
      void saveCompressedJSON(
        `/projects/${ProjectSelectors.getProjectName(state)}`,
        persistentState,
      );
    }
  }
});
