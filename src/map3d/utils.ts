import * as THREE from "three";

import mapData from "../mapData.min.json";
import { EXCLUDE_AO_LAYER, STATIC_ASSETS } from "./constants.ts";
import { importDRC } from "./importDRC.ts";

const rotateCoordinates = ([x, y, z, w]: number[]) => [x, z, -y, w];
const excludedAO = ["3dmap_metro"];

export async function importMesh(
  name: keyof (typeof mapData)["meshes"],
  material: THREE.Material,
) {
  const data = mapData.meshes[name];

  const mesh = await importDRC(
    `${STATIC_ASSETS}/3dmodels/${data.model.replace(".mesh", ".drc")}`,
    material,
  );
  mesh.name = name;
  mesh.position.set(
    ...(rotateCoordinates(data.position) as THREE.Vector3Tuple),
  );
  mesh.scale.set(...(data.visualScale as THREE.Vector3Tuple));
  mesh.setRotationFromQuaternion(
    new THREE.Quaternion(...rotateCoordinates(data.orientation)),
  );

  if (excludedAO.includes(name)) {
    mesh.layers.set(EXCLUDE_AO_LAYER);
  }

  return mesh;
}
