import assert from "node:assert/strict";
import { test } from "node:test";

import { configureStore } from "@reduxjs/toolkit";
import { createJiti } from "jiti";
import undoable, { ActionCreators } from "redux-undo";
import * as THREE from "three";

const jiti = createJiti(import.meta.url);
const { transformsCacheMiddleware } = await jiti.import(
  "../src/store/transformsCacheMiddleware.ts",
);
const { fitBoxTransform } = await jiti.import(
  "../src/utilities/fitBoxTransform.ts",
);
const {
  applyTransforms,
  getTransformsFromSubtree,
  invalidateCachedTransforms,
} = await jiti.import("../src/utilities/getTransformsFromSubtree.ts");
const { buildSupportStructures, cloneNode, initNode, transplantNode } =
  await jiti.import("../src/utilities/nodes.ts");
const { getFinalDistrictTransformsFromNodes } = await jiti.import(
  "../src/utilities/district.ts",
);
const { encodeImageData, decodeImageData } = await jiti.import(
  "../src/map3d/processDDS.ts",
);
const { createDistrictMesh } = await jiti.import(
  "../src/map3d/createDistrictMesh.ts",
);
const {
  NodeSchemaV2,
  NodeSchemaV3,
  NodesStateSchemaV2,
  NodesStateSchemaV3,
  PersistentStateSchema,
} = await jiti.import("../src/types/schemas.ts");

const district = {
  name: "scaling-test",
  isCustom: true,
  position: [0, 0, 0],
  orientation: [0, 0, 0, 1],
  transMin: [0, 0, 0, 0],
  transMax: [1, 1, 1, 1],
  cubeSize: 0.5,
  minMax: { x: 1, y: 1, z: 1 },
  origin: { x: 0, y: 0, z: 0 },
  height: 2,
};
const vector = (values) => new THREE.Vector3().fromArray(values);
const quaternion = (rotation) =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));
const compose = (node) =>
  new THREE.Matrix4().compose(
    vector(node.position),
    quaternion(node.rotation),
    vector(node.scale),
  );
const close = (actual, expected, tolerance = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );
const closeVector = (actual, expected, tolerance = 1e-9) =>
  close(actual.distanceTo(expected), 0, tolerance);

function group(properties = {}) {
  return initNode({
    type: "group",
    tag: "create",
    district: district.name,
    position: [0, 0, 0],
    ...properties,
  });
}
function block(parent, properties = {}) {
  return initNode({
    type: "instance",
    tag: "create",
    district: district.name,
    position: [0, 0, 0],
    scale: [10, 1, 1],
    parent: parent.id,
    ...properties,
  });
}
function beam(parent, start, end) {
  const direction = vector(end).sub(vector(start));
  const euler = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      vector([1, 0, 0]),
      direction.clone().normalize(),
    ),
  );
  const rotation =
    direction.x === 0 && direction.y === 0
      ? [0, (-Math.sign(direction.z) * Math.PI) / 2, 0]
      : [euler.x, euler.y, euler.z];
  return block(parent, {
    position: vector(start).add(vector(end)).multiplyScalar(0.5).toArray(),
    rotation,
    scale: [direction.length(), 1, 1],
  });
}
function scene(items) {
  const nodes = Object.fromEntries(items.map((node) => [node.id, node]));
  const { tree, index } = buildSupportStructures(nodes);
  invalidateCachedTransforms(index, Object.keys(nodes));
  return {
    nodes,
    tree,
    index,
    transforms: getTransformsFromSubtree(
      district,
      nodes,
      tree[district.name].create,
    ),
  };
}
function fromTransform(transform) {
  const { position: p, orientation: q, scale: s } = transform;
  return new THREE.Matrix4().compose(
    new THREE.Vector3(p.x, p.y, p.z),
    new THREE.Quaternion(q.x, q.y, q.z, q.w),
    new THREE.Vector3(s.x, s.y, s.z),
  );
}
function corners(matrix) {
  return [-0.5, 0.5].flatMap((x) =>
    [-0.5, 0.5].flatMap((y) =>
      [-0.5, 0.5].map((z) => new THREE.Vector3(x, y, z).applyMatrix4(matrix)),
    ),
  );
}
function sameBox(actual, expected, tolerance = 1e-9) {
  const candidates = corners(expected);
  for (const point of corners(actual))
    assert.ok(
      candidates.some((candidate) => candidate.distanceTo(point) <= tolerance),
    );
}
function sameCenterline(actual, expected, axis = 0) {
  for (const end of [-0.5, 0.5]) {
    const point = new THREE.Vector3().setComponent(axis, end);
    closeVector(
      point.clone().applyMatrix4(actual),
      point.clone().applyMatrix4(expected),
    );
  }
}

