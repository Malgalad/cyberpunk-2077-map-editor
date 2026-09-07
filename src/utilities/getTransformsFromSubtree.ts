import * as THREE from "three";

import type {
  District,
  InstancedMeshTransforms,
  InstancedMeshUpdate,
  MapNode,
  NodesIndex,
  NodesMap,
  Plane,
  TransformFrame,
  TreeBranch,
  Tuple3,
} from "../types/types.ts";
import { fitBoxTransform } from "./fitBoxTransform.ts";
import {
  fromQuaternion,
  fromVector3,
  toQuaternion,
  toVector3,
} from "./math.ts";
import { nodeToTransform } from "./nodes.ts";
import { pipe, toTuple3 } from "./utilities.ts";

const hadamardProduct = (a: THREE.Vector3Tuple, b: number[]) =>
  a.map((x, i) => x * (b[i] ?? 0));
const addTuples = (a: THREE.Vector3Tuple, b: number[]) =>
  toTuple3(a.map((_, i) => a[i] + (b[i] ?? 0)));
const scalePattern = (i: number) => (value: number) => value * (i + 1);
const noTransforms: InstancedMeshTransforms[] = [];

interface ResolvedNode extends MapNode {
  affineMatrix?: THREE.Matrix4;
}

const mirrorPosition = (plane: Plane | null, position: THREE.Vector3Tuple) => {
  if (plane == null) return position;
  const mirror = {
    XY: [1, 1, -1],
    XZ: [1, -1, 1],
    YZ: [-1, 1, 1],
  }[plane];
  return toTuple3(hadamardProduct(position, mirror));
};
const mirrorRotation = (plane: Plane | null, rotation: THREE.Vector3Tuple) => {
  if (plane == null) return rotation;
  const mirror = {
    XY: [-1, -1, 1],
    XZ: [-1, 1, -1],
    YZ: [1, -1, -1],
  }[plane];
  return toTuple3(hadamardProduct(rotation, mirror));
};

const mirrorContext: Array<Plane | null> = [];
const resolvedMatrix = (node?: ResolvedNode) =>
  node
    ? (node.affineMatrix?.clone() ??
      new THREE.Matrix4().compose(
        toVector3(node.position),
        toQuaternion(node.rotation),
        toVector3(node.scale),
      ))
    : new THREE.Matrix4();

const mirrorMatrix = () =>
  new THREE.Matrix4().makeScale(
    ...mirrorContext.reduce((scale, plane) => mirrorPosition(plane, scale), [
      1, 1, 1,
    ] as Tuple3<number>),
  );

function withTransformFrame<Result>(
  node: MapNode,
  parent: ResolvedNode | undefined,
  fn: (parent: ResolvedNode | undefined) => Result,
): Result {
  if (!node.transformFrame) return fn(parent);
  /* Frames use the parent's mirrored axes. */
  const reflection = mirrorMatrix();
  const affineMatrix = resolvedMatrix(parent)
    .multiply(reflection)
    .multiply(new THREE.Matrix4().fromArray(node.transformFrame.matrix))
    .multiply(reflection);
  const depth = mirrorContext.length;
  mirrorContext.push(...node.transformFrame.mirrors);
  try {
    return fn({ ...node, type: "group", affineMatrix });
  } finally {
    mirrorContext.length = depth;
  }
}

function applyParentTransform(parent: ResolvedNode | null | undefined) {
  if (!parent) return (node: MapNode): ResolvedNode => node;

  const parentMatrix =
    parent.affineMatrix ??
    (parent.type === "group" && parent.preserveShape
      ? resolvedMatrix(parent)
      : undefined);
  const parentPosition = parentMatrix ? undefined : toVector3(parent.position);
  const parentRotation = parentMatrix
    ? undefined
    : toQuaternion(parent.rotation);
  const parentScale = parentMatrix ? undefined : toVector3(parent.scale);

  return (node: MapNode): ResolvedNode => {
    const position = toVector3(
      mirrorContext.reduce(
        (vec3, plane) => mirrorPosition(plane, vec3),
        node.position,
      ),
    );
    const quaternion = toQuaternion(
      mirrorContext.reduce(
        (vec3, plane) => mirrorRotation(plane, vec3),
        node.rotation,
      ),
    );

    if (parentMatrix) {
      const matrix = new THREE.Matrix4()
        .compose(position, quaternion, toVector3(node.scale))
        .premultiply(parentMatrix);
      const resolved = fitBoxTransform(matrix, node);

      // Keep shear through nested groups; only exported blocks use the fitted box.
      return node.type === "group"
        ? { ...resolved, affineMatrix: matrix }
        : resolved;
    }

    position.multiply(parentScale!);
    const scale = hadamardProduct(node.scale, parent.scale) as Tuple3<number>;

    quaternion.premultiply(parentRotation!);
    position.applyQuaternion(parentRotation!);
    position.add(parentPosition!);

    return {
      ...node,
      position: fromVector3(position),
      rotation: fromQuaternion(quaternion),
      scale,
    };
  };
}

