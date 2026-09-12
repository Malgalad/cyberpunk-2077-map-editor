import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

import { STATIC_ASSETS } from "./constants.ts";

const dracoLoader = new DRACOLoader();

dracoLoader.setDecoderPath(STATIC_ASSETS + "/draco/");

export function decodeDRC(buffer: ArrayBuffer): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    dracoLoader.parse(buffer, resolve, reject);
  });
}

export async function importDRC(url: string, material: THREE.Material) {
  const model = await dracoLoader.loadAsync(url);

  return new THREE.Mesh(model, material);
}
