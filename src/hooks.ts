import * as React from "react";
import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux";

import { NodesActions } from "./store/nodes.ts";
import type { AppDispatch, AppState, MapNode } from "./types.ts";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;

const storageKey = "cp-2077-map-editor";
export function useSyncNodes(
  nodes: MapNode[],
  removals: number[],
  district?: string,
) {
  const dispatch = useAppDispatch();
  const timer = React.useRef<number>(null);

  React.useEffect(() => {
    if (!district) return;

    const data = localStorage.getItem(storageKey);

    if (data) {
      try {
        const parsed = JSON.parse(data);

        if (parsed[district].nodes) {
          dispatch(NodesActions.setNodes(parsed[district].nodes));
        }
        if (parsed[district].removals) {
          dispatch(NodesActions.setRemovals(parsed[district].removals));
        }
      } catch {
        dispatch(NodesActions.setNodes([]));
        dispatch(NodesActions.setRemovals([]));
      }
    }
  }, [district, dispatch]);

  React.useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }

    if (!district) return;

    timer.current = setTimeout(() => {
      const data = localStorage.getItem(storageKey);
      if (data) {
        try {
          const parsed = JSON.parse(data);

          localStorage.setItem(
            storageKey,
            JSON.stringify({
              ...parsed,
              [district]: { nodes, removals },
            }),
          );
        } catch {
          localStorage.setItem(
            storageKey,
            JSON.stringify({ [district]: { nodes, removals } }),
          );
        }
      } else {
        localStorage.setItem(storageKey, JSON.stringify({ [district]: nodes }));
      }
    }, 200);
  }, [district, nodes, removals]);
}

export function usePreviousValue<T>(value: T): T | null {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
