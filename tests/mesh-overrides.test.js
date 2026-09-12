import assert from "node:assert/strict";
import { test } from "node:test";

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { createJiti } from "jiti";
import undoable, { ActionCreators } from "redux-undo";
import * as THREE from "three";

// Imported project actions initialize OPFS; these tests must never access it.
globalThis.Worker = class {
  addEventListener() {}
  postMessage() {
    throw new Error("Mesh override tests must not write to a worker.");
  }
};
const jiti = createJiti(import.meta.url);
const { KNOWN_MESHES } = await jiti.import("../src/constants.ts");
const { default: StaticMeshes } = await jiti.import(
  "../src/map3d/StaticMeshes.ts",
);
const { validateMeshGeometry } = await jiti.import(
  "../src/map3d/validateMeshGeometry.ts",
);
const { default: optionsSlice, OptionsActions } = await jiti.import(
  "../src/store/options.ts",
);
const { default: projectSlice } = await jiti.import("../src/store/project.ts");
const { hydrateState } = await jiti.import("../src/store/@actions.ts");
const { getInitialState, getPersistentState } = await jiti.import(
  "../src/store/@selectors.ts",
);
const { onProjectLoaded, projectListeners } = await jiti.import(
  "../src/store/projectListeners.ts",
);

function triangle() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 2, 0, 0, 0, 2, 0], 3),
  );
  geometry.setIndex([0, 1, 2]);
  return geometry;
}

function disposals(geometry) {
  let count = 0;
  geometry.addEventListener("dispose", () => count++);
  return () => count;
}

function fixture(t, loaders = {}) {
  const store = configureStore({
    reducer: undoable(
      combineReducers({
        options: optionsSlice.reducer,
        project: projectSlice.reducer,
      }),
    ),
    middleware: (getDefault) =>
      getDefault().prepend(projectListeners.middleware),
  });
  const originals = new Map();
  const materialDisposals = new Map();
  let decodeCalls = 0;
  const meshes = new StaticMeshes(store, {
    mesh: async (name, material) => {
      const geometry = triangle();
      originals.set(name, geometry);
      materialDisposals.set(material, disposals(material));
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name;
      mesh.position.set(10, 20, 30);
      mesh.scale.set(2, 3, 4);
      mesh.rotation.set(0.1, 0.2, 0.3);
      mesh.layers.set(1);
      return mesh;
    },
    geometry: async () => {
      decodeCalls++;
      return triangle();
    },
    ...loaders,
  });
  const unsubscribe = onProjectLoaded(meshes.resetOverrides);
  t.after(() => {
    unsubscribe();
    meshes.dispose();
    assert.ok([...materialDisposals.values()].every((count) => count() === 0));
  });
  const apply = (
    name = "3dmap_roads",
    filename = "replacement.drc",
    signal = new AbortController().signal,
  ) => meshes.applyOverride(name, new File(["draco bytes"], filename), signal);
  const status = (name = "3dmap_roads") =>
    meshes.getOverrideStatuses().find((entry) => entry.name === name);
  return {
    store,
    meshes,
    originals,
    apply,
    status,
    decodeCalls: () => decodeCalls,
  };
}

test("Roads swaps both passes once and preserves material, transforms, layers, and visibility", async (t) => {
  const { store, meshes, originals, apply, decodeCalls } = fixture(t);
  await Promise.resolve();
  store.dispatch(OptionsActions.toggleMeshVisibility("3dmap_roads"));
  const passes = meshes.children.filter((mesh) => mesh.name === "3dmap_roads");
  assert.equal(passes.length, 2);
  const before = passes.map((mesh) => ({
    material: mesh.material,
    matrix: mesh.matrix.clone(),
    rotation: mesh.rotation.toArray(),
  }));
  assert.equal(await apply(), true);
  assert.equal(decodeCalls(), 1);
  assert.equal(passes[0].geometry, passes[1].geometry);
  assert.notEqual(passes[0].geometry, originals.get("3dmap_roads"));
  passes.forEach((mesh, i) => {
    assert.equal(mesh.material, before[i].material);
    assert.deepEqual(mesh.position.toArray(), [10, 20, 30]);
    assert.deepEqual(mesh.scale.toArray(), [2, 3, 4]);
    assert.deepEqual(mesh.rotation.toArray(), before[i].rotation);
    assert.deepEqual(mesh.matrix, before[i].matrix);
    assert.equal(mesh.layers.mask, 2);
    assert.equal(mesh.visible, false);
  });
  store.dispatch(OptionsActions.toggleMeshVisibility("3dmap_roads"));
  assert.ok(passes.every((mesh) => mesh.visible));
});

