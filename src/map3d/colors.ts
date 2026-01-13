import * as THREE from "three";

import type { Modes } from "../types/types.ts";

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
  selected: new THREE.Color(0xffffff),
};

export const MARKERS = {
  default: new THREE.Color(0x00ffff),
  selected: new THREE.Color(0xffffff),
};

export const IDLE_COLORS: Record<Modes, THREE.Color> = {
  create: ADDITIONS.default,
  update: UPDATES.default,
  delete: DELETIONS.default,
};
export const POINTING_AT_COLORS: Record<Modes, THREE.Color> = {
  create: ADDITIONS.pointingAt,
  update: UPDATES.pointingAt,
  delete: DELETIONS.default,
};
export const SELECTED_COLORS: Record<Modes, THREE.Color> = {
  create: ADDITIONS.selected,
  update: UPDATES.selected,
  delete: DELETIONS.selected,
};
export const BUILDING_COLORS: Record<Modes, THREE.Color> = {
  create: BUILDINGS.default,
  update: BUILDINGS.pointingAtUpdate,
  delete: BUILDINGS.pointingAtDeletion,
};

export const getColor = (
  isDefaultMesh: boolean,
  isMarker: boolean,
  mode: Modes,
) => ({
  idle: isDefaultMesh
    ? BUILDINGS.default
    : isMarker
      ? MARKERS.default
      : IDLE_COLORS[mode],
  pointingAt: isDefaultMesh
    ? BUILDING_COLORS[mode]
    : isMarker
      ? MARKERS.selected
      : POINTING_AT_COLORS[mode],
  selected: isMarker ? MARKERS.selected : SELECTED_COLORS[mode],
});

export const setColorForId = (
  mesh: THREE.InstancedMesh,
  id: string,
  color: THREE.Color,
) => {
  const ids: Record<string, number[]> = mesh.userData.ids;

  if (!ids[id]) return;

  for (const index of ids[id]) {
    mesh.setColorAt(index, color);
  }

  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
};