test("a 12-edge cube stretches to twice its height and stays connected after parent rotation", () => {
  const parent = group({
    preserveShape: true,
    scale: [1, 1, 2],
    position: [30, 40, 50],
    rotation: [0.6, -0.8, 1.1],
  });
  const edges = [];
  for (let axis = 0; axis < 3; axis++) {
    for (const a of [0, 10])
      for (const b of [0, 10]) {
        const start = [0, 0, 0];
        start[(axis + 1) % 3] = a;
        start[(axis + 2) % 3] = b;
        const end = [...start];
        end[axis] = 10;
        edges.push(beam(parent, start, end));
      }
  }
  const { transforms } = scene([parent, ...edges]);
  assert.equal(transforms.length, 12);
  transforms.forEach((transform, index) => {
    const expected = compose(parent).multiply(compose(edges[index]));
    sameBox(fromTransform(transform), expected);
    sameCenterline(fromTransform(transform), expected);
    close(transform.scale.x, index < 8 ? 10 : 20);
    close(transform.scale.y * transform.scale.z, index < 8 ? 2 : 1);
  });
});

test("a diagonal beam balances the sheared ends instead of enclosing every corner", () => {
  const parent = group({ preserveShape: true, scale: [2, 1, 1] });
  const child = block(parent, {
    position: [3, 4, 5],
    rotation: [0, 0, Math.PI / 4],
  });
  const {
    transforms: [result],
  } = scene([parent, child]);
  close(result.scale.x, Math.sqrt(250));
  close(result.scale.y, 2 / Math.sqrt(2.5));
  close(result.scale.z, 1);
  const matrix = fromTransform(result);
  const direction = new THREE.Vector3()
    .setFromMatrixColumn(matrix, 0)
    .normalize();
  close(Math.atan2(direction.y, direction.x), Math.atan(0.5));
  const exact = compose(parent).multiply(compose(child));
  sameCenterline(matrix, exact);
  const inverse = matrix.clone().invert();
  const fittedCoordinates = corners(exact).map((point) =>
    point.applyMatrix4(inverse),
  );
  close(
    Math.max(...fittedCoordinates.map((point) => point.x)) - 0.5,
    -0.5 - Math.min(...fittedCoordinates.map((point) => point.x)),
  );
  assert.ok(Math.max(...fittedCoordinates.map((point) => point.x)) > 0.5);
});

test("the cross-section minimizes corner error with the beam direction fixed", () => {
  const parent = group({ scale: [2, 0.7, 3], rotation: [0.2, -0.4, 0.6] });
  const child = block(parent, { rotation: [0.5, 0.7, 0.8], scale: [10, 2, 1] });
  const exact = compose(parent).multiply(compose(child));
  const fitted = compose(fitBoxTransform(exact, child));
  sameCenterline(fitted, exact);
  const basis = [0, 1, 2].map((axis) =>
    new THREE.Vector3().setFromMatrixColumn(fitted, axis).normalize(),
  );
  const vectors = [0, 1, 2].map((axis) =>
    new THREE.Vector3().setFromMatrixColumn(exact, axis),
  );
  const error = (angle) => {
    const across = basis[1].clone().applyAxisAngle(basis[0], angle);
    const up = basis[2].clone().applyAxisAngle(basis[0], angle);
    return (
      vectors[1].distanceToSquared(
        across.multiplyScalar(vectors[1].dot(across)),
      ) + vectors[2].distanceToSquared(up.multiplyScalar(vectors[2].dot(up)))
    );
  };
  const best = error(0);
  for (let step = 0; step < 720; step++)
    assert.ok(best <= error((step * Math.PI) / 360) + 1e-9);
  close(basis[0].dot(basis[1]), 0);
  close(basis[0].dot(basis[2]), 0);
  close(basis[1].dot(basis[2]), 0);
});

test("nested groups keep the full affine transform until each instance is fitted", () => {
  const root = group({
    preserveShape: true,
    scale: [2, 1, 3],
    position: [20, 30, 40],
    rotation: [0.3, 0.5, -0.7],
  });
  const nested = group({
    parent: root.id,
    position: [1, 2, 3],
    scale: [0.8, 1.3, 1.1],
    rotation: [0.6, -0.9, 1.2],
  });
  const child = block(nested, {
    position: [2, 3, 4],
    rotation: [-0.8, 0.2, 0.7],
  });
  const {
    transforms: [result],
    nodes,
  } = scene([root, nested, child]);
  const exact = compose(root)
    .multiply(compose(nested))
    .multiply(compose(child));
  sameCenterline(fromTransform(result), exact);
  sameBox(compose(applyTransforms(nodes, child)), fromTransform(result));
  assert.equal("affineMatrix" in applyTransforms(nodes, nested), false);
  assert.equal("affineMatrix" in nodes[nested.id], false);
});

