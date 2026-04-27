import * as THREE from "three";

import { NodesSelectors } from "../store/nodes.ts";
import type { AppStore, MapNode } from "../types/types.ts";
import selectedStateFactory from "../utilities/SelectedState.ts";
import { EXCLUDE_AO_LAYER } from "./constants.ts";
import { planeMaterial, spriteMaterial, spriteMaterial2 } from "./materials.ts";

type EventMap = THREE.Object3DEventMap & {
  /**
   * Fires when marker is added, selected, deselected, or removed
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  updated: {};
  /**
   * Dispatch onto this object to update markers size
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  zoomChanged: {};
};

const selectors = {
  selected: NodesSelectors.getSelectedNodes,
  pinned: NodesSelectors.getPinnedPlaneNode,
} as const;

class Markers extends THREE.Group<EventMap> {
  private readonly camera: THREE.OrthographicCamera;
  private readonly state: ReturnType<
    typeof selectedStateFactory<typeof selectors>
  >;
  private readonly plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    planeMaterial,
  );
  private markerNodes: MapNode[] = [];
  name = "Markers";

  constructor(store: AppStore, camera: THREE.OrthographicCamera) {
    super();

    this.state = selectedStateFactory(store, selectors);
    this.state.subscribe(this.update);

    this.plane.layers.set(EXCLUDE_AO_LAYER);
    this.plane.rotateX(-Math.PI / 2);
    this.plane.visible = false;
    this.add(this.plane);
    this.camera = camera;
    this.addEventListener("zoomChanged", this.update);
  }

  dispose() {
    this.removeEventListener("zoomChanged", this.update);
    this.state.dispose();
    this.children.forEach((child) => {
      (child as THREE.Mesh | THREE.Sprite).geometry.dispose();
    });
  }

  private update = () => {
    this.clear();
    this.add(this.plane);
    this.plane.visible = false;

    for (const marker of this.markerNodes) {
      const sprite = new THREE.Sprite(spriteMaterial.clone());
      const scale = 100 / this.camera.zoom / window.devicePixelRatio;
      const color = this.state.selected.includes(marker.id)
        ? 0xff88ff
        : 0x00ffff;
      sprite.scale.set(scale, scale, 1);
      sprite.position.set(
        marker.position[0],
        marker.position[2],
        -marker.position[1],
      );
      sprite.material.color.set(color);
      sprite.layers.set(EXCLUDE_AO_LAYER);
      const spriteCopy = sprite.clone();
      spriteCopy.material = spriteMaterial2.clone();
      spriteCopy.material.color.set(color);
      this.add(sprite, spriteCopy);
    }

    if (this.state.pinned) {
      const marker = this.markerNodes.find((m) => m.id === this.state.pinned);
      if (marker) {
        const [x, y, z] = marker.position;
        this.plane.visible = true;
        this.plane.position.copy(new THREE.Vector3(x, z, -y));
      }
    }

    this.dispatchEvent({ type: "updated" });
  };

  setMarkers(markerNodes: MapNode[]) {
    this.markerNodes = markerNodes;
    this.update();
  }
}

export default Markers;
