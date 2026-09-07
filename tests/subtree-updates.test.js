import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { createJiti } from "jiti";
import * as THREE from "three";

const jiti = createJiti(import.meta.url);
const {
  clearCachedTransforms,
  getIsolatedBranch,
  getTransformsFromSubtree,
  invalidateCachedTransforms,
  SubtreeTransforms,
} = await jiti.import("../src/utilities/getTransformsFromSubtree.ts");
const { buildSupportStructures, initNode } = await jiti.import(
  "../src/utilities/nodes.ts",
);
const { createDistrictMesh } = await jiti.import(
  "../src/map3d/createDistrictMesh.ts",
);

beforeEach(clearCachedTransforms);

const district = {
  name: "subtree-updates",
  isCustom: true,
  position: [100, 200, 300],
  transMin: [1, 2, 3, 0],
  origin: { x: 101, y: 202, z: 303 },
};
const node = (id, type, parent = null, properties = {}) =>
  initNode({
    id,
    type,
    parent,
    tag: "create",
    district: district.name,
    position: [1, 2, 3],
    ...properties,
  });
const pattern = (count) => ({
  count,
  mirror: null,
  position: [5, 2, 1],
  rotation: [0.1, 0.2, 0.3],
  scale: [0.1, 0.2, 0.3],
});

function scene(patterned = false) {
  const nodes = {
    root: node("root", "group", null, {
      preserveShape: patterned,
      scale: [2, 1, 3],
      mirror: "XY",
    }),
    group: node("group", "group", "root", {
      rotation: [0.3, 0.2, 0.1],
      mirror: "YZ",
      transformFrame: {
        matrix: new THREE.Matrix4().makeTranslation(3, 2, 1).toArray(),
        mirrors: ["XZ"],
      },
    }),
    leaf: node("leaf", "instance", "group"),
    sibling: node("sibling", "instance", "root"),
    outside: node("outside", "instance"),
  };
  if (patterned) {
    nodes.root.pattern = pattern(2);
    nodes.group.pattern = pattern(1);
    nodes.leaf.pattern = pattern(2);
  }
  const { tree, index } = buildSupportStructures(nodes);
  return { nodes, treeNodes: tree[district.name].create, index };
}

function update(preview, state, isolated) {
  return preview.update(
    district,
    state.nodes,
    state.treeNodes,
    state.index,
    isolated,
  );
}

function edit(state, id, properties) {
  invalidateCachedTransforms(state.index, [id]);
  state.nodes = { ...state.nodes, [id]: { ...state.nodes[id], ...properties } };
}

function assertFullOutput(state, result, split = true, isolated) {
  let expected = getTransformsFromSubtree(
    district,
    state.nodes,
    state.treeNodes,
  );
  if (isolated) {
    const branch = new Set(getIsolatedBranch(state.index, isolated));
    expected = expected.filter((value) =>
      branch.has(value.originId || value.id),
    );
  }
  assert.deepEqual(
    result.main.transforms,
    split ? expected.filter((value) => value.originId == null) : expected,
  );
  assert.deepEqual(
    result.virtual.transforms,
    split ? expected.filter((value) => value.originId != null) : [],
  );
}

test("a leaf edit visits only that leaf and preserves all unaffected references", () => {
  const state = scene();
  const preview = new SubtreeTransforms(true);
  const initial = update(preview, state);
  const before = initial.main.transforms.slice();
  const exported = getTransformsFromSubtree(
    district,
    state.nodes,
    state.treeNodes,
  );
  const exportSnapshot = structuredClone(exported);
  edit(state, "leaf", { position: [77, 88, 99] });
  const visited = [];
  const nodes = new Proxy(state.nodes, {
    get(target, id) {
      visited.push(id);
      assert.equal(id, "leaf");
      return target[id];
    },
  });
  const result = preview.update(district, nodes, state.treeNodes, state.index);
  assert.ok(visited.length < 10);
  assert.equal(result.main.transforms, initial.main.transforms);
  assert.deepEqual(result.main.changedIndexes, [0]);
  assert.notEqual(result.main.transforms[0], before[0]);
  assert.equal(result.main.transforms[1], before[1]);
  assert.equal(result.main.transforms[2], before[2]);
  assert.deepEqual(exported, exportSnapshot);
  assertFullOutput(state, result);
  assert.deepEqual(update(preview, state).main.changedIndexes, []);
});

