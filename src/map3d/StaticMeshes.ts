import * as THREE from "three";

import { KNOWN_MESHES } from "../constants.ts";
import { OptionsSelectors } from "../store/options.ts";
import type { AppStore, DefaultMeshNames } from "../types/types.ts";
import selectedStateFactory from "../utilities/SelectedState.ts";
import { decodeDRC } from "./importDRC.ts";
import * as materials from "./materials.ts";
import { importMesh } from "./utils.ts";
import { validateMeshGeometry } from "./validateMeshGeometry.ts";

type EventMap = THREE.Object3DEventMap & {
  /**
   * Fires when child mesh geometry or visibility changes
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  updated: {};
};

interface MeshLoaders {
  mesh: typeof importMesh;
  geometry: typeof decodeDRC;
}

interface MeshOverride {
  geometry: THREE.BufferGeometry;
  filename: string;
}

interface MeshEntry {
  meshes: THREE.Mesh[];
  ready: Promise<void>;
  original?: THREE.BufferGeometry;
  override?: MeshOverride;
  request: number;
  error?: string;
}

export interface MeshOverrideStatus {
  name: DefaultMeshNames;
  filename?: string;
}

const materialsMap: Record<string, THREE.Material | THREE.Material[]> = {
  terrain_mesh: materials.terrainMaterial,
  "3dmap_cliffs": materials.terrainMaterial,
  "3dmap_roads": [materials.roadsMaterial, materials.roadsMaterial2],
  "3dmap_roads_borders": materials.roadsBordersMaterial,
  "3dmap_metro": materials.experimentalMetroMaterial,
  water_mesh: materials.waterMaterial,
  northoak_sign_a: materials.statuesMaterial,
  monument_ave_pyramid: materials.statuesMaterial,
  obelisk: materials.statuesMaterial,
  cz_cz_building_h_icosphere: materials.statuesMaterial,
  statue_splash_a: materials.statuesMaterial,
  ferris_wheel_pacifica: materials.statuesMaterial,
  ferris_wheel_collapsed: materials.statuesMaterial,
  ext_monument_av_building_b: materials.statuesMaterial,
};

const selectors = {
  meshes: OptionsSelectors.getVisibleMeshes,
};

class StaticMeshes extends THREE.Group<EventMap> {
  private readonly state: ReturnType<
    typeof selectedStateFactory<typeof selectors>
  >;
  private readonly entries = new Map<DefaultMeshNames, MeshEntry>();
  private readonly disposedGeometries = new WeakSet<THREE.BufferGeometry>();
  private readonly loaders: MeshLoaders;
  private disposed = false;
  private statuses: MeshOverrideStatus[] = [];
  name = "StaticMeshes";

  constructor(
    store: AppStore,
    loaders: MeshLoaders = { mesh: importMesh, geometry: decodeDRC },
  ) {
    super();

    this.loaders = loaders;
    this.state = selectedStateFactory(store, selectors);
    this.state.subscribe(this.update);

    for (const name of KNOWN_MESHES) {
      const entry: MeshEntry = {
        meshes: [],
        ready: Promise.resolve(),
        request: 0,
      };
      this.entries.set(name, entry);
      entry.ready = this.loadDefault(name, entry);
    }
    this.updateStatuses();
  }

  private async loadDefault(name: DefaultMeshNames, entry: MeshEntry) {
    try {
      const targetMaterials = [materialsMap[name]].flat();
      const mesh = await this.loaders.mesh(name, targetMaterials[0]);
      if (this.disposed) {
        this.disposeGeometry(mesh.geometry);
        return;
      }
      entry.original = mesh.geometry;
      entry.meshes = targetMaterials.map((material, index) => {
        const pass = index === 0 ? mesh : mesh.clone();
        pass.material = material;
        this.add(pass);
        return pass;
      });
      this.update();
    } catch {
      entry.error =
        "Could not load the default mesh. Reload the page and try again.";
    }
  }

  getOverrideStatuses = () => this.statuses;

  subscribeOverrides = (listener: () => void) => {
    this.addEventListener("updated", listener);
    return () => this.removeEventListener("updated", listener);
  };

  async applyOverride(name: DefaultMeshNames, file: File, signal: AbortSignal) {
    const entry = this.entries.get(name);
    if (!entry) throw new Error("Choose a default mesh to override.");
    if (this.disposed || signal.aborted) return false;
    if (!/\.drc$/i.test(file.name))
      throw new Error("Choose a Draco (.drc) file.");
    if (file.size === 0) throw new Error("The selected file is empty.");

    const request = ++entry.request;
    const isCurrent = () =>
      !this.disposed && !signal.aborted && entry.request === request;
    let geometry: THREE.BufferGeometry | undefined;
    try {
      await entry.ready;
      if (!isCurrent()) return false;
      if (entry.error) throw new Error(entry.error);
      const buffer = await file.arrayBuffer();
      if (!isCurrent()) return false;
      geometry = await this.loaders.geometry(buffer);
      if (!isCurrent()) return false;
      validateMeshGeometry(name, geometry);

      const previous = entry.override;
      for (const mesh of entry.meshes) mesh.geometry = geometry;
      entry.override = { geometry, filename: file.name };
      geometry = undefined;
      this.disposeGeometry(previous?.geometry);
      this.updateStatuses();
      this.update();
      return true;
    } catch (error) {
      if (!isCurrent()) return false;
      throw error;
    } finally {
      this.disposeGeometry(geometry);
    }
  }

  restoreDefault(name: DefaultMeshNames) {
    const entry = this.entries.get(name);
    if (!entry || this.disposed) return;
    this.restoreEntry(entry);
    this.updateStatuses();
    this.update();
  }

  resetOverrides = () => {
    if (this.disposed) return;
    this.entries.forEach((entry) => this.restoreEntry(entry));
    this.updateStatuses();
    this.update();
  };

  private restoreEntry(entry: MeshEntry) {
    entry.request++;
    const original = entry.original;
    if (original) entry.meshes.forEach((mesh) => (mesh.geometry = original));
    this.disposeGeometry(entry.override?.geometry);
    entry.override = undefined;
  }

  private updateStatuses() {
    this.statuses = Array.from(this.entries, ([name, entry]) => ({
      name,
      filename: entry.override?.filename,
    }));
  }

  private disposeGeometry(geometry?: THREE.BufferGeometry) {
    // Separate targets can share a decoded default (the two Ferris Wheels).
    if (!geometry || this.disposedGeometries.has(geometry)) return;
    this.disposedGeometries.add(geometry);
    geometry.dispose();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.state.dispose();
    this.entries.forEach((entry) => {
      this.disposeGeometry(entry.original);
      this.disposeGeometry(entry.override?.geometry);
    });
    this.entries.clear();
    this.clear();
  }

  private update = () => {
    this.children.forEach((child) => {
      child.visible = this.state.meshes.includes(child.name);
    });
    this.dispatchEvent({ type: "updated" });
  };
}

export default StaticMeshes;
