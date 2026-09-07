import assert from "node:assert/strict";
import { test } from "node:test";

import { createJiti } from "jiti";
import * as THREE from "three";
import { WebGLAttributes } from "three/src/renderers/webgl/WebGLAttributes.js";

const jiti = createJiti(import.meta.url);
const { createDistrictMesh } = await jiti.import(
  "../src/map3d/createDistrictMesh.ts",
);
const { addInstanceUpdateRange } = await jiti.import(
  "../src/map3d/addInstanceUpdateRange.ts",
);
const district = {
  name: "instance-updates",
  isCustom: true,
  position: [0, 0, 0],
  transMin: [0, 0, 0, 0],
};
const idle = new THREE.Color(0xffa500);
const selected = new THREE.Color(0x00ff00);
const transform = (index) => ({
  id: `instance-${index}`,
  originId: null,
  position: { x: index, y: 0, z: 0, w: 1 },
  orientation: { x: 0, y: 0, z: 0, w: 1 },
  scale: { x: 2, y: 2, z: 2, w: 1 },
});

function uploadProbe() {
  const writes = [];
  const gl = {
    FLOAT: 5126,
    createBuffer: () => ({}),
    bindBuffer: () => undefined,
    bufferData: (target, array) => writes.push({ bytes: array.byteLength }),
    bufferSubData: (
      target,
      byteOffset,
      array,
      start = 0,
      count = array.length - start,
    ) => writes.push({ byteOffset, bytes: count * array.BYTES_PER_ELEMENT }),
  };
  const attributes = WebGLAttributes(gl);
  return {
    writes,
    upload(mesh) {
      attributes.update(mesh.instanceMatrix, 34962);
      if (mesh.instanceColor) attributes.update(mesh.instanceColor, 34962);
    },
  };
}

function fixture(t, count = 6, color = idle) {
  const material = new THREE.MeshBasicMaterial();
  const instances = Array.from({ length: count }, (_, index) =>
    transform(index),
  );
  const mesh = createDistrictMesh(null, district, instances, material, color);
  t.after(() => {
    mesh.dispose();
    mesh.geometry.dispose();
    material.dispose();
  });
  const probe = uploadProbe();
  probe.upload(mesh);
  probe.writes.length = 0;
  return { mesh, instances, material, probe };
}

test("unchanged instances preserve indexes and trigger no uploads", (t) => {
  const { mesh, instances, material, probe } = fixture(t);
  const ids = mesh.userData.ids;
  createDistrictMesh(mesh, district, instances.slice(), material, idle);
  probe.upload(mesh);
  assert.equal(mesh.userData.ids, ids);
  assert.deepEqual(probe.writes, []);
});

test("one moved instance uploads only its matrix and preserves its color", (t) => {
  const { mesh, instances, material, probe } = fixture(t);
  const ids = mesh.userData.ids;
  const next = instances.slice();
  next[2] = { ...next[2], position: { x: 77, y: 0, z: 0, w: 1 } };
  createDistrictMesh(mesh, district, next, material, idle);
  probe.upload(mesh);
  assert.equal(mesh.userData.ids, ids);
  assert.deepEqual(probe.writes, [{ byteOffset: 2 * 64, bytes: 64 }]);
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(2, matrix);
  assert.equal(matrix.elements[12], 77);
});

test("pending sparse and adjacent edits survive multiple updates before upload", (t) => {
  const { mesh, instances, material, probe } = fixture(t);
  const first = instances.map((value, index) =>
    index === 4 ? { ...value, position: { ...value.position, x: 40 } } : value,
  );
  createDistrictMesh(mesh, district, first, material, idle);
  const second = first.map((value, index) =>
    index === 1 || index === 2
      ? { ...value, position: { ...value.position, x: index * 10 } }
      : value,
  );
  createDistrictMesh(mesh, district, second, material, idle);
  assert.equal(mesh.instanceMatrix.updateRanges.length, 2);
  probe.upload(mesh);
  assert.deepEqual(probe.writes, [
    { byteOffset: 64, bytes: 128 },
    { byteOffset: 256, bytes: 64 },
  ]);
  assert.deepEqual(mesh.instanceMatrix.updateRanges, []);
});

test("reordering instances rebuilds indexes and moves their existing colors", (t) => {
  const { mesh, instances, material, probe } = fixture(t);
  mesh.setColorAt(1, selected);
  mesh.userData.colors[instances[1].id] = selected;
  const ids = mesh.userData.ids;
  const reordered = [instances[1], instances[0], ...instances.slice(2)];
  createDistrictMesh(mesh, district, reordered, material, idle);
  probe.upload(mesh);
  assert.notEqual(mesh.userData.ids, ids);
  assert.deepEqual(mesh.userData.ids[instances[1].id], [0]);
  assert.deepEqual(mesh.userData.ids[instances[0].id], [1]);
  const color = new THREE.Color();
  mesh.getColorAt(0, color);
  assert.ok(color.equals(selected));
  assert.deepEqual(probe.writes, [
    { byteOffset: 0, bytes: 128 },
    { byteOffset: 0, bytes: 24 },
  ]);
});

