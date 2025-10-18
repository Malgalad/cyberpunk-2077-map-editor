import * as React from "react";

import mapData from "./mapData.min.json";
import type { DistrictData, Districts } from "./types.ts";

export const PROJECT_VERSION = 2 as const;

export const MAX_DEPTH = 10 as const;

export const DISTRICT_LABELS: Record<keyof Districts, string> = {
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
  key: keyof Districts;
  label: React.ReactNode;
}> = Object.keys(mapData.soup).map((key) => ({
  key: key as keyof Districts,
  label: DISTRICT_LABELS[key as keyof Districts],
}));

export const DEFAULT_DISTRICT_DATA: DistrictData[] = Object.entries(
  mapData.soup,
).map(([key, value]) => ({
  ...value,
  isCustom: false,
  name: key,
}));
