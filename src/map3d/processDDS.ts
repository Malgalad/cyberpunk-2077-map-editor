import type { InstancedMeshTransforms } from "../types/types.ts";

// https://github.com/toji/webgl-texture-utils/blob/master/texture-util/dds.js
/** @prop {import('three/examples/jsm/loaders/DDSLoader.js')} **/
const headerLength = 31;
const extendedHeaderLength = 5;
const dataOffset = (headerLength + 1) * 2 + extendedHeaderLength * 2;
// DDS extended headers in Uint16
const magic = [
  17476, 8275, 124, 0, 4111, 2, -1, 0, -1, 0, -1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 4, 0, 22596, 12337,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4096, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 0, 3, 0, 0,
  0, 1, 0, 0, 0,
];
const uint16 = 2 ** 16 - 1; // 65535

/**
 * XYZW data is encoded in 16-bit texture as RGBA channels
 * Image width is x3 image height:
 * - first third (left-to-right) of the image contains position
 * - the second third contains rotation
 * - the last part contains scale
 * Transform data from 0..65536 range to 0..1 (rotation to -1..1)
 *   to later transform scale according to district-specific bounding box
 */

export function decodeImageData(data: Uint16Array): InstancedMeshTransforms[] {
  const instances: InstancedMeshTransforms[] = [];
  const width = data[8];
  const height = data[6];

  for (let i = dataOffset; i < data.length; i += 4) {
    const x = ((i - dataOffset) / 4) % width;
    const y = Math.floor((i - dataOffset) / 4 / width);
    // data is read left-to-right, but instances were baked top-down
    const index = x * height + y;

    if (x >= height) continue;

    const position = {
      x: data[i] / uint16,
      y: data[i + 1] / uint16,
      z: data[i + 2] / uint16,
      w: data[i + 3] / uint16,
    };
    const orientation = {
      x: (data[i + 4 * height] / uint16) * 2 - 1,
      y: (data[i + 1 + 4 * height] / uint16) * 2 - 1,
      z: (data[i + 2 + 4 * height] / uint16) * 2 - 1,
      w: (data[i + 3 + 4 * height] / uint16) * 2 - 1,
    };
    const scale = {
      x: data[i + 8 * height] / uint16,
      y: data[i + 1 + 8 * height] / uint16,
      z: data[i + 2 + 8 * height] / uint16,
      w: data[i + 3 + 8 * height] / uint16,
    };

    instances[index] = {
      id: `${index}`,
      position,
      orientation,
      scale,
    };
  }

  return instances;
}

export function encodeImageData(
  data: InstancedMeshTransforms[],
): Uint16Array<ArrayBuffer> {
  const height = Math.ceil(Math.sqrt(data.length));
  const width = height * 3;
  const totalSize = dataOffset + width * height * 4;
  const result = new Uint16Array(totalSize);

  for (let i = 0; i < magic.length; i++) {
    result[i] = magic[i];
  }

  // Set header values
  result[6] = height;
  result[8] = width;
  result[10] = width * 8;

  for (let i = 0; i < data.length; i++) {
    const instance = data[i];
    const offset =
      dataOffset + ((i % height) * width + Math.floor(i / height)) * 4;

    // Position
    result[offset] = instance.position.x * uint16;
    result[offset + 1] = instance.position.y * uint16;
    result[offset + 2] = instance.position.z * uint16;
    result[offset + 3] = instance.position.w * uint16;

    // Orientation
    result[offset + 4 * height] = ((instance.orientation.x + 1) / 2) * uint16;
    result[offset + 1 + 4 * height] =
      ((instance.orientation.y + 1) / 2) * uint16;
    result[offset + 2 + 4 * height] =
      ((instance.orientation.z + 1) / 2) * uint16;
    result[offset + 3 + 4 * height] =
      ((instance.orientation.w + 1) / 2) * uint16;

    // Scale
    result[offset + 8 * height] = instance.scale.x * uint16;
    result[offset + 1 + 8 * height] = instance.scale.y * uint16;
    result[offset + 2 + 8 * height] = instance.scale.z * uint16;
    result[offset + 3 + 8 * height] = instance.scale.w * uint16;
  }

  return result;
}