function applyGroupPatternTransform(
  parent: ResolvedNode | undefined,
  source: MapNode,
) {
  const resolve = applyParentTransform(parent);
  if (
    !source.pattern ||
    (!source.preserveShape && !parent?.preserveShape && !parent?.affineMatrix)
  )
    return resolve;

  const original = resolve(source);
  const matrix =
    original.affineMatrix ??
    new THREE.Matrix4().compose(
      toVector3(original.position),
      toQuaternion(original.rotation),
      toVector3(original.scale),
    );
  const sourceRotation = toQuaternion(
    mirrorContext.reduce(
      (rotation, plane) => mirrorRotation(plane, rotation),
      source.rotation,
    ),
  ).invert();
  const sourceRotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(
    sourceRotation,
  );
  const patternMatrix = new THREE.Matrix4();

  return (copy: MapNode): ResolvedNode => {
    if (copy === source) return original;

    const position = toTuple3(
      copy.position.map((value, axis) => value - source.position[axis]),
    );
    const rotation = toQuaternion(
      mirrorContext.reduce(
        (rotation, plane) => mirrorRotation(plane, rotation),
        copy.rotation,
      ),
    );
    const scale = toVector3(
      toTuple3(copy.scale.map((value, axis) => 1 + value - source.scale[axis])),
    );
    patternMatrix
      .compose(
        toVector3(
          mirrorContext.reduce(
            (position, plane) => mirrorPosition(plane, position),
            position,
          ),
        ),
        rotation,
        scale,
      )
      .premultiply(sourceRotationMatrix);

    // Assemble copies at unit group scale, then stretch them in shared axes.
    const affineMatrix = matrix.clone().multiply(patternMatrix);
    return { ...fitBoxTransform(affineMatrix, copy), affineMatrix };
  };
}

function getLineage(nodes: NodesMap, node: MapNode) {
  const lineage = [node];
  let ancestor = node.parent;
  while (ancestor) {
    lineage.unshift(nodes[ancestor]);
    ancestor = nodes[ancestor].parent;
  }

  return lineage;
}

export const hasAffineTransforms = (nodes: NodesMap, node: MapNode) =>
  getLineage(nodes, node).some(
    (item) =>
      item.transformFrame || (item.type === "group" && item.preserveShape),
  );

function withResolvedNode<Result>(
  nodes: NodesMap,
  node: MapNode,
  fn: (resolved: ResolvedNode, parent?: ResolvedNode) => Result,
): Result {
  const lineage = getLineage(nodes, node);
  const resolve = (index: number, parent?: ResolvedNode): Result => {
    const local = lineage[index];
    return withTransformFrame(local, parent, (parent) => {
      const transform = applyParentTransform(parent);
      const resolved =
        local.type === "instance"
          ? applyMirror(transform)(local)
          : transform(local);
      if (index === lineage.length - 1) return fn(resolved, parent);
      return applyMirror((next: ResolvedNode) => resolve(index + 1, next))(
        resolved,
      );
    });
  };
  return resolve(0);
}

