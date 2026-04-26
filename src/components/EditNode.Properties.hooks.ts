import * as React from "react";
import * as THREE from "three";

import {
  useAppDispatch,
  useAppSelector,
  usePreviousValue,
} from "../hooks/hooks.ts";
import { useInvalidateTransformsCache } from "../hooks/nodes.hooks.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions } from "../store/nodes.ts";
import { OptionsSelectors } from "../store/options.ts";
import type { MapNode } from "../types/types.ts";
import { toQuaternion } from "../utilities/math.ts";
import { toNumber, toTuple3 } from "../utilities/utilities.ts";

type UpdateNodeProperties = {
  [key in Exclude<keyof MapNode, "id">]?: MapNode[key];
};

const updateTuple = <T>(tuple: T[], index: number, value: T) =>
  toTuple3(tuple.toSpliced(index, 1, value));

function useUpdateNode(node: MapNode, shouldInvalidate = true) {
  const dispatch = useAppDispatch();
  const invalidate = useInvalidateTransformsCache();

  return React.useCallback(
    (update: UpdateNodeProperties) => {
      if (shouldInvalidate) invalidate([node.id]);
      dispatch(
        NodesActions.updateNode({
          id: node.id,
          ...update,
        }),
      );
    },
    [node, dispatch, invalidate, shouldInvalidate],
  );
}

export function useChangeLabel(node: MapNode) {
  const updateNode = useUpdateNode(node, false);

  return React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateNode({ label: event.target.value });
    },
    [updateNode],
  );
}

export function useChangeParent(selected: string[]) {
  const dispatch = useAppDispatch();

  return React.useCallback(
    () => dispatch(ModalsActions.openModal("update-node-parent", selected)),
    [dispatch, selected],
  );
}

export function useChangePosition(node: MapNode, useLocal: boolean) {
  const wasLocal = usePreviousValue(useLocal);
  const previousRotation = usePreviousValue(node.rotation);
  const updateNode = useUpdateNode(node);

  const [local, setLocal] = React.useState<MapNode["position"]>([0, 0, 0]);
  const [copy, setCopy] = React.useState<MapNode["position"]>([0, 0, 0]);

  React.useEffect(() => {
    if ((useLocal && !wasLocal) || node.rotation !== previousRotation) {
      setCopy(node.position);
      setLocal([0, 0, 0]);
    }
  }, [useLocal, wasLocal, previousRotation, node]);

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

          updateNode({ position: toTuple3(position.toArray()) });
        } else {
          updateNode({ position: updateTuple(node.position, axis, value) });
        }
      },
      [node, updateNode, local, copy, useLocal],
    ),
  ] as const;
}

export function useChangeRotation(node: MapNode, useLocal: boolean) {
  const wasLocal = usePreviousValue(useLocal);
  const updateNode = useUpdateNode(node);

  const [local, setLocal] = React.useState<MapNode["rotation"]>([0, 0, 0]);
  const [copy, setCopy] = React.useState<MapNode["rotation"]>([0, 0, 0]);

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

          updateNode({
            rotation: toTuple3(object.rotation.toArray() as number[]),
          });
        } else {
          updateNode({ rotation: updateTuple(node.rotation, axis, value) });
        }
      },
      [node, updateNode, local, useLocal, copy],
    ),
  ] as const;
}

export function useChangeScale(node: MapNode) {
  const updateNode = useUpdateNode(node);
  const adjustZPosition = useAppSelector(OptionsSelectors.getAdjustZPosition);

  return React.useCallback(
    (axis: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = toNumber(event.target.value);
      const updatedProperties: UpdateNodeProperties = {
        scale: updateTuple(node.scale, axis, value),
      };

      if (adjustZPosition && node.version && node.version >= 2) {
        const rotation = toQuaternion(node.rotation);
        const dHeight = new THREE.Vector3(0, 0, 0)
          .setComponent(axis, value - node.scale[axis])
          .applyQuaternion(rotation);
        updatedProperties.position = updateTuple(
          node.position,
          2,
          node.position[2] + dHeight.z / 2,
        );
      }

      updateNode(updatedProperties);
    },
    [node, updateNode, adjustZPosition],
  );
}
