import { MapControls } from "@react-three/drei";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three/webgpu";
import { DRACOLoader } from "three-stdlib";

import { KNOWN_MESHES } from "./constants.ts";
import { useAppSelector, useAppStore } from "./hooks/hooks.ts";
import { STATIC_ASSETS } from "./map3d/constants.ts";
import { frustumSize } from "./map3d/map3d.base.ts";
import { staticMaterial } from "./map3d/materials.ts";
import { materialsMap } from "./map3d/setupTerrain.ts";
import mapData from "./mapData.min.json";
import { DistrictSelectors } from "./store/district.ts";
import { NodesSelectors } from "./store/nodesV2.ts";
import { OptionsSelectors } from "./store/options.ts";
import type { District, DistrictWithTransforms } from "./types/types.ts";
import { getFinalDistrictTransformsFromNodes } from "./utilities/district.ts";

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
function Meshes() {
  const three = useThree();
  const refs = React.useRef<Record<string, THREE.InstancedMesh | null>>({});
  const store = useAppStore();
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

    if (!currentDistrict) return visibleDistricts;

    return visibleDistricts.filter(
      (district) => district.name !== currentDistrict.name,
    );
  }, [currentDistrict, allDistricts, visibleDistrictNames, districtView]);
  const districtsWithTransforms = React.useMemo<
    DistrictWithTransforms[]
  >(() => {
    const state = store.getState();
    const nodes = NodesSelectors.getNodes(state);
    const tree = NodesSelectors.getNodesTree(state);

    return nonCurrentDistricts.map((district) => ({
      district,
      transforms: getFinalDistrictTransformsFromNodes(district, nodes, tree),
    }));
  }, [nonCurrentDistricts, store]);

  React.useEffect(() => {
    for (const { district, transforms } of districtsWithTransforms) {
      const mesh = refs.current[district.name];
      if (!mesh) continue;

      const position = new THREE.Vector3().fromArray(district.position);
      const transformMin = new THREE.Vector4().fromArray(district.transMin);

      mesh.position.set(
        position.x + transformMin.x,
        position.z + transformMin.z,
        -position.y - transformMin.y,
      );
      const temp = new THREE.Matrix4();
      for (let i = 0; i < transforms.length; i += 1) {
        const transform = transforms[i];
        const position = new THREE.Vector3(
          transform.position.x,
          transform.position.z,
          -transform.position.y,
        );
        const rotation = new THREE.Quaternion(
          transform.orientation.x,
          transform.orientation.z,
          -transform.orientation.y,
          transform.orientation.w,
        );
        const scale = new THREE.Vector3(
          transform.scale.x,
          transform.scale.z,
          transform.scale.y,
        );
        temp.compose(position, rotation, scale);
        mesh.setMatrixAt(i, temp);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    three.invalidate();
  }, [districtsWithTransforms, three]);

  return (
    <>
      {districtsWithTransforms.map(({ district, transforms }) => (
        <instancedMesh
          ref={(node) => (refs.current[district.name] = node)}
          args={[undefined, undefined, getCount(transforms.length)]}
          key={district.name}
          material={staticMaterial}
          position={district.position}
        >
          <boxGeometry args={boxScale} />
        </instancedMesh>
      ))}
    </>
  );
}

function Map3D() {
  const canvas = React.useRef<HTMLCanvasElement | null>(null);
  const camera = React.useMemo(
    () =>
      new THREE.OrthographicCamera(
        frustumSize / -2,
        frustumSize / 2,
        frustumSize / 2,
        frustumSize / -2,
        0.1,
        20_000,
      ),
    [],
  );

  React.useEffect(() => {
    if (!canvas.current) return;
    const aspect = canvas.current.clientWidth / canvas.current.clientHeight;
    camera.left = (frustumSize * aspect) / -2;
    camera.right = (frustumSize * aspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.position.set(0, 3000, 0);
    camera.lookAt(0, 0, 0);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
  }, [camera]);

  return (
    <Canvas
      ref={canvas}
      orthographic
      camera={camera}
      gl={async (props) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new THREE.WebGPURenderer(props as any);
        await renderer.init();
        return renderer;
      }}
      frameloop="demand"
    >
      <MapControls
        zoomToCursor
        maxDistance={10_000}
        minDistance={1}
        maxPolarAngle={Math.PI / 2}
      />
      <Lights />
      <StaticAssets />
      <Meshes />
    </Canvas>
  );
}

export default Map3D;
