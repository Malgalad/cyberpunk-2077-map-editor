import * as THREE from "three";

// https://github.com/toji/webgl-texture-utils/blob/master/texture-util/dds.js
/** @prop {import('three/examples/jsm/loaders/DDSLoader.js')} **/
const headerLength = 31;
const extendedHeaderLength = 5;
const dataOffset = (headerLength + 1) * 2 + extendedHeaderLength * 2;

export type InstanceTransforms = {
  id?: string;
  position: { x: number; y: number; z: number; w: number };
  orientation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number; w: number };
};

async function loadImageData(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  return new Uint16Array(buffer);
}

function decodeImageData(data: Uint16Array): InstanceTransforms[] {
  const instances = [];
  const width = data[8];
  const height = data[6];
  const result = [];
  let column = 0;

  for (let i = dataOffset; i < data.length; i += 4) {
    column += 1;
    if (column >= width) column = 0;
    if (column > height || column === 0) continue;

    const position = {
      x: data[i] / 65536,
      y: data[i + 1] / 65536,
      z: data[i + 2] / 65536,
      w: data[i + 3] / 65536,
    };
    const orientation = {
      x: (data[i + 4 * height] / 65536) * 2 - 1,
      y: (data[i + 1 + 4 * height] / 65536) * 2 - 1,
      z: (data[i + 2 + 4 * height] / 65536) * 2 - 1,
      w: (data[i + 3 + 4 * height] / 65536) * 2 - 1,
    };
    const scale = {
      x: data[i + 8 * height] / 65536,
      y: data[i + 1 + 8 * height] / 65536,
      z: data[i + 2 + 8 * height] / 65536,
      w: data[i + 3 + 8 * height] / 65536,
    };

    instances.push({
      position,
      orientation,
      scale,
    });
  }

  for (let w = 0; w < width; w++) {
    for (let h = 0; h < height; h++) {
      const index = w + h * width;

      if (instances[index]) {
        result.push(instances[index]);
      }
    }
  }

  return result;
  // return instances;
}

export function createInstancedMesh(
  instances: InstanceTransforms[],
  material: THREE.Material,
  cubeSize: number,
  position: THREE.Vector3,
  transformMin: THREE.Vector4,
  transformMax: THREE.Vector4,
) {
  const matrix = new THREE.Matrix4();
  const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
  const boundingBox = transformMax.sub(transformMin);

  mesh.userData.count = instances.length;
  mesh.position.set(
    position.x + transformMin.x,
    position.z + transformMin.z,
    -position.y - transformMin.y,
  );

  for (let index = 0; index < instances.length; index++) {
    const position = new THREE.Vector3(
      instances[index].position.x * boundingBox.x,
      instances[index].position.z * boundingBox.z,
      -instances[index].position.y * boundingBox.y,
    );
    const rotation = new THREE.Quaternion(
      instances[index].orientation.x,
      instances[index].orientation.z,
      -instances[index].orientation.y,
      instances[index].orientation.w,
    );
    const scale = new THREE.Vector3(
      instances[index].scale.x,
      instances[index].scale.z,
      instances[index].scale.y,
    ).multiplyScalar(2);

    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
  }

  return mesh;
}

export async function importDDS(
  url: string,
  material: THREE.Material,
  cubeSize: number,
  position: THREE.Vector3,
  transformMin: THREE.Vector4,
  transformMax: THREE.Vector4,
) {
  const imageData = await loadImageData(url);
  const instances = decodeImageData(imageData);

  return createInstancedMesh(
    instances,
    material,
    cubeSize,
    position,
    transformMin,
    transformMax,
  );
}