export function getTransplantFrame(
  nodes: NodesMap,
  node: MapNode,
  parentId: string | null,
): TransformFrame {
  const source = withResolvedNode(nodes, node, (resolved, parent) => {
    let matrix = resolvedMatrix(parent);
    if (parent && !parent.affineMatrix && !parent.preserveShape) {
      /* Legacy scales use the child's axes. */
      const localRotation = toQuaternion(
        mirrorContext.reduce(
          (rotation, plane) => mirrorRotation(plane, rotation),
          node.rotation,
        ),
      );
      matrix = new THREE.Matrix4()
        .makeRotationFromQuaternion(toQuaternion(resolved.rotation))
        .scale(toVector3(parent.scale))
        .multiply(
          new THREE.Matrix4().makeRotationFromQuaternion(
            localRotation.invert(),
          ),
        );
      const localPosition = toVector3(
        mirrorContext.reduce(
          (position, plane) => mirrorPosition(plane, position),
          node.position,
        ),
      ).applyMatrix4(matrix);
      matrix.setPosition(toVector3(resolved.position).sub(localPosition));
    }
    return {
      matrix,
      mirrors: mirrorContext.filter((plane): plane is Plane => plane !== null),
    };
  });
  if (!parentId)
    return { matrix: source.matrix.toArray(), mirrors: source.mirrors };

  return withResolvedNode(nodes, nodes[parentId], (parent) =>
    applyMirror(() => {
      const reflection = mirrorMatrix();
      const matrix = reflection
        .clone()
        .multiply(resolvedMatrix(parent).invert())
        .multiply(source.matrix)
        .multiply(reflection);
      return {
        matrix: matrix.toArray(),
        mirrors: [
          ...mirrorContext.filter((plane): plane is Plane => plane !== null),
          ...source.mirrors,
        ],
      };
    })(parent),
  );
}

export function applyTransforms(nodes: NodesMap, node: MapNode) {
  if (hasAffineTransforms(nodes, node)) {
    const { affineMatrix, ...resolved } = withResolvedNode(
      nodes,
      node,
      (resolved) => resolved,
    );
    return resolved;
  }

  let current = node;
  let parentId = current.parent;

  while (parentId) {
    const parent = nodes[parentId];

    current = applyParentTransform(parent)(current);
    parentId = parent.parent;
  }

  return current;
}

function applyHidden(node: ResolvedNode): ResolvedNode {
  if (node.hidden)
    return {
      ...node,
      scale: [0, 0, 0],
      ...(node.affineMatrix && {
        affineMatrix: node.affineMatrix
          .clone()
          .scale(new THREE.Vector3(0, 0, 0)),
      }),
    };
  return node;
}

function applyCloned(parents: MapNode[]) {
  return (node: ResolvedNode): ResolvedNode => {
    const isCloned = parents.some((parent) => parent.virtual);
    if (!isCloned || node.virtual) return node;
    return { ...node, virtual: true, originId: node.id };
  };
}

function applyOffset(node: MapNode): MapNode {
  // set node Z transform origin to bottom instead of center
  if (node.tag === "create" && (!node.version || node.version < 2))
    return {
      ...node,
      position: [
        node.position[0],
        node.position[1],
        node.position[2] + node.scale[2] / 2,
      ],
    };
  return node;
}

function applyPattern(node: MapNode): MapNode[] {
  if (!node.pattern) return [];

  if (node.pattern.mirror) {
    return [
      {
        ...node,
        id: node.id + "--X",
        virtual: true,
        originId: node.id,
        mirror: node.pattern.mirror,
      },
    ];
  }

  const clones: MapNode[] = Array(node.pattern.count)
    .fill(node)
    .map((clone, index) => ({
      ...clone,
      id: clone.id + `--${index}`,
      virtual: true,
      originId: node.id,
    }));

  for (let i = 0; i < clones.length; i++) {
    const clone = clones[i];

    clone.position = addTuples(
      clone.position,
      node.pattern.position.map(scalePattern(i)),
    );
    clone.rotation = addTuples(
      clone.rotation,
      node.pattern.rotation.map(scalePattern(i)),
    );
    clone.scale = addTuples(
      clone.scale,
      node.pattern.scale.map(scalePattern(i)),
    );
  }

  return clones;
}

function applyMirror<Node extends MapNode, Result>(fn: (node: Node) => Result) {
  return (node: Node): Result => {
    const mirror = [node.mirror].flat();
    mirrorContext.push(...mirror);
    try {
      return fn(node);
    } finally {
      for (let i = 0; i < mirror.length; i++) mirrorContext.pop();
    }
  };
}

// key -> InstancedMeshTransform[],
//   where `key` is node ID + clone index + parent ID + parent clone index + ...
const cache = new Map<string, InstancedMeshTransforms[]>();
// id -> key[],
//   list of all keys related to this id
const extraKeys = new Map<string, string[]>();
let revision = 0;
let resetRevision = 0;
const invalidations: Array<{ revision: number; ids: string[] }> = [];
export const clearCachedTransforms = () => {
  cache.clear();
  extraKeys.clear();
  resetRevision = ++revision;
  invalidations.length = 0;
};

const getKey = <T extends { id: string }>(node: T, parents: T[]) =>
  `${node.id}+${parents.map((p) => p.id).join("+")}`;

