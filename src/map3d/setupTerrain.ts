import * as THREE from "three";

import { KNOWN_MESHES } from "../constants.ts";
import mapData from "../mapData.min.json";
import { STATIC_ASSETS } from "./constants.js";
import { importDRC } from "./importDRC.ts";
import * as materials from "./materials.ts";

const rotateCoordinates = ([x, y, z, w]: number[]) => [x, z, -y, w];

async function importMesh(
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

  return mesh;
}

const materialsMap: Record<string, THREE.Material | THREE.Material[]> = {
  terrain_mesh: materials.terrainMaterial,
  "3dmap_cliffs": materials.terrainMaterial,
  "3dmap_roads": [materials.roadsMaterial, materials.roadsMaterial2],
  "3dmap_roads_borders": materials.roadsBordersMaterial,
  "3dmap_metro": materials.metroMaterial,
  water_mesh: materials.waterMaterial,
  northoak_sign_a: materials.statuesMaterial,
  monument_ave_pyramid: materials.statuesMaterial,
  obelisk: materials.statuesMaterial,
  cz_cz_building_h_icosphere: materials.statuesMaterial,
  statue_splash_a: materials.statuesMaterial,
  ferris_wheel_pacifica: materials.statuesMaterial,
  ferris_wheel_collapsed: materials.statuesMaterial,
  ext_monument_av_building_b: materials.statuesMaterial,
};

export function setupTerrain(
  addMesh: (promise: Promise<THREE.Mesh>) => Promise<THREE.Mesh>,
): Record<
  keyof (typeof mapData)["meshes"],
  THREE.Mesh | THREE.Mesh[] | undefined
> {
  const meshes: Record<string, THREE.Mesh | THREE.Mesh[]> = {};

  for (const name of KNOWN_MESHES) {
    const material = materialsMap[name];

    if (Array.isArray(material)) {
      meshes[name] = [] as THREE.Mesh[];
      for (const mat of material) {
        addMesh(importMesh(name, mat)).then((mesh) => {
          (meshes[name] as THREE.Mesh[]).push(mesh);
        });
      }
    } else {
      addMesh(importMesh(name, material)).then((mesh) => {
        meshes[name] = mesh;
      });
    }
  }

  return meshes;
}
