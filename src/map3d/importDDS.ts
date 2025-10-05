import * as THREE from "three";

// https://github.com/toji/webgl-texture-utils/blob/master/texture-util/dds.js
/** @prop {import('three/examples/jsm/loaders/DDSLoader.js')} **/
const headerLength = 31;
const extendedHeaderLength = 5;
const dataOffset = (headerLength + 1) * 2 + extendedHeaderLength * 2;

export type InstanceTransforms = {
  id?: string;
  virtual?: boolean;
  position: { x: number; y: number; z: number; w: number };
  orientation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number; w: number };
};

export async function loadImageData(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  const blob = await response.blob();
  return blob.arrayBuffer();
}

export function decodeImageData(data: Uint16Array): InstanceTransforms[] {
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
}

const magic = [
  17476, 8275, 124, 0, 4111, 2, 205, 0, 615, 0, 4920, 0, 1, 0, 1, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 4, 0, 22596,
  12337, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4096, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 0,
  3, 0, 0, 0, 1, 0, 0, 0,
];
function encodeImageData(data: InstanceTransforms[]): Uint16Array<ArrayBuffer> {
  const height = Math.ceil(Math.sqrt(data.length));
  const width = height * 3;
  const totalSize = dataOffset + width * height * 4;
  const result = new Uint16Array(totalSize);

  for (let i = 0; i < magic.length; i++) {
    result[i] = magic[i];
  }

  // Set header values
  result[8] = width;
  result[6] = height;

  for (let i = 0; i < data.length; i++) {
    const instance = data[i];
    const offset =
      dataOffset + ((i % height) * width + Math.floor(i / height)) * 4;

    // Position
    result[offset] = instance.position.x * 65536;
    result[offset + 1] = instance.position.y * 65536;
    result[offset + 2] = instance.position.z * 65536;
    result[offset + 3] = instance.position.w * 65536;

    // Orientation
    result[offset + 4 * height] = ((instance.orientation.x + 1) / 2) * 65536;
    result[offset + 1 + 4 * height] =
      ((instance.orientation.y + 1) / 2) * 65536;
    result[offset + 2 + 4 * height] =
      ((instance.orientation.z + 1) / 2) * 65536;
    result[offset + 3 + 4 * height] =
      ((instance.orientation.w + 1) / 2) * 65536;

    // Scale
    result[offset + 8 * height] = instance.scale.x * 65536;
    result[offset + 1 + 8 * height] = instance.scale.y * 65536;
    result[offset + 2 + 8 * height] = instance.scale.z * 65536;
    result[offset + 3 + 8 * height] = instance.scale.w * 65536;
  }

  return result;
}

export function createInstancedMesh(
  instances: InstanceTransforms[],
  material: THREE.Material,
  cubeSize: number,
  position: THREE.Vector3,
  transformMin: THREE.Vector4,
  transformMax: THREE.Vector4,
  excludedIndexes: number[] = [],
) {
  const matrix = new THREE.Matrix4();
  const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
  const boundingBox = transformMax.sub(transformMin);
  const color = new THREE.Color(0xffffff);

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

    if (excludedIndexes.includes(index)) {
      scale.set(0, 0, 0);
    }

    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, color);
  }

  return mesh;
}

export async function importDDS(
  imageData: ArrayBuffer,
  material: THREE.Material,
  cubeSize: number,
  position: THREE.Vector3,
  transformMin: THREE.Vector4,
  transformMax: THREE.Vector4,
  excludedIndexes: number[] = [],
) {
  const instances = decodeImageData(new Uint16Array(imageData));

  return createInstancedMesh(
    instances,
    material,
    cubeSize,
    position,
    transformMin,
    transformMax,
    excludedIndexes,
  );
}

export function exportDDS(
  instances: InstanceTransforms[],
  additions: InstanceTransforms[],
  removals: number[],
) {
  const data = [
    ...instances
      .filter((_, index) => !removals.includes(index))
      .filter(
        (instance) =>
          instance.scale.x !== 0 &&
          instance.scale.y !== 0 &&
          instance.scale.z !== 0,
      ),
    ...additions,
  ];

  const imageData = encodeImageData(data);

  return new Blob([imageData.buffer], { type: "image/dds" });
}
