'use client';

/**
 * Procedural stylised Dubai skyline. Real heights, fictional positions —
 * laid out by neighbourhood (Downtown / Marina / SZR / Jumeirah) rather
 * than GPS. Each named tower is clickable: the click bubbles up via
 * onTowerSelect, and PlaygroundCanvas renders the info panel + plays
 * a Web Audio tone with frequency mapped to building height.
 *
 * timeOfDay (0..1) drives lighting + tower window emissives:
 *   0.00 = midnight (deep blue, city lights on)
 *   0.25 = sunrise   (warm horizon, low sun east)
 *   0.50 = noon      (white sun overhead, dim windows)
 *   0.75 = sunset    (orange horizon, low sun west)
 *   1.00 = midnight (wraps)
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import SceneCamera from '../lib/scene-camera';

// ─── data ─────────────────────────────────────────────────────────────────

export type Tower = {
  id: string;
  name: string;
  heightM: number;
  floors: number;
  year: number;
  neighbourhood: string;
  notes: string;
  pos: [number, number];
  shape: 'tapered' | 'sail' | 'twist' | 'prism' | 'twin';
  scale?: number;
};

export const TOWERS: Tower[] = [
  { id: 'burj-khalifa', name: 'Burj Khalifa',        heightM: 828, floors: 163, year: 2010,
    neighbourhood: 'Downtown',          notes: "Tallest in the world. Y-shaped plan tapers in 27 setbacks.",
    pos: [0.5, 0.5],   shape: 'tapered', scale: 1.0 },
  { id: 'marina-101',  name: 'Marina 101',           heightM: 425, floors: 101, year: 2017,
    neighbourhood: 'Dubai Marina',      notes: "World's 2nd-tallest residential. Tilted crown spire.",
    pos: [-7.0, 4.2],  shape: 'tapered' },
  { id: 'princess',    name: 'Princess Tower',       heightM: 414, floors: 101, year: 2012,
    neighbourhood: 'Dubai Marina',      notes: 'Was the tallest residential building globally on completion.',
    pos: [-7.6, 5.4],  shape: 'tapered' },
  { id: 'address-bd',  name: 'The Address Boulevard',heightM: 370, floors: 73,  year: 2017,
    neighbourhood: 'Downtown',          notes: 'Hotel + residences. Survived a 2015 NYE façade fire.',
    pos: [2.0, 1.2],   shape: 'prism'   },
  { id: 'almas',       name: 'Almas Tower',          heightM: 360, floors: 68,  year: 2008,
    neighbourhood: 'JLT',               notes: 'Diamond Exchange HQ; "Almas" = diamond in Arabic.',
    pos: [-5.0, 6.2],  shape: 'prism'   },
  { id: 'jw-marriott', name: 'JW Marriott Marquis',  heightM: 355, floors: 82,  year: 2012,
    neighbourhood: 'Business Bay',      notes: 'Twin hotel towers — for years the world\'s tallest hotel.',
    pos: [3.2, -1.4],  shape: 'twin'    },
  { id: 'emirates-t',  name: 'Emirates Office Tower',heightM: 354, floors: 54,  year: 1999,
    neighbourhood: 'Sheikh Zayed Rd',   notes: 'One of the SZR landmarks; equilateral-triangle plan.',
    pos: [-3.0, -2.0], shape: 'prism'   },
  { id: 'burj-al-arab',name: 'Burj Al Arab',         heightM: 321, floors: 60,  year: 1999,
    neighbourhood: 'Jumeirah',          notes: 'Sail-shaped hotel on an artificial island. Self-styled 7-star.',
    pos: [-9.5, -3.0], shape: 'sail'    },
  { id: 'cayan',       name: 'Cayan (Infinity) Tower',heightM: 306, floors: 73, year: 2013,
    neighbourhood: 'Dubai Marina',      notes: 'Each floor twists 1.2°; full 90° helical rotation top to bottom.',
    pos: [-6.0, 4.0],  shape: 'twist'   },
  { id: '23-marina',   name: '23 Marina',            heightM: 393, floors: 89,  year: 2012,
    neighbourhood: 'Dubai Marina',      notes: 'Each apartment had its own private swimming pool on the balcony.',
    pos: [-6.4, 5.6],  shape: 'tapered' },
];

// ─── time-of-day model ─────────────────────────────────────────────────────

interface Sky {
  /** 0=midnight, 1=full noon */
  daylight: number;
  sunDir: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  ambient: number;
  ambientColor: string;
  skyTop: string;
  skyHorizon: string;
  groundColor: string;
  waterColor: string;
  nightBoost: number;
}