const addTransformsToCache = (
  id: string,
  key: string,
  transforms: InstancedMeshTransforms[],
) => {
  const keys = extraKeys.get(id) ?? [];
  keys.push(key);
  extraKeys.set(id, keys);
  cache.set(key, transforms);
};

/**
 * Return ids of all nodes in the branch of the specified node
 */
export const getIsolatedBranch = (index: NodesIndex, id: string) => {
  return [id, ...index[id].ancestorIds, ...index[id].descendantIds];
};

/**
 * Invalidate cached transforms for specified node ids
 */
export const invalidateCachedTransforms = (
  index: NodesIndex,
  ids: string[],
) => {
  invalidations.push({ revision: ++revision, ids: [...ids] });
  // Inactive previews rebuild if they fall behind this bounded change history.
  if (invalidations.length > 128) invalidations.shift();
  const allIds = new Set<string>();

  for (const id of ids) {
    for (const related of getIsolatedBranch(index, id)) allIds.add(related);
  }

  for (const id of allIds) {
    const keys = extraKeys.get(id) ?? [];
    extraKeys.set(id, []);
    for (const key of keys) cache.delete(key);
  }
};

interface ResolvedOccurrence {
  node: MapNode;
  treeNode: TreeBranch;
  parents: ResolvedNode[];
  mirrors: Array<Plane | null>;
  start: number;
  count: number;
}

type VisitResolvedNode = (
  treeNode: TreeBranch,
  parents: ResolvedNode[],
  mirrors: Array<Plane | null>,
  transforms: InstancedMeshTransforms[],
) => void;

function processSubtreeNode(
  district: District,
  nodes: NodesMap,
  treeNode: TreeBranch,
  parents: ResolvedNode[],
  visit?: VisitResolvedNode,
): InstancedMeshTransforms[] {
  const node = nodes[treeNode.id];
  const key = getKey(node, parents);
  if (!visit && cache.has(key)) return cache.get(key) ?? noTransforms;
  const mirrors = visit ? [...mirrorContext] : [];
  const transforms = withTransformFrame(node, parents.at(-1), (parent) => {
    const nodeCopies = [node, ...applyPattern(node)];
    if (node.type === "instance") {
      const resolveNode = pipe(
        applyParentTransform(parent),
        applyHidden,
        applyCloned(parents),
        applyOffset,
      );
      const resolvedNodes = nodeCopies.map(applyMirror(resolveNode));

      return resolvedNodes.map((node) => nodeToTransform(node, district));
    } else {
      const resolveNode = pipe(
        applyGroupPatternTransform(parent, node),
        applyHidden,
        applyCloned(parents),
      );
      const resolvedNodes = nodeCopies.map(resolveNode);

      return treeNode.children.flatMap((child) =>
        resolvedNodes.flatMap(
          applyMirror((parent) =>
            processSubtreeNode(
              district,
              nodes,
              child,
              [...parents, parent],
              visit,
            ),
          ),
        ),
      );
    }
  });
  if (visit) visit(treeNode, parents, mirrors, transforms);
  else addTransformsToCache(node.id, key, transforms);
  return transforms;
}

export const getTransformsFromSubtree = (
  district: District,
  nodes: NodesMap,
  treeNodes: TreeBranch[],
): InstancedMeshTransforms[] => {
  return treeNodes.flatMap((treeNode) =>
    processSubtreeNode(district, nodes, treeNode, []),
  );
};

const sameLayout = (previous: MapNode, next: MapNode) =>
  previous.type === next.type &&
  previous.parent === next.parent &&
  previous.district === next.district &&
  previous.tag === next.tag &&
  previous.hidden === next.hidden &&
  previous.virtual === next.virtual &&
  previous.originId === next.originId &&
  previous.pattern?.count === next.pattern?.count &&
  previous.pattern?.mirror === next.pattern?.mirror;

export class SubtreeTransforms {
  private revision = -1;
  private district?: District;
  private treeNodes?: TreeBranch[];
  private index?: NodesIndex;
  private isolated?: string;
  private occurrences = new Map<string, Map<string, ResolvedOccurrence>>();
  private transforms: InstancedMeshTransforms[] = [];
  // Zero excludes a slot; positive/negative values encode main/virtual index + 1.
  private slots: number[] = [];
  private main: InstancedMeshUpdate = { transforms: [] };
  private virtual: InstancedMeshUpdate = { transforms: [] };
  private readonly splitVirtual: boolean;

