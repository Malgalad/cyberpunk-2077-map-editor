import path from "node:path";

import fsx from "fs-extra";
import * as THREE from "three";

import triangleSoup from "../external/3dmap_triangle_soup.json" with { type: "json" };
import mapEntity from "../external/3dmap_view.json" with { type: "json" };
// import { MAP_DIMENSIONS } from '../shared/constants.js';

const MAP_DIMENSIONS = [16000, 16000];
const fixedToFloat = (value, bits) => value / (1 << bits);
const findMaterialValue = (values, key) =>
  values.find((value) => key in value)[key];
const applyTransform = (vec3, transform) =>
  vec3
    .applyQuaternion(new THREE.Quaternion(...getValue(transform.Orientation)))
    .add(new THREE.Vector3(...getValue(transform.Position)));

const getType = (value) => value["$type"];
const getValue = (object) => {
  switch (getType(object)) {
    case "CName":
    case "ResourcePath":
      return object["$value"];
    case "FixedPoint":
      return fixedToFloat(object.Bits, 17);
    case "Quaternion":
      return [object.i, object.j, object.k, object.r];
    case "Vector3":
      return [object.X, object.Y, object.Z];
    case "Vector4":
      return [object.X, object.Y, object.Z, object.W];
    case "WorldPosition":
      return [getValue(object.x), getValue(object.y), getValue(object.z)];
    default:
      return object;
  }
};

const supportedTypes = new Set([
  "entMeshComponent",
  "entTransformComponent",
  "gameStaticTriggerAreaComponent",
]);
const chunks = mapEntity.compiledData.Data.Chunks.filter((chunk) =>
  supportedTypes.has(getType(chunk)),
);

const chunksByName = Object.fromEntries(
  chunks.map((chunk) => [getValue(chunk.name), chunk]),
);

const EXPORT = {
  soup: {},
  meshes: {},
  triggers: {},
};
const BUILDINGS_MESH = "3dmap_triangle_soup.mesh";

for (const chunk of chunks) {
  const type = getType(chunk);
  const name = getValue(chunk.name);

  if (type === "entMeshComponent") {
    let position = new THREE.Vector3(
      ...getValue(chunk.localTransform.Position),
    );
    let current = chunk;

    while (current.parentTransform) {
      const bindName = getValue(current.parentTransform.Data.bindName);
      const parent = chunksByName[bindName];

      position = applyTransform(position, parent.localTransform);
      current = parent;
    }

    position = [position.x, position.y, position.z];

    const DepotPath = getValue(chunk.mesh.DepotPath);
    const orientation = getValue(chunk.localTransform.Orientation);
    const visualScale = getValue(chunk.visualScale);

    if (DepotPath.endsWith(BUILDINGS_MESH)) {
      const meshAppearance = getValue(chunk.meshAppearance);
      const materialIndex = triangleSoup.materialEntries.find(
        (entry) => getValue(entry.name) === meshAppearance,
      ).index;
      const material =
        triangleSoup.localMaterialBuffer.materials[materialIndex];

      const texture = getValue(
        findMaterialValue(material.values, "WorldPosTex").DepotPath,
      )
        .split("\\")
        .at(-1);
      const cubeSize = getValue(findMaterialValue(material.values, "CubeSize"));
      const transMin = getValue(findMaterialValue(material.values, "TransMin"));
      const transMax = getValue(findMaterialValue(material.values, "TransMax"));
      EXPORT.soup[name] = {
        texture,
        position,
        orientation,
        cubeSize,
        transMin,
        transMax,
      };
    } else {
      if (name.includes("seethrou")) continue;

      const model = DepotPath.split("\\").at(-1);

      EXPORT.meshes[name] = {
        model,
        position,
        orientation,
        visualScale,
      };
    }
  } else if (type === "gameStaticTriggerAreaComponent") {
    if (name.endsWith("_backup")) continue;

    let points = chunk.outline.Data.points.map((point) => getValue(point));
    let current = chunk;

    while (current) {
      points = points
        .map((point) =>
          applyTransform(new THREE.Vector3(...point), current.localTransform),
        )
        .map(({ x, y, z }) => [x, y, z]);

      current = current.parentTransform
        ? chunksByName[getValue(current.parentTransform.Data.bindName)]
        : undefined;
    }

    points = points.map(([x, y]) => [
      x + MAP_DIMENSIONS[0] / 2,
      -y + MAP_DIMENSIONS[1] / 2,
    ]);

    EXPORT.triggers[name] = points;
  }
}

await fsx.writeJson(
  path.resolve(import.meta.dirname, "../src/mapData.min.json"),
  EXPORT,
);

console.log("Success!");