function computeSky(timeOfDay: number): Sky {
  // sun arc — angle 0 at sunrise (east), π at sunset (west)
  const arc = ((timeOfDay - 0.25) % 1) * Math.PI * 2;
  const sunY = Math.sin(arc);
  const sunX = Math.cos(arc);
  const daylight = Math.max(0, sunY);

  // dawn / dusk hue near horizon
  const transition = THREE.MathUtils.smoothstep(Math.abs(sunY), 0.0, 0.35);
  // sunColor — warm at low sun, white at high
  const sunHex = new THREE.Color('#fff2c8').lerp(new THREE.Color('#ff8c3a'), 1 - transition).getStyle();

  // sky tints
  const skyTop = new THREE.Color('#0a1830') // midnight
    .lerp(new THREE.Color('#3a6db8'), daylight * 0.5)
    .lerp(new THREE.Color('#79b1f0'), daylight);

  const skyHorizon = new THREE.Color('#101830')
    .lerp(new THREE.Color('#ff9a5a'), (1 - daylight) * 0.0 + transition * 0.85)
    .lerp(new THREE.Color('#a8c8f0'), daylight * 0.9);

  const ground = new THREE.Color('#070912')
    .lerp(new THREE.Color('#352a18'), 0.4)
    .lerp(new THREE.Color('#bf9670'), daylight * 0.7);

  const water = new THREE.Color('#04101c')
    .lerp(new THREE.Color('#0d4870'), daylight * 0.6)
    .lerp(new THREE.Color('#3a8fc8'), daylight * 0.4);

  return {
    daylight,
    sunDir: [sunX * 14, Math.max(0.5, sunY * 14), 6],
    sunColor: sunHex,
    sunIntensity: 0.15 + daylight * 1.6,
    ambient: 0.12 + daylight * 0.35,
    ambientColor: daylight > 0.2 ? '#fff2d6' : '#506890',
    skyTop: skyTop.getStyle(),
    skyHorizon: skyHorizon.getStyle(),
    groundColor: ground.getStyle(),
    waterColor: water.getStyle(),
    nightBoost: 1 - daylight,
  };
}

// ─── sky background ─────────────────────────────────────────────────────────