test("origin changes and repeated origins produce the correct index lists", (t) => {
  const { mesh, instances, material, probe } = fixture(t, 2000);
  const copies = instances.map((value) => ({ ...value, originId: "source" }));
  createDistrictMesh(mesh, district, copies, material, idle);
  assert.deepEqual(
    mesh.userData.ids.source,
    copies.map((_, index) => index),
  );
  const ids = mesh.userData.ids;
  createDistrictMesh(mesh, district, copies.slice(), material, idle);
  assert.equal(mesh.userData.ids, ids);
  probe.upload(mesh);
  assert.equal(probe.writes.length, 1);
});

test("shrinking clears only removed slots and keeps uncolored meshes uncolored", (t) => {
  for (const color of [idle, null]) {
    const { mesh, instances, material, probe } = fixture(t, 6, color);
    createDistrictMesh(mesh, district, instances.slice(0, 4), material, color);
    probe.upload(mesh);
    assert.deepEqual(probe.writes, [
      { byteOffset: 4 * 64, bytes: 2 * 64 },
      ...(color ? [{ byteOffset: 4 * 12, bytes: 2 * 12 }] : []),
    ]);
    assert.equal(mesh.userData.ids[instances[4].id], undefined);
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(4, matrix);
    assert.deepEqual(matrix.elements.slice(0, 15), Array(15).fill(0));
    if (!color) assert.equal(mesh.instanceColor, null);
  }
});

test("appending within capacity uploads only the new slots", (t) => {
  const { mesh, instances, material, probe } = fixture(t);
  const next = [...instances, transform(6), transform(7)];
  assert.equal(createDistrictMesh(mesh, district, next, material, idle), mesh);
  probe.upload(mesh);
  assert.deepEqual(probe.writes, [
    { byteOffset: 6 * 64, bytes: 2 * 64 },
    { byteOffset: 6 * 12, bytes: 2 * 12 },
  ]);
  assert.deepEqual(mesh.userData.ids[next[7].id], [7]);
});

test("capacity growth uploads the replacement buffers and preserves colors", (t) => {
  const { mesh, instances, material, probe } = fixture(t, 1000);
  mesh.userData.colors[instances[1].id] = selected;
  const replacement = createDistrictMesh(
    mesh,
    district,
    [...instances, transform(1000)],
    material,
    idle,
  );
  t.after(() => {
    replacement.dispose();
    replacement.geometry.dispose();
  });
  assert.notEqual(replacement, mesh);
  probe.upload(replacement);
  assert.deepEqual(probe.writes, [{ bytes: 2000 * 64 }, { bytes: 2000 * 12 }]);
  assert.deepEqual(replacement.instanceMatrix.updateRanges, []);
  assert.deepEqual(replacement.instanceColor.updateRanges, []);
  const color = new THREE.Color();
  replacement.getColorAt(1, color);
  assert.ok(color.equals(selected));
});

test("pending color edits accumulate without uploading matrices", (t) => {
  const { mesh, probe } = fixture(t);
  for (const [index, color] of [
    [1, selected],
    [1, idle],
    [3, selected],
    [3, new THREE.Color(0xa500ff)],
  ]) {
    mesh.setColorAt(index, color);
    addInstanceUpdateRange(mesh.instanceColor, index);
    mesh.instanceColor.needsUpdate = true;
  }
  probe.upload(mesh);
  assert.deepEqual(probe.writes, [
    { byteOffset: 12, bytes: 12 },
    { byteOffset: 36, bytes: 12 },
  ]);
  const color = new THREE.Color();
  mesh.getColorAt(3, color);
  const expected = new THREE.Color(0xa500ff);
  assert.equal(color.r, Math.fround(expected.r));
  assert.equal(color.g, Math.fround(expected.g));
  assert.equal(color.b, Math.fround(expected.b));
});

function boundsClock(t) {
  let now = 0;
  const pending = new Set();
  t.mock.method(globalThis, "setTimeout", (callback, delay) => {
    const timer = { callback, time: now + delay };
    pending.add(timer);
    return timer;
  });
  t.mock.method(globalThis, "clearTimeout", (timer) => pending.delete(timer));
  return (elapsed) => {
    now += elapsed;
    for (const timer of pending) {
      if (timer.time <= now) {
        pending.delete(timer);
        timer.callback();
      }
    }
  };
}

function assertBoundsContainInstances(mesh) {
  const matrix = new THREE.Matrix4();
  const sphere = new THREE.Sphere();
  for (let index = 0; index < mesh.count; index++) {
    mesh.getMatrixAt(index, matrix);
    sphere.copy(mesh.geometry.boundingSphere).applyMatrix4(matrix);
    assert.ok(
      sphere.center.distanceTo(mesh.boundingSphere.center) + sphere.radius <=
        mesh.boundingSphere.radius + 1e-7,
      `instance ${index} is outside the mesh bounds`,
    );
  }
}

