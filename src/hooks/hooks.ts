import * as React from "react";
import { useDispatch, useSelector, useStore } from "react-redux";

import type { AppDispatch, AppState, AppStore } from "../types/types.ts";
import { fs } from "../utilities/opfs.ts";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<AppState>();
export const useAppStore = useStore.withTypes<AppStore>();

export function usePreviousValue<T>(value: T): T | null {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function useForceUpdate() {
  const [, setTick] = React.useState(0);
  return React.useCallback(() => setTick((tick) => tick + 1), []);
}

export function useFilesList(directory: string = "/") {
  const [files, setFiles] = React.useState<string[]>([]);

  React.useEffect(() => {
    fs.readdir(directory)
      .then((dirent) =>
        dirent.filter((dirent) => dirent.isFile).map((dirent) => dirent.name),
      )
      .then(setFiles)
      .catch(() => setFiles([]));
  }, [directory]);

  return files;
}

export function useGlobalShortcuts(
  shortcut?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback?: React.EventHandler<any>,
  disabled?: boolean,
) {
  React.useEffect(() => {
    if (!shortcut) return;

    const listener = (event: KeyboardEvent) => {
      if (disabled) return;

      const sequence = shortcut.split("+");
      const code = sequence.at(-1)!;
      const expectedModifiers = sequence.slice(0, -1);

      if (event.target instanceof HTMLInputElement) return;

      const eventModifiers = ["Alt", "Control", "Meta", "Shift"];

      if (
        event.code === code &&
        eventModifiers.every((modifier) =>
          event.getModifierState(modifier)
            ? expectedModifiers.includes(modifier)
            : !expectedModifiers.includes(modifier),
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
        callback?.(event);
      }
    };

    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [shortcut, callback, disabled]);
}
