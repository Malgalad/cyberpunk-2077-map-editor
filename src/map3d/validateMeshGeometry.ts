import type * as THREE from "three";

import type { DefaultMeshNames } from "../types/types.ts";

export function validateMeshGeometry(
  name: DefaultMeshNames,
  geometry: THREE.BufferGeometry,
) {
  const position = geometry.getAttribute("position");
  if (!position || position.itemSize !== 3 || position.count < 3) {
    throw new Error("The file must contain a triangle mesh with 3D positions.");
  }

  const index = geometry.getIndex();
  if (!index || index.count < 3 || index.count % 3 !== 0) {
    throw new Error("The file must contain triangles, not a point cloud.");
  }
  for (let i = 0; i < index.count; i++) {
    const vertex = index.getX(i);
    if (!Number.isInteger(vertex) || vertex < 0 || vertex >= position.count) {
      throw new Error("The file contains invalid triangle indices.");
    }
  }

  if (!geometry.hasAttribute("normal")) geometry.computeVertexNormals();

  for (const attributeName of ["position", "normal", "color"]) {
    const attribute = geometry.getAttribute(attributeName);
    if (!attribute) {
      if (attributeName === "color" && name === "3dmap_metro") {
        throw new Error("Metro replacements must include vertex colors.");
      }
      continue;
    }
    if (attribute.itemSize !== 3 || attribute.count !== position.count) {
      throw new Error(`The file contains invalid ${attributeName} attributes.`);
    }
    for (let i = 0; i < attribute.count; i++) {
      if (
        !Number.isFinite(attribute.getX(i)) ||
        !Number.isFinite(attribute.getY(i)) ||
        !Number.isFinite(attribute.getZ(i))
      ) {
        throw new Error(`The file contains invalid ${attributeName} values.`);
      }
    }
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}