test("changing parent rotation rotates the already fitted shape rigidly", () => {
  const parent = group({ preserveShape: true, scale: [2, 1, 3] });
  const child = block(parent, {
    position: [3, 4, 5],
    rotation: [0.7, 0.4, -0.8],
  });
  const first = scene([parent, child]).transforms[0];
  parent.rotation = [0.6, -0.8, 1.4];
  const second = scene([parent, child]).transforms[0];
  sameBox(
    fromTransform(second),
    new THREE.Matrix4()
      .makeRotationFromQuaternion(quaternion(parent.rotation))
      .multiply(fromTransform(first)),
  );
});

test("group patterns fit each copy using its own scale and rotation", () => {
  const root = group({ preserveShape: true, scale: [2, 1, 3] });
  const nested = group({
    parent: root.id,
    rotation: [0.2, 0.4, 0.6],
  });
  nested.pattern = {
    count: 2,
    mirror: null,
    position: [3, 0, 0],
    rotation: [0.1, 0.2, 0.3],
    scale: [0.2, 0.3, 0.1],
  };
  const child = block(nested, {
    position: [1, 2, 3],
    rotation: [0.4, 0.5, 0.6],
  });
  const { transforms } = scene([root, nested, child]);
  assert.equal(transforms.length, 3);
  transforms.forEach((transform, index) => {
    const copy = { ...nested };
    for (const property of ["position", "rotation", "scale"])
      copy[property] = nested[property].map(
        (value, axis) => value + index * nested.pattern[property][axis],
      );
    sameCenterline(
      fromTransform(transform),
      compose(root).multiply(compose(copy)).multiply(compose(child)),
    );
    assert.equal(transform.originId, index ? child.id : null);
  });
});

test("a pyramid made with the scaled group's own 120-degree pattern keeps its junctions", () => {
  for (const scale of [
    [2, 1, 1],
    [1, 2, 1],
    [1, 1, 2],
    [2, 3, 1],
  ]) {
    const parent = group({
      preserveShape: true,
      scale,
      position: [30, 40, 50],
      rotation: [0.3, 0.4, 0.7],
    });
    parent.pattern = {
      count: 2,
      mirror: null,
      position: [0, 0, 0],
      rotation: [0, 0, (2 * Math.PI) / 3],
      scale: [0, 0, 0],
    };
    const sides = [
      beam(parent, [10, 0, 0], [0, 0, 10]),
      beam(parent, [10, 0, 0], [-5, 5 * Math.sqrt(3), 0]),
    ];
    const { transforms } = scene([parent, ...sides]);
    assert.equal(transforms.length, 6);
    sides.forEach((side, sideIndex) => {
      for (let copy = 0; copy < 3; copy++) {
        const expected = compose(parent)
          .multiply(new THREE.Matrix4().makeRotationZ((copy * 2 * Math.PI) / 3))
          .multiply(compose(side));
        sameCenterline(
          fromTransform(transforms[sideIndex * 3 + copy]),
          expected,
        );
      }
    });
  }
});

test("nested patterned groups use their shared scale before fitting any copy", () => {
  const root = group({
    preserveShape: true,
    scale: [1.2, 0.7, 1.4],
    rotation: [0.2, 0.3, 0.4],
  });
  const nested = group({
    parent: root.id,
    scale: [2, 1, 3],
    rotation: [0.3, 0.4, 0.7],
    position: [3, 4, 5],
  });
  nested.pattern = {
    count: 2,
    mirror: null,
    position: [0, 0, 0],
    rotation: [0, 0, (2 * Math.PI) / 3],
    scale: [0, 0, 0],
  };
  const child = block(nested, {
    rotation: [0.5, 0.6, 0.7],
    position: [1, 2, 3],
  });
  const { transforms } = scene([root, nested, child]);
  transforms.forEach((transform, copy) => {
    const expected = compose(root)
      .multiply(compose(nested))
      .multiply(new THREE.Matrix4().makeRotationZ((copy * 2 * Math.PI) / 3))
      .multiply(compose(child));
    sameCenterline(fromTransform(transform), expected);
  });
});