  constructor(splitVirtual = false) {
    this.splitVirtual = splitVirtual;
  }

  update(
    district: District,
    nodes: NodesMap,
    treeNodes: TreeBranch[],
    index: NodesIndex,
    isolated?: string,
  ) {
    const rebuild = () => {
      this.occurrences.clear();
      const visit = this.collectOccurrences(nodes, 0);
      this.transforms = treeNodes.flatMap((treeNode) =>
        processSubtreeNode(district, nodes, treeNode, [], visit),
      );
      this.main = { transforms: [] };
      this.virtual = { transforms: [] };
      const branch = isolated
        ? new Set(getIsolatedBranch(index, isolated))
        : undefined;
      this.slots = this.transforms.map((transform) => {
        if (branch && !branch.has(transform.originId || transform.id)) return 0;
        if (this.splitVirtual && transform.originId != null)
          return -this.virtual.transforms.push(transform);
        return this.main.transforms.push(transform);
      });
      this.district = district;
      this.treeNodes = treeNodes;
      this.index = index;
      this.isolated = isolated;
    };

    if (
      this.district !== district ||
      this.treeNodes !== treeNodes ||
      this.index !== index ||
      this.isolated !== isolated ||
      this.revision < resetRevision ||
      this.revision < (invalidations[0]?.revision ?? revision + 1) - 1
    ) {
      rebuild();
    } else {
      const dirty = new Set<string>();
      for (let i = invalidations.length - 1; i >= 0; i--) {
        const invalidation = invalidations[i];
        if (invalidation.revision <= this.revision) break;
        for (const id of invalidation.ids) {
          if (this.occurrences.has(id)) dirty.add(id);
        }
      }
      this.main = { transforms: this.main.transforms, changedIndexes: [] };
      this.virtual = {
        transforms: this.virtual.transforms,
        changedIndexes: [],
      };
      let layoutChanged = false;
      for (const id of dirty) {
        const occurrence = this.occurrences.get(id)!.values().next().value!;
        if (!nodes[id] || !sameLayout(occurrence.node, nodes[id])) {
          layoutChanged = true;
          break;
        }
      }
      if (!layoutChanged) {
        for (const id of dirty) {
          if (index[id].ancestorIds.some((ancestor) => dirty.has(ancestor)))
            continue;
          for (const occurrence of this.occurrences.get(id)!.values()) {
            const depth = mirrorContext.length;
            mirrorContext.push(...occurrence.mirrors);
            let transforms: InstancedMeshTransforms[];
            try {
              transforms = processSubtreeNode(
                district,
                nodes,
                occurrence.treeNode,
                occurrence.parents,
                this.collectOccurrences(nodes, occurrence.start),
              );
            } finally {
              mirrorContext.length = depth;
            }
            if (transforms.length !== occurrence.count) {
              layoutChanged = true;
              break;
            }
            for (let i = 0; i < transforms.length; i++) {
              const offset = occurrence.start + i;
              const transform = transforms[i];
              const previous = this.transforms[offset];
              if (
                transform.id !== previous.id ||
                transform.originId !== previous.originId
              ) {
                layoutChanged = true;
                break;
              }
              this.transforms[offset] = transform;
              const slot = this.slots[offset];
              if (slot === 0) continue;
              const target = slot > 0 ? this.main : this.virtual;
              const targetIndex = Math.abs(slot) - 1;
              target.transforms[targetIndex] = transform;
              target.changedIndexes!.push(targetIndex);
            }
            if (layoutChanged) break;
          }
          if (layoutChanged) break;
        }
      }
      if (layoutChanged) rebuild();
    }
    this.revision = revision;
    return { main: this.main, virtual: this.virtual };
  }

  private collectOccurrences(
    nodes: NodesMap,
    start: number,
  ): VisitResolvedNode {
    let cursor = start;
    return (treeNode, parents, mirrors, transforms) => {
      const node = nodes[treeNode.id];
      const offset =
        node.type === "instance" ? cursor : cursor - transforms.length;
      if (node.type === "instance") cursor += transforms.length;
      let occurrences = this.occurrences.get(node.id);
      if (!occurrences) {
        occurrences = new Map();
        this.occurrences.set(node.id, occurrences);
      }
      occurrences.set(getKey(node, parents), {
        node,
        treeNode,
        parents,
        mirrors,
        start: offset,
        count: transforms.length,
      });
    };
  }
}
