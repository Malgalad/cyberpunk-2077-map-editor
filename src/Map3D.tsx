import { MapControls, OrthographicCamera } from "@react-three/drei";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three/webgpu";
import { DRACOLoader } from "three-stdlib";

import { KNOWN_MESHES } from "./constants.ts";
import { useAppSelector, useAppStore } from "./hooks/hooks.ts";
import { STATIC_ASSETS } from "./map3d/constants.ts";
import { frustumSize } from "./map3d/map3d.base.ts";
import {
  additionsMaterial,
  buildingsMaterial,
  staticMaterial,
} from "./map3d/materials.ts";
import { materialsMap } from "./map3d/setupTerrain.ts";
import mapData from "./mapData.min.json";
import { DistrictSelectors } from "./store/district.ts";
import { NodesSelectors } from "./store/nodesV2.ts";
import { OptionsSelectors } from "./store/options.ts";
import type {
  District,
  InstancedMeshTransforms,
  TreeNode,
} from "./types/types.ts";
import {
  getFinalDistrictTransformsFromNodes,
  immutableDistrictTransforms,
} from "./utilities/district.ts";
import { getTransformsFromSubtree } from "./utilities/getTransformsFromSubtree.ts";
import { invariant, partition } from "./utilities/utilities.ts";

// region static
function useDracoLoader(url: string[]) {
  return useLoader(DRACOLoader, url, (loader) => {
    loader.setDecoderPath(STATIC_ASSETS + "/draco/");
  });
}

interface StaticAsset {
  name: string;
  url: string;
  position: THREE.Vector3Tuple;
  scale: THREE.Vector3Tuple;
  rotation: THREE.Vector3Tuple;
}
const rotateCoordinates = ([x, y, z, w]: number[]) =>
  [x, z, -y, w] as unknown as THREE.Vector3Tuple;
function StaticAssets() {
  const meshes = React.useMemo<StaticAsset[]>(() => {
    return KNOWN_MESHES.map((name) => {
      const data = mapData.meshes[name];
      return {
        name,
        url: `${STATIC_ASSETS}/3dmodels/${data.model.replace(".mesh", ".drc")}`,
        position: rotateCoordinates(data.position),
        scale: data.visualScale as THREE.Vector3Tuple,
        rotation: rotateCoordinates(data.orientation),
      };
    });
  }, []);
  const urls = React.useMemo(() => meshes.map(({ url }) => url), [meshes]);
  const geometries = useDracoLoader(urls);
  const visibleMeshes = useAppSelector(OptionsSelectors.getVisibleMeshes);

  return (
    <>
      {meshes.flatMap((asset, i) =>
        Array.isArray(materialsMap[asset.name]) ? (
          (materialsMap[asset.name] as THREE.Material[]).map((material, m) => (
            <mesh
              key={asset.name + m}
              position={asset.position}
              scale={asset.scale}
              rotation={new THREE.Euler().setFromQuaternion(
                new THREE.Quaternion(...asset.rotation),
              )}
              material={material}
              visible={visibleMeshes.includes(asset.name)}
            >
              <bufferGeometry {...geometries[i]} />
            </mesh>
          ))
        ) : (
          <mesh
            key={asset.name}
            position={asset.position}
            scale={asset.scale}
            rotation={new THREE.Euler().setFromQuaternion(
              new THREE.Quaternion(...asset.rotation),
            )}
            material={materialsMap[asset.name]}
            visible={visibleMeshes.includes(asset.name)}
          >
            <bufferGeometry {...geometries[i]} />
          </mesh>
        ),
      )}
    </>
  );
}
// endregion

function Lights() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[1, 1, 1]} />
      <directionalLight position={[-1, 1, 1]} intensity={0.5} />
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emptyArray: any[] = [];
const boxScale = [1, 1, 1] as const;
const getCount = (length: number) =>
  Math.max(1000, Math.ceil(length / 1000) * 1000);

function useUpsertInstances(
  meshRef: React.RefObject<THREE.InstancedMesh | null>,
  transforms: InstancedMeshTransforms[],
  district?: District,
) {
  const three = useThree();

  React.useEffect(() => {
    const mesh = meshRef.current;

    if (!mesh || !district) return;

    const position = new THREE.Vector3().fromArray(district.position);
    const transformMin = new THREE.Vector4().fromArray(district.transMin);

    mesh.position.set(
      position.x + transformMin.x,
      position.z + transformMin.z,
      -position.y - transformMin.y,
    );

    const matrix = new THREE.Matrix4();
    let needsUpdate = false;

    for (let index = 0; index < transforms.length; index++) {
      const instance = transforms[index];

      // if (instance === mesh.userData.instances[index]) continue;

      const position = new THREE.Vector3(
        instance.position.x,
        instance.position.z,
        -instance.position.y,
      );
      const rotation = new THREE.Quaternion(
        instance.orientation.x,
        instance.orientation.z,
        -instance.orientation.y,
        instance.orientation.w,
      );
      const scale = new THREE.Vector3(
        instance.scale.x,
        instance.scale.z,
        instance.scale.y,
      );

      needsUpdate = true;
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(index, matrix);
      // if (color) mesh.setColorAt(index, color);
    }

    if (needsUpdate) mesh.instanceMatrix.needsUpdate = true;
    if (needsUpdate) mesh.computeBoundingSphere();
    if (needsUpdate) three.invalidate();
  }, [district, transforms, meshRef, three]);
}

