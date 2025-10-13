import * as React from "react";
import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux";

import type { AppDispatch, AppState } from "./types.ts";
import { unzip, zip } from "./utilities.ts";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;

export function usePreviousValue<T>(value: T): T | null {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function useFS() {
  const [root, setRoot] = React.useState<FileSystemDirectoryHandle | null>(
    null,
  );
  const loadJSON = React.useCallback(
    async (name: string) => {
      if (!root) return;
      const handle = await root.getFileHandle(name, { create: false });
      const file = await handle.getFile();
      return JSON.parse(await unzip(file.stream()));
    },
    [root],
  );
  const saveJSON = React.useCallback(
    async (name: string, data: unknown) => {
      if (!root) return;
      const handle = await root.getFileHandle(name, { create: true });
      const stream = await handle.createWritable();
      await stream.write(await zip(JSON.stringify(data)));
      await stream.close();
    },
    [root],
  );

  React.useEffect(() => {
    navigator.storage.getDirectory().then(setRoot);
  }, []);

  return [loadJSON, saveJSON] as const;
}
