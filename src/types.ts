import type { ThunkAction, UnknownAction } from "@reduxjs/toolkit";
import type * as THREE from "three";

import mapData from "./mapData.min.json";
import store from "./store/store.ts";

export type MapData = typeof mapData;
export type Districts = MapData["soup"];
export type District = Districts[keyof Districts];

export type ModalType = "alert" | "confirm" | "select-district";
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

export type MapNode = Transform & {
  id: string;
  label: string;
  type: "group" | "instance";
  parent: string;
  pattern?: Transform & {
    count: number;
    enabled: boolean;
  };
};
export type MapNodeParsed = TransformParsed & {
  id: string;
  label: string;
  type: "group" | "instance";
  parent: string;
  pattern?: TransformParsed & {
    count: number;
    enabled: boolean;
  };
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
