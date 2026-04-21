import { getPersistentState } from "./store/@selectors.ts";
import { ProjectSelectors } from "./store/project.ts";
import type { AppState } from "./types/types.ts";
import { saveCompressedJSON } from "./utilities/opfs.ts";

self.addEventListener("message", (event) => {
  if (event.data.type === "update") {
    const state = event.data.state as AppState;
    const persistentState = getPersistentState(state);

    if (ProjectSelectors.getProjectName(state)) {
      void saveCompressedJSON(
        `/projects/${ProjectSelectors.getProjectName(state)}`,
        persistentState,
      );
    }
  }
});
