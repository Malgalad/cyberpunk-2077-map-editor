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

export function useFilesList(directory?: string) {
  const [files, setFiles] = React.useState<string[]>([]);

  React.useEffect(() => {
    listFiles(directory)
      .then(setFiles)
      .catch(() => setFiles([]));
  }, [directory]);

  return files;
}
