import type { ThunkAction, UnknownAction } from "@reduxjs/toolkit";
import type * as THREE from "three";

import mapData from "./mapData.min.json";
import store from "./store/store.ts";

type NestedArray<T> = T | NestedArray<T>[];

export type MapData = typeof mapData;
export type Districts = MapData["soup"];
export type DistrictData = {
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
export type DistrictCenter = {
  center: THREE.Vector3;
  minMax: THREE.Vector4;
  origin: THREE.Vector3;
};

export type ModalType =
  | "alert"
  | "critical"
  | "confirm"
  | "project"
  | "custom-district"
  | "district-info"
  | "confirm-instance-exclusion";
export type Modal = {
  type: ModalType;
  data: unknown;
};
export type ModalProps = {
  data: unknown;
  onClose: (reason?: unknown) => void;
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
  parent: string;
  virtual?: boolean;
  pattern?: T & PatternProperties;
};

export type MapNode = NodeProperties<Transform>;
export type MapNodeParsed = NodeProperties<TransformParsed>;

/**
 * Represents a cache structure for managing group nodes, storing information about child instances, child groups, and depth levels.
 *
 * The `GroupNodeCache` type is defined as a record where keys are string identifiers, and values hold details about the group node:
 * - `i`: An array of child instance IDs.
 * - `g`: An array of child group IDs.
 * - `l`: The depth level of the group node.
 */
export type GroupNodeCache = Record<
  string,
  {
    i: NestedArray<string>[];
    g: NestedArray<string>[];
    l: number;
  }
>;

export type InstancedMeshTransforms = {
  id?: string;
  virtual?: boolean;
  hidden?: boolean;
  position: { x: number; y: number; z: number; w: number };
  orientation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number; w: number };
};

export type DistrictWithTransforms = {
  district: DistrictData;
  transforms: InstancedMeshTransforms[];
};

export type EditingMode = "add" | "remove";
export type PatternView = "none" | "wireframe" | "solid";
export type DistrictView = "all" | "current" | "custom";

export type AppStore = typeof store;
export type AppState = ReturnType<AppStore["getState"]>;
export type PersistentAppState = Omit<AppState, "modals">;
export type AppDispatch = AppStore["dispatch"];
export type AppThunkAction<ReturnType = void> = ThunkAction<
  ReturnType,
  AppState,
  unknown,
  UnknownAction
>;
