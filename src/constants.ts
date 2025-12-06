import mapData from "./mapData.min.json";
import type {
  DefaultDistrictNames,
  DistrictProperties,
} from "./types/types.ts";

export const PROJECT_VERSION = 3 as const;
// TODO disable node creation at max depth
export const MAX_DEPTH = 10 as const;
export const TEMPLATE_ID = "@@TEMPLATE" as const;

export const DISTRICT_LABELS: Record<DefaultDistrictNames, string> = {
  watson_data: "Watson",
  westbrook_data: "Westbrook",
  city_center_data: "City Center",
  heywood_data: "Heywood",
  santo_domingo_data: "Santo Domingo",
  pacifica_data0633: "Pacifica",
  ep1_dogtown_data: "Dogtown",
  ep1_spaceport_data: "Spaceport",
};

export const DEFAULT_DISTRICT_DATA: DistrictProperties[] = Object.entries(
  mapData.soup,
).map(([key, value]) => ({
  ...value,
  isCustom: false,
  name: key,
}));
