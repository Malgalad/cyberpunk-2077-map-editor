import * as React from "react";
import { useDispatch, useSelector, useStore } from "react-redux";

import { listFiles } from "./opfs.ts";
import type { AppDispatch, AppState, AppStore } from "./types/types.ts";

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
  return () => setTick((tick) => tick + 1);
}

export function useFilesList(directory?: string) {
  const [files, setFiles] = React.useState<string[]>([]);

  React.useEffect(() => {
    listFiles(directory)
      .then(setFiles)
      .catch(() => setFiles([]));
  }, [directory]);

  return files;
}

export function useGlobalShortcuts(
  shortcut?: string | ((event: KeyboardEvent) => boolean),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback?: React.EventHandler<any>,
  disabled?: boolean,
) {
  React.useEffect(() => {
    if (!shortcut) return;

    const listener = (event: KeyboardEvent) => {
      if (disabled) return;
      if (event.target instanceof HTMLInputElement) return;

      event.preventDefault();
      event.stopPropagation();

      if (typeof shortcut === "string") {
        if (event.key !== shortcut) return;
      }

      if (typeof shortcut === "function") {
        if (!shortcut(event)) return;
      }

      callback?.(event);
    };

    document.addEventListener("keyup", listener);

    return () => {
      document.removeEventListener("keyup", listener);
    };
  }, [shortcut, callback, disabled]);
}
