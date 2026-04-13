import * as THREE from "three";

import type { Modes } from "../types/types.ts";
import type { KnownInstancedMeshNames } from "./types.ts";

export const BUILDINGS = {
  default: new THREE.Color(0xff375a),
  pointingAtUpdate: new THREE.Color(0xa5ff00),
  pointingAtDeletion: new THREE.Color(0xa500ff),
};

export const ADDITIONS = {
  default: new THREE.Color(0xffff00),
  pointingAt: new THREE.Color(0x88ff88),
  selected: new THREE.Color(0x00ff00),
  marker: new THREE.Color(0x00ffff),
};

export const UPDATES = {
  default: new THREE.Color(0xffa500),
  pointingAt: new THREE.Color(0xa5ff88),
  selected: new THREE.Color(0xa5ff00),
};

export const DELETIONS = {
  default: new THREE.Color(0xff00ff),
  pointingAt: new THREE.Color(0xaaff00),
  selected: new THREE.Color(0xffffff),
};

export const idleColors: Record<KnownInstancedMeshNames, THREE.Color> = {
  additions: ADDITIONS.default,
  additionsVirtual: ADDITIONS.default,
  currentDistrict: BUILDINGS.default,
  deletions: DELETIONS.default,
  updates: UPDATES.default,
  visibleDistricts: BUILDINGS.default,
};
export const intersectionColors: Record<KnownInstancedMeshNames, THREE.Color> =
  {
    additions: ADDITIONS.pointingAt,
    additionsVirtual: ADDITIONS.pointingAt,
    currentDistrict: BUILDINGS.pointingAtUpdate,
    deletions: DELETIONS.pointingAt,
    updates: UPDATES.pointingAt,
    visibleDistricts: BUILDINGS.default,
  };
export const selectedColors: Record<KnownInstancedMeshNames, THREE.Color> = {
  additions: ADDITIONS.selected,
  additionsVirtual: ADDITIONS.selected,
  currentDistrict: BUILDINGS.default,
  deletions: DELETIONS.selected,
  updates: UPDATES.selected,
  visibleDistricts: BUILDINGS.default,
};
export const getColor = (
  name: KnownInstancedMeshNames,
  mode: Modes | undefined,
) => {
  return {
    idle: idleColors[name],
    intersection:
      name === "currentDistrict" && mode === "delete"
        ? BUILDINGS.pointingAtDeletion
        : intersectionColors[name],
    selected: selectedColors[name],
  };
};
