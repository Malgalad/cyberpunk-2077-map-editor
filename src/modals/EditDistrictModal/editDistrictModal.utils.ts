import type * as THREE from "three";

import type { District } from "../../types/types.ts";
import { toNumber, toString } from "../../utilities/utilities.ts";
import type { EditDistrictData } from "./editDistrictModal.types.ts";

export const toData = (district: District): EditDistrictData => ({
  pos: district.position.map((n) => toString(n)).slice(0, 3) as [
    string,
    string,
    string,
  ],
  min: district.transMin.map((n) => toString(n)).slice(0, 3) as [
    string,
    string,
    string,
  ],
  max: district.transMax.map((n) => toString(n)).slice(0, 3) as [
    string,
    string,
    string,
  ],
  cubeSize: toString(district.cubeSize),
});

export const fromData = (
  data: EditDistrictData,
): Pick<District, "position" | "cubeSize" | "transMin" | "transMax"> => ({
  position: data.pos.map((n) => toNumber(n)).slice(0, 3) as THREE.Vector3Tuple,
  transMin: data.min.map((n) => toNumber(n)).slice(0, 4) as THREE.Vector4Tuple,
  transMax: data.max.map((n) => toNumber(n)).slice(0, 4) as THREE.Vector4Tuple,
  cubeSize: toNumber(data.cubeSize),
});
