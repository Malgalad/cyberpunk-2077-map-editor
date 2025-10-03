import * as THREE from "three";

import compiledData from "../mapData.min.json";
import { STATIC_ASSETS } from "./constants.js";
import { importDRC } from "./importDRC.ts";
import * as materials from "./materials.ts";

const transform = ([x, y, z, w]: number[]) => [x, z, -y, w];

async function importMesh(
  name: keyof (typeof compiledData)["meshes"],
  material: THREE.Material,
) {
  const data = compiledData.meshes[name];

  const mesh = await importDRC(
    `${STATIC_ASSETS}/3dmodels/${data.model.replace(".mesh", ".drc")}`,
    material,
  );
  mesh.position.set(...(transform(data.position) as [number, number, number]));
  mesh.scale.set(...(data.visualScale as [number, number, number]));
  mesh.setRotationFromQuaternion(
    new THREE.Quaternion(...transform(data.orientation)),
  );
  return mesh;
}

export function setupTerrain(
  loadResource: (promise: Promise<THREE.Mesh>) => void,
) {
  loadResource(importMesh("terrain_mesh", materials.terrainMaterial));
  loadResource(importMesh("3dmap_cliffs", materials.terrainMaterial));

  loadResource(importMesh("3dmap_roads", materials.roadsMaterial));
  loadResource(
    importMesh("3dmap_roads_borders", materials.roadsBordersMaterial),
  );

  loadResource(importMesh("3dmap_metro", materials.metroMaterial));

  loadResource(importMesh("water_mesh", materials.waterMaterial));

  loadResource(importMesh("northoak_sign_a", materials.buildingsMaterial));
  loadResource(importMesh("monument_ave_pyramid", materials.buildingsMaterial));
  loadResource(importMesh("obelisk", materials.buildingsMaterial));
  loadResource(
    importMesh("cz_cz_building_h_icosphere", materials.buildingsMaterial),
  );
  loadResource(importMesh("statue_splash_a", materials.buildingsMaterial));
  loadResource(
    importMesh("ferris_wheel_collapsed", materials.buildingsMaterial),
  );
  loadResource(
    importMesh("ferris_wheel_pacifica", materials.buildingsMaterial),
  );
  loadResource(
    importMesh("ext_monument_av_building_b", materials.buildingsMaterial),
  );
}
