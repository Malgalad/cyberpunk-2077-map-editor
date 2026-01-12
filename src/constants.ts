import mapData from "./mapData.min.json";
import type {
  DefaultDistrictNames,
  DistrictProperties,
  InstancedMeshTransforms,
  Plane,
} from "./types/types.ts";

export const PROJECT_VERSION = 3 as const;
export const MAX_DEPTH = 10 as const;
export const TEMPLATE_ID = "@@TEMPLATE" as const;
export const AXII = [0, 1, 2] as const;
export const AXIS_LABELS = ["X", "Y", "Z"] as const;
export const PLANES: [Plane, Plane, Plane] = ["XY", "XZ", "YZ"];

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
).map(
  ([key, value]) =>
    ({
      ...value,
      isCustom: false,
      name: key,
    }) as DistrictProperties,
);

export const KNOWN_MESHES: Array<keyof (typeof mapData)["meshes"]> = [
  "3dmap_roads",
  "3dmap_roads_borders",
  "3dmap_metro",
  "3dmap_cliffs",
  "terrain_mesh",
  "water_mesh",
  "cz_cz_building_h_icosphere",
  "ext_monument_av_building_b",
  "ferris_wheel_collapsed",
  "ferris_wheel_pacifica",
  "monument_ave_pyramid",
  "northoak_sign_a",
  "obelisk",
  "statue_splash_a",
];

export const DEFAULT_TRANSFORM: InstancedMeshTransforms = {
  id: "-1",
  virtual: false,
  originId: null,
  index: -1,
  position: { x: 0, y: 0, z: 0, w: 1 },
  orientation: { x: 0, y: 0, z: 0, w: 0 },
  scale: { x: 0, y: 0, z: 0, w: 1 },
};
