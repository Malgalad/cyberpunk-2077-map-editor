import * as React from "react";
import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux";

import { listFiles } from "./opfs.ts";
import type { AppDispatch, AppState } from "./types.ts";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;

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
