import type { District } from "../../types/types.ts";
import { toNumber, toString } from "../../utilities/utilities.ts";
import type { EditDistrictData } from "./editDistrictModal.types.ts";

export const toData = (district: District): EditDistrictData => ({
  pos: district.position.map((n) => toString(n)),
  min: district.transMin.map((n) => toString(n)),
  max: district.transMax.map((n) => toString(n)),
  cubeSize: toString(district.cubeSize),
});

export const fromData = (
  data: EditDistrictData,
): Pick<District, "position" | "cubeSize" | "transMin" | "transMax"> => ({
  position: data.pos.map((n) => toNumber(n)),
  transMin: data.min.map((n) => toNumber(n)),
  transMax: data.max.map((n) => toNumber(n)),
  cubeSize: toNumber(data.cubeSize),
});
