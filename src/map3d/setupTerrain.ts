import * as THREE from "three";

import mapData from "../mapData.min.json";
import type { MapData } from "../types.ts";
import { STATIC_ASSETS } from "./constants.js";
import { importDRC } from "./importDRC.ts";
import * as materials from "./materials.ts";

const rotateCoordinates = ([x, y, z, w]: number[]) => [x, z, -y, w];

async function importMesh(
  name: keyof MapData["meshes"],
  material: THREE.Material,
) {
  const data = mapData.meshes[name];

  const mesh = await importDRC(
    `${STATIC_ASSETS}/3dmodels/${data.model.replace(".mesh", ".drc")}`,
    material,
  );
  mesh.position.set(
    ...(rotateCoordinates(data.position) as THREE.Vector3Tuple),
  );
  mesh.scale.set(...(data.visualScale as THREE.Vector3Tuple));
  mesh.setRotationFromQuaternion(
    new THREE.Quaternion(...rotateCoordinates(data.orientation)),
  );

  return mesh;
}

export function setupTerrain(addMesh: (promise: Promise<THREE.Mesh>) => void) {
  addMesh(importMesh("terrain_mesh", materials.terrainMaterial));
  addMesh(importMesh("3dmap_cliffs", materials.terrainMaterial));

  addMesh(importMesh("3dmap_roads", materials.roadsMaterial));
  addMesh(importMesh("3dmap_roads_borders", materials.roadsBordersMaterial));

  addMesh(importMesh("3dmap_metro", materials.metroMaterial));

  addMesh(importMesh("water_mesh", materials.waterMaterial));

  addMesh(importMesh("northoak_sign_a", materials.buildingsMaterial));
  addMesh(importMesh("monument_ave_pyramid", materials.buildingsMaterial));
  addMesh(importMesh("obelisk", materials.buildingsMaterial));
  addMesh(
    importMesh("cz_cz_building_h_icosphere", materials.buildingsMaterial),
  );
  addMesh(importMesh("statue_splash_a", materials.buildingsMaterial));
  addMesh(importMesh("ferris_wheel_collapsed", materials.buildingsMaterial));
  addMesh(importMesh("ferris_wheel_pacifica", materials.buildingsMaterial));
  addMesh(
    importMesh("ext_monument_av_building_b", materials.buildingsMaterial),
  );
}
