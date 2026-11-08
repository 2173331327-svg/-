/**
 * 晴愈 (QingYu) - 3D 悬浮心象岛屿与动态天气系统
 * 基于 Three.js 遵循 PBR 渲染、低多边形马卡龙美学与性能规约
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { WeatherType, WEATHER_CONFIGS, IslandFloraItem, FloraCategory } from '../types';
import { ecosystemService } from '../services/ecosystemService';

interface IslandCanvasProps {
  weather: WeatherType;
  onIslandClick?: () => void;
  onFloraSprouted?: (flora: IslandFloraItem) => void;
}

// Scratch math helpers outside render loop (Zero GC)
const _vec3 = new THREE.Vector3();
const _color = new THREE.Color();
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.8);
const _intersectPoint = new THREE.Vector3();

interface DynamicCloudData {
  group: THREE.Group;
  initialRadius: number;
  angle: number;
  speed: number;
  altitude: number;
  bobRate: number;
  bobPhase: number;
  baseScale: number;
}

interface FloraMeshNode {
  id: string;
  item: IslandFloraItem;
  group: THREE.Group;
  targetScale: number;
  currentScale: number;
  swayPhase: number;
  type: FloraCategory;
  isSprouting: boolean;
  sproutProgress: number; // 0 to 1
  mats: THREE.Material[];
}

export const IslandCanvas: React.FC<IslandCanvasProps> = ({ weather, onIslandClick, onFloraSprouted }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const weatherRef = useRef<WeatherType>(weather);
  const onFloraSproutedRef = useRef(onFloraSprouted);
  onFloraSproutedRef.current = onFloraSprouted;
  const sceneRef = useRef<THREE.Scene | null>(null);
  const weatherGroupRef = useRef<THREE.Group | null>(null);
  const windmillBladesRef = useRef<THREE.Group | null>(null);
  const islandGroupRef = useRef<THREE.Group | null>(null);
  const ecosystemGroupRef = useRef<THREE.Group | null>(null);
  const floraNodesRef = useRef<Map<string, FloraMeshNode>>(new Map());
  const satelliteA_Ref = useRef<THREE.Group | null>(null);
  const satelliteB_Ref = useRef<THREE.Group | null>(null);
  const dynamicCloudsRef = useRef<DynamicCloudData[]>([]);
  const cloudMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const chimneySmokeRef = useRef<{ mesh: THREE.Mesh; basePosY: number; speed: number; phase: number }[]>([]);
  const motesGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const motesPositionsRef = useRef<Float32Array | null>(null);
  const rainGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const rainParticlesRef = useRef<THREE.Points | null>(null);
  const tornadoParticlesRef = useRef<THREE.Points | null>(null);
  const lightningLightRef = useRef<THREE.PointLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const rainbowRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL Guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer & Color Pipeline
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 3. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const currentSkyColor = new THREE.Color(WEATHER_CONFIGS[weatherRef.current].skyColor);
    scene.background = currentSkyColor;
    scene.fog = new THREE.FogExp2(currentSkyColor, 0.016);

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 14, 28);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Prevent viewing underneath void
    controls.minDistance = 14;
    controls.maxDistance = 50;
    controls.target.set(0, 2, 0);

    // 4. Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting Rig (Key Warm Light with PCF Soft Shadows + Cool Hemisphere + Rim Light)
    const hemiLight = new THREE.HemisphereLight(0xfff8ed, 0xb0c4de, 1.25);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    dirLight.position.set(22, 34, 18);
    dirLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      dirLight.shadow.mapSize.set(isSoftwareGl ? 1024 : 2048, isSoftwareGl ? 1024 : 2048);
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 90;
      const d = 18;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.bias = -0.0003;
      dirLight.shadow.normalBias = 0.02;
      dirLight.shadow.radius = 2.5;
    }
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Cool Rim Directional Light to accentuate low-poly faceted silhouettes
    const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.85);
    rimLight.position.set(-25, 20, -22);
    scene.add(rimLight);

    // Lightning Flash Light
    const lightningLight = new THREE.PointLight(0x93c5fd, 0, 80);
    lightningLight.position.set(0, 20, 0);
    scene.add(lightningLight);
    lightningLightRef.current = lightningLight;

    // Dual Concentric Soft Contact Shadow Grounding Discs underneath island
    const innerShadowGeo = new THREE.PlaneGeometry(16, 16);
    const innerShadowMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const innerShadowMesh = new THREE.Mesh(innerShadowGeo, innerShadowMat);
    innerShadowMesh.rotation.x = -Math.PI / 2;
    innerShadowMesh.position.y = -8.5;
    scene.add(innerShadowMesh);

    const outerShadowGeo = new THREE.PlaneGeometry(28, 28);
    const outerShadowMat = new THREE.MeshBasicMaterial({
      color: 0xcfd8dc,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    const outerShadowMesh = new THREE.Mesh(outerShadowGeo, outerShadowMat);
    outerShadowMesh.rotation.x = -Math.PI / 2;
    outerShadowMesh.position.y = -8.52;
    scene.add(outerShadowMesh);

    // 6. Island Model Construction (Composite Multi-Part Procedural Low-Poly Models)
    const islandGroup = new THREE.Group();
    scene.add(islandGroup);
    islandGroupRef.current = islandGroup;

    // 6.1 Multi-Tier Terraced Rock Base
    // Upper Cliff Strata (Faceted Cylinder)
    const upperRockGeo = new THREE.CylinderGeometry(8.5, 7.6, 2.5, 11);
    const upPos = upperRockGeo.attributes.position;
    for (let i = 0; i < upPos.count; i++) {
      const y = upPos.getY(i);
      if (y < 1.0) {
        upPos.setX(i, upPos.getX(i) + (Math.sin(i * 1.5) * 0.4));
        upPos.setZ(i, upPos.getZ(i) + (Math.cos(i * 2.3) * 0.4));
      }
    }
    upperRockGeo.computeVertexNormals();

    const rockUpperMat = new THREE.MeshStandardMaterial({
      color: 0x78716c, // Stone slate
      roughness: 0.88,
      metalness: 0.08,
      flatShading: true,
    });
    const upperRockMesh = new THREE.Mesh(upperRockGeo, rockUpperMat);
    upperRockMesh.position.y = -1.2;
    upperRockMesh.castShadow = !isSoftwareGl;
    upperRockMesh.receiveShadow = !isSoftwareGl;
    islandGroup.add(upperRockMesh);

    // Lower Inverted Mountain Cone (Deep Subterranean strata)
    const lowerRockGeo = new THREE.ConeGeometry(7.7, 8.5, 9, 3, false);
    const lowPos = lowerRockGeo.attributes.position;
    for (let i = 0; i < lowPos.count; i++) {
      const y = lowPos.getY(i);
      if (y < 4) {
        lowPos.setX(i, lowPos.getX(i) + (Math.sin(i * 1.8) * 0.5));
        lowPos.setZ(i, lowPos.getZ(i) + (Math.cos(i * 2.2) * 0.5));
      }
    }
    lowerRockGeo.computeVertexNormals();

    const rockLowerMat = new THREE.MeshStandardMaterial({
      color: 0x57534e, // Darker stone basalt
      roughness: 0.92,
      metalness: 0.12,
      flatShading: true,
    });
    const lowerRockMesh = new THREE.Mesh(lowerRockGeo, rockLowerMat);
    lowerRockMesh.rotation.x = Math.PI;
    lowerRockMesh.position.y = -5.0;
    lowerRockMesh.castShadow = !isSoftwareGl;
    lowerRockMesh.receiveShadow = !isSoftwareGl;
    islandGroup.add(lowerRockMesh);

    // Protruding Glowing Crystal Clusters on cliff crags
    const cliffCrystalVioletMat = new THREE.MeshPhysicalMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 0.45,
      roughness: 0.1,
      metalness: 0.2,
      flatShading: true,
    });
    const cliffCrystalCyanMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.1,
      metalness: 0.2,
      flatShading: true,
    });

    const crystalOctaGeo = new THREE.OctahedronGeometry(0.55, 0);
    const addCrystal = (x: number, y: number, z: number, rx: number, rz: number, isViolet: boolean) => {
      const cr = new THREE.Mesh(crystalOctaGeo, isViolet ? cliffCrystalVioletMat : cliffCrystalCyanMat);
      cr.position.set(x, y, z);
      cr.rotation.set(rx, 0, rz);
      cr.scale.set(0.9, 1.4, 0.9);
      cr.castShadow = !isSoftwareGl;
      islandGroup.add(cr);
    };
    addCrystal(4.8, -1.0, 3.6, 0.4, 0.5, true);
    addCrystal(5.2, -1.4, 3.1, -0.3, 0.6, true);
    addCrystal(-5.1, -1.3, 2.2, 0.5, -0.6, false);
    addCrystal(1.4, -2.4, -4.8, -0.6, 0.2, false);
    addCrystal(-3.9, -2.6, -3.4, -0.4, -0.5, true);

    // 6.2 Island Grass Top Layer (Faceted Cylinder)
    const grassGeo = new THREE.CylinderGeometry(8.6, 8.0, 1.8, 12);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x86efac, // Fresh Morandi pastel green
      roughness: 0.8,
      metalness: 0.05,
      flatShading: true,
    });
    const grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.position.y = 1.0;
    grassMesh.castShadow = !isSoftwareGl;
    grassMesh.receiveShadow = !isSoftwareGl;
    islandGroup.add(grassMesh);

    // Secondary Rolling Hill Mounds
    const hillGeo = new THREE.DodecahedronGeometry(2.4, 0);
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      roughness: 0.85,
      flatShading: true,
    });
    const hill1 = new THREE.Mesh(hillGeo, hillMat);
    hill1.position.set(-3.2, 1.8, -2.0);
    hill1.scale.set(1.4, 0.9, 1.3);
    hill1.castShadow = !isSoftwareGl;
    hill1.receiveShadow = !isSoftwareGl;
    islandGroup.add(hill1);

    const hill2 = new THREE.Mesh(hillGeo, hillMat);
    hill2.position.set(2.8, 1.6, 2.4);
    hill2.scale.set(1.1, 0.7, 1.1);
    hill2.castShadow = !isSoftwareGl;
    hill2.receiveShadow = !isSoftwareGl;
    islandGroup.add(hill2);

    const hill3 = new THREE.Mesh(hillGeo, hillMat);
    hill3.position.set(-1.6, 1.5, 3.2);
    hill3.scale.set(0.9, 0.6, 0.9);
    hill3.castShadow = !isSoftwareGl;
    hill3.receiveShadow = !isSoftwareGl;
    islandGroup.add(hill3);

    // 6.3 Crystal Healing Pond & Cascading Waterfall
    const waterGeo = new THREE.CylinderGeometry(3.2, 3.0, 0.25, 11);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      roughness: 0.08,
      metalness: 0.12,
      transmission: isSoftwareGl ? 0 : 0.65,
      transparent: true,
      opacity: 0.85,
      flatShading: true,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(-0.5, 1.85, 0.2);
    waterMesh.receiveShadow = !isSoftwareGl;
    islandGroup.add(waterMesh);

    // Stepping stones around pond
    const stoneGeo = new THREE.DodecahedronGeometry(0.45, 0);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.9,
      flatShading: true,
    });
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(
        -0.5 + Math.cos(angle) * 3.4,
        1.95,
        0.2 + Math.sin(angle) * 3.4
      );
      stone.scale.set(1 + Math.sin(i * 1.5) * 0.2, 0.45, 1 + Math.cos(i * 1.5) * 0.2);
      stone.castShadow = !isSoftwareGl;
      stone.receiveShadow = !isSoftwareGl;
      islandGroup.add(stone);
    }

    // Cascading Low-Poly Crystal Waterfall flowing from pond down the cliff
    const waterfallMat = new THREE.MeshPhysicalMaterial({
      color: 0xa5f3fc,
      roughness: 0.05,
      metalness: 0.15,
      transmission: isSoftwareGl ? 0 : 0.75,
      transparent: true,
      opacity: 0.88,
      flatShading: true,
    });

    const wfUpperGeo = new THREE.BoxGeometry(1.3, 1.8, 0.22);
    const wfUpper = new THREE.Mesh(wfUpperGeo, waterfallMat);
    wfUpper.position.set(-3.9, 1.2, 0.35);
    wfUpper.rotation.z = 0.38;
    islandGroup.add(wfUpper);

    const wfMidGeo = new THREE.BoxGeometry(1.4, 3.2, 0.25);
    const wfMid = new THREE.Mesh(wfMidGeo, waterfallMat);
    wfMid.position.set(-4.4, -0.9, 0.4);
    wfMid.rotation.z = 0.16;
    islandGroup.add(wfMid);

    const wfLowGeo = new THREE.BoxGeometry(1.2, 2.8, 0.24);
    const wfLow = new THREE.Mesh(wfLowGeo, waterfallMat);
    wfLow.position.set(-4.6, -3.5, 0.42);
    islandGroup.add(wfLow);

    // Waterfall mist foam spray at lower cliff
    const foamSprayGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const foamMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      transparent: true,
      opacity: 0.75,
      flatShading: true,
    });
    for (let f = 0; f < 6; f++) {
      const foam = new THREE.Mesh(foamSprayGeo, foamMat);
      foam.position.set(
        -4.6 + (Math.random() - 0.5) * 0.7,
        -4.6 + Math.random() * 0.8,
        0.42 + (Math.random() - 0.5) * 0.7
      );
      foam.scale.setScalar(0.7 + Math.random() * 0.6);
      islandGroup.add(foam);
    }

    // 6.4 Cozy Little Low-Poly Healing Cottage
    const cottageGroup = new THREE.Group();
    cottageGroup.position.set(-3.4, 2.5, -1.8);
    islandGroup.add(cottageGroup);

    // House Body
    const houseBodyGeo = new THREE.BoxGeometry(2.0, 1.5, 2.0);
    const houseBodyMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5, // Warm cream
      roughness: 0.7,
      flatShading: true,
    });
    const houseBody = new THREE.Mesh(houseBodyGeo, houseBodyMat);
    houseBody.position.y = 0.75;
    houseBody.castShadow = !isSoftwareGl;
    houseBody.receiveShadow = !isSoftwareGl;
    cottageGroup.add(houseBody);

    // Roof (Pastel terracotta cone/prism)
    const roofGeo = new THREE.ConeGeometry(1.8, 1.2, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xfb7185, // Rose pastel
      roughness: 0.6,
      flatShading: true,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 2.0;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = !isSoftwareGl;
    cottageGroup.add(roof);

    // Chimney & Animated Smoke Puffs
    const chimneyGeo = new THREE.BoxGeometry(0.35, 0.9, 0.35);
    const chimney = new THREE.Mesh(chimneyGeo, stoneMat);
    chimney.position.set(0.6, 2.25, 0.2);
    chimney.castShadow = !isSoftwareGl;
    cottageGroup.add(chimney);

    const smokeGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f4,
      roughness: 0.9,
      transparent: true,
      opacity: 0.55,
      flatShading: true,
    });
    chimneySmokeRef.current = [];
    for (let s = 0; s < 3; s++) {
      const smokeMesh = new THREE.Mesh(smokeGeo, smokeMat);
      smokeMesh.position.set(0.6, 2.8 + s * 0.45, 0.2);
      cottageGroup.add(smokeMesh);
      chimneySmokeRef.current.push({
        mesh: smokeMesh,
        basePosY: 2.7,
        speed: 0.45 + s * 0.1,
        phase: (s / 3) * Math.PI * 2,
      });
    }

    // 6.5 Low-Poly Windmill
    const windmillGroup = new THREE.Group();
    windmillGroup.position.set(3.8, 2.2, -1.5);
    islandGroup.add(windmillGroup);

    const millTowerGeo = new THREE.CylinderGeometry(0.8, 1.2, 3.2, 7);
    const millTowerMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.75,
      flatShading: true,
    });
    const millTower = new THREE.Mesh(millTowerGeo, millTowerMat);
    millTower.position.y = 1.6;
    millTower.castShadow = !isSoftwareGl;
    millTower.receiveShadow = !isSoftwareGl;
    windmillGroup.add(millTower);

    const millRoofGeo = new THREE.ConeGeometry(1.1, 1.0, 7);
    const millRoof = new THREE.Mesh(millRoofGeo, roofMat);
    millRoof.position.y = 3.6;
    millRoof.castShadow = !isSoftwareGl;
    windmillGroup.add(millRoof);

    // Windmill rotating blades
    const bladesGroup = new THREE.Group();
    bladesGroup.position.set(0, 3.0, 0.9);
    windmillGroup.add(bladesGroup);
    windmillBladesRef.current = bladesGroup;

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.6,
      flatShading: true,
    });
    for (let b = 0; b < 4; b++) {
      const bladeGeo = new THREE.BoxGeometry(0.25, 2.2, 0.05);
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 1.0;
      blade.castShadow = !isSoftwareGl;
      const bladeHolder = new THREE.Group();
      bladeHolder.rotation.z = (b * Math.PI) / 2;
      bladeHolder.add(blade);
      bladesGroup.add(bladeHolder);
    }

    // 6.6 Procedural Trees (Pine & Sakura Cherry Blossom)
    const treeTrunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.6, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.9,
      flatShading: true,
    });

    const createPineTree = (x: number, z: number, scale = 1.0) => {
      const tree = new THREE.Group();
      tree.position.set(x, 1.9, z);
      tree.scale.setScalar(scale);

      const trunk = new THREE.Mesh(treeTrunkGeo, trunkMat);
      trunk.position.y = 0.8;
      trunk.castShadow = !isSoftwareGl;
      trunk.receiveShadow = !isSoftwareGl;
      tree.add(trunk);

      const foliageMat = new THREE.MeshStandardMaterial({
        color: 0x15803d, // Emerald green
        roughness: 0.8,
        flatShading: true,
      });

      for (let layer = 0; layer < 3; layer++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(1.4 - layer * 0.3, 1.2, 6),
          foliageMat
        );
        cone.position.y = 1.4 + layer * 0.75;
        cone.castShadow = !isSoftwareGl;
        cone.receiveShadow = !isSoftwareGl;
        tree.add(cone);
      }
      islandGroup.add(tree);
    };

    const createSakuraTree = (x: number, z: number, scale = 1.0) => {
      const tree = new THREE.Group();
      tree.position.set(x, 1.9, z);
      tree.scale.setScalar(scale);

      const trunk = new THREE.Mesh(treeTrunkGeo, trunkMat);
      trunk.position.y = 0.8;
      trunk.rotation.z = 0.08;
      trunk.castShadow = !isSoftwareGl;
      trunk.receiveShadow = !isSoftwareGl;
      tree.add(trunk);

      const sakuraMat = new THREE.MeshStandardMaterial({
        color: 0xfbcfe8, // Soft sakura pink
        roughness: 0.75,
        flatShading: true,
      });

      // 3 overlapping faceted clusters
      const clusterGeo = new THREE.IcosahedronGeometry(0.85, 0);
      const c1 = new THREE.Mesh(clusterGeo, sakuraMat);
      c1.position.set(0, 1.8, 0);
      c1.scale.set(1.4, 1.2, 1.3);
      c1.castShadow = !isSoftwareGl;
      tree.add(c1);

      const c2 = new THREE.Mesh(clusterGeo, sakuraMat);
      c2.position.set(0.6, 2.0, 0.4);
      c2.scale.set(1.1, 1.0, 1.1);
      c2.castShadow = !isSoftwareGl;
      tree.add(c2);

      const c3 = new THREE.Mesh(clusterGeo, sakuraMat);
      c3.position.set(-0.5, 1.6, -0.3);
      c3.scale.set(1.0, 0.9, 1.0);
      c3.castShadow = !isSoftwareGl;
      tree.add(c3);

      islandGroup.add(tree);
    };

    // Plant trees
    createPineTree(-4.8, 1.2, 1.2);
    createPineTree(-2.2, 4.0, 0.9);
    createPineTree(4.2, 2.5, 1.0);
    createSakuraTree(1.8, -3.2, 1.3);
    createSakuraTree(3.5, 0.2, 1.0);
    createSakuraTree(-1.5, -4.0, 1.1);

    // 6.7 Floating Satellite Mini-Islets
    const satGeo = new THREE.ConeGeometry(1.8, 2.4, 7);
    const satMeshA = new THREE.Mesh(satGeo, rockUpperMat);
    satMeshA.rotation.x = Math.PI;
    satMeshA.castShadow = !isSoftwareGl;

    const satGrassA = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 1.6, 0.4, 7),
      grassMat
    );
    satGrassA.position.y = 1.2;
    satGrassA.castShadow = !isSoftwareGl;

    const crystalGeo = new THREE.OctahedronGeometry(0.7, 0);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0xa78bfa, // Violet crystal
      emissive: 0x7c3aed,
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.2,
      flatShading: true,
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.y = 2.0;
    crystalMesh.castShadow = !isSoftwareGl;

    const satelliteA = new THREE.Group();
    satelliteA.add(satMeshA);
    satelliteA.add(satGrassA);
    satelliteA.add(crystalMesh);
    satelliteA.position.set(9.5, -1.0, -4.0);
    scene.add(satelliteA);
    satelliteA_Ref.current = satelliteA;

    const satelliteB = new THREE.Group();
    const satMeshB = satMeshA.clone();
    const satGrassB = satGrassA.clone();
    satelliteB.add(satMeshB);
    satelliteB.add(satGrassB);
    satelliteB.position.set(-10.0, 1.5, 3.5);
    satelliteB.scale.setScalar(0.75);
    scene.add(satelliteB);
    satelliteB_Ref.current = satelliteB;

    // 6.8 Island Ecosystem: Dynamic Low-Poly Growing Vegetation
    const ecosystemGroup = new THREE.Group();
    islandGroup.add(ecosystemGroup);
    ecosystemGroupRef.current = ecosystemGroup;
    floraNodesRef.current.clear();

    const buildFloraMeshGroup = (flora: IslandFloraItem): { group: THREE.Group; mats: THREE.Material[] } => {
      const g = new THREE.Group();
      const mats: THREE.Material[] = [];
      g.position.set(flora.position[0], flora.position[1], flora.position[2]);
      g.rotation.y = flora.rotationY;

      if (flora.type === 'moss') {
        // Velvet Moss Carpet (multi-layered low-poly discs hugging stone/earth)
        const mossMat = new THREE.MeshStandardMaterial({
          color: flora.color,
          roughness: 0.95,
          metalness: 0.05,
          flatShading: true,
        });
        mats.push(mossMat);

        const m1 = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.88, 0.07, 8), mossMat);
        m1.position.y = 0.035;
        m1.receiveShadow = !isSoftwareGl;
        g.add(m1);

        const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 0.06, 7), mossMat);
        m2.position.set(0.42, 0.05, 0.22);
        m2.receiveShadow = !isSoftwareGl;
        g.add(m2);

        if (flora.accentColor) {
          const accentMat = new THREE.MeshStandardMaterial({
            color: flora.accentColor,
            roughness: 0.9,
            flatShading: true,
          });
          mats.push(accentMat);
          const m3 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.44, 0.05, 6), accentMat);
          m3.position.set(-0.32, 0.065, -0.18);
          m3.receiveShadow = !isSoftwareGl;
          g.add(m3);
        }
      } else if (flora.type === 'shrub') {
        // Low-poly faceted shrub with colorful blossom bud octahedrons
        const shrubFoliageMat = new THREE.MeshStandardMaterial({
          color: flora.color,
          roughness: 0.82,
          flatShading: true,
        });
        mats.push(shrubFoliageMat);

        const dGeo = new THREE.DodecahedronGeometry(0.38, 0);
        const p1 = new THREE.Mesh(dGeo, shrubFoliageMat);
        p1.position.set(0, 0.35, 0);
        p1.scale.set(1.15, 0.95, 1.1);
        p1.castShadow = !isSoftwareGl;
        p1.receiveShadow = !isSoftwareGl;
        g.add(p1);

        const p2 = new THREE.Mesh(dGeo, shrubFoliageMat);
        p2.position.set(0.26, 0.28, 0.16);
        p2.scale.set(0.85, 0.8, 0.85);
        p2.castShadow = !isSoftwareGl;
        g.add(p2);

        const p3 = new THREE.Mesh(dGeo, shrubFoliageMat);
        p3.position.set(-0.22, 0.25, -0.14);
        p3.scale.set(0.8, 0.75, 0.8);
        p3.castShadow = !isSoftwareGl;
        g.add(p3);

        if (flora.accentColor) {
          const budMat = new THREE.MeshStandardMaterial({
            color: flora.accentColor,
            roughness: 0.5,
            flatShading: true,
          });
          mats.push(budMat);
          const budGeo = new THREE.OctahedronGeometry(0.09, 0);
          const budOffsets = [
            [0.08, 0.68, 0.12],
            [-0.14, 0.62, -0.08],
            [0.28, 0.48, 0.24],
            [-0.24, 0.45, 0.1],
          ];
          budOffsets.forEach(([bx, by, bz]) => {
            const bud = new THREE.Mesh(budGeo, budMat);
            bud.position.set(bx, by, bz);
            g.add(bud);
          });
        }
      } else if (flora.type === 'wildflower') {
        // Delicate Morandi Wildflower Bouquet
        const stemMat = new THREE.MeshStandardMaterial({
          color: 0x65a30d,
          roughness: 0.9,
          flatShading: true,
        });
        const petalMat = new THREE.MeshStandardMaterial({
          color: flora.color,
          roughness: 0.65,
          flatShading: true,
        });
        const centerMat = new THREE.MeshStandardMaterial({
          color: flora.accentColor ?? 0xfef08a,
          roughness: 0.4,
          flatShading: true,
        });
        mats.push(stemMat, petalMat, centerMat);

        const stemGeo = new THREE.CylinderGeometry(0.022, 0.032, 0.45, 5);
        const blossomGeo = new THREE.IcosahedronGeometry(0.14, 0);
        const centerGeo = new THREE.OctahedronGeometry(0.06, 0);

        const flowerOffsets = [
          [0, 0, 0.45],
          [0.18, 0.14, 0.38],
          [-0.16, 0.12, 0.4],
          [0.12, -0.15, 0.42],
          [-0.14, -0.14, 0.36],
        ];

        flowerOffsets.forEach(([fx, fz, fh]) => {
          const stalk = new THREE.Mesh(stemGeo, stemMat);
          stalk.position.set(fx, fh / 2, fz);
          stalk.castShadow = !isSoftwareGl;
          g.add(stalk);

          const blossom = new THREE.Mesh(blossomGeo, petalMat);
          blossom.position.set(fx, fh + 0.05, fz);
          blossom.scale.set(1.2, 0.85, 1.2);
          blossom.castShadow = !isSoftwareGl;
          g.add(blossom);

          const center = new THREE.Mesh(centerGeo, centerMat);
          center.position.set(fx, fh + 0.1, fz);
          g.add(center);
        });
      } else if (flora.type === 'succulent') {
        // Low-Poly Lotus Succulent Rosette
        const succulentMat = new THREE.MeshStandardMaterial({
          color: flora.color,
          roughness: 0.55,
          flatShading: true,
        });
        mats.push(succulentMat);

        const petalGeo = new THREE.ConeGeometry(0.22, 0.38, 3);
        for (let layer = 0; layer < 2; layer++) {
          const count = 5 + layer * 2;
          const radius = 0.16 + layer * 0.12;
          for (let i = 0; i < count; i++) {
            const ang = (i / count) * Math.PI * 2 + layer * 0.35;
            const petal = new THREE.Mesh(petalGeo, succulentMat);
            petal.position.set(Math.cos(ang) * radius, 0.1 + layer * 0.07, Math.sin(ang) * radius);
            petal.rotation.x = Math.sin(ang) * 0.52;
            petal.rotation.z = -Math.cos(ang) * 0.52;
            petal.scale.set(0.9 - layer * 0.15, 1.0 - layer * 0.1, 0.9 - layer * 0.15);
            petal.castShadow = !isSoftwareGl;
            g.add(petal);
          }
        }
      } else if (flora.type === 'mushroom') {
        // Bioluminescent Spore Mushrooms (Gentle ethereal pulse)
        const mushStalkMat = new THREE.MeshStandardMaterial({
          color: 0xfef9c3,
          roughness: 0.8,
          flatShading: true,
        });
        const mushCapMat = new THREE.MeshPhysicalMaterial({
          color: flora.color,
          emissive: flora.accentColor ?? flora.color,
          emissiveIntensity: 0.55,
          roughness: 0.25,
          metalness: 0.1,
          flatShading: true,
        });
        mats.push(mushStalkMat, mushCapMat);

        const mOffsets = [
          [0, 0, 0.44, 0.25],
          [0.22, 0.14, 0.34, 0.19],
          [-0.16, 0.16, 0.26, 0.15],
        ];
        mOffsets.forEach(([mx, mz, mh, mr]) => {
          const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.08, mh, 6), mushStalkMat);
          stalk.position.set(mx, mh / 2, mz);
          stalk.castShadow = !isSoftwareGl;
          g.add(stalk);

          const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(mr, 0), mushCapMat);
          cap.position.set(mx, mh + mr * 0.35, mz);
          cap.scale.set(1.3, 0.7, 1.3);
          cap.castShadow = !isSoftwareGl;
          g.add(cap);
        });
      } else if (flora.type === 'fern') {
        // Cascading Stream Fern Fronds
        const fernMat = new THREE.MeshStandardMaterial({
          color: flora.color,
          roughness: 0.8,
          flatShading: true,
        });
        mats.push(fernMat);

        const frondGeo = new THREE.BoxGeometry(0.075, 0.52, 0.02);
        for (let f = 0; f < 6; f++) {
          const ang = (f / 6) * Math.PI * 2;
          const frond = new THREE.Mesh(frondGeo, fernMat);
          frond.position.set(Math.cos(ang) * 0.11, 0.2, Math.sin(ang) * 0.11);
          frond.rotation.y = ang;
          frond.rotation.x = 0.52;
          frond.scale.set(1.0 - (f % 2) * 0.2, 1.0 - (f % 2) * 0.15, 1.0);
          frond.castShadow = !isSoftwareGl;
          g.add(frond);
        }
      }

      return { group: g, mats };
    };

    // Synchronize Unlocked Flora with the 3D Island
    const syncEcosystemFlora = (newlyUnlockedFlora?: IslandFloraItem) => {
      const unlockedList = ecosystemService.getUnlockedFlora();

      unlockedList.forEach((item) => {
        if (!floraNodesRef.current.has(item.id)) {
          const { group: fGroup, mats } = buildFloraMeshGroup(item);
          const isBrandNew = newlyUnlockedFlora?.id === item.id;

          const node: FloraMeshNode = {
            id: item.id,
            item,
            group: fGroup,
            targetScale: item.scale,
            currentScale: isBrandNew ? 0.001 : item.scale,
            swayPhase: Math.random() * Math.PI * 2,
            type: item.type,
            isSprouting: isBrandNew,
            sproutProgress: isBrandNew ? 0 : 1,
            mats,
          };

          fGroup.scale.setScalar(node.currentScale);
          ecosystemGroup.add(fGroup);
          floraNodesRef.current.set(item.id, node);

          if (isBrandNew) {
            // Localized Starlight Spore Puff upon sprouting!
            spawnClickEffect(new THREE.Vector3(...item.position));
            onFloraSproutedRef.current?.(item);
          }
        }
      });
    };

    // Initial ecosystem hydration
    syncEcosystemFlora();

    // Listen to real-time ecosystem progress
    const unsubscribeEcosystem = ecosystemService.subscribe((_profile, newlyUnlocked) => {
      if (newlyUnlocked) {
        syncEcosystemFlora(newlyUnlocked);
      }
    });

    // 6.9 12 Dynamic Multi-Tier Volumetric Clouds
    const cloudsContainer = new THREE.Group();
    scene.add(cloudsContainer);

    dynamicCloudsRef.current = [];
    cloudMaterialsRef.current = [];

    // Helper to generate a multi-part volumetric low-poly cloud
    const createVolumetricCloud = (
      radius: number,
      startAngle: number,
      orbitSpeed: number,
      altitude: number,
      scale = 1.0,
      tier: 'high' | 'mid' | 'low'
    ) => {
      const cloudGroup = new THREE.Group();
      const cMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.92,
        metalness: 0.04,
        flatShading: true,
        transparent: true,
        opacity: tier === 'low' ? 0.78 : tier === 'high' ? 0.85 : 0.95,
      });
      cloudMaterialsRef.current.push(cMat);

      const dGeo = new THREE.DodecahedronGeometry(1.0, 0);
      const isMid = tier === 'mid';

      // Assemble 5-7 intersecting multifaceted cloud puffs
      const puffOffsets = [
        [0, 0, 0, 1.7, 1.0, 1.3],
        [1.1, 0.2, 0.2, 1.3, 0.9, 1.1],
        [-1.0, -0.1, 0.1, 1.2, 0.8, 1.0],
        [0.4, 0.5, -0.3, 1.0, 0.85, 0.95],
        [-0.5, 0.4, 0.3, 1.1, 0.9, 1.0],
        [0.2, -0.3, 0.4, 0.9, 0.6, 0.9],
      ];

      puffOffsets.forEach(([px, py, pz, sx, sy, sz]) => {
        const puff = new THREE.Mesh(dGeo, cMat);
        puff.position.set(px, py, pz);
        puff.scale.set(sx, sy, sz);
        puff.castShadow = isMid && !isSoftwareGl; // Mid clouds cast soft shadows on island
        puff.receiveShadow = !isSoftwareGl;
        cloudGroup.add(puff);
      });

      cloudGroup.position.set(
        Math.cos(startAngle) * radius,
        altitude,
        Math.sin(startAngle) * radius
      );
      cloudGroup.scale.setScalar(scale);
      cloudsContainer.add(cloudGroup);

      dynamicCloudsRef.current.push({
        group: cloudGroup,
        initialRadius: radius,
        angle: startAngle,
        speed: orbitSpeed,
        altitude: altitude,
        bobRate: 0.6 + Math.random() * 0.5,
        bobPhase: Math.random() * Math.PI * 2,
        baseScale: scale,
      });
    };

    // Tier 1: High Cirrus (y: 13.5 to 16.5) - slow, ethereal drift
    createVolumetricCloud(20, 0.2, 0.035, 14.2, 1.5, 'high');
    createVolumetricCloud(23, 2.4, 0.028, 15.5, 1.7, 'high');
    createVolumetricCloud(19, 4.5, 0.042, 13.8, 1.4, 'high');

    // Tier 2: Mid Cumulus (y: 2.5 to 7.0) - casting soft shadows on island
    createVolumetricCloud(14, 0.8, 0.075, 4.5, 1.35, 'mid');
    createVolumetricCloud(16, 1.9, 0.065, 6.2, 1.5, 'mid');
    createVolumetricCloud(13, 3.1, 0.082, 3.2, 1.25, 'mid');
    createVolumetricCloud(15, 4.2, 0.07, 5.8, 1.45, 'mid');
    createVolumetricCloud(12, 5.1, 0.09, 2.8, 1.15, 'mid');
    createVolumetricCloud(17, 6.0, 0.06, 6.6, 1.55, 'mid');

    // Tier 3: Low Cloud Sea (y: -8.0 to -11.0) - ocean of clouds beneath the floating island
    createVolumetricCloud(11, 0.5, 0.048, -9.0, 2.2, 'low');
    createVolumetricCloud(13, 2.8, 0.042, -9.8, 2.0, 'low');
    createVolumetricCloud(10, 4.9, 0.055, -8.5, 2.4, 'low');

    // 6.9 Floating Atmospheric Starlight Sunbeam Motes
    const moteCount = 75;
    const motePositions = new Float32Array(moteCount * 3);
    for (let m = 0; m < moteCount; m++) {
      motePositions[m * 3] = (Math.random() - 0.5) * 36;
      motePositions[m * 3 + 1] = Math.random() * 20 - 2;
      motePositions[m * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    const motesGeo = new THREE.BufferGeometry();
    motesGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
    motesGeoRef.current = motesGeo;
    motesPositionsRef.current = motePositions;

    const motesMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.22,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const motesPoints = new THREE.Points(motesGeo, motesMat);
    scene.add(motesPoints);

    // 7. Dynamic Weather Systems Container
    const weatherGroup = new THREE.Group();
    scene.add(weatherGroup);
    weatherGroupRef.current = weatherGroup;

    // 7.1 Rain particle system
    const rainCount = 450;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 36;
      rainPositions[i * 3 + 1] = Math.random() * 30 - 5;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    rainGeoRef.current = rainGeo;

    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.18,
      transparent: true,
      opacity: 0.65,
    });
    const rainParticles = new THREE.Points(rainGeo, rainMat);
    weatherGroup.add(rainParticles);
    rainParticlesRef.current = rainParticles;

    // 7.2 Tornado Vortex Particles
    const tornadoCount = 300;
    const tornadoPositions = new Float32Array(tornadoCount * 3);
    for (let i = 0; i < tornadoCount; i++) {
      const radius = 6 + Math.random() * 8;
      const angle = Math.random() * Math.PI * 2;
      tornadoPositions[i * 3] = Math.cos(angle) * radius;
      tornadoPositions[i * 3 + 1] = Math.random() * 20 - 4;
      tornadoPositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const tornadoGeo = new THREE.BufferGeometry();
    tornadoGeo.setAttribute('position', new THREE.BufferAttribute(tornadoPositions, 3));
    const tornadoMat = new THREE.PointsMaterial({
      color: 0xd97706,
      size: 0.28,
      transparent: true,
      opacity: 0.7,
    });
    const tornadoParticles = new THREE.Points(tornadoGeo, tornadoMat);
    weatherGroup.add(tornadoParticles);
    tornadoParticlesRef.current = tornadoParticles;

    // 7.3 Procedural Rainbow Arch
    const rainbowGroup = new THREE.Group();
    rainbowRef.current = rainbowGroup;
    weatherGroup.add(rainbowGroup);

    const rainbowColors = [0xf43f5e, 0xfb923c, 0xfde047, 0x4ade80, 0x38bdf8, 0x818cf8, 0xc084fc];
    rainbowColors.forEach((hex, idx) => {
      const radius = 13.5 + idx * 0.28;
      const arcGeo = new THREE.TorusGeometry(radius, 0.14, 8, 36, Math.PI);
      const arcMat = new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: 0.6,
      });
      const arc = new THREE.Mesh(arcGeo, arcMat);
      arc.rotation.z = Math.PI;
      arc.position.set(0, 0, -8);
      rainbowGroup.add(arc);
    });

    // 7.4 Global Light Flash Trigger & Weather-Specific Particle Scattering System
    const clickWaveGroup = new THREE.Group();
    scene.add(clickWaveGroup);

    // Global Light Flash Rig (Illuminates the whole island with weather-specific tint upon click)
    const clickFlashPointLight = new THREE.PointLight(0xfff0c2, 0, 45, 1.2);
    clickFlashPointLight.position.set(0, 4, 0);
    scene.add(clickFlashPointLight);

    let clickLightSurge = 0; // Directional sunbeam surge

    // Expanding Weather-Tinted Ripple Rings
    const rippleRingMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const rippleRings: { mesh: THREE.Mesh; scale: number; opacity: number; active: boolean; delay: number }[] = [];
    for (let r = 0; r < 3; r++) {
      const ringGeo = new THREE.RingGeometry(0.2, 0.55, 36);
      const ringMesh = new THREE.Mesh(ringGeo, rippleRingMat.clone());
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.visible = false;
      clickWaveGroup.add(ringMesh);
      rippleRings.push({ mesh: ringMesh, scale: 1, opacity: 0, active: false, delay: 0 });
    }

    // Weather-Specific Scatter Particles (Golden motes, electric sparks, water droplets, prismatic motes, whirlwind embers)
    const sparkCount = 76;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkColors = new Float32Array(sparkCount * 3);
    const sparkVelocities = new Float32Array(sparkCount * 3);
    const sparkLifespans = new Float32Array(sparkCount);
    const sparkMaxLives = new Float32Array(sparkCount);
    const sparkModes = new Uint8Array(sparkCount); // 0: sunny, 1: rainbow, 2: rainy, 3: thunder, 4: tornado
    const sparkOrigins = new Float32Array(sparkCount * 3);

    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = 0;
      sparkPositions[i * 3 + 1] = -100;
      sparkPositions[i * 3 + 2] = 0;

      sparkColors[i * 3] = 1.0;
      sparkColors[i * 3 + 1] = 0.94;
      sparkColors[i * 3 + 2] = 0.54;
      sparkLifespans[i] = 0;
      sparkModes[i] = 0;
    }

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

    const sparkMat = new THREE.PointsMaterial({
      size: 0.38,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparkPoints);

    // Weather-Tailored Color Palettes for Particle Scattering
    // ☀️ Sunny: Radiant warm golds, honey amber, sunflower yellows
    const sunnyPalettes = [
      [1.0, 0.94, 0.52], // Bright gold
      [0.99, 0.82, 0.26], // Honey amber
      [1.0, 0.98, 0.85], // Warm white sunbeam
      [0.98, 0.68, 0.18], // Rich marigold
    ];
    // 🌩️ Thunder: Electric neon violet, high-voltage purple, electric arc cyan-white
    const thunderPalettes = [
      [0.78, 0.45, 1.0],  // Electric neon violet
      [0.65, 0.28, 0.98], // High-voltage purple
      [0.62, 0.88, 1.0],  // Electric blue-cyan arc
      [0.94, 0.90, 1.0],  // Sharp flash white-lilac
    ];
    // 🌧️ Rainy: Water droplet splash cyan, clear aqua, deep pool blue, crystal liquid
    const rainyPalettes = [
      [0.22, 0.74, 0.97], // Crystal aqua blue
      [0.49, 0.83, 0.99], // Clear puddle cyan
      [0.18, 0.58, 0.88], // Deep stream blue
      [0.88, 0.96, 1.0],  // Liquid dewdrop pearl
    ];
    // 🌈 Rainbow: 7-Hue Prismatic Pastel Bubble Hues
    const rainbowPalettes = [
      [0.98, 0.65, 0.76], // Sakura rose
      [0.99, 0.76, 0.58], // Warm peach
      [0.99, 0.93, 0.55], // Buttercup yellow
      [0.55, 0.93, 0.76], // Fresh mint
      [0.55, 0.83, 0.99], // Sky cyan
      [0.72, 0.75, 0.99], // Soft periwinkle
      [0.85, 0.68, 0.99], // Dream lavender
    ];
    // 🌪️ Tornado: Scorched ember amber, flame gold, swirling spark orange
    const tornadoPalettes = [
      [0.98, 0.45, 0.09], // Fiery orange ember
      [0.98, 0.75, 0.14], // Flame gold
      [0.85, 0.52, 0.20], // Desert rust
      [1.0, 0.32, 0.18],  // Fiery crimson spark
    ];

    // Spring Kinematics State for Island Bounce
    let clickBounceY = 0;
    let clickBounceVelocity = 0;
    let clickSquashX = 1.0;
    let clickSquashY = 1.0;

    // Trigger Global Light Flare & Weather-Specific Particle Scattering
    const spawnClickEffect = (impactPoint: THREE.Vector3) => {
      const currentW = weatherRef.current;

      // 1. Trigger Global Light Flash & Surge
      clickFlashPointLight.position.set(impactPoint.x, impactPoint.y + 1.8, impactPoint.z);

      let ringColorHex = 0xfef08a;
      let flashLightColorHex = 0xfef08a;
      let flashIntensity = 3.6;
      let weatherModeInt = 0;

      if (currentW === 'sunny') {
        flashLightColorHex = 0xfef08a;
        ringColorHex = 0xfef08a;
        flashIntensity = 3.8;
        clickLightSurge = 1.6; // Radiant sunny daylight surge
        weatherModeInt = 0;
        sparkMat.size = 0.40;
      } else if (currentW === 'rainbow') {
        flashLightColorHex = 0xfce7f3;
        ringColorHex = 0xfbcfe8;
        flashIntensity = 3.5;
        clickLightSurge = 1.3;
        weatherModeInt = 1;
        sparkMat.size = 0.42;
      } else if (currentW === 'rainy') {
        flashLightColorHex = 0x38bdf8;
        ringColorHex = 0x38bdf8;
        flashIntensity = 3.0;
        clickLightSurge = 0.9;
        weatherModeInt = 2;
        sparkMat.size = 0.36;
      } else if (currentW === 'thunder') {
        flashLightColorHex = 0xc084fc;
        ringColorHex = 0xc084fc;
        flashIntensity = 5.2; // High-voltage sudden electric illumination
        clickLightSurge = 2.2;
        weatherModeInt = 3;
        sparkMat.size = 0.34;
        // Sympathetic lightning flash surge
        if (lightningLightRef.current) {
          lightningLightRef.current.intensity = 4.2;
          lightningLightRef.current.position.set(impactPoint.x, impactPoint.y + 8, impactPoint.z);
        }
      } else if (currentW === 'tornado') {
        flashLightColorHex = 0xf97316;
        ringColorHex = 0xf97316;
        flashIntensity = 4.0;
        clickLightSurge = 1.5;
        weatherModeInt = 4;
        sparkMat.size = 0.38;
      }

      clickFlashPointLight.color.setHex(flashLightColorHex);
      clickFlashPointLight.intensity = flashIntensity;

      // 2. Position and Tint Ripple Rings
      rippleRings.forEach((ring, idx) => {
        (ring.mesh.material as THREE.MeshBasicMaterial).color.setHex(ringColorHex);
        ring.mesh.position.copy(impactPoint);
        ring.mesh.position.y += 0.05 + idx * 0.01;
        ring.mesh.scale.set(0.2, 0.2, 0.2);
        ring.scale = 0.2;
        ring.opacity = 0.85;
        ring.delay = idx * 0.12;
        ring.active = true;
        ring.mesh.visible = true;
      });

      // 3. Burst Weather-Customized Particles
      const activePalette =
        currentW === 'sunny'
          ? sunnyPalettes
          : currentW === 'thunder'
          ? thunderPalettes
          : currentW === 'rainy'
          ? rainyPalettes
          : currentW === 'rainbow'
          ? rainbowPalettes
          : tornadoPalettes;

      for (let i = 0; i < sparkCount; i++) {
        sparkPositions[i * 3] = impactPoint.x + (Math.random() - 0.5) * 0.6;
        sparkPositions[i * 3 + 1] = impactPoint.y + 0.1 + Math.random() * 0.25;
        sparkPositions[i * 3 + 2] = impactPoint.z + (Math.random() - 0.5) * 0.6;

        sparkOrigins[i * 3] = impactPoint.x;
        sparkOrigins[i * 3 + 1] = impactPoint.y;
        sparkOrigins[i * 3 + 2] = impactPoint.z;

        sparkModes[i] = weatherModeInt;

        // Assign palette color
        const colorEntry = activePalette[i % activePalette.length];
        sparkColors[i * 3] = colorEntry[0];
        sparkColors[i * 3 + 1] = colorEntry[1];
        sparkColors[i * 3 + 2] = colorEntry[2];

        // Tailor launch velocity based on weather physics
        if (weatherModeInt === 3) {
          // Thunder: sharp explosive crackle in all 3D directions
          const speed = 4.8 + Math.random() * 5.6;
          const theta = Math.random() * Math.PI * 2;
          const phi = (Math.random() - 0.2) * Math.PI; // Up and out
          sparkVelocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
          sparkVelocities[i * 3 + 1] = Math.max(1.5, Math.cos(phi) * speed);
          sparkVelocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

          const life = 0.55 + Math.random() * 0.4;
          sparkLifespans[i] = life;
          sparkMaxLives[i] = life;
        } else if (weatherModeInt === 4) {
          // Tornado: cyclonic initial vortex velocity
          const angle = Math.random() * Math.PI * 2;
          const radialSpeed = 1.8 + Math.random() * 3.2;
          const tangentialSpeed = 3.6 + Math.random() * 3.8;
          // Tangential cross-radial vector
          sparkVelocities[i * 3] = Math.cos(angle) * radialSpeed - Math.sin(angle) * tangentialSpeed;
          sparkVelocities[i * 3 + 1] = 3.2 + Math.random() * 4.6; // Strong upward whirlwind
          sparkVelocities[i * 3 + 2] = Math.sin(angle) * radialSpeed + Math.cos(angle) * tangentialSpeed;

          const life = 0.95 + Math.random() * 0.65;
          sparkLifespans[i] = life;
          sparkMaxLives[i] = life;
        } else if (weatherModeInt === 2) {
          // Rainy: water droplet splash outward & upward arc
          const angle = Math.random() * Math.PI * 2;
          const splashHoriz = 2.4 + Math.random() * 4.2;
          sparkVelocities[i * 3] = Math.cos(angle) * splashHoriz;
          sparkVelocities[i * 3 + 1] = 2.5 + Math.random() * 3.2;
          sparkVelocities[i * 3 + 2] = Math.sin(angle) * splashHoriz;

          const life = 0.75 + Math.random() * 0.45;
          sparkLifespans[i] = life;
          sparkMaxLives[i] = life;
        } else if (weatherModeInt === 1) {
          // Rainbow: gentle hemispherical canopy float
          const angle = Math.random() * Math.PI * 2;
          const spread = 0.8 + Math.random() * 0.6;
          const speed = 2.0 + Math.random() * 3.0;
          sparkVelocities[i * 3] = Math.cos(angle) * spread * speed;
          sparkVelocities[i * 3 + 1] = 3.2 + Math.random() * 3.4;
          sparkVelocities[i * 3 + 2] = Math.sin(angle) * spread * speed;

          const life = 1.3 + Math.random() * 0.6;
          sparkLifespans[i] = life;
          sparkMaxLives[i] = life;
        } else {
          // Sunny: sunbeam pollen fountain floating upward smoothly
          const angle = Math.random() * Math.PI * 2;
          const spread = 0.6 + Math.random() * 0.7;
          const speed = 2.2 + Math.random() * 3.8;
          sparkVelocities[i * 3] = Math.cos(angle) * spread * speed;
          sparkVelocities[i * 3 + 1] = 3.5 + Math.random() * 4.2;
          sparkVelocities[i * 3 + 2] = Math.sin(angle) * spread * speed;

          const life = 1.1 + Math.random() * 0.7;
          sparkLifespans[i] = life;
          sparkMaxLives[i] = life;
        }
      }
      sparkGeo.attributes.position.needsUpdate = true;
      sparkGeo.attributes.color.needsUpdate = true;

      // 4. Elastic physical compression on island
      clickBounceVelocity = -2.5;
      clickSquashY = 0.91;
      clickSquashX = 1.05;
    };

    // 8. Animation & Render Loop
    let animationFrameId = 0;
    let clock = new THREE.Clock();
    let lightningTimer = 0;

    // Software WebGL pacing helper
    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          animationFrameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          animationFrameId = window.setTimeout(cb, 80);
        }
      };
      animationFrameId = window.setTimeout(poll, 5);
    };

    const animate = () => {
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const currentW = weatherRef.current;

      // Rotate windmill blades
      if (windmillBladesRef.current) {
        const windSpeed = currentW === 'tornado' ? 9.0 : currentW === 'thunder' ? 5.0 : 1.8;
        windmillBladesRef.current.rotation.z -= dt * windSpeed;
      }

      // --- Natural Multi-Frequency Breathing Animation ---
      // Primary deep restorative breathing rhythm (calm ~0.72 rad/s)
      const breathPrimary = Math.sin(elapsed * 0.72) * 0.42;
      // Secondary buoyant atmospheric draft
      const breathSecondary = Math.sin(elapsed * 1.5 + 0.8) * 0.12;
      // Tertiary gentle micro-ripple
      const breathTertiary = Math.sin(elapsed * 2.6) * 0.03;

      // Spring kinematics simulation for click bounce
      const springK = 36.0; // Stiffness
      const springDamping = 6.8; // Damping
      const springForce = -springK * clickBounceY - springDamping * clickBounceVelocity;
      clickBounceVelocity += springForce * dt;
      clickBounceY += clickBounceVelocity * dt;

      clickSquashX = THREE.MathUtils.damp(clickSquashX, 1.0, 10, dt);
      clickSquashY = THREE.MathUtils.damp(clickSquashY, 1.0, 10, dt);

      if (islandGroupRef.current) {
        // Compound realistic vertical buoyancy
        islandGroupRef.current.position.y = breathPrimary + breathSecondary + breathTertiary + clickBounceY;

        // Subtle 3-axis organic tilt and roll in breeze
        islandGroupRef.current.rotation.z = Math.sin(elapsed * 0.45) * 0.022 + Math.cos(elapsed * 0.85) * 0.01;
        islandGroupRef.current.rotation.x = Math.cos(elapsed * 0.55) * 0.018;
        islandGroupRef.current.rotation.y = Math.sin(elapsed * 0.18) * 0.035;

        // Subtle respiratory volume expansion & tactile squash
        const breathScale = 1.0 + Math.sin(elapsed * 0.72) * 0.012;
        islandGroupRef.current.scale.set(
          breathScale * clickSquashX,
          breathScale * clickSquashY,
          breathScale * clickSquashX
        );
      }

      // Dynamic Contact Shadow Grounding response for dual discs
      if (innerShadowMesh && outerShadowMesh) {
        const currentY = islandGroupRef.current?.position.y || 0;
        const altitudeNormalized = THREE.MathUtils.clamp(currentY / 4.0, -0.6, 0.6);
        innerShadowMesh.scale.setScalar(1.0 - altitudeNormalized * 0.28);
        (innerShadowMat as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 0.28 - altitudeNormalized * 0.12);
        outerShadowMesh.scale.setScalar(1.0 - altitudeNormalized * 0.18);
        (outerShadowMat as THREE.MeshBasicMaterial).opacity = Math.max(0.04, 0.12 - altitudeNormalized * 0.06);
      }

      // Satellite islets harmonious sympathetic bobbing
      if (satelliteA_Ref.current) {
        satelliteA_Ref.current.position.y = -1.0 + Math.sin(elapsed * 0.95 + 1.2) * 0.42;
        satelliteA_Ref.current.rotation.y += dt * 0.2;
        satelliteA_Ref.current.rotation.z = Math.sin(elapsed * 0.7) * 0.04;
      }
      if (satelliteB_Ref.current) {
        satelliteB_Ref.current.position.y = 1.5 + Math.cos(elapsed * 1.15) * 0.36;
        satelliteB_Ref.current.rotation.y -= dt * 0.15;
        satelliteB_Ref.current.rotation.x = Math.cos(elapsed * 0.8) * 0.04;
      }

      // Low-poly waterfall flow shimmer
      if (wfMid && wfLow) {
        wfMid.scale.z = 1.0 + Math.sin(elapsed * 8.0) * 0.08;
        wfLow.scale.x = 1.0 + Math.cos(elapsed * 9.0) * 0.06;
      }

      // --- Update Click Ripple Rings ---
      rippleRings.forEach((ring) => {
        if (!ring.active) return;
        if (ring.delay > 0) {
          ring.delay -= dt;
          return;
        }
        ring.scale += dt * 7.5;
        ring.opacity -= dt * 0.95;
        ring.mesh.scale.set(ring.scale, ring.scale, ring.scale);
        (ring.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, ring.opacity);

        if (ring.opacity <= 0) {
          ring.active = false;
          ring.mesh.visible = false;
        }
      });

      // --- Update Starlight / Electric / Water / Ember Sparkle Burst ---
      let hasActiveSparks = false;
      const positions = sparkGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < sparkCount; i++) {
        if (sparkLifespans[i] > 0) {
          hasActiveSparks = true;
          sparkLifespans[i] -= dt;
          const wMode = sparkModes[i]; // 0: sunny, 1: rainbow, 2: rainy, 3: thunder, 4: tornado

          if (wMode === 3) {
            // 🌩️ Thunder: high-voltage electric crackle & zigzag micro-jitter
            sparkVelocities[i * 3] += (Math.random() - 0.5) * 16.0 * dt;
            sparkVelocities[i * 3 + 1] += (Math.random() - 0.5) * 12.0 * dt - dt * 2.2;
            sparkVelocities[i * 3 + 2] += (Math.random() - 0.5) * 16.0 * dt;
            // High velocity drag
            sparkVelocities[i * 3] *= 0.92;
            sparkVelocities[i * 3 + 1] *= 0.92;
            sparkVelocities[i * 3 + 2] *= 0.92;
          } else if (wMode === 4) {
            // 🌪️ Tornado: cyclonic vortex swirling upward
            const dx = positions[i * 3] - sparkOrigins[i * 3];
            const dz = positions[i * 3 + 2] - sparkOrigins[i * 3 + 2];
            // Tangential acceleration
            sparkVelocities[i * 3] += -dz * 5.2 * dt;
            sparkVelocities[i * 3 + 2] += dx * 5.2 * dt;
            // Upward whirlwind draft
            sparkVelocities[i * 3 + 1] += dt * 3.8;
            sparkVelocities[i * 3] *= 0.97;
            sparkVelocities[i * 3 + 2] *= 0.97;
          } else if (wMode === 2) {
            // 🌧️ Rainy: water droplet splash with natural gravity
            sparkVelocities[i * 3 + 1] -= dt * 6.5; // Natural droplet gravity
            sparkVelocities[i * 3] *= 0.96;
            sparkVelocities[i * 3 + 2] *= 0.96;
          } else if (wMode === 1) {
            // 🌈 Rainbow: ethereal buoyant float with gentle harmonic sway
            sparkVelocities[i * 3 + 1] -= dt * 1.5;
            sparkVelocities[i * 3] += Math.sin(elapsed * 4.0 + i) * dt * 1.4;
            sparkVelocities[i * 3 + 2] += Math.cos(elapsed * 3.5 + i) * dt * 1.4;
            sparkVelocities[i * 3] *= 0.98;
            sparkVelocities[i * 3 + 1] *= 0.98;
            sparkVelocities[i * 3 + 2] *= 0.98;
          } else {
            // ☀️ Sunny: golden sunbeam pollen, gentle buoyant air drift
            sparkVelocities[i * 3 + 1] -= dt * 2.2;
            sparkVelocities[i * 3] += Math.cos(elapsed * 2.4 + i) * dt * 0.9;
            sparkVelocities[i * 3 + 2] += Math.sin(elapsed * 2.4 + i) * dt * 0.9;
            sparkVelocities[i * 3] *= 0.97;
            sparkVelocities[i * 3 + 2] *= 0.97;
          }

          positions[i * 3] += sparkVelocities[i * 3] * dt;
          positions[i * 3 + 1] += sparkVelocities[i * 3 + 1] * dt;
          positions[i * 3 + 2] += sparkVelocities[i * 3 + 2] * dt;

          if (sparkLifespans[i] <= 0) {
            positions[i * 3 + 1] = -100; // Reset off-screen
          }
        }
      }
      if (hasActiveSparks) {
        sparkGeo.attributes.position.needsUpdate = true;
      }

      // Update Island Ecosystem Vegetation (Dynamic organic sprouting & breeze sway)
      floraNodesRef.current.forEach((node) => {
        if (node.isSprouting) {
          node.sproutProgress += dt * 0.95;
          if (node.sproutProgress >= 1.0) {
            node.sproutProgress = 1.0;
            node.isSprouting = false;
            node.currentScale = node.targetScale;
          } else {
            const springProgress = Math.sin(node.sproutProgress * Math.PI * 0.5);
            const overshoot = 1.0 + Math.sin(node.sproutProgress * Math.PI) * 0.22;
            node.currentScale = node.targetScale * springProgress * overshoot;
          }
          node.group.scale.setScalar(Math.max(0.001, node.currentScale));
        }

        // Gentle harmonic breeze sway
        node.group.rotation.z = Math.sin(elapsed * 1.5 + node.swayPhase) * 0.035;

        // Bioluminescent mushrooms subtle night/storm breathing glow
        if (node.type === 'mushroom') {
          node.mats.forEach((m) => {
            if (m instanceof THREE.MeshPhysicalMaterial) {
              m.emissiveIntensity = 0.45 + Math.sin(elapsed * 2.2 + node.swayPhase) * 0.25;
            }
          });
        }
      });

      // Chimney smoke puff loop
      chimneySmokeRef.current.forEach((puff, idx) => {
        const loopT = (elapsed * puff.speed + puff.phase) % 1.0;
        puff.mesh.position.y = puff.basePosY + loopT * 1.6;
        puff.mesh.position.x = 0.6 + Math.sin(elapsed * 1.2 + idx) * 0.12 + loopT * 0.2;
        puff.mesh.position.z = 0.2 + Math.cos(elapsed * 1.0 + idx) * 0.1;
        const puffScale = 0.8 + loopT * 1.4;
        puff.mesh.scale.setScalar(puffScale);
        (puff.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, (1.0 - loopT) * 0.55);
      });

      // Update 12 Dynamic Multi-Tier Volumetric Clouds
      dynamicCloudsRef.current.forEach((cloud) => {
        cloud.angle += dt * cloud.speed;
        cloud.group.position.x = Math.cos(cloud.angle) * cloud.initialRadius;
        cloud.group.position.z = Math.sin(cloud.angle) * cloud.initialRadius;
        cloud.group.position.y = cloud.altitude + Math.sin(elapsed * cloud.bobRate + cloud.bobPhase) * 0.45;
        // Subtle volume breathing
        const breath = cloud.baseScale * (1.0 + Math.sin(elapsed * 0.6 + cloud.bobPhase) * 0.05);
        cloud.group.scale.setScalar(breath);
      });

      // Weather Color & Opacity Transition for Volumetric Clouds
      let targetCloudHex = 0xffffff;
      let targetCloudOpacity = 0.92;
      if (currentW === 'sunny') {
        targetCloudHex = 0xffffff;
        targetCloudOpacity = 0.92;
      } else if (currentW === 'rainbow') {
        targetCloudHex = 0xfce7f3; // Warm soft rose pastel
        targetCloudOpacity = 0.95;
      } else if (currentW === 'rainy') {
        targetCloudHex = 0x94a3b8; // Soft slate grey
        targetCloudOpacity = 0.88;
      } else if (currentW === 'thunder') {
        targetCloudHex = 0x475569; // Dark moody tempest grey
        targetCloudOpacity = 0.96;
      } else if (currentW === 'tornado') {
        targetCloudHex = 0xd97706; // Amber dust storm
        targetCloudOpacity = 0.85;
      }
      _color.set(targetCloudHex);
      cloudMaterialsRef.current.forEach((mat) => {
        mat.color.lerp(_color, 0.04);
        mat.opacity = THREE.MathUtils.damp(mat.opacity, targetCloudOpacity, 4, dt);
      });

      // Update Atmospheric Starlight Dust Motes
      if (motesGeoRef.current && motesPositionsRef.current) {
        const positions = motesPositionsRef.current;
        for (let m = 0; m < moteCount; m++) {
          positions[m * 3 + 1] += Math.sin(elapsed * 0.8 + m) * 0.012;
          positions[m * 3] += Math.cos(elapsed * 0.4 + m * 1.3) * 0.01;
          positions[m * 3 + 2] += Math.sin(elapsed * 0.5 + m * 0.7) * 0.01;
        }
        motesGeoRef.current.attributes.position.needsUpdate = true;
      }

      // Weather Particles and Atmosphere Updates
      const isRainy = currentW === 'rainy';
      const isThunder = currentW === 'thunder';
      const isTornado = currentW === 'tornado';
      const isRainbow = currentW === 'rainbow';

      // Update Rain
      if (rainParticlesRef.current && rainGeoRef.current) {
        rainParticlesRef.current.visible = isRainy || isThunder;
        if (isRainy || isThunder) {
          const rainPositions = rainGeoRef.current.attributes.position.array as Float32Array;
          const fallSpeed = isThunder ? 38 : 22;
          for (let i = 0; i < rainCount; i++) {
            rainPositions[i * 3 + 1] -= dt * fallSpeed;
            if (rainPositions[i * 3 + 1] < -6) {
              rainPositions[i * 3 + 1] = 24;
            }
          }
          rainGeoRef.current.attributes.position.needsUpdate = true;
        }
      }

      // Update Tornado
      if (tornadoParticlesRef.current) {
        tornadoParticlesRef.current.visible = isTornado;
        if (isTornado) {
          tornadoParticlesRef.current.rotation.y += dt * 3.8;
        }
      }

      // Update Rainbow
      if (rainbowRef.current) {
        rainbowRef.current.visible = isRainbow;
        if (isRainbow) {
          rainbowRef.current.rotation.y = Math.sin(elapsed * 0.3) * 0.08;
        }
      }

      // Lightning Stochastic Flash in Thunderstorm
      if (lightningLightRef.current) {
        if (isThunder) {
          lightningTimer -= dt;
          if (lightningTimer <= 0) {
            lightningLightRef.current.intensity = Math.random() > 0.4 ? 4.5 : 2.5;
            lightningLightRef.current.position.set(
              (Math.random() - 0.5) * 20,
              18 + Math.random() * 8,
              (Math.random() - 0.5) * 20
            );
            lightningTimer = 1.2 + Math.random() * 3.0;
          } else {
            lightningLightRef.current.intensity = THREE.MathUtils.damp(
              lightningLightRef.current.intensity,
              0,
              12,
              dt
            );
          }
        } else {
          lightningLightRef.current.intensity = 0;
        }
      }

      // Smooth Background & Fog Color Interpolation
      const targetSkyHex = WEATHER_CONFIGS[currentW].skyColor;
      _color.set(targetSkyHex);
      if (scene.background instanceof THREE.Color) {
        scene.background.lerp(_color, 0.05);
      }
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(_color, 0.05);
      }

      // Global Click Light Flash & Light Intensity tuning per weather
      if (clickFlashPointLight) {
        const decayRate = currentW === 'thunder' ? 14 : 7;
        clickFlashPointLight.intensity = THREE.MathUtils.damp(clickFlashPointLight.intensity, 0, decayRate, dt);
      }

      if (dirLightRef.current) {
        clickLightSurge = THREE.MathUtils.damp(clickLightSurge, 0, 7, dt);
        const targetIntensity = currentW === 'sunny' ? 2.2 : currentW === 'rainbow' ? 2.0 : currentW === 'tornado' ? 1.4 : currentW === 'rainy' ? 1.0 : 0.7;
        dirLightRef.current.intensity = THREE.MathUtils.damp(dirLightRef.current.intensity, targetIntensity, 4, dt) + clickLightSurge;
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    if (isSoftwareGl) {
      afterDraw(animate);
    } else {
      animationFrameId = requestAnimationFrame(animate);
    }

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Click handler for island interaction with Raycaster & Particle Feedback
    const handleCanvasClick = (e: MouseEvent) => {
      if (!container) return;
      const rect = renderer.domElement.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_mouse, camera);

      let impactPoint = new THREE.Vector3(0, 1.8, 0);
      let hit = false;

      if (islandGroupRef.current) {
        const intersects = _raycaster.intersectObjects(islandGroupRef.current.children, true);
        if (intersects.length > 0) {
          impactPoint.copy(intersects[0].point);
          hit = true;
        }
      }

      // If user clicked nearby area, intersect with horizontal plane
      if (!hit) {
        const hitPlane = _raycaster.ray.intersectPlane(_plane, _intersectPoint);
        if (hitPlane && _intersectPoint.length() < 12) {
          impactPoint.copy(_intersectPoint);
        }
      }

      spawnClickEffect(impactPoint);

      if (onIslandClick) {
        onIslandClick();
      }
    };
    renderer.domElement.addEventListener('click', handleCanvasClick);

    // 10. Clean-up & Resource Disposal
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(animationFrameId);

      sparkGeo.dispose();
      sparkMat.dispose();
      rippleRingMat.dispose();
      innerShadowGeo.dispose();
      innerShadowMat.dispose();
      outerShadowGeo.dispose();
      outerShadowMat.dispose();
      motesGeo.dispose();
      clickFlashPointLight.dispose();
      unsubscribeEcosystem();
      floraNodesRef.current.forEach((node) => {
        node.mats.forEach((m) => m.dispose());
      });
      floraNodesRef.current.clear();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
      style={{ touchAction: 'none' }}
    />
  );
};