test("replacing and restoring releases overrides once and keeps defaults for instant restoration", async (t) => {
  const { meshes, originals, apply, status } = fixture(t);
  await apply();
  const original = originals.get("3dmap_roads");
  const originalDisposed = disposals(original);
  const first = meshes.children.find(
    (mesh) => mesh.name === "3dmap_roads",
  ).geometry;
  const firstDisposed = disposals(first);
  await apply("3dmap_roads", "second.drc");
  const secondDisposed = disposals(
    meshes.children.find((mesh) => mesh.name === "3dmap_roads").geometry,
  );
  assert.equal(firstDisposed(), 1);
  assert.equal(status().filename, "second.drc");
  meshes.restoreDefault("3dmap_roads");
  assert.equal(status().filename, undefined);
  assert.equal(secondDisposed(), 1);
  assert.equal(originalDisposed(), 0);
  assert.ok(
    meshes.children
      .filter((mesh) => mesh.name === "3dmap_roads")
      .every((mesh) => mesh.geometry === original),
  );
  meshes.dispose();
  meshes.dispose();
  assert.equal(originalDisposed(), 1);
  assert.equal(firstDisposed(), 1);
  assert.equal(secondDisposed(), 1);
});

test("multiple overrides survive unrelated actions and undo/redo without entering persistence", async (t) => {
  const { meshes, store, apply, status } = fixture(t);
  const initial = getInitialState(undefined);
  const persistent = () =>
    getPersistentState({
      present: { ...initial, ...store.getState().present },
    });
  const before = JSON.stringify(persistent());
  await apply();
  await apply("terrain_mesh", "terrain-local.drc");
  assert.equal(JSON.stringify(persistent()), before);
  store.dispatch(OptionsActions.toggleMeshVisibility("water_mesh"));
  store.dispatch(ActionCreators.undo());
  store.dispatch(ActionCreators.redo());
  assert.equal(status().filename, "replacement.drc");
  assert.equal(status("terrain_mesh").filename, "terrain-local.drc");
  meshes.restoreDefault("3dmap_roads");
  assert.equal(status("terrain_mesh").filename, "terrain-local.drc");
  assert.ok(!JSON.stringify(persistent()).includes("terrain-local.drc"));
});

test("successful same-name hydration resets overrides; rejected hydration does not", async (t) => {
  const { store, meshes, apply, status } = fixture(t);
  await apply();
  store.dispatch(hydrateState.pending("failed", {}));
  store.dispatch(hydrateState.rejected(new Error("load failed"), "failed", {}));
  assert.equal(status().filename, "replacement.drc");
  const sameProject = store.getState().present;
  store.dispatch(hydrateState.fulfilled(sameProject, "reopened", {}));
  assert.ok(meshes.getOverrideStatuses().every((entry) => !entry.filename));
});

test("invalid files and invalid decoded geometry preserve the active override", async (t) => {
  let decoded = triangle();
  const { meshes, apply, status } = fixture(t, {
    geometry: async () => decoded,
  });
  await apply();
  const active = decoded;
  await assert.rejects(apply("3dmap_roads", "wrong.glb"), /Draco/);
  await assert.rejects(
    meshes.applyOverride(
      "3dmap_roads",
      new File([], "empty.drc"),
      new AbortController().signal,
    ),
    /empty/,
  );
  decoded = new THREE.BufferGeometry();
  const disposed = disposals(decoded);
  await assert.rejects(apply(), /triangle mesh/);
  assert.equal(disposed(), 1);
  assert.equal(status().filename, "replacement.drc");
  assert.equal(
    meshes.children.find((mesh) => mesh.name === "3dmap_roads").geometry,
    active,
  );
});

test("decoder failures preserve the current replacement", async (t) => {
  let fail = false;
  const { apply, status } = fixture(t, {
    geometry: async () => {
      if (fail) throw new Error("Invalid Draco data");
      return triangle();
    },
  });
  await apply();
  fail = true;
  await assert.rejects(apply(), /Invalid Draco/);
  assert.equal(status().filename, "replacement.drc");
});

for (const operation of ["abort", "restore", "hydrate", "dispose"]) {
  test(`${operation} during decoding prevents late attachment and disposes the result`, async (t) => {
    const started = Promise.withResolvers();
    const pending = Promise.withResolvers();
    const { meshes, store, apply, status } = fixture(t, {
      geometry: () => {
        started.resolve();
        return pending.promise;
      },
    });
    const controller = new AbortController();
    const result = apply("3dmap_roads", "late.drc", controller.signal);
    await started.promise;
    if (operation === "abort") controller.abort();
    if (operation === "restore") meshes.restoreDefault("3dmap_roads");
    if (operation === "hydrate")
      store.dispatch(
        hydrateState.fulfilled(store.getState().present, "reload", {}),
      );
    if (operation === "dispose") meshes.dispose();
    const geometry = triangle();
    const disposed = disposals(geometry);
    pending.resolve(geometry);
    assert.equal(await result, false);
    assert.equal(disposed(), 1);
    assert.equal(status()?.filename, undefined);
  });
}

test("a newer apply wins when decodes complete out of order", async (t) => {
  const started = Promise.withResolvers();
  const first = Promise.withResolvers();
  let calls = 0;
  const { meshes, apply, status } = fixture(t, {
    geometry: () => {
      if (++calls === 1) {
        started.resolve();
        return first.promise;
      }
      return Promise.resolve(triangle());
    },
  });
  const older = apply("3dmap_roads", "old.drc");
  await started.promise;
  await apply("3dmap_roads", "new.drc");
  const active = meshes.children.find(
    (mesh) => mesh.name === "3dmap_roads",
  ).geometry;
  const stale = triangle();
  const disposed = disposals(stale);
  first.resolve(stale);
  assert.equal(await older, false);
  assert.equal(disposed(), 1);
  assert.equal(status().filename, "new.drc");
  assert.equal(
    meshes.children.find((mesh) => mesh.name === "3dmap_roads").geometry,
    active,
  );
});

