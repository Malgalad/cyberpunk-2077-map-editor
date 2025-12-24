import * as React from "react";

import { loadFile, saveBlobToFile } from "../helpers.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { decodeImageData, encodeImageData } from "../map3d/processDDS.ts";
import { getDistrictCache, getPersistentState } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesSelectors } from "../store/nodes.ts";
import { PersistentStateSchema } from "../types/schemas.ts";
import type { PersistentAppState } from "../types/types.ts";
import { unzip, zip } from "../utilities/compression.ts";
import { getFinalDistrictTransformsFromNodes } from "../utilities/district.ts";
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
  const dispatch = useAppDispatch();
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const cache = useAppSelector(getDistrictCache);

  return React.useCallback(() => {
    if (!district) return;

    try {
      const data = getFinalDistrictTransformsFromNodes(nodes, district, cache);
      const imageData = encodeImageData(data, district.isCustom);
      const blob = new Blob([imageData.buffer], { type: "image/dds" });

      saveBlobToFile(blob, `${district.name}.dds`);
    } catch (error) {
      if (error instanceof Error) {
        dispatch(ModalsActions.openModal("alert", error.message));
      }
      console.error(error);
    }
  }, [district, nodes, cache, dispatch]);
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
