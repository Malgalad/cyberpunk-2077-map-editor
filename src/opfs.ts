import { ModalsActions } from "./store/modals.ts";
import store from "./store/store.ts";
import { unzip, zip } from "./utilities/compression.ts";

let root: FileSystemDirectoryHandle;

try {
  root = await window.navigator.storage.getDirectory();
} catch (error) {
  if (!("storage" in navigator) || !("getDirectory" in navigator.storage)) {
    store.dispatch(
      ModalsActions.openModal(
        "critical",
        "Your browser doesn't support the File System Access API",
      ),
    );
  } else if (error instanceof DOMException && error.name === "SecurityError") {
    store.dispatch(
      ModalsActions.openModal(
        "critical",
        "Access to the File System is blocked",
      ),
    );
  }
}

async function resolve(
  parent: FileSystemDirectoryHandle,
  path: string[],
  create = false,
) {
  if (path.length === 0) return parent;
  const [name, ...rest] = path;
  try {
    const handle = await parent.getDirectoryHandle(name, { create });
    return resolve(handle, rest);
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "TypeMismatchError" &&
      rest.length === 0
    ) {
      return parent.getFileHandle(name, { create });
    }

    throw error;
  }
}

export async function listFiles(pathname: string = "") {
  const files: string[] = [];
  const path = pathname.split("/").filter(Boolean);
  const parent = await resolve(root, path, false);

  if (parent.kind === "file")
    throw new DOMException("Not a directory", "TypeMismatchError");

  for await (const filename of parent.keys()) {
    files.push(filename);
  }

  return files;
}

export async function loadJSON(pathname: string) {
  const path = pathname.split("/").filter(Boolean);
  if (!path.length) return;

  const parent = await resolve(root, path.slice(0, -1), false);

  if (parent.kind === "file")
    throw new DOMException("Not a directory", "TypeMismatchError");

  const handle = await parent.getFileHandle(path.at(-1)!, { create: false });
  const file = await handle.getFile();

  return JSON.parse(await unzip(file.stream()));
}

export async function saveJSON(pathname: string, data: unknown) {
  const path = pathname.split("/").filter(Boolean);
  if (!path.length) return;

  const parent = await resolve(root, path.slice(0, -1), true);

  if (parent.kind === "file")
    throw new DOMException("Not a directory", "TypeMismatchError");

  const handle = await parent.getFileHandle(path.at(-1)!, { create: true });
  const stream = await handle.createWritable();
  await zip(JSON.stringify(data)).pipeTo(stream);
}

export async function removeEntry(pathname: string) {
  const path = pathname.split("/").filter(Boolean);
  if (!path.length) return;

  const parent = await resolve(root, path.slice(0, -1), false);

  if (parent.kind === "file")
    throw new DOMException("Not a directory", "TypeMismatchError");

  await parent.removeEntry(path.at(-1)!);
}

Object.defineProperties(window, {
  $opfs: {
    enumerable: false,
    configurable: false,
    writable: false,
    value: {
      listFiles,
      loadJSON,
      saveJSON,
      removeEntry,
    },
  },
});