const SKY_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  varying vec3 vWorld;
  void main() {
    float t = clamp(vWorld.y / 30.0 + 0.35, 0.0, 1.0);
    vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.6, t));
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Sky({ skyTop, skyHorizon }: { skyTop: string; skyHorizon: string }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTop:     { value: new THREE.Color(skyTop) },
    uHorizon: { value: new THREE.Color(skyHorizon) },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (!matRef.current) return;
    (matRef.current.uniforms.uTop.value as THREE.Color).set(skyTop);
    (matRef.current.uniforms.uHorizon.value as THREE.Color).set(skyHorizon);
  });

  return (
    <mesh>
      <sphereGeometry args={[80, 32, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={SKY_VERT}
        fragmentShader={SKY_FRAG}
        uniforms={uniforms}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// ─── procedural tower shapes ────────────────────────────────────────────────

function TowerMesh({
  tower, hScale, highlighted, nightBoost, onClick, onHover, onUnhover,
}: {
  tower: Tower;
  hScale: number;
  highlighted: boolean;
  nightBoost: number;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onHover: () => void;
  onUnhover: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const h = (tower.heightM / 50) * hScale * (tower.scale ?? 1);

  useFrame((state) => {
    if (!ref.current) return;
    const target = highlighted ? 1.06 : 1.0;
    ref.current.scale.x = THREE.MathUtils.lerp(ref.current.scale.x, target, 0.12);
    ref.current.scale.z = THREE.MathUtils.lerp(ref.current.scale.z, target, 0.12);
    if (tower.shape === 'twist') {
      ref.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  // Material has 3 states: highlighted (gold), day (dim windows), night (warm windows)
  // Recompute on highlight or nightBoost change.
  const glassMat = useMemo(() => {
    if (highlighted) {
      return new THREE.MeshPhysicalMaterial({
        color: '#c9a96e', metalness: 0.85, roughness: 0.22,
        emissive: '#c9a96e', emissiveIntensity: 0.45,
        clearcoat: 0.5,
      });
    }
    const dayCol = '#1c2230';
    const nightCol = '#0a1018';
    const c = new THREE.Color(dayCol).lerp(new THREE.Color(nightCol), nightBoost);
    return new THREE.MeshPhysicalMaterial({
      color: c,
      metalness: 0.85 - nightBoost * 0.25,
      roughness: 0.22 + nightBoost * 0.15,
      emissive: new THREE.Color('#fff2a0'),
      emissiveIntensity: 0.04 + nightBoost * 0.75,
      clearcoat: 0.5,
    });
  }, [highlighted, nightBoost]);

  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(); document.body.style.cursor = 'pointer'; },
    onPointerOut:  (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onUnhover(); document.body.style.cursor = ''; },
    onClick:       (e: ThreeEvent<MouseEvent>)   => { e.stopPropagation(); onClick(e); },
  };

  return (
    <group ref={ref} position={[tower.pos[0], 0, tower.pos[1]]}>
      <mesh visible={false} {...handlers} position={[0, h / 2, 0]}>
        <boxGeometry args={[1.6, h * 1.05, 1.6]} />
      </mesh>

      {tower.shape === 'tapered' && (
        <>
          <mesh position={[0, h * 0.25, 0]}><boxGeometry args={[1.1, h * 0.5, 1.1]} /><primitive object={glassMat} attach="material" /></mesh>
          <mesh position={[0, h * 0.65, 0]}><boxGeometry args={[0.9, h * 0.3, 0.9]} /><primitive object={glassMat} attach="material" /></mesh>
          <mesh position={[0, h * 0.86, 0]}><boxGeometry args={[0.6, h * 0.14, 0.6]} /><primitive object={glassMat} attach="material" /></mesh>
          <mesh position={[0, h * 0.98, 0]}><coneGeometry args={[0.22, h * 0.18, 6]} /><primitive object={glassMat} attach="material" /></mesh>
        </>
      )}

      {tower.shape === 'prism' && (
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[1.0, h, 1.0]} />
          <primitive object={glassMat} attach="material" />
        </mesh>
      )}

      {tower.shape === 'twin' && (
        <>
          <mesh position={[-0.45, h / 2, 0]}><boxGeometry args={[0.7, h, 0.7]} /><primitive object={glassMat} attach="material" /></mesh>
          <mesh position={[0.45, h / 2, 0]}><boxGeometry args={[0.7, h * 0.95, 0.7]} /><primitive object={glassMat} attach="material" /></mesh>
        </>
      )}

      {tower.shape === 'twist' && (
        <group>
          {Array.from({ length: 14 }).map((_, i) => {
            const t = i / 14;
            const rot = t * (Math.PI / 2);
            return (
              <mesh key={i} position={[0, h * (t + 0.04), 0]} rotation={[0, rot, 0]}>
                <boxGeometry args={[1.0, h / 14, 1.0]} />
                <primitive object={glassMat} attach="material" />
              </mesh>
            );
          })}
        </group>
      )}

      {tower.shape === 'sail' && (
        <group rotation={[0, 0.4, 0]}>
          <mesh position={[0.0, h / 2, -0.3]}>
            <boxGeometry args={[0.45, h, 0.45]} />
            <primitive object={glassMat} attach="material" />
          </mesh>
          <mesh position={[0.3, h * 0.5, 0.1]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.08, h * 1.0, 1.4]} />
            <meshPhysicalMaterial
              color="#f4f4f4"
              metalness={0.05}
              roughness={0.4}
              emissive={highlighted ? '#c9a96e' : '#fff2a0'}
              emissiveIntensity={highlighted ? 0.35 : 0.04 + nightBoost * 0.4}
            />
          </mesh>
          <mesh position={[0.0, h * 0.93, 0]}>
            <cylinderGeometry args={[0.5, 0.55, 0.08, 24]} />
            <meshStandardMaterial color="#1a1f2a" />
          </mesh>
        </group>
      )}

      {highlighted && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.9, 1.2, 32]} />
          <meshBasicMaterial color="#c9a96e" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ─── filler skyline ─────────────────────────────────────────────────────────

function FillerSkyline({ nightBoost }: { nightBoost: number }) {
  const fillers = useMemo(() => {
    const arr: { pos: [number, number]; h: number; w: number }[] = [];
    const rng = mulberry32(424242);
    const namedFootprint = TOWERS.map((t) => t.pos);
    for (let i = 0; i < 64; i++) {
      const x = (rng() - 0.5) * 22;
      const z = (rng() - 0.5) * 22;
      if (namedFootprint.some(([nx, nz]) => Math.hypot(nx - x, nz - z) < 1.5)) continue;
      const dist = Math.hypot(x, z);
      const maxH = Math.max(0.7, 4.0 - dist * 0.15);
      arr.push({ pos: [x, z], h: 0.6 + rng() * maxH, w: 0.4 + rng() * 0.5 });
    }
    return arr;
  }, []);

  return (
    <group>
      {fillers.map((b, i) => (
        <mesh key={i} position={[b.pos[0], b.h / 2, b.pos[1]]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial
            color="#22262e"
            metalness={0.4}
            roughness={0.55}
            emissive="#ffaa55"
            emissiveIntensity={0.05 + nightBoost * 0.55}
          />
        </mesh>
      ))}
    </group>
  );
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── ground + water ────────────────────────────────────────────────────────

function Ground({ groundColor, waterColor }: { groundColor: string; waterColor: string }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60, 1, 1]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[60, 60, 30, 30]} />
        <meshBasicMaterial color="#1a1d28" wireframe transparent opacity={0.25} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-15, 0.02, 0]}>
        <planeGeometry args={[40, 60, 1, 1]} />
        <meshPhysicalMaterial color={waterColor} metalness={0.6} roughness={0.2} clearcoat={0.5} />
      </mesh>
    </>
  );
}

// ─── scene ─────────────────────────────────────────────────────────────────

export default function DubaiScene({
  mouse, hoveredId, selectedId, onHover, onSelect, timeOfDay = 0.5,
}: {
  mouse: { x: number; y: number };
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (tower: Tower) => void;
  timeOfDay?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, mouse.x * 0.2, 0.04);
    }
  });

  const sky = useMemo(() => computeSky(timeOfDay), [timeOfDay]);

  return (
    <>
      <SceneCamera position={[14, 9, 14]} target={[-2, 1.5, 0]} autoRotateSpeed={0.25} minDistance={6} maxDistance={32} maxPolarAngle={Math.PI / 2 - 0.05} />

      {/* lighting — animated by time-of-day */}
      <ambientLight intensity={sky.ambient} color={sky.ambientColor} />
      <directionalLight
        position={sky.sunDir}
        intensity={sky.sunIntensity}
        color={sky.sunColor}
        castShadow
      />
      {/* always-on cool fill from the Gulf side, dims in daylight */}
      <pointLight position={[-8, 6, 4]} intensity={0.2 + sky.nightBoost * 0.4} color="#7faad4" />
      {/* warm fill from the city core */}
      <pointLight position={[6, 5, -8]} intensity={0.2 + sky.nightBoost * 0.5} color="#ffb060" />

      <Sky skyTop={sky.skyTop} skyHorizon={sky.skyHorizon} />

      <group ref={groupRef}>
        <Ground groundColor={sky.groundColor} waterColor={sky.waterColor} />
        <FillerSkyline nightBoost={sky.nightBoost} />

        {TOWERS.map((t) => (
          <TowerMesh
            key={t.id}
            tower={t}
            hScale={0.14}
            highlighted={hoveredId === t.id || selectedId === t.id}
            nightBoost={sky.nightBoost}
            onHover={() => onHover(t.id)}
            onUnhover={() => onHover(null)}
            onClick={() => onSelect(t)}
          />
        ))}

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -12]}>
          <ringGeometry args={[0.18, 0.22, 24]} />
          <meshBasicMaterial color="#c9a96e" transparent opacity={0.6} />
        </mesh>
      </group>
    </>
  );
}
