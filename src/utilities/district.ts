import { DEFAULT_TRANSFORM, DISTRICT_LABELS } from "../constants.ts";
import type {
  ComputedDistrictProperties,
  DefaultDistrictNames,
  District,
  DistrictProperties,
  InstancedMeshTransforms,
  NodesMap,
  NodesTree,
} from "../types/types.ts";
import { projectNodesToDistrict } from "./transforms.ts";
import { invariant } from "./utilities.ts";

export const getDistrictName = (district: DistrictProperties) =>
  district.isCustom
    ? district.name
    : DISTRICT_LABELS[district.name as DefaultDistrictNames];

export const computeDistrictProperties = (
  district: DistrictProperties,
  count: number,
): ComputedDistrictProperties => {
  const minMax = {
    x: district.transMax[0] - district.transMin[0],
    y: district.transMax[1] - district.transMin[1],
    z: district.transMax[2] - district.transMin[2],
  };
  const origin = {
    x: district.position[0] + district.transMin[0],
    y: district.position[1] + district.transMin[1],
    z: district.position[2] + district.transMin[2],
  };

  return {
    minMax,
    origin,
    height: calculateHeight(count),
  };
};

export const immutableDistrictTransforms = new Map<
  string,
  InstancedMeshTransforms[]
>();

const isVisible = ({ scale: { x, y, z, w } }: InstancedMeshTransforms) =>
  !((x === 0 && y === 0 && z === 0) || w === 0);
export function getFinalDistrictTransformsFromNodes(
  district: District,
  nodes: NodesMap,
  tree: NodesTree,
): InstancedMeshTransforms[] {
  const baseTransforms = immutableDistrictTransforms.get(district.name) ?? [];
  const treeNode = tree[district.name];

  if (!treeNode) return baseTransforms;

  invariant(
    treeNode.type === "district",
    "District tree must have a district type.",
  );
  const additions = projectNodesToDistrict(district, nodes, treeNode.create);
  const updates = projectNodesToDistrict(district, nodes, treeNode.update);
  const deletions = projectNodesToDistrict(district, nodes, treeNode.delete);

  const visibleAdditions = additions.filter(isVisible);
  const visibleUpdatesMap = new Map(
    updates.filter(isVisible).map((transform) => [transform.index, transform]),
  );
  const visibleDeletionsSet = new Set(
    deletions.filter(isVisible).map((transform) => transform.index),
  );
  const districtTransforms: InstancedMeshTransforms[] = [];

  for (let index = 0; index < baseTransforms.length; index++) {
    const transform = baseTransforms[index];

    if (visibleDeletionsSet.has(index)) continue;
    if (visibleUpdatesMap.has(index)) {
      districtTransforms.push(visibleUpdatesMap.get(index)!);
      continue;
    }
    districtTransforms.push(transform);
  }

  const result = [...districtTransforms, ...visibleAdditions];
  let padding = 0;

  if (district.isCustom) {
    // Pad custom district with empty transforms so that all blocks are rendered
    padding = padHeight(result.length, calculateHeight(result.length));
  } else {
    const difference = result.length - baseTransforms.length;

    if (difference < 0) {
      // Maintain the same transforms length so that height does not change
      padding = Math.abs(difference);
    }
  }

  result.unshift(...Array(padding).fill(DEFAULT_TRANSFORM));

  return result;
}

export function calculateHeight(length: number): number {
  return Math.ceil(Math.sqrt(length));
}

export function padHeight(length: number, height: number) {
  if (calculateHeight(length + height) === height) return height;
  return padHeight(length + height, calculateHeight(length + height));
}