test("nested patterns retain full-path occurrences through parent and subsequent child edits", () => {
  const state = scene(true);
  const preview = new SubtreeTransforms(true);
  assertFullOutput(state, update(preview, state));
  for (const [id, properties] of [
    ["leaf", { position: [7, 8, 9] }],
    ["group", { rotation: [0.4, 0.5, 0.6], scale: [3, 2, 1] }],
    ["leaf", { scale: [4, 5, 6] }],
    ["root", { position: [9, 8, 7] }],
    ["leaf", { mirror: "YZ", rotation: [0.6, 0.2, 0.4] }],
    ["group", { pattern: { ...pattern(1), rotation: [0.5, 0.3, 0.1] } }],
  ]) {
    const before = update(preview, state);
    edit(state, id, properties);
    const result = update(preview, state);
    assert.equal(result.main.transforms, before.main.transforms);
    assert.equal(result.virtual.transforms, before.virtual.transforms);
    assert.ok(result.virtual.changedIndexes.length > 0);
    assert.equal(
      new Set(result.virtual.changedIndexes).size,
      result.virtual.changedIndexes.length,
    );
    assertFullOutput(state, result);
  }
});

test("pattern copies retain independent affine parents across repeated child edits", () => {
  const root = node("root", "group", null, {
    position: [0, 0, 0],
    scale: [2, 3, 4],
    preserveShape: true,
  });
  root.pattern = {
    count: 3,
    mirror: null,
    position: [10, 0, 0],
    rotation: [0, 0, Math.PI / 2],
    scale: [0, 0, 0],
  };
  const nodes = {
    root,
    leaf: node("leaf", "instance", "root", { position: [1, 0, 0] }),
  };
  const { tree, index } = buildSupportStructures(nodes);
  const state = { nodes, index, treeNodes: tree[district.name].create };
  const preview = new SubtreeTransforms();
  const initial = update(preview, state).main.transforms.slice();
  const snapshot = structuredClone(initial);

  for (const distance of [2, 3, 1]) {
    edit(state, "leaf", { position: [distance, 0, 0] });
    const { transforms } = update(preview, state).main;
    assert.equal(transforms.length, 4);
    for (let copy = 0; copy < transforms.length; copy++) {
      const angle = (copy * Math.PI) / 2;
      const expected = {
        x: 2 * (copy * 10 + distance * Math.cos(angle)) - district.origin.x,
        y: 3 * distance * Math.sin(angle) - district.origin.y,
        z: -district.origin.z,
      };
      for (const axis of ["x", "y", "z"])
        assert.ok(
          Math.abs(transforms[copy].position[axis] - expected[axis]) < 1e-9,
        );
    }
    assert.deepEqual(initial, snapshot);
  }
});

test("overlapping and disjoint invalidations update each affected slot once", () => {
  const state = scene(true);
  const preview = new SubtreeTransforms(true);
  update(preview, state);
  edit(state, "group", { position: [10, 20, 30] });
  edit(state, "leaf", { scale: [9, 8, 7] });
  edit(state, "outside", { position: [30, 20, 10] });
  const result = update(preview, state);
  assert.equal(
    new Set(result.main.changedIndexes).size,
    result.main.changedIndexes.length,
  );
  assert.equal(
    new Set(result.virtual.changedIndexes).size,
    result.virtual.changedIndexes.length,
  );
  assertFullOutput(state, result);
});

