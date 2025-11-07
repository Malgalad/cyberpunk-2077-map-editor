import * as React from "react";

import { loadFile, saveBlobToFile } from "../helpers.ts";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { encodeImageData } from "../map3d/processDDS.ts";
import { getDistrictCache, getPersistentState } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import { ProjectSelectors } from "../store/project.ts";
import { NodeSchema, PersistentStateSchema } from "../types/schemas.ts";
import type { MapNode, PersistentAppState } from "../types/types.ts";
import { unzip, zip } from "../utilities/compression.ts";
import { getFinalDistrictTransformsFromNodes } from "../utilities/district.ts";

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

export function useLoadProject() {
  return React.useCallback(async (): Promise<
    [string, PersistentAppState] | undefined
  > => {
    const file = await loadFile(".ncmapedits");
    const content = await unzip(file.stream());
    const data = JSON.parse(content);
    const state = PersistentStateSchema.parse(data);

    return [file.name, state];
  }, []);
}

export function useImportNodes() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(NodesSelectors.getNodes);

  return React.useCallback(async () => {
    const file = await loadFile(".json");
    const content = await file.text();
    const data = JSON.parse(content);
    const parsed: MapNode[] = [];

    for (const maybeNode of data) {
      maybeNode.tag ||= "create";
      parsed.push(NodeSchema.parse(maybeNode));
    }

    const merged = new Map(nodes.map((node) => [node.id, node]));

    for (const node of parsed) {
      merged.set(node.id, node);
    }

    dispatch(NodesActions.replaceNodes([...merged.values()]));
  }, [nodes, dispatch]);
}

export function useExportNodes() {
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const project = useAppSelector(ProjectSelectors.getProjectName);

  return React.useCallback(async () => {
    const json = JSON.stringify(nodes, null, 2);
    const blob = new Blob([json], { type: "application/json" });

    saveBlobToFile(blob, `${project}_nodes.json`);
  }, [nodes, project]);
}

// TODO export _m base color texture (?) or use Pacifica
export function useExportDDS() {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const cache = useAppSelector(getDistrictCache);

  return React.useCallback(() => {
    if (!district) return;

    const data = getFinalDistrictTransformsFromNodes(nodes, district, cache);
    const imageData = encodeImageData(data);
    const blob = new Blob([imageData.buffer], { type: "image/dds" });

    saveBlobToFile(blob, `${district.name}.dds`);
  }, [district, nodes, cache]);
}
