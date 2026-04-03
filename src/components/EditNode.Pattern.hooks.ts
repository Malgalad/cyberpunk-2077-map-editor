import * as React from "react";
import * as THREE from "three";

import { useAppDispatch } from "../hooks/hooks.ts";
import { useInvalidateTransformsCache } from "../hooks/nodes.hooks.ts";
import { NodesActions } from "../store/nodes.ts";
import type { MapNode, Plane, Transform } from "../types/types.ts";
import { toNumber } from "../utilities/utilities.ts";

function useUpdatePattern(node: MapNode) {
  const dispatch = useAppDispatch();
  const invalidate = useInvalidateTransformsCache();

  return React.useCallback(
    (pattern: MapNode["pattern"]) => {
      invalidate([node.id]);
      dispatch(
        NodesActions.updateNode({
          id: node.id,
          pattern,
        }),
      );
    },
    [invalidate, dispatch, node.id],
  );
}

export function useTogglePattern(node: MapNode) {
  const updatePattern = useUpdatePattern(node);

  return React.useCallback(() => {
    const pattern: MapNode["pattern"] = node.pattern
      ? undefined
      : {
          count: 1,
          mirror: null,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [0, 0, 0],
        };

    updatePattern(pattern);
  }, [updatePattern, node.pattern]);
}

export function useChangePatternCount(node: MapNode) {
  const updatePattern = useUpdatePattern(node);

  return React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!node.pattern) return;

      const pattern = {
        ...node.pattern,
        count: Math.floor(toNumber(event.target.value)),
      };

      updatePattern(pattern);
    },
    [node.pattern, updatePattern],
  );
}

export function useChangePatternProperty(node: MapNode) {
  const updatePattern = useUpdatePattern(node);

  return React.useCallback(
    (property: keyof Transform, index: number) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!node.pattern || property === "mirror") return;

        const pattern = {
          ...node.pattern,
          [property]: node.pattern[property].toSpliced(
            index,
            1,
            property === "rotation"
              ? THREE.MathUtils.degToRad(toNumber(event.target.value))
              : toNumber(event.target.value),
          ),
        };

        updatePattern(pattern);
      },
    [node.pattern, updatePattern],
  );
}

export function useChangePatternMirror(node: MapNode) {
  const updatePattern = useUpdatePattern(node);

  return React.useCallback(
    (plane: Plane) => () => {
      if (!node.pattern) return;

      const pattern: MapNode["pattern"] =
        node.pattern.mirror === plane
          ? { ...node.pattern, mirror: null }
          : {
              count: 1,
              mirror: plane,
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [0, 0, 0],
            };

      updatePattern(pattern);
    },
    [node.pattern, updatePattern],
  );
}
