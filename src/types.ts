import type { ThunkAction, UnknownAction } from "@reduxjs/toolkit";
import type * as THREE from "three";

import mapData from "./mapData.min.json";
import store from "./store/store.ts";

export type MapData = typeof mapData;
export type Districts = MapData["soup"];
export type District = keyof MapData["soup"];
export type DistrictData = MapData["soup"][District];
export type DistrictLoaded = DistrictData & {
  name: string;
  imageData: ArrayBuffer;
};
export type DistrictCenter = {
  center: THREE.Vector3;
  minMax: THREE.Vector4;
  origin: THREE.Vector3;
};

export type ModalType =
  | "alert"
  | "confirm"
  | "select-district"
  | "custom-district";
export type Modal = {
  type: ModalType;
  data: unknown;
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

type NodeProperties<T extends Transform | TransformParsed> = T & {
  id: string;
  label: string;
  type: "group" | "instance";
  parent: string;
  virtual?: boolean;
  pattern?: T & PatternProperties;
};
type PatternProperties = {
  count: number;
  enabled: boolean;
};

export type MapNode = NodeProperties<Transform>;
export type MapNodeParsed = NodeProperties<TransformParsed>;

export type InstancedMeshTransforms = {
  id?: string;
  virtual?: boolean;
  position: { x: number; y: number; z: number; w: number };
  orientation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number; w: number };
};

export type AppStore = typeof store;
export type AppState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunkAction<ReturnType = void> = ThunkAction<
  ReturnType,
  AppState,
  unknown,
  UnknownAction
>;
