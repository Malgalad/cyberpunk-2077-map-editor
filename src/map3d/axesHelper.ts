import * as THREE from "three";

class AxesHelper extends THREE.LineSegments {
  constructor(size = 1) {
    // prettier-ignore
    const vertices = [
      0, 0, 0,	size, 0, 0,
      0, 0, 0,	0, size, 0,
      0, 0, 0,	0, 0, -size
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

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      toneMapped: false,
    });

    super(geometry, material);
  }

  dispose() {
    this.geometry.dispose();
    if (this.material instanceof THREE.Material) this.material.dispose();
  }
}

export default AxesHelper;
