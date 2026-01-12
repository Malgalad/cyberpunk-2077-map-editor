import * as React from "react";
import * as THREE from "three";

import { KNOWN_MESHES } from "../constants.ts";
import { loadFile, saveBlobToFile } from "../helpers.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { decodeImageData, encodeImageData } from "../map3d/processDDS.ts";
import { getPersistentState } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesSelectors } from "../store/nodesV2.ts";
import { PersistentStateSchema } from "../types/schemas.ts";
import type { MapNode, NodesMap, PersistentAppState } from "../types/types.ts";
import { unzip, zip } from "../utilities/compression.ts";
import {
  calculateHeight,
  getFinalDistrictTransformsFromNodes,
} from "../utilities/district.ts";
import { getNodeDistrict } from "../utilities/nodes.ts";
import { toNumber, toTuple3 } from "../utilities/utilities.ts";
import { useAppDispatch, useAppSelector } from "./hooks.ts";

export function useSaveProject() {
  const persistentState = useAppSelector(getPersistentState);

  return React.useCallback(async () => {
    if (!persistentState.project.name) return;

    const data = PersistentStateSchema.encode(persistentState);
    const stream = zip(JSON.stringify(data));
    const blob = await new Response(stream).blob();

    saveBlobToFile(
      blob,
      `${persistentState.project.name}_${Date.now()}.ncmapedits`,
    );
  }, [persistentState]);
}

const reviveNodes = (nodes: MapNode[]): NodesMap => {
  const revivedNodes: NodesMap = {};

  for (const node of nodes) {
    revivedNodes[node.id] = {
      id: node.id,
      label: node.label,
      type: node.type,
      tag: node.tag,
      parent: node.parent === node.district ? null : node.parent,
      district: node.district ? node.district : getNodeDistrict(nodes, node),
      hidden: node.hidden ?? false,
      indexInDistrict: node.index ?? -1,
      position: toTuple3(node.position.map(toNumber)),
      rotation: toTuple3(
        node.rotation.map(toNumber).map(THREE.MathUtils.degToRad),
      ),
      scale: toTuple3(node.scale.map(toNumber)),
      mirror: null,
      pattern: node.pattern
        ? {
            count: node.pattern.count,
            mirror: node.pattern.mirror ?? null,
            position: toTuple3(node.pattern.position.map(toNumber)),
            rotation: toTuple3(
              node.pattern.rotation.map(toNumber).map(THREE.MathUtils.degToRad),
            ),
            scale: toTuple3(node.pattern.scale.map(toNumber)),
          }
        : undefined,
    };
  }

  return revivedNodes;
};

export function useLoadProject() {
  return React.useCallback(async (): Promise<
    [string, PersistentAppState] | undefined
  > => {
    const file = await loadFile(".ncmapedits");
    const content = await unzip(file.stream());
    const data = JSON.parse(content);
    if (data.nodes.nodes[0].indexInDistrict === undefined) {
      data.nodes.nodes = reviveNodes(data.nodes.nodes);
      data.nodes.selected = [data.nodes.editingId].filter(Boolean).flat();
    }
    if (!data.options.visibleMeshes) {
      data.options.visibleMeshes = KNOWN_MESHES;
    }
    const state = PersistentStateSchema.parse(data);

    return [file.name, state];
  }, []);
}

// TODO export _m base color texture (?) or use Pacifica
export function useExportDDS() {
  const dispatch = useAppDispatch();
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const tree = useAppSelector(NodesSelectors.getNodesTree);

  return React.useCallback(() => {
    if (!district) return;

    try {
      const data = getFinalDistrictTransformsFromNodes(district, nodes, tree);
      // TODO add validation (every transform [0..1])
      if (!district.isCustom && calculateHeight(data.length) > district.height)
        throw new Error(
          "Total number of transforms is larger than the original. For compatibility reasons the transforms count should be the same.",
        );
      const imageData = encodeImageData(data);
      const blob = new Blob([imageData.buffer], { type: "image/dds" });

      const fileName = district.isCustom
        ? `${district.name.replace(/\s+/g, "_")}.dds`
        : district.texture.replace(".xbm", ".dds");
      saveBlobToFile(blob, fileName);
    } catch (error) {
      if (error instanceof Error) {
        dispatch(ModalsActions.openModal("alert", error.message));
      }
      console.error(error);
    }
  }, [district, nodes, tree, dispatch]);
}

export function useImportDDS() {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const map3d = useMap3D();

  return React.useCallback(async () => {
    if (!map3d || !district) return;

    const file = await loadFile(".dds");
    const arrayBuffer = await file.arrayBuffer();
    const transforms = decodeImageData(new Uint16Array(arrayBuffer));

    map3d.reset();
    map3d.setVisibleDistricts([
      {
        district,
        transforms,
      },
    ]);
  }, [map3d, district]);
}
