import type { ThunkAction, UnknownAction } from "@reduxjs/toolkit";
import type * as THREE from "three";

import mapData from "../mapData.min.json";
import store from "../store/store.ts";

export type NestedArray<T> = T | NestedArray<T>[];
export type Optional<T, K extends keyof T> = Partial<T> & Pick<T, K>;
export type Tuple3<T> = [T, T, T];
export type Vector3 = Tuple3<number>;

export type Axis = "X" | "Y" | "Z";
export type Plane = "XY" | "XZ" | "YZ";

export type DefaultDistrictNames = keyof (typeof mapData)["soup"];
export type DefaultMeshNames = keyof (typeof mapData)["meshes"];
export type DistrictProperties = {
  name: string;
  position: THREE.Vector3Tuple;
  orientation: THREE.QuaternionTuple;
  transMin: THREE.Vector4Tuple;
  transMax: THREE.Vector4Tuple;
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
  height: number;
};
export type District = DistrictProperties & ComputedDistrictProperties;

// InstancedMeshTransforms are relative to to district position
export type InstancedMeshTransforms = {
  id: string;
  virtual: boolean;
  originId: string | null;
  index: number;
  position: THREE.Vector4Like;
  orientation: THREE.Vector4Like;
  scale: THREE.Vector4Like;
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
  nodes: {
    nodes: AppState["present"]["nodes"]["nodes"];
    selected: AppState["present"]["nodes"]["selected"];
  };
  options: AppState["present"]["options"];
  project: AppState["present"]["project"];
};
export type RevivedAppState = {
  district: AppState["present"]["district"];
  nodes: {
    nodes: AppState["present"]["nodes"]["nodes"];
    selected: AppState["present"]["nodes"]["selected"];
  };
  options: AppState["present"]["options"];
  project: AppState["present"]["project"];
};

export type TransformV2 = {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  mirror: Plane | null;
};
// MapNodes use absolute position
export type MapNodeV2 = TransformV2 & {
  id: string;
  label: string;
  type: "group" | "instance";
  tag: "create" | "update" | "delete";
  parent: string | null;
  district: string;
  indexInDistrict: number;
  hidden: boolean;
  virtual?: boolean;
  originId?: string;
  pattern?: TransformV2 & {
    count: number;
  };
};
export type NodesMap = Record<string, MapNodeV2>;

export type TreeNode = {
  id: string;
  type: "group" | "instance";
  children: TreeNode[];
  weight: number;
};
export type TreeRoot =
  | {
      id: string;
      type: "district";
      create: TreeNode[];
      update: TreeNode[];
      delete: TreeNode[];
    }
  | {
      id: string;
      type: "template";
      children: TreeNode[];
    };
export type NodesTree = Record<string, TreeRoot>;
export type NodesIndexIntermediate = Record<
  string,
  {
    treeNode: TreeNode | TreeRoot;
    descendantIds: NestedArray<string>[];
    ancestorIds: NestedArray<string>[];
  }
>;
export type NodesIndex = Record<
  string,
  {
    treeNode: TreeNode | TreeRoot;
    descendantIds: string[];
    ancestorIds: string[];
  }
>;