test("an override waits for its original load and then replaces both passes", async (t) => {
  const pending = Promise.withResolvers();
  const { meshes, apply, decodeCalls } = fixture(t, {
    mesh: async (name, material) => {
      if (name === "3dmap_roads") await pending.promise;
      const mesh = new THREE.Mesh(triangle(), material);
      mesh.name = name;
      return mesh;
    },
  });
  const result = apply();
  await Promise.resolve();
  assert.equal(decodeCalls(), 0);
  pending.resolve();
  assert.equal(await result, true);
  assert.equal(
    meshes.children.filter((mesh) => mesh.name === "3dmap_roads").length,
    2,
  );
});

test("reset during the original load cancels an override without suppressing defaults", async (t) => {
  const pending = Promise.withResolvers();
  const { meshes, apply, decodeCalls } = fixture(t, {
    mesh: async (name, material) => {
      await pending.promise;
      const mesh = new THREE.Mesh(triangle(), material);
      mesh.name = name;
      return mesh;
    },
  });
  const result = apply();
  meshes.resetOverrides();
  pending.resolve();
  assert.equal(await result, false);
  assert.equal(decodeCalls(), 0);
  assert.equal(meshes.children.length, KNOWN_MESHES.length + 1);
});

test("disposing before defaults finish releases their geometry without attaching meshes", async (t) => {
  const pending = Promise.withResolvers();
  const counts = [];
  const { meshes, apply } = fixture(t, {
    mesh: async (name, material) => {
      await pending.promise;
      const geometry = triangle();
      counts.push(disposals(geometry));
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name;
      return mesh;
    },
  });
  const result = apply();
  meshes.dispose();
  pending.resolve();
  assert.equal(await result, false);
  assert.equal(meshes.children.length, 0);
  assert.equal(counts.length, KNOWN_MESHES.length);
  assert.ok(counts.every((count) => count() === 1));
});

test("a failed original load reports an actionable error", async (t) => {
  const { apply, decodeCalls } = fixture(t, {
    mesh: async () => {
      throw new Error("offline");
    },
  });
  await assert.rejects(apply(), /default mesh.*Reload/);
  assert.equal(decodeCalls(), 0);
});

for (const pendingLoad of [false, true]) {
  test(`shared default geometry is disposed once with pending load ${pendingLoad}`, async (t) => {
    const shared = triangle();
    const disposed = disposals(shared);
    const pending = Promise.withResolvers();
    const { meshes, apply } = fixture(t, {
      mesh: async (name, material) => {
        if (pendingLoad) await pending.promise;
        const mesh = new THREE.Mesh(shared, material);
        mesh.name = name;
        return mesh;
      },
    });
    const result = apply();
    if (!pendingLoad) await result;
    meshes.dispose();
    pending.resolve();
    await result;
    assert.equal(disposed(), 1);
  });
}

test("Metro requires colors and valid geometry gains normals and bounds", () => {
  const geometry = triangle();
  assert.throws(
    () => validateMeshGeometry("3dmap_metro", geometry),
    /vertex colors/,
  );
  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1], 3),
  );
  validateMeshGeometry("3dmap_metro", geometry);
  assert.equal(geometry.getAttribute("normal").count, 3);
  assert.ok(geometry.boundingSphere.radius > 0);
  assert.deepEqual(geometry.boundingBox.max.toArray(), [2, 2, 0]);
  geometry.dispose();
});

test("validation rejects malformed geometry and nonfinite attributes", () => {
  const invalid = [
    (g) => g.deleteAttribute("position"),
    (g) => g.setIndex(null),
    (g) => g.setIndex([]),
    (g) => g.setIndex([0, 1]),
    (g) => g.setIndex([0, 1, 8]),
    (g) => g.getAttribute("position").setX(0, Infinity),
    (g) =>
      g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, 1], 3)),
    (g) =>
      g.setAttribute(
        "color",
        new THREE.Float32BufferAttribute([NaN, 0, 0, 0, 1, 0, 0, 0, 1], 3),
      ),
  ];
  for (const mutate of invalid) {
    const geometry = triangle();
    mutate(geometry);
    assert.throws(() => validateMeshGeometry("terrain_mesh", geometry));
    geometry.dispose();
  }
});

test("render subscriptions receive apply and restore events and can unsubscribe", async (t) => {
  const { meshes, apply } = fixture(t);
  await Promise.resolve();
  let updates = 0;
  const unsubscribe = meshes.subscribeOverrides(() => updates++);
  await apply();
  assert.equal(updates, 1);
  meshes.restoreDefault("3dmap_roads");
  assert.equal(updates, 2);
  unsubscribe();
  await apply();
  assert.equal(updates, 2);
});
