import { hydrateState } from "./store/@actions.ts";
import { getPersistentState } from "./store/@selectors.ts";
import { ModalsActions } from "./store/modals.ts";
import { ProjectSelectors } from "./store/project.ts";
import store from "./store/store.ts";
import { PersistentStateSchema } from "./types/schemas.ts";
import {
  listFiles,
  loadFileAsJSON,
  moveFile,
  removeFileOrDirectory,
  saveJSONToFile,
} from "./utilities/opfs.ts";
import { partition } from "./utilities/utilities.ts";

let backupId: number | undefined;

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
    if (error instanceof DOMException && error.name === "NotFoundError") {
      const backups = await listFiles("backups/");
      const confirm = await store.dispatch(
        ModalsActions.openModal(
          "confirm",
          "Could not load the project. Attempt restoring from backup?",
        ),
      );
      if (confirm) {
        const lastBackup = backups.at(-1)!;
        const projectName = lastBackup.match(/(.+?)_backup/)![1];

        console.log(confirm, lastBackup, projectName);
        await moveFile(`backups/${lastBackup}`, `projects/${projectName}`);
        return initProject();
      }
    } else {
      store.dispatch(ModalsActions.openModal("project"));
    }
  }

  void (async () => {
    try {
      const backups = await listFiles("backups/");
      const regexp = /(.+?)_backup/;
      const byProject = partition(backups, (name) =>
        name.match(regexp) ? name.match(regexp)![1] : "--",
      );

      for (const project of Object.keys(byProject)) {
        const backups = byProject[project];

        if (backups.length > 5) {
          for (const backup of backups.slice(0, -5)) {
            void removeFileOrDirectory(`backups/${backup}`);
          }
        }
      }
    } catch {
      // noop
    }
  })();

  clearInterval(backupId);
  backupId = setInterval(() => {
    const state = store.getState();
    const persistentState = getPersistentState(state);

    if (ProjectSelectors.getProjectName(state)) {
      void saveJSONToFile(
        `backups/${ProjectSelectors.getProjectName(state)}_backup_${Date.now()}`,
        persistentState,
      );
    }
  }, 30_000);
}
