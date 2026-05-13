'use client';

/**
 * PlaygroundCanvas — embedded interactive sandbox.
 *
 * 12 scenes across four groups:
 *   gen      → PARTICLES / ORB / SWARM / WAVE / NEBULA
 *   cars     → SPORTS / TRUCK / SEDAN  (each with paint-color picker)
 *   world    → BEACH / EARTH / DUBAI  (Dubai has day/night slider)
 *   engines  → PLAYCANVAS               (own pc.Application, R3F unmounts)
 *
 * R3F Canvas hosts 11 of 12 scenes. When the user selects PLAYCANVAS,
 * the R3F Canvas unmounts entirely and PlayCanvasDemo (dynamic-imported)
 * mounts in its place — two different WebGL engines never coexist.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Canvas, useFrame } from '@react-three/fiber';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';

import CarScene from './playground/scenes/CarScene';
import TruckScene from './playground/scenes/TruckScene';
import SedanScene from './playground/scenes/SedanScene';
import BeachScene from './playground/scenes/BeachScene';
import EarthScene from './playground/scenes/EarthScene';
import DubaiScene, { Tower } from './playground/scenes/DubaiScene';
import NebulaScene from './playground/scenes/NebulaScene';
import GalaxyScene from './playground/scenes/GalaxyScene';
import DesignShowcase from './playground/scenes/DesignShowcase';
import Effects from './playground/lib/effects';
import { Environment } from '@react-three/drei';
import { playTone, freqForHeight } from './playground/lib/audio';

// PlayCanvas runtime (~400KB) — only loads when the user picks the tab.
const PlayCanvasDemo = dynamic(() => import('./playground/PlayCanvasDemo'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#07070b' }}>
      <div className="text-[10px] tracking-[0.3em] uppercase" style={{ color: '#c9a96e', fontFamily: 'var(--font-mono)' }}>
        loading playcanvas runtime…
      </div>
    </div>
  ),
});

// ─── palette ───────────────────────────────────────────────────────────────

const GOLD = '#c9a96e';

const PAINT_SWATCHES = [
  '#c9a96e', '#0a0a0a', '#e8d5b0', '#7faad4',
  '#a52a2a', '#0d3a5f', '#2a3140', '#c8ccd2',
];

// ─── inline generative scenes (small, kept here) ────────────────────────────

function ParticlesScene({ mouse }: { mouse: { x: number; y: number } }) {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 1800;
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      speeds[i] = 0.4 + Math.random() * 1.2;
    }
    return { positions, speeds };
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const pts = ref.current; if (!pts) return;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const x = arr[ix], y = arr[ix + 1];
      const ux = Math.sin(y * 0.6 + t * 0.5) * 0.4 + (mouse.x - x) * 0.005;
      const uy = Math.cos(x * 0.5 - t * 0.4) * 0.4 + (mouse.y - y) * 0.005;
      const uz = Math.sin((x + y) * 0.3 + t * 0.3) * 0.3;
      arr[ix]     += ux * dt * speeds[i];
      arr[ix + 1] += uy * dt * speeds[i];
      arr[ix + 2] += uz * dt * speeds[i];
      if (Math.abs(arr[ix])     > 4)   arr[ix]     = -Math.sign(arr[ix])     * 4;
      if (Math.abs(arr[ix + 1]) > 2.5) arr[ix + 1] = -Math.sign(arr[ix + 1]) * 2.5;
      if (Math.abs(arr[ix + 2]) > 2.5) arr[ix + 2] = -Math.sign(arr[ix + 2]) * 2.5;
    }
    pos.needsUpdate = true;
    pts.rotation.y = Math.sin(t * 0.1) * 0.3;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={COUNT} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color={GOLD} transparent opacity={0.85} sizeAttenuation />
    </points>
  );
}

function OrbScene({ mouse }: { mouse: { x: number; y: number } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseGeo = useMemo(() => new THREE.IcosahedronGeometry(1.4, 6), []);
  const basePositions = useMemo(() => {
    const a = baseGeo.attributes.position as THREE.BufferAttribute;
    return new Float32Array(a.array);
  }, [baseGeo]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mesh = meshRef.current; if (!mesh) return;
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const v = new THREE.Vector3();
    const mInfluence = (mouse.x * mouse.x + mouse.y * mouse.y) * 0.02;
    for (let i = 0; i < arr.length; i += 3) {
      v.set(basePositions[i], basePositions[i + 1], basePositions[i + 2]).normalize();
      const noise =
        Math.sin(v.x * 4 + t * 1.2) * 0.18 +
        Math.cos(v.y * 5 - t * 0.9) * 0.12 +
        Math.sin(v.z * 3.2 + t * 1.5) * 0.1;
      const r = 1.4 + noise + mInfluence;
      arr[i] = v.x * r; arr[i + 1] = v.y * r; arr[i + 2] = v.z * r;
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.rotation.y = t * 0.2 + mouse.x * 0.4;
    mesh.rotation.x = mouse.y * 0.4;
  });

  return (
    <>
      <mesh ref={meshRef} geometry={baseGeo.clone()}>
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.25} emissive={GOLD} emissiveIntensity={0.15} />
      </mesh>
      <mesh geometry={baseGeo}>
        <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.18} />
      </mesh>
    </>
  );
}

function SwarmScene({ mouse }: { mouse: { x: number; y: number } }) {
  const COUNT = 80;
  const groupRef = useRef<THREE.Group>(null);
  const agents = useMemo(() => Array.from({ length: COUNT }, () => ({
    pos: new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3),
    vel: new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.4),
  })), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    target.set(mouse.x * 3, mouse.y * 1.6, 0);
    const group = groupRef.current; if (!group) return;
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      const toT = target.clone().sub(a.pos).multiplyScalar(0.5);
      a.vel.add(toT.multiplyScalar(dt));
      for (let j = 0; j < agents.length; j++) {
        if (i === j) continue;
        const d = a.pos.clone().sub(agents[j].pos);
        const dist = d.length();
        if (dist < 0.5 && dist > 0.001) {
          d.normalize().multiplyScalar((0.5 - dist) * 1.2 * dt);
          a.vel.add(d);
        }
      }
      a.vel.multiplyScalar(0.97);
      if (a.vel.length() > 2) a.vel.setLength(2);
      a.pos.addScaledVector(a.vel, dt);
      const child = group.children[i] as THREE.Mesh;
      child.position.copy(a.pos);
      child.lookAt(a.pos.clone().add(a.vel));
    }
  });

  return (
    <group ref={groupRef}>
      {agents.map((_, i) => (
        <mesh key={i}>
          <coneGeometry args={[0.05, 0.16, 6]} />
          <meshStandardMaterial color={i % 5 === 0 ? '#64dfdf' : GOLD} emissive={i % 5 === 0 ? '#64dfdf' : GOLD} emissiveIntensity={0.8} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function WaveScene({ mouse }: { mouse: { x: number; y: number } }) {
  const mesh = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(7, 4, 80, 50), []);
  const basePos = useMemo(() => {
    const a = geo.attributes.position as THREE.BufferAttribute;
    return new Float32Array(a.array);
  }, [geo]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const m = mesh.current; if (!m) return;
    const pos = m.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = basePos[i], y = basePos[i + 1];
      const mxd = x - mouse.x * 3, myd = y - mouse.y * 1.6;
      const mDist = Math.sqrt(mxd * mxd + myd * myd);
      arr[i + 2] = Math.sin(x * 1.2 + t * 1.5) * 0.18 + Math.cos(y * 1.4 - t * 1.2) * 0.18 + Math.exp(-mDist * 1.3) * 0.6;
    }
    pos.needsUpdate = true;
    m.geometry.computeVertexNormals();
    m.rotation.x = -Math.PI / 3;
  });

  return (
    <mesh ref={mesh} geometry={geo}>
      <meshStandardMaterial color={GOLD} wireframe emissive={GOLD} emissiveIntensity={0.8} />
    </mesh>
  );
}

// ─── shell ─────────────────────────────────────────────────────────────────

type DemoKey =
  | 'particles' | 'orb' | 'swarm' | 'wave' | 'nebula' | 'galaxy'
  | 'car' | 'truck' | 'sedan'
  | 'beach' | 'earth' | 'dubai'
  | 'playcanvas'
  | 'design';

type GroupKey = 'gen' | 'cars' | 'world' | 'engines' | 'showcase';

interface Demo {
  key: DemoKey;
  label: string;
  hint: string;
  group: GroupKey;
  bloom: number;
}

const DEMOS: Demo[] = [
  { key: 'particles', label: 'PARTICLES', hint: 'gold flow field · cursor disturbs',                       group: 'gen',     bloom: 0.35 },
  { key: 'orb',       label: 'ORB',       hint: 'noise-displaced sphere · cursor warps the field',         group: 'gen',     bloom: 0.4  },
  { key: 'swarm',     label: 'SWARM',     hint: 'agent boids · cursor is the attractor',                   group: 'gen',     bloom: 0.5  },
  { key: 'wave',      label: 'WAVE',      hint: 'plane mesh · cursor pushes ripple',                       group: 'gen',     bloom: 0.4  },
  { key: 'nebula',    label: 'NEBULA',    hint: 'curl-noise fluid · cursor swirl attractor · bloom heavy', group: 'gen',     bloom: 1.4  },
  { key: 'galaxy',    label: 'GALAXY',    hint: '5-arm spiral · 12k particles · Keplerian rotation, cursor warps the disc', group: 'gen', bloom: 1.6  },
  { key: 'car',       label: 'SPORTS',    hint: 'procedural sports car · clearcoat paint, swatches →',     group: 'cars',    bloom: 0.55 },
  { key: 'truck',     label: 'TRUCK',     hint: 'pickup · pick a body colour from the swatches',           group: 'cars',    bloom: 0.45 },
  { key: 'sedan',     label: 'SEDAN',     hint: 'saloon · iridescent clearcoat, swatches →',               group: 'cars',    bloom: 0.45 },
  { key: 'beach',     label: 'BEACH',     hint: 'shader water · 120×90 grid, foam at peaks',               group: 'world',   bloom: 0.25 },
  { key: 'earth',     label: 'EARTH',     hint: 'procedural planet shader · day/night terminator',         group: 'world',   bloom: 0.75 },
  { key: 'dubai',     label: 'DUBAI',     hint: 'click a tower · drag the time slider for day↔night',      group: 'world',   bloom: 0.4  },
  { key: 'playcanvas',label: 'PLAYCANVAS',hint: 'PlayCanvas ECS engine · click a cube to recolour',        group: 'engines', bloom: 0    },
  { key: 'design',    label: 'DESIGN',    hint: 'DESIGN.md tokens · stitch-style preview · live mockup',  group: 'showcase',bloom: 0    },
];

const GROUP_LABEL: Record<GroupKey, string> = {
  gen:      'GENERATIVE',
  cars:     'VEHICLES',
  world:    'WORLD',
  engines:  'ENGINES',
  showcase: 'SHOWCASE',
};

const GROUP_ORDER: GroupKey[] = ['gen', 'cars', 'world', 'engines', 'showcase'];

// ─── tiny in-Canvas Suspense fallback ──────────────────────────────────────

function CanvasLoader() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.z = state.clock.elapsedTime * 1.4;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.6, 0.04, 12, 64, Math.PI * 1.4]} />
      <meshBasicMaterial color={GOLD} />
    </mesh>
  );
}

// ─── main component ────────────────────────────────────────────────────────

export default function PlaygroundCanvas() {
  const [demo, setDemo] = useState<DemoKey>('nebula');
  const [reducedMotion, setReducedMotion] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Dubai state
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selected, setSelected]   = useState<Tower | null>(null);
  const [timeOfDay, setTimeOfDay] = useState(0.78); // sunset by default — looks nice
  const [autoCycle, setAutoCycle] = useState(false);

  // Vehicle paint state — sticky per vehicle
  const [paint, setPaint] = useState<Record<'car' | 'truck' | 'sedan', string>>({
    car: '#c9a96e',
    truck: '#2a3140',
    sedan: '#c8ccd2',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // auto-cycle the day/night clock (one full cycle ≈ 60s)
  useEffect(() => {
    if (!autoCycle || demo !== 'dubai') return;
    const id = window.setInterval(() => {
      setTimeOfDay((v) => (v + 0.005) % 1);
    }, 60);
    return () => clearInterval(id);
  }, [autoCycle, demo]);

  // Arrow-key tab navigation. Skips when a form control has focus so the
  // Dubai time slider's native left/right behaviour still works.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const i = DEMOS.findIndex((d) => d.key === demo);
      const next = e.key === 'ArrowLeft'
        ? (i - 1 + DEMOS.length) % DEMOS.length
        : (i + 1) % DEMOS.length;
      setDemo(DEMOS[next].key);
      setSelected(null);
      setHoveredId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [demo]);

  const handleTowerSelect = (t: Tower) => {
    setSelected(t);
    playTone(freqForHeight(t.heightM));
  };

  const activeDemo = DEMOS.find((d) => d.key === demo)!;
  const grouped = useMemo(() => {
    const g: Record<GroupKey, Demo[]> = { gen: [], cars: [], world: [], engines: [], showcase: [] };
    for (const d of DEMOS) g[d.group].push(d);
    return g;
  }, []);

  const isVehicleTab = demo === 'car' || demo === 'truck' || demo === 'sedan';

  return (
    <div className="relative w-full h-full">
      {/* Engine swap: R3F Canvas hosts 11 scenes, PlayCanvas owns its own canvas,
          DesignShowcase is DOM-only. Two WebGL engines never coexist. */}
      {demo === 'playcanvas' ? (
        <PlayCanvasDemo />
      ) : demo === 'design' ? (
        <DesignShowcase />
      ) : (
        <Canvas
          shadows={{ type: THREE.PCFShadowMap }}
          camera={{ position: [0, 0, 6], fov: 50 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          style={{ background: '#07070b' }}
          onPointerMove={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouseRef.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
          }}
        >
          <Suspense fallback={<CanvasLoader />}>
            {demo === 'particles' && (<><ambientLight intensity={0.4} /><directionalLight position={[3,4,5]} intensity={0.9} color={GOLD} /><pointLight position={[-3,-2,-2]} intensity={0.4} color="#64dfdf" /><ParticlesScene mouse={mouseRef.current} /></>)}
            {demo === 'orb'       && (<><Environment preset="studio" background={false} environmentIntensity={0.7} /><ambientLight intensity={0.15} /><directionalLight position={[3,4,5]} intensity={0.6} color={GOLD} /><pointLight position={[-3,-2,-2]} intensity={0.4} color="#64dfdf" /><OrbScene mouse={mouseRef.current} /></>)}
            {demo === 'swarm'     && (<><ambientLight intensity={0.4} /><directionalLight position={[3,4,5]} intensity={0.9} color={GOLD} /><pointLight position={[-3,-2,-2]} intensity={0.4} color="#64dfdf" /><SwarmScene mouse={mouseRef.current} /></>)}
            {demo === 'wave'      && (<><ambientLight intensity={0.4} /><directionalLight position={[3,4,5]} intensity={0.9} color={GOLD} /><pointLight position={[-3,-2,-2]} intensity={0.4} color="#64dfdf" /><WaveScene mouse={mouseRef.current} /></>)}
            {demo === 'nebula'    && <NebulaScene mouse={mouseRef.current} />}
            {demo === 'galaxy'    && <GalaxyScene mouse={mouseRef.current} />}
            {demo === 'car'       && <CarScene mouse={mouseRef.current}   paintColor={paint.car} />}
            {demo === 'truck'     && <TruckScene mouse={mouseRef.current} paintColor={paint.truck} />}
            {demo === 'sedan'     && <SedanScene mouse={mouseRef.current} paintColor={paint.sedan} />}
            {demo === 'beach'     && <BeachScene mouse={mouseRef.current} />}
            {demo === 'earth'     && <EarthScene mouse={mouseRef.current} />}
            {demo === 'dubai'     && (
              <DubaiScene
                mouse={mouseRef.current}
                hoveredId={hoveredId}
                selectedId={selected?.id ?? null}
                onHover={setHoveredId}
                onSelect={handleTowerSelect}
                timeOfDay={timeOfDay}
              />
            )}
            {activeDemo.bloom > 0 && (
              <Effects
                bloomIntensity={activeDemo.bloom}
                bloomThreshold={demo === 'nebula' || demo === 'galaxy' ? 0.15 : 0.55}
              />
            )}
          </Suspense>
        </Canvas>
      )}

      {/* tab strip — grouped by category, ≥36px height for touch */}
      <div
        className="absolute top-3 left-3 right-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 pointer-events-none"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {GROUP_ORDER.map((g, gi) => (
          <div key={g} className="flex items-center gap-1.5 pointer-events-auto">
            <span
              className="text-[9px] tracking-[0.32em] uppercase"
              style={{ color: 'rgba(255,255,255,0.32)' }}
              aria-hidden="true"
            >
              {GROUP_LABEL[g]}
            </span>
            <div className="flex gap-1">
              {grouped[g].map((d) => {
                const active = d.key === demo;
                return (
                  <button
                    key={d.key}
                    onClick={() => { setDemo(d.key); setSelected(null); setHoveredId(null); }}
                    data-hover="true"
                    aria-pressed={active}
                    aria-label={`Switch to ${d.label} demo: ${d.hint}`}
                    className="relative h-9 min-w-[44px] px-2.5 text-[10px] tracking-[0.16em] border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{
                      color: active ? '#0a0a0a' : 'rgba(255,255,255,0.7)',
                      background: active ? 'transparent' : 'rgba(10,10,14,0.7)',
                      borderColor: active ? GOLD : 'rgba(255,255,255,0.18)',
                    }}
                  >
                    {active && (
                      reducedMotion ? (
                        <span className="absolute inset-0" style={{ background: GOLD, zIndex: 0 }} />
                      ) : (
                        <motion.span
                          layoutId="tab-pill"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          className="absolute inset-0"
                          style={{ background: GOLD, zIndex: 0 }}
                        />
                      )
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>{d.label}</span>
                  </button>
                );
              })}
            </div>
            {gi < GROUP_ORDER.length - 1 && <div className="hidden md:block w-px h-5 bg-white/10 ml-1" aria-hidden="true" />}
          </div>
        ))}
      </div>

      {/* hint — animated cross-fade per scene */}
      <AnimatePresence mode="wait">
        <motion.div
          key={demo}
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
          className="absolute bottom-3 left-3 right-3 text-[10px] tracking-[0.22em] uppercase pointer-events-none flex items-center gap-3"
          style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
          <span>{activeDemo.hint}</span>
        </motion.div>
      </AnimatePresence>

      <div
        className="absolute top-3 right-3 text-[9px] tracking-[0.3em] uppercase pointer-events-none"
        style={{ color: GOLD, fontFamily: 'var(--font-mono)' }}
      >
        ◆ {demo === 'playcanvas' ? 'playcanvas · ecs' : demo === 'design' ? 'design.md · stitch' : 'r3f · bloom'}
      </div>

      {/* ─── side control panel ──────────────────────────────────────────── */}

      <AnimatePresence>
        {/* Vehicle paint picker */}
        {isVehicleTab && (
          <motion.div
            key="paint-panel"
            initial={reducedMotion ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: 16 }}
            transition={{ duration: 0.22 }}
            className="absolute right-3 top-14 w-[148px] border p-3 z-10"
            style={{
              background: 'rgba(8,8,12,0.92)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(201,169,110,0.4)',
              fontFamily: 'var(--font-mono)',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-[9px] tracking-[0.3em] uppercase text-[#c9a96e] mb-2">◆ paint</div>
            <div className="grid grid-cols-4 gap-1.5">
              {PAINT_SWATCHES.map((c) => {
                const vehicle = demo as 'car' | 'truck' | 'sedan';
                const active = paint[vehicle] === c;
                return (
                  <button
                    key={c}
                    onClick={() => setPaint((p) => ({ ...p, [vehicle]: c }))}
                    data-hover="true"
                    aria-label={`Paint colour ${c}`}
                    className="w-7 h-7 border transition-transform"
                    style={{
                      background: c,
                      borderColor: active ? GOLD : 'rgba(255,255,255,0.15)',
                      transform: active ? 'scale(1.08)' : 'scale(1)',
                      boxShadow: active ? `0 0 0 2px ${GOLD}33` : 'none',
                    }}
                  />
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Dubai day/night control */}
        {demo === 'dubai' && (
          <motion.div
            key="time-panel"
            initial={reducedMotion ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: 16 }}
            transition={{ duration: 0.22 }}
            className="absolute right-3 top-14 w-[180px] border p-3 z-10"
            style={{
              background: 'rgba(8,8,12,0.92)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(201,169,110,0.4)',
              fontFamily: 'var(--font-mono)',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[9px] tracking-[0.3em] uppercase text-[#c9a96e]">◆ time</div>
              <div className="text-[9px] tabular-nums text-white/60">{formatTime(timeOfDay)}</div>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.005}
              value={timeOfDay}
              onChange={(e) => { setTimeOfDay(parseFloat(e.target.value)); setAutoCycle(false); }}
              aria-label="Time of day"
              className="w-full accent-[#c9a96e]"
              style={{ accentColor: GOLD }}
            />
            <div className="grid grid-cols-3 gap-1 mt-2">
              <button
                onClick={() => { setTimeOfDay(0.5); setAutoCycle(false); }}
                data-hover="true"
                aria-pressed={!autoCycle && timeOfDay === 0.5}
                className="h-7 text-[9px] tracking-[0.18em] uppercase border"
                style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.7)' }}
              >
                day
              </button>
              <button
                onClick={() => { setTimeOfDay(0.0); setAutoCycle(false); }}
                data-hover="true"
                aria-pressed={!autoCycle && timeOfDay === 0.0}
                className="h-7 text-[9px] tracking-[0.18em] uppercase border"
                style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.7)' }}
              >
                night
              </button>
              <button
                onClick={() => setAutoCycle((v) => !v)}
                data-hover="true"
                aria-pressed={autoCycle}
                className="h-7 text-[9px] tracking-[0.18em] uppercase border"
                style={{
                  borderColor: autoCycle ? GOLD : 'rgba(255,255,255,0.18)',
                  color: autoCycle ? GOLD : 'rgba(255,255,255,0.7)',
                  background: autoCycle ? 'rgba(201,169,110,0.08)' : 'transparent',
                }}
              >
                auto
              </button>
            </div>
          </motion.div>
        )}

        {/* Dubai tower info — moves below time panel when both visible */}
        {demo === 'dubai' && selected && (
          <motion.div
            key={selected.id}
            initial={reducedMotion ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: 16 }}
            transition={{ duration: 0.22 }}
            className="absolute right-3 bottom-12 w-[260px] border p-4 z-10"
            style={{
              background: 'rgba(8,8,12,0.92)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(201,169,110,0.4)',
              fontFamily: 'var(--font-mono)',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[9px] tracking-[0.3em] uppercase text-[#c9a96e]">◆ tower</div>
                <div className="text-white text-sm mt-1" style={{ fontFamily: 'var(--font-playfair)' }}>
                  {selected.name}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                data-hover="true"
                aria-label="Close tower info"
                className="text-white/50 hover:text-white text-xs leading-none w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <div className="text-white/35 uppercase tracking-[0.18em]">height</div>
                <div className="text-[#c9a96e] text-base mt-0.5 tabular-nums">
                  <CountUp to={selected.heightM} duration={1.1} />m
                </div>
              </div>
              <div>
                <div className="text-white/35 uppercase tracking-[0.18em]">floors</div>
                <div className="text-white text-base mt-0.5 tabular-nums">
                  <CountUp to={selected.floors} duration={0.9} />
                </div>
              </div>
              <div>
                <div className="text-white/35 uppercase tracking-[0.18em]">year</div>
                <div className="text-white text-base mt-0.5">{selected.year}</div>
              </div>
              <div>
                <div className="text-white/35 uppercase tracking-[0.18em]">area</div>
                <div className="text-white text-base mt-0.5">{selected.neighbourhood}</div>
              </div>
            </div>

            <p className="mt-3 text-[10px] text-white/65 leading-relaxed" style={{ fontFamily: 'var(--font-inter)' }}>
              {selected.notes}
            </p>

            <button
              onClick={() => playTone(freqForHeight(selected.heightM))}
              data-hover="true"
              aria-label={`Replay tone for ${selected.name}`}
              className="mt-3 w-full h-9 border text-[9px] tracking-[0.3em] uppercase"
              style={{ borderColor: 'rgba(201,169,110,0.5)', color: '#c9a96e' }}
            >
              ▶ replay tone
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatTime(t: number): string {
  // 0 = midnight, 0.5 = noon, 1 = midnight again
  const hours = Math.floor(t * 24);
  const minutes = Math.floor((t * 24 - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Inline CountUp — ease-out cubic from 0 to `to`. Remounts (via parent
 * `key`) restart the animation, so switching towers restarts the count.
 */
function CountUp({ to, duration = 1.0, decimals = 0 }: { to: number; duration?: number; decimals?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setV(to * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{v.toFixed(decimals)}</>;
}
