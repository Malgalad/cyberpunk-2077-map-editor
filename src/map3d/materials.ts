import * as THREE from "three";

export const buildingsMaterial = new THREE.MeshLambertMaterial({
  color: 0xba1c1f,
});

export const editorMaterial = new THREE.MeshLambertMaterial({
  color: 0xffffff,
});

export const virtualBlocksMaterial = new THREE.MeshBasicMaterial({
  color: 0xffff00,
  wireframe: true,
});

// buildingsMaterial.onBeforeCompile = (shader) => {
//   shader.uniforms.vColorBase = { value: new THREE.Color("#5a262e") };
//   shader.uniforms.vColorUp = { value: new THREE.Color("#ff375a") };
//   shader.uniforms.vMaxHeight = { value: 400.0 };
//   shader.vertexShader = shader.vertexShader
//     .replace(
//       "#define LAMBERT\nvarying vec3 vViewPosition;\n",
//       // -
//       "#define LAMBERT\nvarying vec3 vViewPosition;\n" + "varying vec4 vPos;\n",
//     )
//     .replace(
//       "void main() {\n",
//       // -
//       "void main() {\n" +
//         "\t#ifdef USE_INSTANCING\n" +
//         "\t\tvPos = instanceMatrix * vec4(position, 1.0);\n" +
//         "\t#else\n" +
//         "\t\tvPos = vec4(position, 1.0);\n" +
//         "\t#endif\n",
//     );
//   shader.fragmentShader = shader.fragmentShader
//     .replace(
//       "#define LAMBERT\n",
//       // -
//       "#define LAMBERT\n" +
//         "uniform vec3 vColorBase;\n" +
//         "uniform vec3 vColorUp;\n" +
//         "uniform float vMaxHeight;\n" +
//         "varying vec4 vPos;\n",
//     )
//     .replace(
//       "\tvec4 diffuseColor = vec4( diffuse, opacity );\n",
//       // -
//       "\tfloat colorMix = 1.0 - pow( 1.0 - clamp(vPos.y / vMaxHeight, 0.0, 1.0), 3.0 );\n" +
//         "\tvec4 diffuseColor = vec4( mix(vColorBase, vColorUp, colorMix), opacity );\n",
//     );
//   buildingsMaterial.userData.shader = shader;
// };

export const terrainMaterial = new THREE.MeshPhongMaterial({
  color: 0x051b4f,
});

export const roadsMaterial = new THREE.MeshBasicMaterial({
  color: 0x09b3f9,
  opacity: 0.5,
  transparent: true,
});

export const roadsBordersMaterial = new THREE.MeshBasicMaterial({
  color: 0x09b3f9,
  opacity: 0.8,
  transparent: true,
});

export const metroMaterial = new THREE.MeshBasicMaterial({
  color: 0xf0f0f0,
  opacity: 0.67,
  transparent: true,
});

export const waterMaterial = new THREE.MeshLambertMaterial({
  color: 0x003779,
});
