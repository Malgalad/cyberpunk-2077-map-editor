import type { DistrictProperties } from "../../types/types.ts";

export const mapSize = 16_000;
export const defaultValues: DistrictProperties = {
  name: "new_district",
  position: [0, 0, 0],
  orientation: [0, 0, 0, 1],
  transMin: [-2000, -2000, -50, 0],
  transMax: [2000, 2000, 650, 1],
  cubeSize: 200,
  isCustom: true,
};
