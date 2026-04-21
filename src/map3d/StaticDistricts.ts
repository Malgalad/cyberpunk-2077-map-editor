import * as THREE from "three";

import type { DistrictWithTransforms } from "../types/types.ts";
import { createDistrictMesh } from "./createDistrictMesh.ts";
import { staticMaterial } from "./materials.ts";

type EventMap = THREE.Object3DEventMap & {
  /**
   * Fires when child is added or removed
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  updated: {};
};

class StaticDistricts extends THREE.Group<EventMap> {
  declare children: THREE.InstancedMesh[];
  name = "StaticDistricts";

  dispose() {
    for (const child of this.children) {
      child.geometry.dispose();
    }
  }

  setStaticDistricts(districts: DistrictWithTransforms[]) {
    const visibleNames = districts.map((item) => item.district.name);
    const toRemove = [];
    const toAdd = [];

    for (const child of this.children) {
      if (!visibleNames.includes(child.name)) {
        toRemove.push(child);
      }
    }

    for (const item of districts) {
      const { district, transforms } = item;
      const child = this.getObjectByName(district.name) ?? null;

      const mesh = createDistrictMesh(
        child as THREE.InstancedMesh | null,
        district,
        transforms,
        staticMaterial,
      );
      mesh.name = district.name;

      if (!child) toAdd.push(mesh);
    }

    if (toRemove.length) this.remove(...toRemove);
    for (const child of toRemove) child.geometry.dispose();
    if (toAdd.length) this.add(...toAdd);
    this.dispatchEvent({ type: "updated" });
  }
}

export default StaticDistricts;
