import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

import { STATIC_ASSETS } from "./constants.ts";

const dracoLoader = new DRACOLoader();

dracoLoader.setDecoderPath(STATIC_ASSETS + "/draco/");
dracoLoader.preload();

export async function importDRC(url: string, material: THREE.Material) {
  const model = await dracoLoader.loadAsync(url);

  return new THREE.Mesh(model, material);
}
