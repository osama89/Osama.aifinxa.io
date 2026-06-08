"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { feature, mesh as topomesh } from "topojson-client";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";

/**
 * GlobeWebGL — A real WebGL globe in the spirit of the Framer Globe-Pins
 * component. Built with react-three-fiber + three.js + OrbitControls + the
 * world-atlas topojson dataset for real continent geometry.
 *
 * Features:
 *   - True 3D sphere
 *   - REAL continents (land-110m.json from world-atlas) rendered as a
 *     dotted point cloud — the dots only appear over actual land
 *   - White coastline outlines drawn on top of the dot field
 *   - Auto-rotates on idle, click-and-drag to rotate, pause-on-drag
 *   - Pins anchored to real lat/lon
 *   - Animated bezier-arc trails between Dubai and each target city
 *   - Bloom-like outer glow halo
 *   - Hover tooltips
 */

type Pin = {
  city: string;
  country: string;
  lat: number;
  lon: number;
  status: "deployed" | "target";
};

// Real coordinates for GCC cities.
const HOME: Pin = { city: "Dubai", country: "UAE", lat: 25.2048, lon: 55.2708, status: "deployed" };
const TARGETS: Pin[] = [
  { city: "Abu Dhabi", country: "UAE", lat: 24.4539, lon: 54.3773, status: "deployed" },
  { city: "Riyadh", country: "KSA", lat: 24.7136, lon: 46.6753, status: "target" },
  { city: "Doha", country: "Qatar", lat: 25.2854, lon: 51.5310, status: "target" },
  { city: "Muscat", country: "Oman", lat: 23.5859, lon: 58.4059, status: "target" },
  { city: "Manama", country: "Bahrain", lat: 26.2285, lon: 50.5860, status: "target" },
  { city: "Kuwait City", country: "Kuwait", lat: 29.3759, lon: 47.9774, status: "target" },
];
const ALL_PINS = [HOME, ...TARGETS];

const RADIUS = 1;

// lat/lon (degrees) → unit-sphere 3D vector
function latLonToVec3(lat: number, lon: number, radius: number = RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/* -------------- Point-in-polygon helper (ray casting on flat lat/lon) -------------- */
function pointInRing(lon: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const xi = a[0];
    const yi = a[1];
    const xj = b[0];
    const yj = b[1];
    if (xi === undefined || yi === undefined || xj === undefined || yj === undefined) continue;
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lon: number, lat: number, polygon: number[][][]) {
  if (polygon.length === 0) return false;
  // Outer ring
  const outer = polygon[0];
  if (!outer || !pointInRing(lon, lat, outer)) return false;
  // Inner rings (holes) — must NOT be inside any
  for (let i = 1; i < polygon.length; i++) {
    const hole = polygon[i];
    if (hole && pointInRing(lon, lat, hole)) return false;
  }
  return true;
}

function pointOnLand(
  lon: number,
  lat: number,
  geom: FeatureCollection<Polygon | MultiPolygon>,
) {
  for (const f of geom.features) {
    if (!f.geometry) continue;
    if (f.geometry.type === "Polygon") {
      if (pointInPolygon(lon, lat, f.geometry.coordinates as number[][][])) {
        return true;
      }
    } else if (f.geometry.type === "MultiPolygon") {
      for (const poly of f.geometry.coordinates as number[][][][]) {
        if (pointInPolygon(lon, lat, poly)) return true;
      }
    }
  }
  return false;
}

/* -------------- Continents dot field (real land) -------------- */
function LandDots({
  land,
}: {
  land: FeatureCollection<Polygon | MultiPolygon>;
}) {
  const points = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    // Step 1.5° gives ~28k candidate points; ~10k will be on land. Cheap.
    const step = 1.5;
    for (let lat = -85; lat <= 85; lat += step) {
      const rad = Math.cos((lat * Math.PI) / 180);
      const lonStep = Math.max(step, step / Math.max(0.15, rad));
      for (let lon = -180; lon < 180; lon += lonStep) {
        if (pointOnLand(lon, lat, land)) {
          const v = latLonToVec3(lat, lon, RADIUS * 1.001);
          positions.push(v.x, v.y, v.z);
        }
      }
    }
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    return geom;
  }, [land]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color("#67e8f9"),
        size: 0.011,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  return <points geometry={points} material={mat} />;
}

