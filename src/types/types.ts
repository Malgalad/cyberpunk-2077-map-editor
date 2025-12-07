import type { ThunkAction, UnknownAction } from "@reduxjs/toolkit";
import type * as THREE from "three";

import mapData from "../mapData.min.json";
import store from "../store/store.ts";

type NestedArray<T> = T | NestedArray<T>[];

export type DefaultDistrictNames = keyof (typeof mapData)["soup"];
export type DistrictProperties = {
  name: string;
  position: number[];
  orientation: number[];
  transMin: number[];
  transMax: number[];
  cubeSize: number;
} & (
  | {
      isCustom: false;
      texture: string;
    }
  | {
      isCustom: true;
    }
);
export type ComputedDistrictProperties = {
  minMax: THREE.Vector3Like;
  origin: THREE.Vector3Like;
};
export type District = DistrictProperties &
  ComputedDistrictProperties & {
    transforms: InstancedMeshTransforms[];
  };

export type Transform = {
  position: [string, string, string];
  rotation: [string, string, string];
  scale: [string, string, string];
};
export type TransformParsed = {
  position: THREE.Vector3Tuple;
  rotation: THREE.Vector3Tuple;
  scale: THREE.Vector3Tuple;
};

type PatternProperties = {
  count: number;
  enabled: boolean;
};
type NodeProperties<T extends Transform | TransformParsed> = T & {
  id: string;
  label: string;
  type: "group" | "instance";
  tag: "create" | "update" | "delete";
  parent: string;
  virtual?: boolean;
  hidden?: boolean;
  pattern?: T & PatternProperties;
  errors?: string[];
};

export type MapNode = NodeProperties<Transform>;
export type MapNodeParsed = NodeProperties<TransformParsed>;
export type MapNodeUri = Pick<
  MapNodeParsed,
  "id" | "parent" | "type" | "tag"
> & { hasErrors: boolean };

export type GroupNodeCache = Record<
  string,
  {
    instances: string[];
    groups: string[];
    nodes: string[];
    additions: string[];
    updates: string[];
    deletions: string[];
    errors: string[];
    level: number;
  }
>;
export type IntermediateGroupNodeCache = Record<
  string,
  {
    instances: NestedArray<string>[];
    groups: NestedArray<string>[];
    nodes: NestedArray<string>[];
    additions: NestedArray<string>[];
    updates: NestedArray<string>[];
    deletions: NestedArray<string>[];
    errors: NestedArray<string>[];
    level: number;
  }
>;

export type InstancedMeshTransforms = {
  id: string;
  virtual?: boolean;
  position: { x: number; y: number; z: number; w: number };
  orientation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number; w: number };
};

export type DistrictWithTransforms = {
  district: DistrictProperties;
  transforms: InstancedMeshTransforms[];
};

export type Tool = "move" | "select" | "multiselect";
export type Modes = "create" | "update" | "delete";
export type PatternView = "none" | "wireframe" | "solid";
export type DistrictView = "all" | "current" | "custom";

export type AppStore = typeof store;
export type AppState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunkAction<ReturnType = void> = ThunkAction<
  ReturnType,
  AppState,
  unknown,
  UnknownAction
>;

export type PersistentAppState = {
  district: {
    districts: DistrictProperties[];
    current: string | null;
  };
  nodes: AppState["nodes"];
  options: AppState["options"];
  project: AppState["project"];
};
export type RevivedAppState = {
  district: AppState["district"];
  nodes: AppState["nodes"];
  options: AppState["options"];
  project: AppState["project"];
};