test("ancestor mirrors reflect all copies of a nested rotated pattern", () => {
  const root = group({ preserveShape: true, scale: [1.2, 0.7, 1.4] });
  const nested = group({
    parent: root.id,
    scale: [2, 1, 3],
    rotation: [0.3, 0.4, 0.7],
    position: [3, 4, 5],
  });
  nested.pattern = {
    count: 2,
    mirror: null,
    position: [0, 0, 0],
    rotation: [0, 0, (2 * Math.PI) / 3],
    scale: [0, 0, 0],
  };
  const child = block(nested, {
    rotation: [0.5, 0.6, 0.7],
    position: [1, 2, 3],
  });
  const original = scene([root, nested, child]).transforms;
  for (const [mirror, scale] of [
    ["XY", [1, 1, -1]],
    ["XZ", [1, -1, 1]],
    ["YZ", [-1, 1, 1]],
  ]) {
    root.mirror = mirror;
    const reflected = scene([root, nested, child]).transforms;
    reflected.forEach((transform, index) => {
      sameBox(
        fromTransform(transform),
        new THREE.Matrix4()
          .makeScale(...scale)
          .multiply(fromTransform(original[index])),
      );
    });
  }
});

test("a group's own mirror pattern stays symmetric after stretching and rotating", () => {
  const root = group({
    preserveShape: true,
    scale: [2, 1, 3],
    rotation: [0.2, 0.3, 0.4],
    position: [3, 4, 5],
  });
  const child = block(root, { position: [2, 3, 4], rotation: [0.5, 0.6, 0.7] });
  for (const [mirror, scale] of [
    ["XY", [1, 1, -1]],
    ["XZ", [1, -1, 1]],
    ["YZ", [-1, 1, 1]],
  ]) {
    root.pattern = {
      count: 1,
      mirror,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [0, 0, 0],
    };
    const { transforms } = scene([root, child]);
    const reflection = compose(root)
      .multiply(new THREE.Matrix4().makeScale(...scale))
      .multiply(compose(root).invert());
    sameBox(
      fromTransform(transforms[1]),
      reflection.multiply(fromTransform(transforms[0])),
    );
  }
});

test("patterns on legacy groups keep their previous per-copy transforms", () => {
  const parent = group({ scale: [2, 1, 3], rotation: [0.2, 0.3, 0.4] });
  parent.pattern = {
    count: 2,
    mirror: null,
    position: [2, 3, 4],
    rotation: [0, 0, (2 * Math.PI) / 3],
    scale: [0.2, 0.3, 0.4],
  };
  const child = block(parent, {
    rotation: [0.5, 0.6, 0.7],
    position: [1, 2, 3],
  });
  const { transforms } = scene([parent, child]);
  transforms.forEach((transform, copy) => {
    const rotation = parent.rotation.map(
      (value, axis) => value + copy * parent.pattern.rotation[axis],
    );
    const scale = parent.scale.map(
      (value, axis) => value + copy * parent.pattern.scale[axis],
    );
    const position = parent.position.map(
      (value, axis) => value + copy * parent.pattern.position[axis],
    );
    const expected = new THREE.Matrix4().compose(
      vector(child.position)
        .multiply(vector(scale))
        .applyQuaternion(quaternion(rotation))
        .add(vector(position)),
      quaternion(rotation).multiply(quaternion(child.rotation)),
      vector(child.scale).multiply(vector(scale)),
    );
    sameBox(fromTransform(transform), expected);
  });
});

test("pattern position and scale steps stretch with the entire assembly", () => {
  const parent = group({ preserveShape: true, scale: [2, 1, 3] });
  parent.pattern = {
    count: 2,
    mirror: null,
    position: [3, 0, 2],
    rotation: [0, 0, 0],
    scale: [0.2, 0.3, 0.4],
  };
  const child = block(parent);
  const { transforms } = scene([parent, child]);
  transforms.forEach((transform, copy) => {
    close(transform.position.x, 6 * copy);
    close(transform.position.z, 6 * copy);
    close(transform.scale.x, 20 * (1 + 0.2 * copy));
    close(transform.scale.y, 1 + 0.3 * copy);
    close(transform.scale.z, 3 * (1 + 0.4 * copy));
  });
  parent.scale = [0, 0, 0];
  for (const transform of scene([parent, child]).transforms)
    assert.deepEqual(transform.scale, { x: 0, y: 0, z: 0, w: 1 });
});

test("mixed rotation, position, and scale pattern steps share the same group stretch", () => {
  for (const rotation of [
    [0.2, 0, 0],
    [0, 0.3, 0],
    [0, 0, 0.4],
    [0.2, 0.3, 0.4],
  ]) {
    const parent = group({
      preserveShape: true,
      rotation: [0.3, 0.4, 0.7],
      position: [30, 40, 50],
    });
    parent.pattern = {
      count: 2,
      mirror: null,
      position: [2, 3, 4],
      rotation,
      scale: [0.2, 0.3, 0.4],
    };
    const child = block(parent, {
      rotation: [0.5, 0.6, 0.7],
      position: [1, 2, 3],
    });
    const original = scene([parent, child]).transforms;
    const inverse = compose(parent).invert();
    parent.scale = [2, 1, 3];
    const stretch = compose(parent).multiply(inverse);
    scene([parent, child]).transforms.forEach((transform, copy) => {
      sameCenterline(
        fromTransform(transform),
        stretch.clone().multiply(fromTransform(original[copy])),
      );
    });
  }
});

