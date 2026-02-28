import * as React from "react";
import type * as THREE from "three";

import { encodeImageData } from "../map3d/processDDS.ts";
import { getPersistentState } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesSelectors } from "../store/nodesV2.ts";
import { PersistentStateSchema } from "../types/schemas.ts";
import type {
  InstancedMeshTransforms,
  PersistentAppState,
} from "../types/types.ts";
import { unzip, zip } from "../utilities/compression.ts";
import { getFinalDistrictTransformsFromNodes } from "../utilities/district.ts";
import {
  downloadBlob,
  uploadFileByExtensions,
} from "../utilities/fileHelpers.ts";
import { clampTransforms } from "../utilities/transforms.ts";
import { invariant } from "../utilities/utilities.ts";
import { useAppDispatch, useAppSelector } from "./hooks.ts";

export function useDownloadProject() {
  const persistentState = useAppSelector(getPersistentState);

  return React.useCallback(async () => {
    if (!persistentState.project.name) return;

    const data = PersistentStateSchema.encode(persistentState);
    const stream = zip(JSON.stringify(data));
    const blob = await new Response(stream).blob();

    downloadBlob(
      blob,
      `${persistentState.project.name}_${Date.now()}.ncmapedits`,
    );
  }, [persistentState]);
}

export function useUploadProject() {
  return React.useCallback(async (): Promise<
    [string, PersistentAppState] | undefined
  > => {
    const file = await uploadFileByExtensions(".ncmapedits");
    const content = await unzip(file.stream());
    const data = JSON.parse(content);
    const state = PersistentStateSchema.parse(data);

    return [file.name, state];
  }, []);
}

const validateNumber = (number: number, min: number, max: number) =>
  number >= min && number <= max;
const validateVector = (vector: THREE.Vector4Like) =>
  validateNumber(vector.x, 0, 1) &&
  validateNumber(vector.y, 0, 1) &&
  validateNumber(vector.z, 0, 1) &&
  validateNumber(vector.w, 0, 1);
const validateQuaternion = (vector: THREE.QuaternionLike) =>
  validateNumber(vector.x, -1, 1) &&
  validateNumber(vector.y, -1, 1) &&
  validateNumber(vector.z, -1, 1) &&
  validateNumber(vector.w, -1, 1);
const validateTransform = (transform: InstancedMeshTransforms) =>
  validateVector(transform.position) &&
  validateQuaternion(transform.orientation) &&
  validateVector(transform.scale);

// TODO export _m base color texture (?) or use Pacifica
export function useExportDDS() {
  const dispatch = useAppDispatch();
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const tree = useAppSelector(NodesSelectors.getNodesTree);

  return React.useCallback(() => {
    if (!district) return;

    try {
      const transforms = getFinalDistrictTransformsFromNodes(
        district,
        nodes,
        tree,
      );

      invariant(
        district.isCustom ? true : transforms.length <= district.height ** 2,
        "District has too many additions. For compatibility reasons there should not be more additions than deletions.",
      );

      const clampedTransforms = transforms.map(clampTransforms(district));
      invariant(
        clampedTransforms.every(validateTransform),
        "Found transforms outside of district boundaries or too large.",
      );

      const imageData = encodeImageData(clampedTransforms);
      const blob = new Blob([imageData.buffer], { type: "image/dds" });

      const fileName = district.isCustom
        ? `${district.name.replace(/\s+/g, "_")}.dds`
        : district.texture.replace(".xbm", ".dds");
      downloadBlob(blob, fileName);
    } catch (error) {
      if (error instanceof Error) {
        dispatch(ModalsActions.openModal("alert", error.message));
      }
      console.error(error);
    }
  }, [district, nodes, tree, dispatch]);
}
