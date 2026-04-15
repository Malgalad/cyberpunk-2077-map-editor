import * as THREE from "three";

class Map3DLights {
  readonly group = new THREE.Group();

  constructor() {
    this.group.name = "Lights";

    const ambient = new THREE.AmbientLight(0xffffff, 0.33);
    this.group.add(ambient);

    const light1 = new THREE.DirectionalLight(0xffffff);
    light1.position.set(1, 1, 1);
    this.group.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
    light2.position.set(-1, 1, 1);
    this.group.add(light2);
  }

  dispose() {}

  render() {}
}

export default Map3DLights;
