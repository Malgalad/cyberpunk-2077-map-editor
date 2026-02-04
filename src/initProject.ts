import { hydrateState } from "./store/@actions.ts";
import { getPersistentState } from "./store/@selectors.ts";
import { ModalsActions } from "./store/modals.ts";
import { ProjectSelectors } from "./store/project.ts";
import store from "./store/store.ts";
import { PersistentStateSchema } from "./types/schemas.ts";
import {
  fs,
  loadCompressedJSON,
  saveCompressedJSON,
} from "./utilities/opfs.ts";
import { partition } from "./utilities/utilities.ts";

let backupId: number | undefined;

const notFound = (pathname: string) =>
  fs.exists(pathname).then((exists) => !exists);

async function wakeup() {
  store.dispatch(ModalsActions.openModal("loading"));

  if (await notFound("/persistentData")) {
    return store.dispatch(ModalsActions.openModal("project", "new"));
  }

  const persistentData = await loadCompressedJSON("/persistentData");

  if (!persistentData.project) {
    return store.dispatch(ModalsActions.openModal("project", "new"));
  }

  if (await notFound(`/projects/${persistentData.project}`)) {
    if (await notFound("/backups/")) {
      await fs.mkdir("/backups/");
    }

    const backups = await fs.readdir("/backups/");

    if (!backups.length) {
      await store.dispatch(
        ModalsActions.openModal(
          "alert",
          "Could not load last project and no backups found",
        ),
      );
      return store.dispatch(ModalsActions.openModal("project", "load"));
    }

    const confirmed = await store.dispatch(
      ModalsActions.openModal(
        "confirm",
        "Could not load last project. Restore latest backup?",
      ),
    );

    if (confirmed) {
      const lastBackup = backups.at(-1)!.name;
      const projectName = lastBackup.match(/(.+?)_backup/)![1];

      await saveCompressedJSON(`/persistentData`, { project: projectName });
      await fs.rename(`/backups/${lastBackup}`, `/projects/${projectName}`);
      return wakeup();
    } else {
      return store.dispatch(ModalsActions.openModal("project", "load"));
    }
  }

  const data = await loadCompressedJSON(`/projects/${persistentData.project}`);
  try {
    const state = PersistentStateSchema.parse(data);

    await store.dispatch(hydrateState(state));
    store.dispatch(ModalsActions.closeModal());
  } catch {
    await store.dispatch(
      ModalsActions.openModal("alert", "Error parsing the project data"),
    );
    return store.dispatch(ModalsActions.openModal("project", "open"));
  }
}

export default async function initProject() {
  void wakeup().catch(() => {
    store.dispatch(ModalsActions.openModal("critical", "Unrecoverable error"));
  });

  void (async () => {
    if (await notFound("/backups")) return;
    const backups = await fs.readdir("/backups/");
    const regexp = /(.+?)_backup/;
    const byProject = partition(backups, (dirent) =>
      dirent.name.match(regexp) ? dirent.name.match(regexp)![1] : "--",
    );

    for (const project of Object.keys(byProject)) {
      const backups = byProject[project];

      if (backups.length > 5) {
        for (const backup of backups.slice(0, -5)) {
          void fs.remove(`/backups/${backup}`);
        }
      }
    }
  })();

  clearInterval(backupId);
  backupId = setInterval(() => {
    const state = store.getState();
    const persistentState = getPersistentState(state);

    if (ProjectSelectors.getProjectName(state)) {
      void saveCompressedJSON(
        `/backups/${ProjectSelectors.getProjectName(state)}_backup_${Date.now()}`,
        persistentState,
      );
    }
  }, 30_000);
}
