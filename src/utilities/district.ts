import type {
  District,
  DistrictData,
  DistrictProperties,
  GroupNodeCache,
  InstancedMeshTransforms,
  MapNode,
} from "../types/types.ts";
import { projectNodesToDistrict } from "./transforms.ts";

export const getDistrictProperties = (
  district: DistrictData,
): DistrictProperties => {
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
  const center = {
    x: origin.x + minMax.x / 2,
    y: origin.y + minMax.y / 2,
    z: origin.z + minMax.z / 2,
  };

  return {
    center,
    minMax,
    origin,
  };
};

export function getFinalDistrictTransformsFromNodes(
  nodes: MapNode[],
  cache: GroupNodeCache,
  district: District,
): InstancedMeshTransforms[] {
  const cachedDistrict = cache[district.name];

  if (!cachedDistrict) return district.transforms;

  const districtNodeIds = new Set([...cachedDistrict.i, ...cachedDistrict.g]);
  const additions: MapNode[] = [];
  const updates: MapNode[] = [];
  const deletions = new Set<string>();

  for (const node of nodes) {
    if (!districtNodeIds.has(node.id)) continue;
    if (node.tag === "create") {
      additions.push(node);
    } else if (node.tag === "update") {
      updates.push(node);
    } else if (node.tag === "delete") {
      deletions.add(node.id);
    }
  }

  const additionTransforms = projectNodesToDistrict(additions, district, true);
  const updateTransforms = new Map(
    projectNodesToDistrict(updates, district, false).map((transform) => [
      transform.id,
      transform,
    ]),
  );
  const districtTransforms: InstancedMeshTransforms[] = [];

  for (const transform of district.transforms) {
    if (deletions.has(transform.id)) continue;
    if (updateTransforms.has(transform.id)) {
      districtTransforms.push(updateTransforms.get(transform.id)!);
      continue;
    }
    districtTransforms.push(transform);
  }

  return [...districtTransforms, ...additionTransforms];
}
