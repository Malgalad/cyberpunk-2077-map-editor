import { ModalsActions } from "../store/modals.ts";
import store from "../store/store.ts";
import { unzip, zip } from "./compression.ts";

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

async function resolvePath(
  parent: FileSystemDirectoryHandle,
  path: string[],
  create = false,
) {
  if (path.length === 0) return parent;
  const [name, ...rest] = path;
  try {
    const handle = await parent.getDirectoryHandle(name, { create });
    return resolvePath(handle, rest, create);
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "NotFoundError" &&
      create &&
      rest.length === 0
    ) {
      return parent.getFileHandle(name, { create });
    }
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
  const parent = await resolvePath(root, path, false);

  if (parent.kind === "file")
    throw new DOMException(
      "Parent entry is not a directory",
      "TypeMismatchError",
    );

  for await (const filename of parent.keys()) {
    files.push(filename);
  }

  return files;
}

export async function loadFileAsJSON(pathname: string) {
  const path = pathname.split("/").filter(Boolean);
  if (!path.length) return;

  const parent = await resolvePath(root, path.slice(0, -1), false);

  if (parent.kind === "file")
    throw new DOMException(
      "Parent entry is not a directory",
      "TypeMismatchError",
    );

  const handle = await parent.getFileHandle(path.at(-1)!, { create: false });
  const file = await handle.getFile();
  const data = await unzip(file.stream());

  return JSON.parse(data);
}

export async function saveJSONToFile(pathname: string, data: unknown) {
  const path = pathname.split("/").filter(Boolean);
  if (!path.length) return;

  const parent = await resolvePath(root, path.slice(0, -1), true);

  if (parent.kind === "file")
    throw new DOMException(
      "Parent entry is not a directory",
      "TypeMismatchError",
    );

  const handle = await parent.getFileHandle(path.at(-1)!, { create: true });
  const stream = await handle.createWritable();
  const json = JSON.stringify(data);

  await zip(json).pipeTo(stream);
}

export async function removeFileOrDirectory(pathname: string) {
  const path = pathname.split("/").filter(Boolean);
  if (!path.length) return;

  const parent = await resolvePath(root, path.slice(0, -1), false);

  if (parent.kind === "file")
    throw new DOMException(
      "Parent entry is not a directory",
      "TypeMismatchError",
    );

  await parent.removeEntry(path.at(-1)!);
}

export async function moveFile(from: string, to: string) {
  const fromPath = from.split("/").filter(Boolean);
  const toPath = to.split("/").filter(Boolean);

  const fromHandle = await resolvePath(root, fromPath, false);
  const toHandle = await resolvePath(root, toPath, true);

  if (fromHandle.kind === "directory")
    throw new DOMException("From is not a file", "TypeMismatchError");
  if (toHandle.kind === "directory")
    throw new DOMException("To is not a file", "TypeMismatchError");

  const output = await toHandle.createWritable();
  const input = await fromHandle.getFile().then((file) => file.stream());

  await input.pipeTo(output);
}

async function nuke() {
  await removeFileOrDirectory("persistentData");
}

Object.defineProperties(window, {
  $opfs: {
    enumerable: false,
    configurable: false,
    writable: false,
    value: {
      listFiles,
      loadFileAsJSON,
      saveJSONToFile,
      removeFileOrDirectory,
      moveFile,
      nuke,
    },
  },
});
