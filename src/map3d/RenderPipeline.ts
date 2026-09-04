import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import { OptionsSelectors } from "../store/options.ts";
import type { AppStore } from "../types/types.ts";
import selectedStateFactory from "../utilities/SelectedState.ts";
import { EXCLUDE_AO_LAYER } from "./constants.ts";

const selectors = {
  effects: OptionsSelectors.getEffects,
};

class RenderPipeline extends EffectComposer {
  private readonly state: ReturnType<
    typeof selectedStateFactory<typeof selectors>
  >;

  constructor({
    camera,
    renderer,
    scene,
    store,
  }: {
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    store: AppStore;
  }) {
    super(renderer);

    this.state = selectedStateFactory(store, selectors);
    this.state.subscribe(this.update);

    const canvas = this.renderer.domElement;

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    this.setPixelRatio(window.devicePixelRatio);
    this.setSize(canvas.clientWidth, canvas.clientHeight);

    this.addPass(new RenderPass(scene, camera));
    this.addPass(
      this.configureGTAO(
        new GTAOPass(scene, camera, canvas.width, canvas.height),
      ),
    );
    this.addPass(new SMAAPass());
    this.addPass(new OutputPass());
    this.update();

    window.addEventListener("resize", this.onWindowResize);
  }

  dispose() {
    window.removeEventListener("resize", this.onWindowResize);
    this.state.dispose();
    this.renderer.dispose();
    this.passes.forEach((pass) => {
      pass.dispose();
    });
    super.dispose();
  }

  private configureGTAO = (gtaoPass: GTAOPass) => {
    const render = gtaoPass.render.bind(gtaoPass);
    const camera = gtaoPass.camera;

    gtaoPass.render = (...args) => {
      camera.layers.disable(EXCLUDE_AO_LAYER);
      render.call(null, ...args);
      camera.layers.enable(EXCLUDE_AO_LAYER);
    };
    gtaoPass.updateGtaoMaterial({
      radius: 5,
      distanceExponent: 1,
      thickness: 128,
      scale: 1.5,
      samples: 8,
      distanceFallOff: 0.6,
      screenSpaceRadius: false,
    });

    return gtaoPass;
  };

  private update = () => {
    this.passes.forEach((pass) => {
      if (pass instanceof GTAOPass) {
        pass.enabled = this.state.effects.includes("ao");
      }

      if (pass instanceof SMAAPass) {
        pass.enabled = this.state.effects.includes("aa");
      }
    });

    this.render();
  };

  private onWindowResize = () => {
    const canvas = this.renderer.domElement;
    const parent = canvas.parentElement;

    if (!parent) return;

    const width =
      document.fullscreenElement === canvas
        ? window.screen.width
        : parent.clientWidth;
    const height =
      document.fullscreenElement === canvas
        ? window.screen.height
        : parent.clientHeight;

    this.renderer.setSize(width, height);
    this.setSize(width, height);
    this.render();
  };
}

export default RenderPipeline;