test("mirrored pattern copies reflect the fitted beam", () => {
  const root = group({ preserveShape: true, scale: [2, 1, 3] });
  const child = block(root, { position: [3, 4, 5], rotation: [0.2, 0.4, 0.6] });
  child.pattern = {
    count: 1,
    mirror: "YZ",
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [0, 0, 0],
  };
  const { transforms } = scene([root, child]);
  assert.equal(transforms.length, 2);
  sameBox(
    fromTransform(transforms[1]),
    new THREE.Matrix4()
      .makeScale(-1, 1, 1)
      .multiply(fromTransform(transforms[0])),
  );
});

test("legacy scaling and version-one bottom offsets remain unchanged without opt-in", () => {
  const root = group({
    scale: [2, 1, 3],
    rotation: [0.2, 0.3, 0.4],
    position: [3, 4, 5],
  });
  const child = block(root, { position: [1, 2, 3], rotation: [0.5, 0.6, 0.7] });
  child.version = 1;
  const expectedPosition = vector(child.position)
    .multiply(vector(root.scale))
    .applyQuaternion(quaternion(root.rotation))
    .add(vector(root.position));
  expectedPosition.z += 1.5;
  const expected = new THREE.Matrix4().compose(
    expectedPosition,
    quaternion(root.rotation).multiply(quaternion(child.rotation)),
    vector([20, 1, 3]),
  );
  const original = scene([root, child]).transforms[0];
  sameBox(fromTransform(original), expected);
  root.preserveShape = false;
  assert.deepEqual(scene([root, child]).transforms[0], original);
});

test("uniform scaling preserves the existing mirrored, nested geometry", () => {
  const root = group({
    scale: [2, 2, 2],
    rotation: [0.3, 0.4, 0.5],
    mirror: "XY",
  });
  const nested = group({
    parent: root.id,
    position: [2, 3, 4],
    rotation: [0.7, 0.8, 0.9],
    scale: [3, 3, 3],
    mirror: "YZ",
  });
  const child = block(nested, {
    rotation: [0.4, 0.6, 0.8],
    position: [1, 2, 3],
  });
  const original = scene([root, nested, child]).transforms[0];
  root.preserveShape = true;
  sameBox(
    fromTransform(scene([root, nested, child]).transforms[0]),
    fromTransform(original),
  );
});

test("hidden and zero-scale groups produce finite transforms and restore cleanly", () => {
  const root = group({ preserveShape: true, scale: [2, 1, 3] });
  const nested = group({ parent: root.id, rotation: [0.3, 0.4, 0.5] });
  const child = block(nested, { rotation: [0.6, 0.7, 0.8] });
  const original = scene([root, nested, child]).transforms[0];
  nested.hidden = true;
  assert.deepEqual(scene([root, nested, child]).transforms[0].scale, {
    x: 0,
    y: 0,
    z: 0,
    w: 1,
  });
  nested.hidden = false;
  for (const scale of [
    [0, 0, 0],
    [0, 1, 1],
    [0, 0, 1],
    [1e-10, 2, 3],
  ]) {
    root.scale = scale;
    const result = scene([root, nested, child]).transforms[0];
    for (const property of ["position", "orientation", "scale"])
      assert.ok(Object.values(result[property]).every(Number.isFinite));
  }
  root.scale = [2, 1, 3];
  assert.deepEqual(scene([root, nested, child]).transforms[0], original);
});

test("a beam collapsed along its original length still has a finite box fit", () => {
  const parent = group({ preserveShape: true, scale: [0, 1, 2] });
  const child = block(parent);
  const result = scene([parent, child]).transforms[0];
  sameBox(fromTransform(result), compose(parent).multiply(compose(child)));
});

test("old nodes load unchanged and the version-three opt-in survives serialization", () => {
  const parent = group();
  assert.equal(parent.version, 3);
  assert.equal(parent.preserveShape, undefined);
  for (const version of [undefined, 1, 2]) {
    const legacy = { ...parent, version };
    assert.deepEqual(NodeSchemaV2.parse(legacy), legacy);
    assert.deepEqual(NodeSchemaV3.parse(legacy), legacy);
  }
  parent.preserveShape = true;
  const state = { nodes: { [parent.id]: parent }, selected: [parent.id] };
  const restored = NodesStateSchemaV3.parse(
    JSON.parse(JSON.stringify(NodesStateSchemaV3.encode(state))),
  );
  assert.equal(restored.nodes[parent.id].preserveShape, true);
  assert.equal(restored.nodes[parent.id].version, 3);
});

