import * as THREE from "three";

import { MARKER_ID } from "../constants.ts";
import { NodesSelectors } from "../store/nodes.ts";
import type { AppStore } from "../types/types.ts";
import { applyTransforms } from "../utilities/getTransformsFromSubtree.ts";
import selectedStateFactory from "../utilities/SelectedState.ts";

const material = new THREE.LineBasicMaterial({
  vertexColors: true,
  toneMapped: false,
  depthTest: false,
  depthWrite: false,
  transparent: true,
});

const selectors = {
  selected: NodesSelectors.getSelectedNodes,
  nodes: NodesSelectors.getNodes,
} as const;

class Helper extends THREE.LineSegments {
  private readonly state: ReturnType<
    typeof selectedStateFactory<typeof selectors>
  >;
  private readonly camera: THREE.OrthographicCamera;

  constructor(store: AppStore, camera: THREE.OrthographicCamera) {
    // prettier-ignore
    const vertices = [
      0, 0, 0,	1, 0, 0,
      0, 0, 0,	0, 1, 0,
      0, 0, 0,	0, 0, -1
    ];

    // prettier-ignore
    const colors = [
      1, 0, 0,	1, 0, 0,
      0, 0, 1,	0, 0, 1,
      0, 1, 0,	0, 1, 0
    ];

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    super(geometry, material);

    this.state = selectedStateFactory(store, selectors);
    this.state.subscribe(this.onUpdate);
    this.camera = camera;
    this.renderOrder = 999;
  }

  dispose() {
    this.geometry.dispose();
  }

  onUpdate = () => {
    const { selected, nodes } = this.state;
    const node = selected.length === 1 ? nodes[selected[0]] : undefined;

    if (!node || node.district === MARKER_ID) {
      this.visible = false;
      return;
    }

    this.visible = true;
    const transform = applyTransforms(nodes, node);
    const scale = 750 / this.camera.zoom / window.devicePixelRatio;

    this.position.set(
      transform.position[0],
      transform.position[2],
      -transform.position[1],
    );
    this.scale.set(scale, scale, scale);
    this.rotation.set(
      transform.rotation[0],
      transform.rotation[2],
      -transform.rotation[1],
    );
  };
}

export default Helper;
