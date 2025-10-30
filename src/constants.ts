import * as React from "react";

import mapData from "./mapData.min.json";
import type { DefaultDistricts, DistrictData } from "./types/types.ts";

export const PROJECT_VERSION = 3 as const;
// TODO disable node creation at max depth
export const MAX_DEPTH = 10 as const;

export const DISTRICT_LABELS: Record<DefaultDistricts, string> = {
  watson_data: "Watson",
  westbrook_data: "Westbrook",
  city_center_data: "City Center",
  heywood_data: "Heywood",
  santo_domingo_data: "Santo Domingo",
  pacifica_data0633: "Pacifica",
  ep1_dogtown_data: "Dogtown",
  ep1_spaceport_data: "Spaceport",
};

export const DISTRICTS: Array<{
  key: DefaultDistricts;
  label: React.ReactNode;
}> = Object.keys(mapData.soup).map((key) => ({
  key: key as DefaultDistricts,
  label: DISTRICT_LABELS[key as DefaultDistricts],
}));

export const DEFAULT_DISTRICT_DATA: DistrictData[] = Object.entries(
  mapData.soup,
).map(([key, value]) => ({
  ...value,
  isCustom: false,
  name: key,
}));