test("version-two project and standalone node imports preserve their original data", () => {
  const parent = { ...group({ scale: [2, 1, 3] }), version: 2 };
  const child = { ...block(parent, { rotation: [0.2, 0.4, 0.6] }), version: 2 };
  child.pattern = {
    count: 2,
    mirror: null,
    position: [1, 2, 3],
    rotation: [0, 0, 0.2],
    scale: [0, 0, 0],
  };
  const legacyNodes = NodesStateSchemaV2.parse({
    nodes: { [parent.id]: parent, [child.id]: child },
    selected: [parent.id],
  });
  const project = {
    project: { name: "v2 import", version: 3, mode: "create", tool: "move" },
    nodes: legacyNodes,
    options: {
      districtView: "current",
      patternView: "solid",
      visibleDistricts: [],
      visibleMeshes: [],
    },
    district: { districts: [district], current: district.name },
  };
  const restored = PersistentStateSchema.parse(
    JSON.parse(JSON.stringify(project)),
  );
  assert.deepEqual(restored.nodes, legacyNodes);
  const standalone = NodeSchemaV3.array().parse(
    JSON.parse(JSON.stringify([parent, child])),
  );
  assert.deepEqual(standalone, [parent, child]);
  assert.deepEqual(
    scene(standalone).transforms,
    scene([parent, child]).transforms,
  );
  assert.equal("preserveShape" in restored.nodes.nodes[parent.id], false);
});

test("toggling the mode invalidates cached descendants and restores legacy output", () => {
  const parent = group({ scale: [2, 1, 3] });
  const nested = group({ parent: parent.id, rotation: [0.3, 0.4, 0.5] });
  const child = block(nested, { rotation: [0.6, 0.7, 0.8] });
  const {
    nodes,
    tree,
    index,
    transforms: original,
  } = scene([parent, nested, child]);
  parent.preserveShape = true;
  invalidateCachedTransforms(index, [parent.id]);
  const changed = getTransformsFromSubtree(
    district,
    nodes,
    tree[district.name].create,
  );
  assert.notDeepEqual(changed, original);
  sameCenterline(
    fromTransform(changed[0]),
    compose(parent).multiply(compose(nested)).multiply(compose(child)),
  );
  parent.preserveShape = false;
  invalidateCachedTransforms(index, [parent.id]);
  assert.deepEqual(
    getTransformsFromSubtree(district, nodes, tree[district.name].create),
    original,
  );
});

test("undo and redo invalidate rendered geometry without relying on selection", () => {
  const parent = group({ scale: [2, 1, 1] });
  const child = block(parent, { rotation: [0, 0, Math.PI / 4] });
  const { nodes, tree, index } = scene([parent, child]);
  const store = configureStore({
    reducer: undoable((state = nodes, action) =>
      action.type === "enable"
        ? { ...state, [parent.id]: { ...parent, preserveShape: true } }
        : state,
    ),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(transformsCacheMiddleware),
  });
  const render = () =>
    getTransformsFromSubtree(
      district,
      store.getState().present,
      tree[district.name].create,
    );
  const original = render();
  invalidateCachedTransforms(index, [parent.id]);
  store.dispatch({ type: "enable" });
  const enabled = render();
  assert.notDeepEqual(enabled, original);
  store.dispatch(ActionCreators.undo());
  assert.deepEqual(render(), original);
  store.dispatch(ActionCreators.redo());
  assert.deepEqual(render(), enabled);
});

test("reparenting a mirrored instance applies its reflection exactly once", () => {
  const parent = group({ preserveShape: true });
  const destination = group();
  const child = block(parent, { position: [10, 0, 0], mirror: "YZ" });
  const { nodes, transforms } = scene([parent, destination, child]);
  close(transforms[0].position.x, -10);
  const moved = transplantNode(nodes, child, destination.id, district.name);
  const result = scene([parent, destination, moved]).transforms;
  sameBox(fromTransform(result[0]), fromTransform(transforms[0]));
  assert.equal(moved.mirror, "YZ");
  sameBox(
    compose(applyTransforms({ ...nodes, [child.id]: moved }, moved)),
    fromTransform(result[0]),
  );
});

test("exporting the identity subgroup preserves inherited affine scaling on import", () => {
  const parent = group({ preserveShape: true, scale: [2, 1, 1] });
  const nested = group({ parent: parent.id });
  const child = block(nested, { rotation: [0, 0, Math.PI / 4] });
  const { nodes, index, transforms } = scene([parent, nested, child]);
  const detached = transplantNode(nodes, nested, null, district.name);
  const exported = cloneNode(nodes, index, detached);
  const imported = NodeSchemaV3.array().parse(
    JSON.parse(JSON.stringify(exported)),
  );
  assert.equal(imported.length, 2);
  assert.equal(imported[1].parent, imported[0].id);
  assert.deepEqual(imported[0].transformFrame, detached.transformFrame);
  const result = scene(imported).transforms;
  close(result[0].scale.x, Math.sqrt(250));
  sameBox(fromTransform(result[0]), fromTransform(transforms[0]));
});

