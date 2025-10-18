import { produce } from "immer";
import * as React from "react";

import { DEFAULT_DISTRICT_DATA } from "../constants.ts";
import { loadFile, saveBlobToFile } from "../helpers.ts";
import { useAppSelector } from "../hooks.ts";
import { encodeImageData } from "../map3d/processDDS.ts";
import { getInitialState, getPersistentState } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { getNodesInstancedMeshTransforms } from "../store/nodes.selectors.ts";
import { NodesSelectors } from "../store/nodes.ts";
import type { PersistentAppState } from "../types.ts";
import {
  getDistrictInstancedMeshTransforms,
  unzip,
  zip,
} from "../utilities.ts";
import {
  PersistentStateV1Schema,
  PersistentStateV2Schema,
} from "./importExport.schemas.ts";

export function useSaveProject() {
  const persistentState = useAppSelector(getPersistentState);

  return React.useCallback(async () => {
    if (!persistentState.project.name) return;

    const data = PersistentStateV2Schema.encode(persistentState);
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

    if (!data.project?.version) {
      // assume v1
      const stateV1 = PersistentStateV1Schema.decode(data);

      return [
        file.name,
        produce(getInitialState(undefined), (draft) => {
          for (const [name, value] of Object.entries(stateV1)) {
            const { district, nodes, removals } = value;

            draft.nodes.nodes.push(...nodes);
            draft.nodes.removals.push(...removals);
            draft.district.districts.push(...DEFAULT_DISTRICT_DATA);

            const index = draft.district.districts.findIndex(
              (district) => district.name === name,
            );

            if (index === -1) {
              draft.district.districts.push(district);
            } else {
              draft.district.districts.splice(index, 1, district);
            }
          }
        }),
      ];
    } else if (data.project?.version === 2) {
      return [file.name, PersistentStateV2Schema.decode(data)];
    }
  }, []);
}

// TODO export _m base color texture (?) or use Pacifica
export function useExportDDS() {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const removals = useAppSelector(NodesSelectors.getRemovals);
  const nodesInstancedMeshTransforms = useAppSelector(
    getNodesInstancedMeshTransforms,
  );

  return React.useCallback(async () => {
    if (!district) return;

    const districtInstancedMeshTransforms =
      await getDistrictInstancedMeshTransforms(district);
    const data = [
      ...districtInstancedMeshTransforms.filter(
        (_, index) => !removals.includes(index),
      ),
      ...nodesInstancedMeshTransforms,
    ];
    const imageData = encodeImageData(data);
    const blob = new Blob([imageData.buffer], { type: "image/dds" });

    saveBlobToFile(blob, `${district.name}.dds`);
  }, [district, removals, nodesInstancedMeshTransforms]);
}

/*
export function useImportDDS() {
  const dispatch = useAppDispatch();
  const district = useAppSelector(DistrictSelectors.getDistrict);

  return React.useCallback(async () => {
    if (!district) return;

    const file = await loadFile(".dds");
    const imageData = await file.arrayBuffer();
    const data = {
      ...district,
      isCustom: false,
      texture: file.name,
      imageData,
    } satisfies DistrictData as DistrictData;
    dispatch(DistrictActions.setDistrict(data));
  }, [dispatch, district]);
}
*/