/* -------------- Coastline outlines (the actual stroked edges) -------------- */
function Coastlines({
  topology,
  landObject,
}: {
  topology: Topology;
  landObject: GeometryCollection;
}) {
  const lines = useMemo(() => {
    // mesh() gives MultiLineString with all coastline edges combined.
    const ml = topomesh(topology, landObject);
    // Build a single LineSegments geometry. Each consecutive pair of points
    // becomes one segment.
    const positions: number[] = [];
    const coords = ml.coordinates as number[][][];
    for (const line of coords) {
      // Sample the polyline densely along great-circle so it bends with sphere
      for (let i = 0; i < line.length - 1; i++) {
        const a = line[i];
        const b = line[i + 1];
        if (!a || !b) continue;
        const [lonA, latA] = a as [number, number];
        const [lonB, latB] = b as [number, number];
        // Interpolate 4 sub-segments so wide polygon edges don't sink under sphere
        const steps = 5;
        for (let s = 0; s < steps; s++) {
          const t0 = s / steps;
          const t1 = (s + 1) / steps;
          const lon0 = lonA + (lonB - lonA) * t0;
          const lat0 = latA + (latB - latA) * t0;
          const lon1 = lonA + (lonB - lonA) * t1;
          const lat1 = latA + (latB - latA) * t1;
          const v0 = latLonToVec3(lat0, lon0, RADIUS * 1.005);
          const v1 = latLonToVec3(lat1, lon1, RADIUS * 1.005);
          positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z);
        }
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geom;
  }, [topology, landObject]);

  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#22d3ee"),
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  return <lineSegments geometry={lines} material={mat} />;
}

/* -------------- Latitude/longitude graticule (faint reference grid) -------------- */
function Graticule() {
  const geom = useMemo(() => {
    const positions: number[] = [];
    // Latitude lines every 30°
    for (let lat = -60; lat <= 60; lat += 30) {
      const segs = 96;
      for (let i = 0; i < segs; i++) {
        const lon0 = -180 + (i / segs) * 360;
        const lon1 = -180 + ((i + 1) / segs) * 360;
        const v0 = latLonToVec3(lat, lon0, RADIUS * 0.998);
        const v1 = latLonToVec3(lat, lon1, RADIUS * 0.998);
        positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z);
      }
    }
    // Longitude lines every 30°
    for (let lon = -180; lon < 180; lon += 30) {
      const segs = 96;
      for (let i = 0; i < segs; i++) {
        const lat0 = -90 + (i / segs) * 180;
        const lat1 = -90 + ((i + 1) / segs) * 180;
        const v0 = latLonToVec3(lat0, lon, RADIUS * 0.998);
        const v1 = latLonToVec3(lat1, lon, RADIUS * 0.998);
        positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#138294"),
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
    [],
  );
  return <lineSegments geometry={geom} material={mat} />;
}

/* -------------- Solid inner sphere (the planet body) -------------- */
function SphereBody() {
  return (
    <mesh>
      <sphereGeometry args={[RADIUS * 0.99, 64, 64]} />
      <meshBasicMaterial color={new THREE.Color("#081720")} transparent opacity={0.95} />
    </mesh>
  );
}

/* -------------- Outer atmosphere shells (cheap bloom) -------------- */
function AtmosphereShells() {
  return (
    <>
      <mesh>
        <sphereGeometry args={[RADIUS * 1.03, 48, 48]} />
        <meshBasicMaterial
          color={new THREE.Color("#22d3ee")}
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[RADIUS * 1.08, 48, 48]} />
        <meshBasicMaterial
          color={new THREE.Color("#138294")}
          transparent
          opacity={0.04}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[RADIUS * 1.16, 48, 48]} />
        <meshBasicMaterial
          color={new THREE.Color("#22d3ee")}
          transparent
          opacity={0.022}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/* -------------- A single pin -------------- */
function PinMarker({
  pin,
  onHover,
}: {
  pin: Pin;
  onHover: (pin: Pin | null) => void;
}) {
  const pos = useMemo(() => latLonToVec3(pin.lat, pin.lon, RADIUS * 1.01), [pin]);
  const haloPos = useMemo(() => latLonToVec3(pin.lat, pin.lon, RADIUS * 1.04), [pin]);
  const isDeployed = pin.status === "deployed";
  const color = isDeployed ? "#22d3ee" : "#fbbf24";

  const haloRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!haloRef.current) return;
    const t = clock.getElapsedTime() + pin.lon * 0.01;
    const s = 1 + Math.sin(t * 1.6) * 0.4;
    haloRef.current.scale.setScalar(s);
    const mat = haloRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.45 - Math.sin(t * 1.6) * 0.25;
  });

  return (
    <group>
      <mesh
        position={pos}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(pin);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[isDeployed ? 0.024 : 0.02, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={haloRef} position={haloPos}>
        <sphereGeometry args={[isDeployed ? 0.045 : 0.036, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* -------------- Animated arc trails -------------- */
function ArcTrails() {
  const tubesRef = useRef<{ mat: THREE.ShaderMaterial; offset: number }[]>([]);

  const arcs = useMemo(() => {
    return TARGETS.map((t, i) => {
      const start = latLonToVec3(HOME.lat, HOME.lon, RADIUS * 1.01);
      const end = latLonToVec3(t.lat, t.lon, RADIUS * 1.01);
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize();
      const dist = start.distanceTo(end);
      const ctrl = mid.multiplyScalar(RADIUS + dist * 0.7 + 0.15);
      const curve = new THREE.QuadraticBezierCurve3(start, ctrl, end);
      const geom = new THREE.TubeGeometry(curve, 48, 0.0045, 8, false);
      return { geom, offset: i * 0.3 };
    });
  }, []);

  const baseShader = useMemo(
    () => ({
      uniforms: {
        uColor: { value: new THREE.Color("#67e8f9") },
        uProgress: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uProgress;
        varying vec2 vUv;
        void main() {
          float t = uProgress;
          float len = 0.35;
          float dist = t - vUv.x;
          if (dist < 0.0 || dist > len) discard;
          float alpha = 1.0 - (dist / len);
          alpha = pow(alpha, 2.2);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    tubesRef.current.forEach((entry) => {
      const local = ((t + entry.offset) % 4) / 4;
      entry.mat.uniforms.uProgress.value = local + 0.35;
    });
  });

  return (
    <group>
      {arcs.map((arc, i) => (
        <ArcTube
          key={i}
          geom={arc.geom}
          offset={arc.offset}
          baseShader={baseShader}
          registerTube={(mat) => {
            tubesRef.current.push({ mat, offset: arc.offset });
          }}
        />
      ))}
    </group>
  );
}

function ArcTube({
  geom,
  baseShader,
  registerTube,
}: {
  geom: THREE.TubeGeometry;
  offset: number;
  baseShader: {
    uniforms: { uColor: { value: THREE.Color }; uProgress: { value: number } };
    vertexShader: string;
    fragmentShader: string;
  };
  registerTube: (mat: THREE.ShaderMaterial) => void;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useEffect(() => {
    if (matRef.current) registerTube(matRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <mesh geometry={geom}>
        <meshBasicMaterial
          color={new THREE.Color("#22d3ee")}
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh geometry={geom}>
        <shaderMaterial
          ref={matRef}
          attach="material"
          uniforms={THREE.UniformsUtils.clone(baseShader.uniforms)}
          vertexShader={baseShader.vertexShader}
          fragmentShader={baseShader.fragmentShader}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

/* -------------- Auto-rotate (paused while dragging) -------------- */
function AutoRotator({ enabled }: { enabled: boolean }) {
  const { scene } = useThree();
  const globeRef = useRef<THREE.Object3D | null>(null);
  useEffect(() => {
    globeRef.current = scene.getObjectByName("globe-group") ?? null;
  }, [scene]);
  useFrame((_, dt) => {
    if (!enabled) return;
    const g = globeRef.current;
    if (!g) return;
    g.rotation.y += dt * 0.18;
  });
  return null;
}

/* -------------- Scene -------------- */
function GlobeScene({
  land,
  topology,
  landObject,
  setHovered,
}: {
  land: FeatureCollection<Polygon | MultiPolygon>;
  topology: Topology;
  landObject: GeometryCollection;
  setHovered: (pin: Pin | null) => void;
}) {
  const [autoRotate, setAutoRotate] = useState(true);

  return (
    <>
      <ambientLight intensity={0.4} />
      <group name="globe-group" rotation={[0, (55 * Math.PI) / 180, 0]}>
        {/* Initial rotation parks the Middle East/GCC roughly toward the camera. */}
        <SphereBody />
        <Graticule />
        <LandDots land={land} />
        <Coastlines topology={topology} landObject={landObject} />
        <AtmosphereShells />
        <ArcTrails />
        {ALL_PINS.map((pin) => (
          <PinMarker key={pin.city} pin={pin} onHover={setHovered} />
        ))}
      </group>
      <AutoRotator enabled={autoRotate} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.7}
        onStart={() => setAutoRotate(false)}
        onEnd={() => setTimeout(() => setAutoRotate(true), 2400)}
      />
    </>
  );
}

/* -------------- Exported wrapper -------------- */
export function GlobeWebGL({ className = "" }: { className?: string }) {
  const [hovered, setHovered] = useState<Pin | null>(null);
  const [data, setData] = useState<{
    topology: Topology;
    landObject: GeometryCollection;
    land: FeatureCollection<Polygon | MultiPolygon>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/land-110m.json");
        if (!res.ok) throw new Error(`Failed to load land data (${res.status})`);
        const topology = (await res.json()) as Topology;
        const landObject = topology.objects["land"] as GeometryCollection;
        if (!landObject) throw new Error("Missing 'land' object in topology");
        const land = feature(topology, landObject) as unknown as FeatureCollection<
          Polygon | MultiPolygon
        >;
        if (!cancelled) setData({ topology, landObject, land });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`relative aspect-square w-full ${className}`}>
      {/* Heavy bloom backdrop */}
      <div className="pointer-events-none absolute inset-[-12%] rounded-full bg-[var(--color-accent)]/25 blur-[80px]" />
      <div className="pointer-events-none absolute inset-[-4%] rounded-full bg-[var(--color-accent-glow)]/18 blur-3xl" />

      {/* Deployed badge */}
      <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-surface)]/90 px-3.5 py-1.5 text-xs backdrop-blur-md shadow-[0_0_24px_-4px_rgba(34,211,238,0.45)]">
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-400">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink)]">
            Deployed in UAE
          </span>
        </div>
      </div>

      {/* Drag hint */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-muted-2)]">
        ↕ Drag to rotate
      </div>

      {/* Loader */}
      {!data && !error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent-glow)]" />
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-muted-2)]">
              Loading world map…
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-300">
            Map load failed: {error}
          </div>
        </div>
      )}

      {/* Canvas */}
      {data && (
        <Canvas
          camera={{ position: [0, 0, 2.8], fov: 45 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          className="relative z-10"
        >
          <GlobeScene
            land={data.land}
            topology={data.topology}
            landObject={data.landObject}
            setHovered={setHovered}
          />
        </Canvas>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <div className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2">
          <div
            className={`inline-flex items-center gap-2 rounded-full border bg-[var(--color-surface)]/95 px-3 py-1.5 text-xs backdrop-blur-md ${
              hovered.status === "deployed"
                ? "border-[var(--color-accent-glow)]/50 text-[var(--color-accent-glow)]"
                : "border-amber-500/40 text-amber-300"
            }`}
          >
            <span className="font-medium">{hovered.city}</span>
            <span className="text-[var(--color-muted-2)]">·</span>
            <span className="font-mono text-[10px] tracking-wider">
              {hovered.country}
            </span>
            <span className="text-[var(--color-muted-2)]">·</span>
            <span className="font-mono text-[10px] uppercase tracking-wider">
              {hovered.status === "deployed" ? "LIVE" : "TARGET"}
            </span>
          </div>
        </div>
      )}

      {/* Polar glints */}
      <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-6 w-6 -translate-x-1/2 rounded-full bg-[var(--color-accent-glow)]/40 blur-md" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-6 w-6 -translate-x-1/2 rounded-full bg-[var(--color-accent)]/40 blur-md" />
    </div>
  );
}
