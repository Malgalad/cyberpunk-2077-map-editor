import { DISTRICT_LABELS } from "../constants.ts";
import type {
  ComputedDistrictProperties,
  DefaultDistrictNames,
  District,
  DistrictProperties,
  GroupNodeCache,
  InstancedMeshTransforms,
  MapNode,
} from "../types/types.ts";
import { projectNodesToDistrict } from "./transforms.ts";

export const getDistrictName = (district: DistrictProperties) =>
  district.isCustom
    ? district.name
    : DISTRICT_LABELS[district.name as DefaultDistrictNames];

export const computeDistrictProperties = (
  district: DistrictProperties,
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
  };
};

export const immutableDistrictTransforms = new Map<
  string,
  InstancedMeshTransforms[]
>();

const not =
  <T>(fn: (value: T) => boolean) =>
  (value: T) =>
    !fn(value);
const valid = (n: number) => n >= 0 && n <= 1;
const validOrientation = (n: number) => n >= -1 && n <= 1;
const validate = (transform: InstancedMeshTransforms) => {
  if (
    Object.values(transform.position).some(not(valid)) ||
    Object.values(transform.orientation).some(not(validOrientation)) ||
    Object.values(transform.scale).some(not(valid))
  )
    throw new Error(`Invalid transform: ${JSON.stringify(transform)}`);
};
const isHidden = ({ scale: { x, y, z } }: InstancedMeshTransforms) =>
  x === 0 && y === 0 && z === 0;
export function getFinalDistrictTransformsFromNodes(
  nodes: MapNode[],
  district: District,
  cache: GroupNodeCache[string] | undefined,
): InstancedMeshTransforms[] {
  const transforms = immutableDistrictTransforms.get(district.name) ?? [];

  if (!cache) return transforms;

  const districtNodeIds = new Set(cache.nodes);
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

  const additionTransforms = projectNodesToDistrict(additions, district).filter(
    (transform) => !isHidden(transform),
  );
  const updateTransforms = new Map(
    projectNodesToDistrict(updates, district)
      .filter((transform) => !isHidden(transform))
      .map((transform) => [transform.id, transform]),
  );
  const districtTransforms: InstancedMeshTransforms[] = [];

  for (const transform of transforms) {
    validate(transform);

    if (deletions.has(transform.id)) continue;
    if (updateTransforms.has(transform.id)) {
      districtTransforms.push(updateTransforms.get(transform.id)!);
      continue;
    }
    districtTransforms.push(transform);
  }

  return [...districtTransforms, ...additionTransforms];
}

export function calculateHeight(length: number): number {
  const height = Math.ceil(Math.sqrt(length));
  if (Math.ceil(Math.sqrt(length + height)) === height) return height;
  return calculateHeight(length + height);
}