function StaticInstancedMesh(props: { district: District; visible?: boolean }) {
  const { district, ...rest } = props;
  const store = useAppStore();
  const meshRef = React.useRef<THREE.InstancedMesh | null>(null);
  const transforms = React.useMemo(() => {
    if (!district) return emptyArray;

    const state = store.getState();
    const nodes = NodesSelectors.getNodes(state);
    const tree = NodesSelectors.getNodesTree(state);

    return getFinalDistrictTransformsFromNodes(district, nodes, tree);
  }, [district, store]);

  useUpsertInstances(meshRef, transforms, district);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, getCount(transforms.length)]}
      material={staticMaterial}
      {...rest}
    >
      <boxGeometry args={boxScale} />
    </instancedMesh>
  );
}

function CurrentInstancedMesh(props: {
  district?: District;
  visible?: boolean;
}) {
  const { district, ...rest } = props;
  const store = useAppStore();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const tree = useAppSelector(NodesSelectors.getNodesTree);
  const baselineMesh = React.useRef<THREE.InstancedMesh | null>(null);
  const additionsMesh = React.useRef<THREE.InstancedMesh | null>(null);
  const baselineTransforms = React.useMemo(() => {
    if (!district) return emptyArray;

    const state = store.getState();
    const nodes = NodesSelectors.getNodes(state);
    const index = NodesSelectors.getNodesIndex(state);
    const root = index[district.name];

    const baseTransforms = immutableDistrictTransforms.get(district.name) ?? [];

    if (root) {
      const { update: updates = [], delete: deletions = [] } = partition(
        root.descendantIds,
        (id) => nodes[id].tag,
      );
      const updateIndexes = new Set(
        updates.map((id) => nodes[id].indexInDistrict),
      );
      const deletionIndexes = new Set(
        deletions.map((id) => nodes[id].indexInDistrict),
      );

      return baseTransforms.map((instance, index) => {
        if (updateIndexes.has(index) || deletionIndexes.has(index)) {
          return { ...instance, scale: { x: 0, y: 0, z: 0, w: 0 } };
        }

        return instance;
      });
    } else {
      return baseTransforms;
    }
  }, [district, store]);

  const additions = React.useMemo<TreeNode[]>(() => {
    if (!district || !tree[district.name]) return emptyArray;
    const root = tree[district.name];
    invariant(root.type === "district", "Unexpected tree node type");
    return root.create;
  }, [district, tree]);
  const additionsTransforms = React.useMemo(
    () =>
      district
        ? getTransformsFromSubtree(district, nodes, additions)
        : emptyArray,
    [district, nodes, additions],
  );

  useUpsertInstances(baselineMesh, baselineTransforms, district);
  useUpsertInstances(additionsMesh, additionsTransforms, district);

  return (
    <>
      <instancedMesh
        ref={baselineMesh}
        args={[undefined, undefined, getCount(baselineTransforms.length)]}
        material={buildingsMaterial}
        {...rest}
      >
        <boxGeometry args={boxScale} />
      </instancedMesh>
      <instancedMesh
        ref={additionsMesh}
        args={[undefined, undefined, getCount(additionsTransforms.length)]}
        material={additionsMaterial}
        {...rest}
      >
        <boxGeometry args={boxScale} />
      </instancedMesh>
    </>
  );
}

function Meshes() {
  const three = useThree();
  const currentDistrict = useAppSelector(DistrictSelectors.getDistrict);
  const allDistricts = useAppSelector(DistrictSelectors.getAllDistricts);
  const districtView = useAppSelector(OptionsSelectors.getDistrictView);
  const visibleDistrictNames = useAppSelector(
    OptionsSelectors.getVisibleDistricts,
  );
  const nonCurrentDistricts = React.useMemo(() => {
    const districtsVisibilityMap: Record<string, District[]> = {
      all: allDistricts,
      current: emptyArray,
      custom: allDistricts.filter((district) =>
        visibleDistrictNames.includes(district.name),
      ),
    };
    const visibleDistricts = districtsVisibilityMap[districtView];

    if (!currentDistrict)
      return visibleDistricts.map((district) => district.name);

    return visibleDistricts
      .filter((district) => district.name !== currentDistrict.name)
      .map((district) => district.name);
  }, [currentDistrict, allDistricts, visibleDistrictNames, districtView]);

  React.useEffect(() => {
    three.invalidate();
  }, [three, nonCurrentDistricts]);

  return (
    <>
      {allDistricts.map((district) => (
        <StaticInstancedMesh
          key={district.name}
          district={district}
          visible={
            nonCurrentDistricts.includes(district.name) &&
            district.name !== currentDistrict?.name
          }
        />
      ))}
      <CurrentInstancedMesh
        district={currentDistrict}
        visible={!!currentDistrict}
      />
    </>
  );
}

function useSetupCamera(canvas: React.RefObject<HTMLCanvasElement | null>) {
  const cameraRef = React.useRef<THREE.OrthographicCamera | null>(null);

  React.useEffect(() => {
    const camera = cameraRef.current;
    if (!canvas.current || !camera) return;
    const aspect = canvas.current.clientWidth / canvas.current.clientHeight;
    camera.left = (frustumSize * aspect) / -2;
    camera.right = (frustumSize * aspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [cameraRef, canvas]);

  return cameraRef;
}

function Map3D() {
  const canvas = React.useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useSetupCamera(canvas);

  return (
    <Canvas
      ref={canvas}
      orthographic
      gl={async (props) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new THREE.WebGPURenderer(props as any);
        await renderer.init();
        return renderer;
      }}
      frameloop="demand"
    >
      <OrthographicCamera
        makeDefault
        position={[0, 3000, 0]}
        near={0.1}
        far={5_000}
        ref={cameraRef}
      />
      <MapControls
        zoomToCursor
        maxDistance={5_000}
        minDistance={1}
        maxPolarAngle={Math.PI / 2}
        enableDamping={false}
      />
      <Lights />
      <StaticAssets />
      <Meshes />
    </Canvas>
  );
}

export default Map3D;
