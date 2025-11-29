import type { defaultValues } from "./editDistrictModal.constants.ts";

export type EditDistrictData = typeof defaultValues;
export type ErrorSlots =
  | "name"
  | "cubeSize"
  | "posX"
  | "posY"
  | "posZ"
  | "minX"
  | "minY"
  | "minZ"
  | "maxX"
  | "maxY"
  | "maxZ";