test("mirrored instance exports retain patterns and legacy bottom offsets on import", () => {
  for (const version of [undefined, 1, 2, 3]) {
    const parent = group({
      preserveShape: true,
      scale: [2, 1, 3],
      mirror: "XY",
    });
    const child = block(parent, {
      version,
      position: [10, 2, 3],
      rotation: [0.3, 0.1, 0.4],
      mirror: "YZ",
    });
    child.version = version;
    child.pattern = {
      count: 1,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [0, 0, 0],
      mirror: "XZ",
    };
    const { nodes, index, transforms } = scene([parent, child]);
    const exported = cloneNode(
      nodes,
      index,
      transplantNode(nodes, child, null, district.name),
    );
    const imported = NodeSchemaV3.array().parse(
      JSON.parse(JSON.stringify(exported)),
    );
    assert.equal(imported[0].version, version);
    assert.deepEqual(imported[0].pattern, child.pattern);
    scene(imported).transforms.forEach((transform, i) =>
      sameBox(fromTransform(transform), fromTransform(transforms[i])),
    );
  }
});

test("subgroup export and project loading retain shear, mirrors, hierarchy and patterns", () => {
  const parent = group({
    preserveShape: true,
    scale: [2, 1, 3],
    rotation: [0.2, 0.4, 0.6],
    position: [4, 5, 6],
    mirror: "YZ",
  });
  const nested = group({
    parent: parent.id,
    rotation: [0.5, 0.3, 0.7],
    scale: [0.8, 1.4, 0.9],
  });
  nested.pattern = {
    count: 2,
    position: [3, 1, 2],
    rotation: [0.1, 0.4, 0.5],
    scale: [0.2, 0.3, 0.1],
    mirror: null,
  };
  const inner = group({
    parent: nested.id,
    rotation: [0.4, 0.3, 0.1],
    mirror: "XZ",
  });
  inner.pattern = {
    count: 1,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [0, 0, 0],
    mirror: "XY",
  };
  const child = block(inner, {
    position: [7, 2, 1],
    rotation: [0.1, 0.2, 0.3],
    mirror: "YZ",
  });
  const { nodes, index, transforms } = scene([parent, nested, inner, child]);
  const detached = transplantNode(nodes, nested, null, district.name);
  const exported = cloneNode(nodes, index, detached);
  const imported = NodeSchemaV3.array().parse(
    JSON.parse(JSON.stringify(exported)),
  );
  assert.equal(imported.length, 3);
  assert.deepEqual(imported[0].pattern, nested.pattern);
  assert.deepEqual(imported[1].pattern, inner.pattern);
  const restored = PersistentStateSchema.parse(
    JSON.parse(
      JSON.stringify({
        project: {
          name: "frame import",
          version: 3,
          mode: "create",
          tool: "move",
        },
        nodes: {
          nodes: Object.fromEntries(imported.map((node) => [node.id, node])),
          selected: [],
        },
        options: {
          districtView: "current",
          patternView: "solid",
          visibleDistricts: [],
          visibleMeshes: [],
        },
        district: { districts: [district], current: district.name },
      }),
    ),
  );
  const result = scene(Object.values(restored.nodes.nodes)).transforms;
  assert.equal(result.length, transforms.length);
  result.forEach((transform, i) =>
    sameBox(fromTransform(transform), fromTransform(transforms[i])),
  );
});

test("reparenting into a mirrored sheared destination preserves geometry and follows later edits", () => {
  const parent = group({ preserveShape: true, scale: [2, 1, 3], mirror: "YZ" });
  const nested = group({
    parent: parent.id,
    rotation: [0.2, 0.4, 0.6],
    mirror: "XZ",
  });
  nested.pattern = {
    count: 2,
    position: [3, 1, 0],
    rotation: [0, 0.2, 0.3],
    scale: [0.2, 0, 0],
    mirror: null,
  };
  const child = block(nested, {
    position: [10, 3, 2],
    rotation: [0.1, 0.2, 0.3],
    mirror: "YZ",
  });
  const target = group({
    preserveShape: true,
    scale: [1, 3, 2],
    rotation: [0.1, 0.5, 0.3],
    mirror: "XY",
  });
  const destination = group({
    parent: target.id,
    position: [4, 5, 6],
    rotation: [0.3, 0.4, 0.2],
    mirror: "XZ",
  });
  const { nodes, transforms } = scene([
    parent,
    nested,
    child,
    target,
    destination,
  ]);
  const moved = transplantNode(nodes, nested, destination.id, district.name);
  const movedScene = scene([parent, moved, child, target, destination]);
  movedScene.transforms.forEach((transform, i) =>
    sameBox(fromTransform(transform), fromTransform(transforms[i])),
  );
  const detached = transplantNode(movedScene.nodes, moved, null, district.name);
  scene([detached, child]).transforms.forEach((transform, i) =>
    sameBox(fromTransform(transform), fromTransform(transforms[i])),
  );
  target.position = [10, 20, 30];
  scene([parent, moved, child, target, destination]).transforms.forEach(
    (transform, i) => {
      const expected = fromTransform(transforms[i]);
      expected.setPosition(
        new THREE.Vector3()
          .setFromMatrixPosition(expected)
          .add(vector(target.position)),
      );
      sameBox(fromTransform(transform), expected);
    },
  );
});