test("sparse transform edits expand bounds without scanning unchanged matrices", (t) => {
  boundsClock(t);
  const { mesh, instances, material } = fixture(t);
  const oldBounds = mesh.boundingSphere.clone();
  const reads = t.mock.method(mesh, "getMatrixAt");
  const rebuilds = t.mock.method(mesh, "computeBoundingSphere");
  const next = instances.slice();
  const rotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0.2, 0.7, 0.4),
  );
  next[2] = {
    ...next[2],
    position: { x: 1000000.1, y: 40.2, z: 50.3, w: 1 },
    orientation: rotation,
    scale: { x: 4.1, y: 8.2, z: 16.3, w: 1 },
  };
  createDistrictMesh(mesh, district, next, material, idle);
  assert.equal(rebuilds.mock.callCount(), 0);
  assert.equal(reads.mock.callCount(), 1);
  assertBoundsContainInstances(mesh);

  mesh.updateMatrixWorld(true);
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(2, matrix);
  const center = new THREE.Vector3().setFromMatrixPosition(matrix);
  const eye = center.clone().add(new THREE.Vector3(0, 100, 0));
  const ray = new THREE.Raycaster(eye, new THREE.Vector3(0, -1, 0));
  assert.ok(ray.intersectObject(mesh).some((hit) => hit.instanceId === 2));
  const camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 200);
  camera.position.copy(eye);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ),
  );
  assert.equal(frustum.intersectsSphere(oldBounds), false);
  assert.equal(frustum.intersectsObject(mesh), true);
});

test("bounds tighten once after editing settles and unchanged updates do not delay it", (t) => {
  const advance = boundsClock(t);
  const { mesh, instances, material } = fixture(t);
  const original = mesh.boundingSphere.clone();
  const rebuilds = t.mock.method(mesh, "computeBoundingSphere");
  const moved = instances.slice();
  moved[0] = { ...moved[0], position: { x: 10000, y: 0, z: 0, w: 1 } };
  createDistrictMesh(mesh, district, moved, material, idle);
  advance(200);
  createDistrictMesh(mesh, district, instances, material, idle);
  advance(100);
  assert.equal(rebuilds.mock.callCount(), 0);
  assert.ok(mesh.boundingSphere.radius > original.radius * 100);
  createDistrictMesh(mesh, district, instances.slice(), material, idle);
  advance(150);
  assert.equal(rebuilds.mock.callCount(), 1);
  assert.ok(mesh.boundingSphere.equals(original));
  advance(1000);
  assert.equal(rebuilds.mock.callCount(), 1);
});

test("removal includes collapsed slots at the origin before deferred rebuilding", (t) => {
  const advance = boundsClock(t);
  const { mesh, instances, material } = fixture(t, 1000);
  const shifted = instances.map((value) => ({
    ...value,
    position: { ...value.position, x: value.position.x + 10000 },
  }));
  createDistrictMesh(mesh, district, shifted, material, idle);
  advance(250);
  assert.equal(mesh.boundingSphere.containsPoint(new THREE.Vector3()), false);
  const rebuilds = t.mock.method(mesh, "computeBoundingSphere");
  createDistrictMesh(mesh, district, shifted.slice(0, 999), material, idle);
  assert.equal(rebuilds.mock.callCount(), 0);
  assertBoundsContainInstances(mesh);
  advance(250);
  assert.equal(rebuilds.mock.callCount(), 1);
  assertBoundsContainInstances(mesh);
});

test("appended and hidden instances remain inside bounds during deferred rebuilding", (t) => {
  const advance = boundsClock(t);
  const { mesh, instances, material } = fixture(t);
  const next = [
    ...instances,
    { ...transform(6), position: { x: -1000, y: 500, z: 200, w: 1 } },
  ];
  createDistrictMesh(mesh, district, next, material, idle);
  assertBoundsContainInstances(mesh);
  const hidden = next.map((value) => ({
    ...value,
    scale: { x: 0, y: 0, z: 0, w: 0 },
  }));
  createDistrictMesh(mesh, district, hidden, material, idle);
  assertBoundsContainInstances(mesh);
  advance(250);
  assertBoundsContainInstances(mesh);
});

test("removing or disposing a mesh cancels its deferred bounds rebuild", (t) => {
  const advance = boundsClock(t);
  for (const cleanup of [
    (mesh) => mesh.dispose(),
    (mesh) => mesh.geometry.dispose(),
    (mesh) => mesh.removeFromParent(),
  ]) {
    const { mesh, instances, material } = fixture(t);
    new THREE.Group().add(mesh);
    const rebuilds = t.mock.method(mesh, "computeBoundingSphere");
    const moved = instances.slice();
    moved[0] = { ...moved[0], position: { x: 1000, y: 0, z: 0, w: 1 } };
    createDistrictMesh(mesh, district, moved, material, idle);
    cleanup(mesh);
    advance(250);
    assert.equal(rebuilds.mock.callCount(), 0);
  }
});
