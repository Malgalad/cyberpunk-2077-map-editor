import * as THREE from "three";

import { NodesSelectors } from "../store/nodes.ts";
import { ProjectSelectors } from "../store/project.ts";
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
};

const selectors = {
  selected: NodesSelectors.getSelectedNodes,
  pinned: NodesSelectors.getPinnedPlaneNode,
  tool: ProjectSelectors.getTool,
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
    this.state.subscribe(this.onUpdate);

    this.plane.layers.set(EXCLUDE_AO_LAYER);
    this.plane.rotateX(-Math.PI / 2);
    this.plane.visible = false;
    this.add(this.plane);
    this.camera = camera;
  }

  dispose() {
    this.state.dispose();
    this.children.forEach((child) => {
      (child as THREE.Mesh | THREE.Sprite).geometry.dispose();
    });
  }

  onUpdate = () => {
    this.clear();
    this.add(this.plane);
    this.plane.visible = false;
    const selectable = this.state.tool === "select";

    for (const marker of this.markerNodes) {
      const sprite = new THREE.Sprite(spriteMaterial.clone());
      const scale = 150 / this.camera.zoom / window.devicePixelRatio;
      const isSelected = this.state.selected.includes(marker.id);
      const isHovered =
        (this.userData.intersection as undefined | THREE.Intersection)?.object
          .userData.id === marker.id && selectable;
      const color = isSelected ? 0xff88ff : isHovered ? 0xffffff : 0x00ffff;
      sprite.scale.set(scale, scale, 1);
      sprite.position.set(
        marker.position[0],
        marker.position[2],
        -marker.position[1],
      );
      sprite.material.color.set(color);
      sprite.layers.set(EXCLUDE_AO_LAYER);
      sprite.userData.id = marker.id;
      sprite.userData.viable = true;
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
    this.onUpdate();
  }
}

export default Markers;
