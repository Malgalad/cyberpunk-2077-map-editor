import * as React from "react";

import { loadFile, saveBlobToFile } from "../helpers.ts";
import { encodeImageData } from "../map3d/processDDS.ts";
import { getDistrictCache, getPersistentState } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesSelectors } from "../store/nodes.ts";
import { PersistentStateSchema } from "../types/schemas.ts";
import type { PersistentAppState } from "../types/types.ts";
import { unzip, zip } from "../utilities/compression.ts";
import { getFinalDistrictTransformsFromNodes } from "../utilities/district.ts";
import { useAppSelector } from "./hooks.ts";

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
