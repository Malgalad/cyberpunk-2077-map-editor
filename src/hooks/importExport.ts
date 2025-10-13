import * as React from "react";
import * as z from "zod";

import { loadFile, loadURLAsArrayBuffer, saveBlobToFile } from "../helpers.ts";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { STATIC_ASSETS } from "../map3d/constants.ts";
import { encodeImageData } from "../map3d/processDDS.ts";
import { getDistrictInstancedMeshTransforms } from "../store/district.selectors.ts";
import { DistrictActions, DistrictSelectors } from "../store/district.ts";
import { getNodesInstancedMeshTransforms } from "../store/nodes.selectors.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { DistrictData } from "../types.ts";
import { unzip, zip } from "../utilities.ts";

const ProjectSchema = z.record(
  z.string(),
  z.object({
    district: z.intersection(
      z.object({
        name: z.string(),
        position: z.array(z.number()),
        orientation: z.array(z.number()),
        transMin: z.array(z.number()),
        transMax: z.array(z.number()),
        cubeSize: z.number(),
      }),
      z.discriminatedUnion("isCustom", [
        z.object({
          isCustom: z.literal(true),
        }),
        z.object({
          isCustom: z.literal(false),
          texture: z.string(),
          imageData: z.any(),
        }),
      ]),
    ),
    nodes: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z.union([z.literal("group"), z.literal("instance")]),
        parent: z.string(),
        virtual: z.boolean().optional(),
        position: z.tuple([z.string(), z.string(), z.string()]),
        rotation: z.tuple([z.string(), z.string(), z.string()]),
        scale: z.tuple([z.string(), z.string(), z.string()]),
        pattern: z
          .object({
            enabled: z.boolean(),
            count: z.number(),
            position: z.tuple([z.string(), z.string(), z.string()]),
            rotation: z.tuple([z.string(), z.string(), z.string()]),
            scale: z.tuple([z.string(), z.string(), z.string()]),
          })
          .optional(),
      }),
    ),
    removals: z.array(z.number()),
  }),
);

export function useSaveProject() {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const removals = useAppSelector(NodesSelectors.getRemovals);

  return React.useCallback(async () => {
    if (!district) return;

    const data = ProjectSchema.encode({
      [district.name]: { district, nodes, removals },
    });
    const blob = await zip(JSON.stringify(data));

    saveBlobToFile(blob, `${district.name}-${Date.now()}.ncmapedits`);
  }, [district, nodes, removals]);
}

export function useLoadProject() {
  const dispatch = useAppDispatch();

  return React.useCallback(async () => {
    const file = await loadFile(".ncmapedits");
    const content = await unzip(file.stream());
    const project = ProjectSchema.parse(JSON.parse(content));
    const districts = Object.values(project);

    if (districts.length === 1) {
      const { district, nodes, removals } = districts[0];

      if (!district.isCustom) {
        district.imageData = await loadURLAsArrayBuffer(
          `${STATIC_ASSETS}/textures/${district.texture.replace(".xbm", ".dds")}`,
        );
      }

      dispatch(DistrictActions.setDistrict(district));
      dispatch(NodesActions.setNodes(nodes));
      dispatch(NodesActions.setRemovals(removals));
    }
  }, [dispatch]);
}

// TODO export _m base color texture (?) or use Pacifica
export function useExportDDS() {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const districtInstancedMeshTransforms = useAppSelector(
    getDistrictInstancedMeshTransforms,
  );
  const nodesInstancedMeshTransforms = useAppSelector(
    getNodesInstancedMeshTransforms,
  );

  return React.useCallback(() => {
    if (!district) return;
    const data = [
      ...districtInstancedMeshTransforms.filter((instance) => !instance.hidden),
      ...nodesInstancedMeshTransforms,
    ];
    const imageData = encodeImageData(data);
    const blob = new Blob([imageData.buffer], { type: "image/dds" });

    saveBlobToFile(blob, `${district.name}.dds`);
  }, [district, districtInstancedMeshTransforms, nodesInstancedMeshTransforms]);
}

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