test("detaching a group's own opt-in from a legacy parent retains its pattern geometry", () => {
  const parent = group({
    scale: [2, 1, 3],
    rotation: [0.3, 0.2, 0.4],
    mirror: "YZ",
  });
  const nested = group({
    parent: parent.id,
    preserveShape: true,
    position: [3, 4, 5],
    rotation: [0.1, 0.4, 0.6],
    scale: [0, 2, 3],
  });
  nested.pattern = {
    count: 2,
    position: [2, 1, 3],
    rotation: [0.1, 0.2, 0.3],
    scale: [0.2, 0.1, 0.3],
    mirror: null,
  };
  const child = block(nested, {
    position: [4, 5, 6],
    rotation: [0.5, 0.2, 0.3],
  });
  const { nodes, transforms } = scene([parent, nested, child]);
  const detached = transplantNode(nodes, nested, null, district.name);
  scene([detached, child]).transforms.forEach((transform, i) =>
    sameBox(fromTransform(transform), fromTransform(transforms[i])),
  );
});

test("preview matrices and DDS round-trip use the same fitted blocks", () => {
  const root = group({
    preserveShape: true,
    scale: [2, 1, 3],
    position: [0.3, 0.4, 0.5],
    rotation: [0.2, 0.3, 0.4],
  });
  const child = block(root, {
    scale: [0.1, 0.01, 0.01],
    rotation: [0.5, 0.6, 0.7],
  });
  const {
    nodes,
    tree,
    transforms: [preview],
  } = scene([root, child]);
  const exported = getFinalDistrictTransformsFromNodes(district, nodes, tree);
  assert.deepEqual(exported.at(-1), preview);
  // This district has identity export normalization (bounds 1, cubeSize 0.5).
  const decoded = decodeImageData(encodeImageData(exported))[
    exported.length - 1
  ];
  for (const property of ["position", "orientation", "scale"]) {
    for (const axis of ["x", "y", "z", "w"])
      close(decoded[property][axis], preview[property][axis], 2 / 65535);
  }
  const material = new THREE.MeshBasicMaterial();
  const mesh = createDistrictMesh(null, district, [preview], material);
  const decodedMesh = createDistrictMesh(null, district, [decoded], material);
  const actual = new THREE.Matrix4();
  const roundTrip = new THREE.Matrix4();
  mesh.getMatrixAt(0, actual);
  decodedMesh.getMatrixAt(0, roundTrip);
  sameBox(actual, roundTrip, 1e-4);
  mesh.geometry.dispose();
  decodedMesh.geometry.dispose();
  material.dispose();
});

test("every copy of a stretched group pattern survives DDS export", () => {
  const parent = group({
    preserveShape: true,
    scale: [2, 1, 3],
    position: [0.3, 0.4, 0.5],
    rotation: [0.2, 0.3, 0.4],
  });
  parent.pattern = {
    count: 2,
    mirror: null,
    position: [0.01, 0.02, 0.01],
    rotation: [0, 0, (2 * Math.PI) / 3],
    scale: [0.2, 0.3, 0.1],
  };
  const children = [
    block(parent, { scale: [0.1, 0.01, 0.01], rotation: [0.5, 0.6, 0.7] }),
    block(parent, {
      scale: [0.1, 0.01, 0.01],
      position: [0.01, 0.02, 0.01],
      rotation: [0.7, 0.4, 0.3],
    }),
  ];
  const { nodes, tree, transforms } = scene([parent, ...children]);
  const exported = getFinalDistrictTransformsFromNodes(district, nodes, tree);
  const padding = exported.length - transforms.length;
  assert.deepEqual(exported.slice(padding), transforms);
  const decoded = decodeImageData(encodeImageData(exported));
  transforms.forEach((transform, index) => {
    sameBox(
      fromTransform(decoded[padding + index]),
      fromTransform(transform),
      1e-4,
    );
  });
});
