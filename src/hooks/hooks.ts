import * as React from "react";
import { useDispatch, useSelector, useStore } from "react-redux";

import { MARKER_ID } from "../constants.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions } from "../store/nodes.ts";
import type {
  AppDispatch,
  AppState,
  AppStore,
  NodesMap,
} from "../types/types.ts";
import { initNode } from "../utilities/nodes.ts";
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

export function useConnectToServer() {
  const dispatch = useAppDispatch();
  const [eventSource, setEventSource] = React.useState<EventSource | null>(
    null,
  );
  const connected = React.useRef(false);

  React.useEffect(() => {
    if (!eventSource) return;
    eventSource.addEventListener("connect", (event) => {
      if (event.data === "OK" && !connected.current) {
        connected.current = true;
        dispatch(ModalsActions.openModal("alert", "Connected to server!"));
      }
    });
    eventSource.addEventListener("addMarker", (event) => {
      const markers = JSON.parse(event.data) as number[][];
      if (!markers.length) return;

      const nodesToUpsert: NodesMap = {};
      for (const marker of markers) {
        const [x, y, z] = marker;

        const node = initNode({
          type: "instance",
          tag: "create",
          district: MARKER_ID,
          position: [x, y, z + 0.83],
          scale: [1, 1, 1],
          parent: null,
        });
        nodesToUpsert[node.id] = node;
      }
      dispatch(NodesActions.batchUpsertNodes(nodesToUpsert));
    });

    return () => {
      eventSource.close();
    };
  }, [eventSource, dispatch]);

  return React.useCallback(async () => {
    const maybeId = await dispatch(
      ModalsActions.openModal("connect-to-server"),
    );
    if (!maybeId) return;
    const id = maybeId as string;
    const eventSource = new EventSource(
      "https://cyberpunk.moonbee.eu/connect?id=" + id,
    );
    setEventSource(eventSource);
  }, [dispatch]);
}