test("structural edits and isolation rebuild ordering instead of emitting stale indexes", () => {
  const state = scene(true);
  const preview = new SubtreeTransforms(true);
  let previous = update(preview, state);
  edit(state, "root", { pattern: { ...pattern(2), mirror: "XY" } });
  let result = update(preview, state);
  assert.equal(result.main.changedIndexes, undefined);
  assert.notEqual(result.main.transforms, previous.main.transforms);
  assertFullOutput(state, result);

  edit(state, "leaf", { parent: null });
  let structures = buildSupportStructures(state.nodes);
  state.treeNodes = structures.tree[district.name].create;
  state.index = structures.index;
  result = update(preview, state);
  assert.equal(result.main.changedIndexes, undefined);
  assertFullOutput(state, result);

  previous = result;
  result = update(preview, state, "leaf");
  assert.notEqual(result.main.transforms, previous.main.transforms);
  assertFullOutput(state, result, true, "leaf");
  edit(state, "outside", { position: [50, 60, 70] });
  result = update(preview, state, "leaf");
  assert.deepEqual(result.main.changedIndexes, []);
  assertFullOutput(state, result, true, "leaf");
  assertFullOutput(state, update(preview, state));

  invalidateCachedTransforms(state.index, ["leaf"]);
  const { leaf, ...remaining } = state.nodes;
  assert.equal(leaf.id, "leaf");
  state.nodes = remaining;
  structures = buildSupportStructures(state.nodes);
  state.treeNodes = structures.tree[district.name].create;
  state.index = structures.index;
  result = update(preview, state);
  assert.equal(result.main.changedIndexes, undefined);
  assertFullOutput(state, result);
});

test("cache resets, district changes, and missed history force a complete refresh", () => {
  const state = scene();
  const preview = new SubtreeTransforms();
  update(preview, state);
  edit(state, "leaf", { position: [20, 30, 40] });
  clearCachedTransforms();
  let result = update(preview, state);
  assert.equal(result.main.changedIndexes, undefined);
  assertFullOutput(state, result, false);
  for (let i = 0; i < 130; i++) edit(state, "outside", { position: [i, 0, 0] });
  result = update(preview, state);
  assert.equal(result.main.changedIndexes, undefined);
  assertFullOutput(state, result, false);
  const movedDistrict = { ...district, origin: { x: 0, y: 0, z: 0 } };
  result = preview.update(
    movedDistrict,
    state.nodes,
    state.treeNodes,
    state.index,
  );
  assert.equal(result.main.changedIndexes, undefined);
  clearCachedTransforms();
  assert.deepEqual(
    result.main.transforms,
    getTransformsFromSubtree(movedDistrict, state.nodes, state.treeNodes),
  );
});

test("multiple previews independently receive all pending changes", () => {
  const state = scene(true);
  const first = new SubtreeTransforms(true);
  const second = new SubtreeTransforms();
  update(first, state);
  update(second, state);
  edit(state, "leaf", { position: [20, 30, 40] });
  assertFullOutput(state, update(first, state));
  edit(state, "outside", { scale: [9, 8, 7] });
  assertFullOutput(state, update(second, state), false);
  assertFullOutput(state, update(first, state));
});

test("reused preview arrays write dirty matrices and can initialize a fresh mesh", (t) => {
  const state = scene();
  const preview = new SubtreeTransforms();
  const initial = update(preview, state).main;
  const material = new THREE.MeshBasicMaterial();
  const color = new THREE.Color(0xffa500);
  const mesh = createDistrictMesh(
    null,
    district,
    initial.transforms,
    material,
    color,
  );
  const writes = t.mock.method(mesh, "setMatrixAt");
  const ids = mesh.userData.ids;
  edit(state, "leaf", { position: [20, 30, 40] });
  const result = update(preview, state).main;
  createDistrictMesh(
    mesh,
    district,
    result.transforms,
    material,
    color,
    result.changedIndexes,
  );
  assert.equal(writes.mock.callCount(), 1);
  assert.equal(writes.mock.calls[0].arguments[0], 0);
  assert.equal(mesh.userData.ids, ids);
  const fresh = createDistrictMesh(
    null,
    district,
    result.transforms,
    material,
    color,
    result.changedIndexes,
  );
  for (let i = 0; i < result.transforms.length; i++) {
    const actual = new THREE.Matrix4();
    const expected = new THREE.Matrix4();
    mesh.getMatrixAt(i, actual);
    fresh.getMatrixAt(i, expected);
    assert.ok(actual.equals(expected));
  }
  mesh.dispose();
  fresh.dispose();
  mesh.geometry.dispose();
  fresh.geometry.dispose();
  material.dispose();
});
