import * as THREE from "three";

export const BUILDINGS = {
  default: new THREE.Color(0xff375a),
  pointingAtUpdate: new THREE.Color(0xa5ff00),
  pointingAtDeletion: new THREE.Color(0xa500ff),
};

export const ADDITIONS = {
  default: new THREE.Color(0xffff00),
  pointingAt: new THREE.Color(0x88ff88),
  selected: new THREE.Color(0x00ff00),
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
