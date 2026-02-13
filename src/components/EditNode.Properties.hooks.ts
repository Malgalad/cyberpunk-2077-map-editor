import * as React from "react";
import * as THREE from "three";

import { useAppDispatch, usePreviousValue } from "../hooks/hooks.ts";
import { useInvalidateTransformsCache } from "../hooks/nodes.hooks.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions } from "../store/nodesV2.ts";
import type { MapNodeV2 } from "../types/types.ts";
import { toNumber, toTuple3 } from "../utilities/utilities.ts";

const updateTuple = <T>(tuple: T[], index: number, value: T) =>
  toTuple3(tuple.toSpliced(index, 1, value));

function useUpdateNode(node: MapNodeV2, shouldInvalidate = true) {
  const dispatch = useAppDispatch();
  const invalidate = useInvalidateTransformsCache();

  return React.useCallback(
    <T extends keyof MapNodeV2>(property: T, value: MapNodeV2[T]) => {
      if (shouldInvalidate) invalidate([node.id]);
      dispatch(
        NodesActions.updateNode({
          id: node.id,
          [property]: value,
        }),
      );
    },
    [node.id, dispatch, invalidate, shouldInvalidate],
  );
}

export function useChangeLabel(node: MapNodeV2) {
  const updateNode = useUpdateNode(node, false);

  return React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateNode("label", event.target.value);
    },
    [updateNode],
  );
}

export function useChangeParent() {
  const dispatch = useAppDispatch();

  return React.useCallback(
    () => dispatch(ModalsActions.openModal("update-node-parent")),
    [dispatch],
  );
}

export function useChangePosition(node: MapNodeV2, useLocal: boolean) {
  const wasLocal = usePreviousValue(useLocal);
  const updateNode = useUpdateNode(node);

  const [local, setLocal] = React.useState<MapNodeV2["position"]>([0, 0, 0]);
  const [copy, setCopy] = React.useState<MapNodeV2["position"]>([0, 0, 0]);

  React.useEffect(() => {
    if (useLocal && !wasLocal) {
      setCopy(node.position);
      setLocal([0, 0, 0]);
    }
  }, [useLocal, wasLocal, node]);

  return [
    useLocal ? local : node.position,
    React.useCallback(
      (axis: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = toNumber(event.target.value);
        if (useLocal) {
          const newLocal = updateTuple(local, axis, value);

          setLocal(newLocal);

          const position = new THREE.Vector3()
            .fromArray(copy)
            .add(
              new THREE.Vector3()
                .fromArray(newLocal)
                .applyEuler(new THREE.Euler().fromArray(node.rotation)),
            );

          updateNode("position", toTuple3(position.toArray()));
        } else {
          updateNode("position", updateTuple(node.position, axis, value));
        }
      },
      [node, updateNode, local, copy, useLocal],
    ),
  ] as const;
}

export function useChangeRotation(node: MapNodeV2, useLocal: boolean) {
  const wasLocal = usePreviousValue(useLocal);
  const updateNode = useUpdateNode(node);

  const [local, setLocal] = React.useState<MapNodeV2["rotation"]>([0, 0, 0]);
  const [copy, setCopy] = React.useState<MapNodeV2["rotation"]>([0, 0, 0]);

  React.useEffect(() => {
    if (useLocal && !wasLocal) {
      setCopy(node.rotation);
      setLocal([0, 0, 0]);
    }
  }, [useLocal, wasLocal, node]);

  return [
    useLocal ? local : node.rotation,
    React.useCallback(
      (axis: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = THREE.MathUtils.degToRad(toNumber(event.target.value));
        if (useLocal) {
          const newLocal = updateTuple(local, axis, value);

          setLocal(newLocal);

          const object = new THREE.Object3D();
          object.rotation.fromArray(copy);
          object.rotateOnAxis(
            new THREE.Vector3().fromArray([0, 0, 0].toSpliced(axis, 1, 1)),
            value,
          );

          updateNode(
            "rotation",
            toTuple3(object.rotation.toArray() as number[]),
          );
        } else {
          updateNode("rotation", updateTuple(node.rotation, axis, value));
        }
      },
      [node, updateNode, local, useLocal, copy],
    ),
  ] as const;
}

export function useChangeScale(node: MapNodeV2) {
  const updateNode = useUpdateNode(node);

  return React.useCallback(
    (axis: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = toNumber(event.target.value);
      updateNode("scale", updateTuple(node.scale, axis, value));
    },
    [node, updateNode],
  );
}
