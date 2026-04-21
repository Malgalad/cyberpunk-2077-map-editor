import * as THREE from "three";

class Lights extends THREE.Group {
  name = "Lights";

  constructor() {
    super();

    const ambient = new THREE.AmbientLight(0xffffff, 0.33);
    this.add(ambient);

    const light1 = new THREE.DirectionalLight(0xffffff);
    light1.position.set(1, 1, 1);
    this.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
    light2.position.set(-1, 1, 1);
    this.add(light2);
  }

  dispose() {
    this.children.forEach((child) => {
      (child as THREE.Light).dispose();
    });
  }
}

export default Lights;
