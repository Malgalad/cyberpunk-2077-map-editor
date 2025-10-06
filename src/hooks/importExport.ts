import * as React from "react";

import { loadFileAsText, saveBlobToFile } from "../helpers.ts";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { encodeImageData } from "../map3d/processDDS.ts";
import { getDistrictInstancedMeshTransforms } from "../store/district.selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { getNodesInstancedMeshTransforms } from "../store/nodes.selectors.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";

export function useLoadJSON() {
  const dispatch = useAppDispatch();
  const district = useAppSelector(DistrictSelectors.getDistrict);

  return React.useCallback(async () => {
    if (!district) return;
    const content = await loadFileAsText(".json");
    try {
      const data = JSON.parse(content);

      if (!data[district]) {
        // noinspection ExceptionCaughtLocallyJS
        throw new Error("File does not contain data for this district");
      }

      if (
        !(
          Array.isArray(data[district].nodes) &&
          Array.isArray(data[district].removals)
        )
      ) {
        // noinspection ExceptionCaughtLocallyJS
        throw new Error(
          "Invalid data format. Expected arrays of nodes and removals",
        );
      }

      dispatch(NodesActions.setNodes(data[district].nodes));
      dispatch(NodesActions.setRemovals(data[district].removals));
    } catch (error: unknown) {
      dispatch(
        ModalsActions.openModal(
          "alert",
          error instanceof SyntaxError
            ? "Failed to parse JSON file"
            : error instanceof Error
              ? error.message
              : "Unknown error",
        ),
      );
    }
  }, [dispatch, district]);
}

export function useSaveJSON() {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const removals = useAppSelector(NodesSelectors.getRemovals);

  return React.useCallback(() => {
    if (!district) return;

    const blob = new Blob(
      [JSON.stringify({ [district]: { nodes, removals } })],
      {
        type: "application/json",
      },
    );
    saveBlobToFile(blob, `${district}.json`);
  }, [district, nodes, removals]);
}

export function useExportDDS() {
  const districtData = useAppSelector(DistrictSelectors.getDistrictData);
  const districtInstancedMeshTransforms = useAppSelector(
    getDistrictInstancedMeshTransforms,
  );
  const nodesInstancedMeshTransforms = useAppSelector(
    getNodesInstancedMeshTransforms,
  );

  return React.useCallback(() => {
    if (!districtData) return;
    const data = [
      ...districtInstancedMeshTransforms.filter(
        (instance) =>
          instance.scale.x !== 0 &&
          instance.scale.y !== 0 &&
          instance.scale.z !== 0,
      ),
      ...nodesInstancedMeshTransforms,
    ];
    const imageData = encodeImageData(data);
    const blob = new Blob([imageData.buffer], { type: "image/dds" });

    saveBlobToFile(blob, `${districtData.name}.dds`);
  }, [
    districtData,
    districtInstancedMeshTransforms,
    nodesInstancedMeshTransforms,
  ]);
}
