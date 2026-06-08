'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useScroll, useMotionValueEvent } from 'framer-motion';
import * as THREE from 'three';

// ─── Palette ────────────────────────────────────────────────────────────────

const GOLD = new THREE.Color('#1ba3b8');
const CYAN = new THREE.Color('#64dfdf');
const VIOLET = new THREE.Color('#b8a4e8');
const PINK = new THREE.Color('#ff7eb3');   // output signals
const GREEN = new THREE.Color('#7fd9a3');  // input signals
const WHITE = new THREE.Color('#ffffff');

// ─── Cognitive states ──────────────────────────────────────────────────────

interface CogState {
  id: string;
  color: THREE.Color;
  accent: THREE.Color;
  label: string;
  tempo: number; // multiplier for activity rate
  hue: string;   // CSS color for UI
}

const COG_STATES: CogState[] = [
  { id: 'SCANNING',   color: CYAN,   accent: GREEN,  label: 'Sensing patterns',     tempo: 1.0, hue: '#64dfdf' },
  { id: 'PROCESSING', color: VIOLET, accent: CYAN,   label: 'Computing inference',  tempo: 1.4, hue: '#b8a4e8' },
  { id: 'LEARNING',   color: GOLD,   accent: VIOLET, label: 'Strengthening memory', tempo: 0.85, hue: '#1ba3b8' },
  { id: 'DECIDING',   color: PINK,   accent: GOLD,   label: 'Forming decision',     tempo: 1.6, hue: '#ff7eb3' },
  { id: 'PREDICTING', color: GREEN,  accent: PINK,   label: 'Forecasting outcome',  tempo: 1.25, hue: '#7fd9a3' },
];

// ─── Signal labels (used in the streaming log) ──────────────────────────────

const SIGNAL_TYPES = [
  'PATTERN',  'MEMORY',   'PREDICT', 'DECIDE',
  'QUERY',    'RESPONSE', 'EMBED',   'RECALL',
  'INSIGHT',  'WEIGHT',   'ATTEND',  'GATE',
  'CONTEXT',  'TOKEN',    'SCORE',   'CHAIN',
];

// ─── Shared signal bus (R3F → React) ────────────────────────────────────────

interface SignalEvent {
  kind: 'in' | 'out' | 'sync';
  label: string;
  source: string;
  color: string;
}

interface SharedRefs {
  mouse: THREE.Vector2;
  stateIdx: number;
  events: SignalEvent[];
  metrics: { input: number; output: number; sync: number };
  selectedSat: number | null;
  scrollProgress: number; // 0 = section just entered viewport, 1 = section exiting
  satellitePositions: THREE.Vector3[]; // live positions of each satellite (length 6)
  satellitePulses: number[];           // 0..1 flash intensity per satellite (return signal arrived)
}

interface SatelliteMeta {
  name: string;
  role: string;
  feed: string;
  rate: string;
}

const SAT_META: SatelliteMeta[] = [
  { name: 'SENSOR',  role: 'Telemetry stream',  feed: 'IoT · Edge devices',     rate: '12 Hz' },
  { name: 'API',     role: 'REST gateway',      feed: 'Microservices',          rate: '4 Hz'  },
  { name: 'STREAM',  role: 'Kafka consumer',    feed: 'Event bus',              rate: '40 Hz' },
  { name: 'EVENT',   role: 'Webhook listener',  feed: 'Partner integrations',   rate: '2 Hz'  },
  { name: 'WEBHOOK', role: 'Power Automate',    feed: 'Workflow triggers',      rate: '6 Hz'  },
  { name: 'POLL',    role: 'Scheduler',         feed: 'Cron jobs · ERP sync',   rate: '0.5 Hz' },
];

// ─── helpers ────────────────────────────────────────────────────────────────

function pseudoNoise(x: number, y: number, z: number) {
  return (
    Math.sin(x * 2.1 + y * 1.7) * 0.5 +
    Math.sin(y * 3.3 + z * 1.4) * 0.3 +
    Math.sin(z * 2.7 + x * 2.2) * 0.2 +
    Math.sin(x * 5.6 + y * 4.3 + z * 3.1) * 0.12
  );
}

function makeLobeGeometry(side: 1 | -1) {
  const geo = new THREE.IcosahedronGeometry(1, 7);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.normalize();
    v.multiply(new THREE.Vector3(0.78, 0.92, 1.08));
    const n = 0.18 * pseudoNoise(v.x * 3, v.y * 3, v.z * 3)
            + 0.06 * pseudoNoise(v.x * 7, v.y * 7, v.z * 7);
    const innerDist = side === 1 ? Math.max(0, -v.x) : Math.max(0, v.x);
    const groove = innerDist > 0.85 ? -0.05 * (innerDist - 0.85) * 6 : 0;
    v.multiplyScalar(1 + n + groove);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function sampleNeurons(geo: THREE.BufferGeometry, count: number, xShift: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const out: THREE.Vector3[] = [];
  const seen = new Set<number>();
  while (out.length < count) {
    const i = Math.floor(Math.random() * pos.count);
    if (seen.has(i)) continue;
    seen.add(i);
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    v.x += xShift;
    const dir = v.clone().normalize();
    v.addScaledVector(dir, 0.012);
    out.push(v);
  }
  return out;
}

// ─── BrainHemispheres: the two glowing lobes ────────────────────────────────

function BrainHemispheres({ shared }: { shared: SharedRefs }) {
  const leftGeo = useMemo(() => makeLobeGeometry(1), []);
  const rightGeo = useMemo(() => makeLobeGeometry(-1), []);

  const leftMat = useRef<THREE.MeshStandardMaterial>(null!);
  const rightMat = useRef<THREE.MeshStandardMaterial>(null!);
  const goldWire = useRef<THREE.MeshBasicMaterial>(null!);
  const cyanWire = useRef<THREE.MeshBasicMaterial>(null!);

  useFrame((_, dt) => {
    const s = COG_STATES[shared.stateIdx];
    if (leftMat.current) {
      leftMat.current.emissive.lerp(s.color, 0.04);
      leftMat.current.emissiveIntensity = 0.35 + Math.sin(performance.now() * 0.0015) * 0.05;
    }
    if (rightMat.current) {
      rightMat.current.emissive.lerp(s.accent, 0.04);
      rightMat.current.emissiveIntensity = 0.35 + Math.sin(performance.now() * 0.0015 + 1) * 0.05;
    }
    if (goldWire.current) goldWire.current.color.lerp(s.color, 0.03);
    if (cyanWire.current) cyanWire.current.color.lerp(s.accent, 0.03);
  });

  return (
    <group>
      <mesh geometry={leftGeo} position={[-0.18, 0, 0]}>
        <meshStandardMaterial
          ref={leftMat}
          color="#15101e"
          emissive="#3a2a55"
          emissiveIntensity={0.35}
          metalness={0.4}
          roughness={0.5}
          transparent
          opacity={0.4}
        />
      </mesh>
      <mesh geometry={rightGeo} position={[0.18, 0, 0]}>
        <meshStandardMaterial
          ref={rightMat}
          color="#15101e"
          emissive="#2a3555"
          emissiveIntensity={0.35}
          metalness={0.4}
          roughness={0.5}
          transparent
          opacity={0.4}
        />
      </mesh>
      <mesh geometry={leftGeo} position={[-0.18, 0, 0]}>
        <meshBasicMaterial ref={goldWire} color="#1ba3b8" wireframe transparent opacity={0.08} />
      </mesh>
      <mesh geometry={rightGeo} position={[0.18, 0, 0]}>
        <meshBasicMaterial ref={cyanWire} color="#64dfdf" wireframe transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

// ─── FresnelShell: rim-glow halo around each lobe via custom shader ────────

const FRESNEL_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRESNEL_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uIntensity;
uniform float uPower;
uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  vec3 viewDir = normalize(vViewPosition);
  float rim = 1.0 - max(0.0, dot(normalize(vNormal), viewDir));
  float fresnel = pow(rim, uPower);
  // Subtle pulsing blend between primary and accent
  float mixT = 0.5 + 0.5 * sin(uTime * 0.8);
  vec3 col = mix(uColor, uAccent, mixT) * fresnel * uIntensity;
  gl_FragColor = vec4(col, fresnel);
}
`;

function FresnelShell({ shared, geometry, position }: {
  shared: SharedRefs;
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#1ba3b8') },
      uAccent: { value: new THREE.Color('#64dfdf') },
      uIntensity: { value: 1.8 },
      uPower: { value: 2.6 },
      uTime: { value: 0 },
    }),
    []
  );

  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
    const s = COG_STATES[shared.stateIdx];
    uniforms.uColor.value.lerp(s.color, 0.04);
    uniforms.uAccent.value.lerp(s.accent, 0.04);
    if (matRef.current) matRef.current.uniformsNeedUpdate = true;
  });

  return (
    <mesh geometry={geometry} position={position} scale={1.04}>
      <shaderMaterial
        ref={matRef}
        vertexShader={FRESNEL_VERTEX}
        fragmentShader={FRESNEL_FRAGMENT}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// ─── SurfaceNetwork: neurons + synapses + flashing + pulses ─────────────────

interface SurfaceData {
  neurons: THREE.Vector3[];
  edges: [number, number][];
}

function SurfaceNetwork({ shared, data }: { shared: SharedRefs; data: SurfaceData }) {
  const { neurons, edges } = data;
  const edgeCount = edges.length;

  // Hebbian weights — edges that fire often gain persistent glow
  const hebbWeights = useRef(new Float32Array(edgeCount));

  // Buffers
  const { np, nc, ep, ec } = useMemo(() => {
    const np = new Float32Array(neurons.length * 3);
    const nc = new Float32Array(neurons.length * 3);
    neurons.forEach((p, i) => {
      np[i * 3] = p.x; np[i * 3 + 1] = p.y; np[i * 3 + 2] = p.z;
      const c = i % 7 === 0 ? GOLD : i % 5 === 0 ? VIOLET : CYAN;
      nc[i * 3] = c.r; nc[i * 3 + 1] = c.g; nc[i * 3 + 2] = c.b;
    });
    const ep = new Float32Array(edgeCount * 6);
    const ec = new Float32Array(edgeCount * 6);
    edges.forEach(([a, b], i) => {
      const pa = neurons[a], pb = neurons[b];
      ep[i * 6] = pa.x; ep[i * 6 + 1] = pa.y; ep[i * 6 + 2] = pa.z;
      ep[i * 6 + 3] = pb.x; ep[i * 6 + 4] = pb.y; ep[i * 6 + 5] = pb.z;
      ec[i * 6] = 0.04; ec[i * 6 + 1] = 0.07; ec[i * 6 + 2] = 0.10;
      ec[i * 6 + 3] = 0.04; ec[i * 6 + 4] = 0.07; ec[i * 6 + 5] = 0.10;
    });
    return { np, nc, ep, ec };
  }, [neurons, edges, edgeCount]);

  const flashes = useRef<{ edge: number; t: number; color: THREE.Color }[]>([]);
  const synapseRef = useRef<THREE.LineSegments>(null!);
  const neuronRef = useRef<THREE.Points>(null!);

  // Pulse signals traveling on edges
  const PULSE_COUNT = 32;
  const pulses = useRef(
    Array.from({ length: PULSE_COUNT }, () => ({
      edge: Math.floor(Math.random() * edgeCount),
      t: Math.random(),
      speed: 0.005 + Math.random() * 0.012,
      color: Math.random() < 0.5 ? GOLD : CYAN,
    }))
  );
  const pulsePositions = useMemo(() => new Float32Array(PULSE_COUNT * 3), []);
  const pulseColors = useMemo(() => {
    const a = new Float32Array(PULSE_COUNT * 3);
    pulses.current.forEach((p, i) => {
      a[i * 3] = p.color.r; a[i * 3 + 1] = p.color.g; a[i * 3 + 2] = p.color.b;
    });
    return a;
  }, []);
  const pulseRef = useRef<THREE.Points>(null!);

  // Convert mouse to world-space "attention point" — neurons closest light up
  const attentionPoint = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const state = COG_STATES[shared.stateIdx];

    // Project mouse into roughly the sphere plane (z=0 cutting plane)
    attentionPoint.current.set(shared.mouse.x * 1.3, shared.mouse.y * 1.0, 0.4);

    // Spawn flashes (rate scales with state tempo)
    const flashesThisFrame = Math.floor(Math.random() * (3 * state.tempo) + 0.5);
    for (let f = 0; f < flashesThisFrame; f++) {
      let edgeIdx: number;
      // 35% chance to fire an edge near the mouse attention point
      if (Math.random() < 0.35) {
        let bestI = 0, bestD = Infinity;
        for (let tries = 0; tries < 8; tries++) {
          const idx = Math.floor(Math.random() * edgeCount);
          const [a] = edges[idx];
          const d = neurons[a].distanceToSquared(attentionPoint.current);
          if (d < bestD) { bestD = d; bestI = idx; }
        }
        edgeIdx = bestI;
      } else {
        edgeIdx = Math.floor(Math.random() * edgeCount);
      }
      const r = Math.random();
      const color = r < 0.45 ? state.color : r < 0.75 ? state.accent : Math.random() < 0.5 ? GOLD : CYAN;
      flashes.current.push({ edge: edgeIdx, t: 1, color });
      hebbWeights.current[edgeIdx] = Math.min(1, hebbWeights.current[edgeIdx] + 0.04);
    }

    // Reset edge colors (incorporating Hebbian baseline)
    if (synapseRef.current) {
      const colorAttr = synapseRef.current.geometry.attributes.color as THREE.BufferAttribute;
      const arr = colorAttr.array as Float32Array;
      for (let i = 0; i < edgeCount; i++) {
        const w = hebbWeights.current[i] * 0.5;
        // Decay Hebbian weight slowly
        hebbWeights.current[i] = Math.max(0, hebbWeights.current[i] - dt * 0.04);
        const base = 0.04 + w;
        const baseG = 0.07 + w * 0.7;
        const baseB = 0.10 + w * 0.6;
        const idx = i * 6;
        arr[idx] = base; arr[idx + 1] = baseG; arr[idx + 2] = baseB;
        arr[idx + 3] = base; arr[idx + 4] = baseG; arr[idx + 5] = baseB;
      }
      // Apply active flashes
      flashes.current = flashes.current.filter((f) => {
        f.t -= dt * 1.8;
        if (f.t <= 0) return false;
        const idx = f.edge * 6;
        const I = Math.min(1, f.t * 1.4);
        arr[idx] = f.color.r * I; arr[idx + 1] = f.color.g * I; arr[idx + 2] = f.color.b * I;
        arr[idx + 3] = f.color.r * I; arr[idx + 4] = f.color.g * I; arr[idx + 5] = f.color.b * I;
        return true;
      });
      colorAttr.needsUpdate = true;
    }

    // Pulses
    if (pulseRef.current) {
      const posAttr = pulseRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      pulses.current.forEach((p, i) => {
        p.t += p.speed * state.tempo;
        if (p.t >= 1) {
          p.t = 0;
          p.edge = Math.floor(Math.random() * edgeCount);
          // Color follows state with some randomness
          const r = Math.random();
          p.color = r < 0.4 ? state.color : r < 0.7 ? state.accent : (Math.random() < 0.5 ? GOLD : CYAN);
          pulseColors[i * 3] = p.color.r;
          pulseColors[i * 3 + 1] = p.color.g;
          pulseColors[i * 3 + 2] = p.color.b;
          // Occasional sync log
          if (Math.random() < 0.12) {
            shared.metrics.sync++;
            if (shared.events.length < 60) {
              shared.events.push({
                kind: 'sync',
                label: SIGNAL_TYPES[Math.floor(Math.random() * SIGNAL_TYPES.length)],
                source: `N${p.edge.toString().padStart(3, '0')}`,
                color: '#' + p.color.getHexString(),
              });
            }
          }
        }
        const [a, b] = edges[p.edge];
        const pa = neurons[a], pb = neurons[b];
        posArr[i * 3] = pa.x + (pb.x - pa.x) * p.t;
        posArr[i * 3 + 1] = pa.y + (pb.y - pa.y) * p.t;
        posArr[i * 3 + 2] = pa.z + (pb.z - pa.z) * p.t;
      });
      posAttr.needsUpdate = true;
      (pulseRef.current.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }

    // Neuron breathing
    if (neuronRef.current) {
      const m = neuronRef.current.material as THREE.PointsMaterial;
      m.size = 0.034 + Math.sin(performance.now() * 0.0018) * 0.008;
    }
  });

  return (
    <group>
      <points ref={neuronRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[np, 3]} count={neurons.length} />
          <bufferAttribute attach="attributes-color" args={[nc, 3]} count={neurons.length} />
        </bufferGeometry>
        <pointsMaterial size={0.034} vertexColors transparent opacity={0.95} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <lineSegments ref={synapseRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ep, 3]} count={edgeCount * 2} />
          <bufferAttribute attach="attributes-color" args={[ec, 3]} count={edgeCount * 2} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
      <points ref={pulseRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pulsePositions, 3]} count={PULSE_COUNT} />
          <bufferAttribute attach="attributes-color" args={[pulseColors, 3]} count={PULSE_COUNT} />
        </bufferGeometry>
        <pointsMaterial size={0.085} vertexColors transparent opacity={1} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

// ─── CrossHemisphereBridges: thick bezier beams between left and right ─────

function CrossBridges({ shared, leftNeurons, rightNeurons }: { shared: SharedRefs; leftNeurons: THREE.Vector3[]; rightNeurons: THREE.Vector3[] }) {
  // Pick 14 long-range pairs between left and right
  const SEGMENTS = 24;
  const { bridges, positions, colors } = useMemo(() => {
    const BRIDGE_COUNT = 14;
    const bridges: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
    for (let i = 0; i < BRIDGE_COUNT; i++) {
      const a = leftNeurons[Math.floor(Math.random() * leftNeurons.length)];
      const b = rightNeurons[Math.floor(Math.random() * rightNeurons.length)];
      bridges.push({ a, b });
    }
    // Sample each curve into SEGMENTS line segments
    const positions = new Float32Array(BRIDGE_COUNT * SEGMENTS * 2 * 3);
    const colors = new Float32Array(BRIDGE_COUNT * SEGMENTS * 2 * 3);
    bridges.forEach(({ a, b }, bi) => {
      // Control point: slightly forward and lifted, with random vertical offset
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.z += 0.15 + Math.random() * 0.1;
      mid.y += (Math.random() - 0.5) * 0.25;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const pts = curve.getPoints(SEGMENTS);
      for (let s = 0; s < SEGMENTS; s++) {
        const p0 = pts[s];
        const p1 = pts[s + 1];
        const base = (bi * SEGMENTS + s) * 6;
        positions[base + 0] = p0.x; positions[base + 1] = p0.y; positions[base + 2] = p0.z;
        positions[base + 3] = p1.x; positions[base + 4] = p1.y; positions[base + 5] = p1.z;
        colors[base + 0] = 0.05; colors[base + 1] = 0.04; colors[base + 2] = 0.03;
        colors[base + 3] = 0.05; colors[base + 4] = 0.04; colors[base + 5] = 0.03;
      }
    });
    return { bridges, positions, colors };
  }, [leftNeurons, rightNeurons]);

  const lineRef = useRef<THREE.LineSegments>(null!);
  // Each bridge has a "wave" — a moving bright segment progressing along it
  const wavePhase = useRef<number[]>(bridges.map(() => Math.random()));

  useFrame((_, dt) => {
    const state = COG_STATES[shared.stateIdx];
    if (!lineRef.current) return;
    const colorAttr = lineRef.current.geometry.attributes.color as THREE.BufferAttribute;
    const arr = colorAttr.array as Float32Array;
    bridges.forEach((_, bi) => {
      wavePhase.current[bi] += dt * 0.6 * state.tempo;
      if (wavePhase.current[bi] > 1.3) wavePhase.current[bi] = -0.3;
      const head = wavePhase.current[bi];
      // Pick color: alternate state color and gold for emphasis
      const baseColor = bi % 2 === 0 ? state.color : GOLD;
      for (let s = 0; s < SEGMENTS; s++) {
        const u = s / SEGMENTS;
        // Intensity peaks when u is near head
        const dist = Math.abs(u - head);
        const I = Math.max(0.05, Math.exp(-dist * 14));
        const idx = (bi * SEGMENTS + s) * 6;
        arr[idx] = baseColor.r * I; arr[idx + 1] = baseColor.g * I; arr[idx + 2] = baseColor.b * I;
        arr[idx + 3] = baseColor.r * I; arr[idx + 4] = baseColor.g * I; arr[idx + 5] = baseColor.b * I;
      }
    });
    colorAttr.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={bridges.length * SEGMENTS * 2} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={bridges.length * SEGMENTS * 2} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} linewidth={2} />
    </lineSegments>
  );
}

// ─── DeepNetwork: inner small sphere of neurons (the "deep layer") ─────────

function DeepNetwork({ shared }: { shared: SharedRefs }) {
  const groupRef = useRef<THREE.Group>(null!);
  const { positions, colors, count } = useMemo(() => {
    const COUNT = 90;
    const p = new Float32Array(COUNT * 3);
    const c = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // Inside the brain, radius ~0.55, ellipsoid
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 0.45 + Math.random() * 0.18;
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 0.82;
      p[i * 3 + 1] = r * Math.cos(phi) * 0.92;
      p[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) * 1.05;
      const col = i % 3 === 0 ? VIOLET : GOLD;
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    return { positions: p, colors: c, count: COUNT };
  }, []);
  const matRef = useRef<THREE.PointsMaterial>(null!);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y -= dt * 0.25;
    if (matRef.current) {
      const t = performance.now() * 0.002;
      matRef.current.size = 0.04 + Math.sin(t * COG_STATES[shared.stateIdx].tempo) * 0.012;
      matRef.current.opacity = 0.7 + Math.sin(t * 1.4) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} count={count} />
        </bufferGeometry>
        <pointsMaterial ref={matRef} size={0.04} vertexColors transparent opacity={0.7} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

// ─── CognitiveCore: rotating crystalline core ──────────────────────────────

function CognitiveCore({ shared }: { shared: SharedRefs }) {
  const ref = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.x += dt * 0.5;
      ref.current.rotation.y += dt * 0.3;
    }
    if (matRef.current) {
      const state = COG_STATES[shared.stateIdx];
      matRef.current.color.lerp(state.color, 0.05);
      matRef.current.opacity = 0.55 + Math.sin(performance.now() * 0.003 * state.tempo) * 0.2;
    }
  });
  return (
    <group>
      {/* Soft halo */}
      <mesh>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshBasicMaterial color="#1ba3b8" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshBasicMaterial color="#ffd58a" transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Crystalline core */}
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.18, 0]} />
        <meshBasicMaterial ref={matRef} color="#1ba3b8" wireframe transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── InputSatellites: orbs that orbit and fire signals INTO the brain ──────

interface Satellite {
  angle: number;
  radius: number;
  yOff: number;
  speed: number;
  fireCooldown: number;
  label: string;
}

function InputSatellites({
  shared,
  surfaceNeurons,
  onSelect,
}: {
  shared: SharedRefs;
  surfaceNeurons: THREE.Vector3[];
  onSelect: (i: number | null) => void;
}) {
  const SAT_COUNT = 6;
  const TRAIL_LEN = 16;

  // Satellite state (orbit)
  const satellites = useRef<Satellite[]>(
    Array.from({ length: SAT_COUNT }, (_, i) => ({
      angle: (i / SAT_COUNT) * Math.PI * 2,
      radius: 2.8 + Math.random() * 0.5,
      yOff: (Math.random() - 0.5) * 1.0,
      speed: 0.25 + Math.random() * 0.2,
      fireCooldown: 0.5 + Math.random() * 2,
      label: SAT_META[i % SAT_META.length].name,
    }))
  );

  // Mesh refs per satellite (for live position updates + visual highlight)
  const meshRefs = useRef<(THREE.Mesh | null)[]>(Array(SAT_COUNT).fill(null));
  const haloRefs = useRef<(THREE.Mesh | null)[]>(Array(SAT_COUNT).fill(null));

  // Active in-flight signals
  interface InFlight {
    from: THREE.Vector3;
    to: THREE.Vector3;
    t: number;
    speed: number;
    color: THREE.Color;
    label: string;
    source: string;
    logged: boolean;
    trail: THREE.Vector3[];
  }
  const signals = useRef<InFlight[]>([]);

  // Signal positions buffer (head only; trails drawn separately)
  const MAX_SIGNALS = 30;
  const signalPositions = useMemo(() => new Float32Array(MAX_SIGNALS * 3), []);
  const signalColors = useMemo(() => new Float32Array(MAX_SIGNALS * 3), []);
  const signalSizes = useMemo(() => new Float32Array(MAX_SIGNALS), []);
  const signalRef = useRef<THREE.Points>(null!);

  // Trail line segments
  const trailPositions = useMemo(() => new Float32Array(MAX_SIGNALS * TRAIL_LEN * 2 * 3), []);
  const trailColors = useMemo(() => new Float32Array(MAX_SIGNALS * TRAIL_LEN * 2 * 3), []);
  const trailRef = useRef<THREE.LineSegments>(null!);

  // Connection ring (faint line tracing each satellite's orbit)
  const orbitGeo = useMemo(() => {
    const segs = 96;
    const positions = new Float32Array(segs * 3);
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      positions[i * 3] = Math.cos(a);
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(a);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    const state = COG_STATES[shared.stateIdx];

    // Update satellites
    satellites.current.forEach((sat, i) => {
      const isSelected = shared.selectedSat === i;
      sat.angle += dt * sat.speed * state.tempo * 0.8;
      const x = Math.cos(sat.angle) * sat.radius;
      const z = Math.sin(sat.angle) * sat.radius * 0.6;
      const y = sat.yOff + Math.sin(performance.now() * 0.001 + i) * 0.1;

      // Publish live position for OutputBeams to target
      shared.satellitePositions[i].set(x, y, z);

      // Read return-trip pulse (set by OutputBeams when a response beam arrives)
      const pulseRaw = shared.satellitePulses[i];
      shared.satellitePulses[i] = Math.max(0, pulseRaw - dt * 1.6); // decay
      const flash = pulseRaw; // 0..1

      // Drive mesh & halo positions
      const mesh = meshRefs.current[i];
      const halo = haloRefs.current[i];
      if (mesh) {
        mesh.position.set(x, y, z);
        const selScale = isSelected ? 1.7 + Math.sin(performance.now() * 0.006) * 0.15 : 1;
        const flashScale = 1 + flash * 0.8;
        mesh.scale.setScalar(selScale * flashScale);
        // Recolor briefly toward gold during flash
        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (flash > 0.05) {
          mat.color.copy(GREEN).lerp(GOLD, Math.min(1, flash * 1.4));
        } else {
          mat.color.lerp(GREEN, 0.2);
        }
      }
      if (halo) {
        halo.position.set(x, y, z);
        const baseS = isSelected ? 3.4 : 2.1;
        const pulse = Math.sin(performance.now() * 0.003 + i) * 0.2;
        halo.scale.setScalar((baseS + pulse) * (1 + flash * 1.2));
      }

      // Selected satellites fire much faster; dim ones fire slower
      const rateMul = isSelected ? 3.5 : (shared.selectedSat !== null ? 0.4 : 1.0);
      sat.fireCooldown -= dt * state.tempo * rateMul;
      if (sat.fireCooldown <= 0 && signals.current.length < MAX_SIGNALS) {
        sat.fireCooldown = (isSelected ? 0.35 : 1.5) + Math.random() * (isSelected ? 0.4 : 2.5);
        const target = surfaceNeurons[Math.floor(Math.random() * surfaceNeurons.length)];
        signals.current.push({
          from: new THREE.Vector3(x, y, z),
          to: target.clone(),
          t: 0,
          speed: 0.012 + Math.random() * 0.018,
          color: isSelected ? GOLD.clone() : GREEN.clone(),
          label: SIGNAL_TYPES[Math.floor(Math.random() * SIGNAL_TYPES.length)],
          source: sat.label,
          logged: false,
          trail: [],
        });
      }
    });

    // Advance signals
    if (signalRef.current && trailRef.current) {
      const posAttr = signalRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const colAttr = signalRef.current.geometry.attributes.color as THREE.BufferAttribute;
      const sizeAttr = signalRef.current.geometry.attributes.size as THREE.BufferAttribute | undefined;
      const tPosAttr = trailRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const tColAttr = trailRef.current.geometry.attributes.color as THREE.BufferAttribute;

      // Clear position buffers (move signals off-screen if inactive)
      for (let i = 0; i < MAX_SIGNALS; i++) {
        signalPositions[i * 3] = 0;
        signalPositions[i * 3 + 1] = 1000; // off-screen
        signalPositions[i * 3 + 2] = 0;
      }
      // Clear trails
      trailPositions.fill(0);
      trailColors.fill(0);

      signals.current.forEach((sig, i) => {
        if (i >= MAX_SIGNALS) return;
        sig.t += sig.speed;
        const x = sig.from.x + (sig.to.x - sig.from.x) * sig.t;
        const y = sig.from.y + (sig.to.y - sig.from.y) * sig.t;
        const z = sig.from.z + (sig.to.z - sig.from.z) * sig.t;
        // Slight arc — push toward center on the way
        const arc = Math.sin(sig.t * Math.PI) * 0.18;
        const dir = new THREE.Vector3(-sig.from.x, 0, -sig.from.z).normalize();
        const px = x + dir.x * arc;
        const pz = z + dir.z * arc;
        signalPositions[i * 3] = px;
        signalPositions[i * 3 + 1] = y;
        signalPositions[i * 3 + 2] = pz;
        signalColors[i * 3] = sig.color.r;
        signalColors[i * 3 + 1] = sig.color.g;
        signalColors[i * 3 + 2] = sig.color.b;

        // Add to trail
        sig.trail.push(new THREE.Vector3(px, y, pz));
        if (sig.trail.length > TRAIL_LEN) sig.trail.shift();

        // Render trail as line segments
        for (let s = 0; s < sig.trail.length - 1; s++) {
          const idx = (i * TRAIL_LEN + s) * 6;
          tPosAttr.array[idx] = sig.trail[s].x;
          tPosAttr.array[idx + 1] = sig.trail[s].y;
          tPosAttr.array[idx + 2] = sig.trail[s].z;
          tPosAttr.array[idx + 3] = sig.trail[s + 1].x;
          tPosAttr.array[idx + 4] = sig.trail[s + 1].y;
          tPosAttr.array[idx + 5] = sig.trail[s + 1].z;
          const fade = (s + 1) / sig.trail.length;
          tColAttr.array[idx] = sig.color.r * fade;
          tColAttr.array[idx + 1] = sig.color.g * fade;
          tColAttr.array[idx + 2] = sig.color.b * fade;
          tColAttr.array[idx + 3] = sig.color.r * fade;
          tColAttr.array[idx + 4] = sig.color.g * fade;
          tColAttr.array[idx + 5] = sig.color.b * fade;
        }

        // Log on arrival
        if (!sig.logged && sig.t > 0.85) {
          sig.logged = true;
          shared.metrics.input++;
          if (shared.events.length < 60) {
            shared.events.push({
              kind: 'in',
              label: sig.label,
              source: sig.source,
              color: '#7fd9a3',
            });
          }
        }
      });

      // Remove arrived signals
      signals.current = signals.current.filter((s) => s.t < 1);

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      if (sizeAttr) sizeAttr.needsUpdate = true;
      tPosAttr.needsUpdate = true;
      tColAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Faint orbit ring */}
      <lineLoop>
        <bufferGeometry attach="geometry" {...orbitGeo} />
        <lineBasicMaterial color="#7fd9a3" transparent opacity={0.08} />
      </lineLoop>

      {/* Satellite orbs — clickable */}
      {Array.from({ length: SAT_COUNT }, (_, i) => (
        <group key={i}>
          {/* Halo glow (background) */}
          <mesh
            ref={(el) => { haloRefs.current[i] = el; }}
            renderOrder={0}
          >
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial
              color="#7fd9a3"
              transparent
              opacity={0.18}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {/* Solid orb (clickable) */}
          <mesh
            ref={(el) => { meshRefs.current[i] = el; }}
            renderOrder={1}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(shared.selectedSat === i ? null : i);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = '';
            }}
          >
            <sphereGeometry args={[0.06, 20, 20]} />
            <meshBasicMaterial color="#7fd9a3" />
          </mesh>
        </group>
      ))}

      {/* In-flight signal heads */}
      <points ref={signalRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[signalPositions, 3]} count={MAX_SIGNALS} />
          <bufferAttribute attach="attributes-color" args={[signalColors, 3]} count={MAX_SIGNALS} />
        </bufferGeometry>
        <pointsMaterial size={0.085} vertexColors transparent opacity={1} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>

      {/* Signal trails */}
      <lineSegments ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trailPositions, 3]} count={MAX_SIGNALS * TRAIL_LEN * 2} />
          <bufferAttribute attach="attributes-color" args={[trailColors, 3]} count={MAX_SIGNALS * TRAIL_LEN * 2} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

// ─── OutputBeams: signals leaving the brain ────────────────────────────────

function OutputBeams({ shared, surfaceNeurons }: { shared: SharedRefs; surfaceNeurons: THREE.Vector3[] }) {
  const TRAIL_LEN = 18;
  const MAX_BEAMS = 24;
  interface Beam {
    from: THREE.Vector3;
    direction: THREE.Vector3;
    t: number;
    speed: number;
    label: string;
    logged: boolean;
    trail: THREE.Vector3[];
    targetSat: number | null; // if set, beam homes in on this satellite
    hit: boolean;
  }
  const beams = useRef<Beam[]>([]);
  const cooldown = useRef(0);

  const headPos = useMemo(() => new Float32Array(MAX_BEAMS * 3), []);
  const headColor = useMemo(() => {
    const a = new Float32Array(MAX_BEAMS * 3);
    for (let i = 0; i < MAX_BEAMS; i++) {
      a[i * 3] = PINK.r; a[i * 3 + 1] = PINK.g; a[i * 3 + 2] = PINK.b;
    }
    return a;
  }, []);
  const headRef = useRef<THREE.Points>(null!);

  const trailPos = useMemo(() => new Float32Array(MAX_BEAMS * TRAIL_LEN * 2 * 3), []);
  const trailCol = useMemo(() => new Float32Array(MAX_BEAMS * TRAIL_LEN * 2 * 3), []);
  const trailRef = useRef<THREE.LineSegments>(null!);

  useFrame((_, dt) => {
    const state = COG_STATES[shared.stateIdx];
    cooldown.current -= dt;
    if (cooldown.current <= 0 && beams.current.length < MAX_BEAMS) {
      cooldown.current = 0.4 / state.tempo + Math.random() * 0.6;
      const origin = surfaceNeurons[Math.floor(Math.random() * surfaceNeurons.length)].clone();
      // 40% chance this is a "response" beam targeting a specific satellite
      let targetSat: number | null = null;
      let direction: THREE.Vector3;
      if (Math.random() < 0.4) {
        targetSat = Math.floor(Math.random() * shared.satellitePositions.length);
        // Prefer the selected satellite if any
        if (shared.selectedSat !== null && Math.random() < 0.65) targetSat = shared.selectedSat;
        direction = shared.satellitePositions[targetSat].clone().sub(origin).normalize();
      } else {
        direction = origin.clone().normalize().add(
          new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5)
        ).normalize();
      }
      beams.current.push({
        from: origin,
        direction,
        t: 0,
        speed: 0.013 + Math.random() * 0.02,
        label: SIGNAL_TYPES[Math.floor(Math.random() * SIGNAL_TYPES.length)],
        logged: false,
        trail: [],
        targetSat,
        hit: false,
      });
    }

    if (headRef.current && trailRef.current) {
      const headPosAttr = headRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const tPosAttr = trailRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const tColAttr = trailRef.current.geometry.attributes.color as THREE.BufferAttribute;

      for (let i = 0; i < MAX_BEAMS; i++) {
        headPos[i * 3] = 0; headPos[i * 3 + 1] = 1000; headPos[i * 3 + 2] = 0;
      }
      trailPos.fill(0);
      trailCol.fill(0);

      beams.current.forEach((b, i) => {
        if (i >= MAX_BEAMS) return;
        b.t += b.speed;
        // If homing on a satellite, continuously update direction toward its current position
        if (b.targetSat !== null && !b.hit) {
          const tgt = shared.satellitePositions[b.targetSat];
          const desired = tgt.clone().sub(b.from).normalize();
          // Smooth blend toward desired direction (gives a slight curving trail)
          b.direction.lerp(desired, 0.18).normalize();
        }
        const dist = b.t * 4.5;
        const px = b.from.x + b.direction.x * dist;
        const py = b.from.y + b.direction.y * dist;
        const pz = b.from.z + b.direction.z * dist;
        // Hit-test against target satellite
        if (b.targetSat !== null && !b.hit) {
          const tgt = shared.satellitePositions[b.targetSat];
          const dx = px - tgt.x, dy = py - tgt.y, dz = pz - tgt.z;
          if (dx * dx + dy * dy + dz * dz < 0.04) {
            b.hit = true;
            shared.satellitePulses[b.targetSat] = 1;
            if (shared.events.length < 60) {
              shared.events.push({
                kind: 'out',
                label: 'RESPONSE',
                source: `→ ${SAT_META[b.targetSat].name}`,
                color: '#1ba3b8',
              });
            }
          }
        }
        headPos[i * 3] = px;
        headPos[i * 3 + 1] = py;
        headPos[i * 3 + 2] = pz;
        b.trail.push(new THREE.Vector3(px, py, pz));
        if (b.trail.length > TRAIL_LEN) b.trail.shift();
        for (let s = 0; s < b.trail.length - 1; s++) {
          const idx = (i * TRAIL_LEN + s) * 6;
          tPosAttr.array[idx] = b.trail[s].x;
          tPosAttr.array[idx + 1] = b.trail[s].y;
          tPosAttr.array[idx + 2] = b.trail[s].z;
          tPosAttr.array[idx + 3] = b.trail[s + 1].x;
          tPosAttr.array[idx + 4] = b.trail[s + 1].y;
          tPosAttr.array[idx + 5] = b.trail[s + 1].z;
          const fade = (s + 1) / b.trail.length;
          tColAttr.array[idx] = PINK.r * fade;
          tColAttr.array[idx + 1] = PINK.g * fade;
          tColAttr.array[idx + 2] = PINK.b * fade;
          tColAttr.array[idx + 3] = PINK.r * fade;
          tColAttr.array[idx + 4] = PINK.g * fade;
          tColAttr.array[idx + 5] = PINK.b * fade;
        }
        if (!b.logged && b.t > 0.3) {
          b.logged = true;
          shared.metrics.output++;
          if (shared.events.length < 60) {
            shared.events.push({
              kind: 'out',
              label: b.label,
              source: 'CORTEX',
              color: '#ff7eb3',
            });
          }
        }
      });
      beams.current = beams.current.filter((b) => b.t < 1 && !b.hit);

      headPosAttr.needsUpdate = true;
      tPosAttr.needsUpdate = true;
      tColAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      <points ref={headRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[headPos, 3]} count={MAX_BEAMS} />
          <bufferAttribute attach="attributes-color" args={[headColor, 3]} count={MAX_BEAMS} />
        </bufferGeometry>
        <pointsMaterial size={0.08} vertexColors transparent opacity={1} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <lineSegments ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trailPos, 3]} count={MAX_BEAMS * TRAIL_LEN * 2} />
          <bufferAttribute attach="attributes-color" args={[trailCol, 3]} count={MAX_BEAMS * TRAIL_LEN * 2} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

// ─── OrbitRings + AmbientSparkles ──────────────────────────────────────────

function OrbitRings() {
  const r1 = useRef<THREE.Mesh>(null!);
  const r2 = useRef<THREE.Mesh>(null!);
  const r3 = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => {
    if (r1.current) r1.current.rotation.z += dt * 0.12;
    if (r2.current) { r2.current.rotation.x += dt * 0.08; r2.current.rotation.y -= dt * 0.05; }
    if (r3.current) r3.current.rotation.y += dt * 0.06;
  });
  return (
    <group>
      <mesh ref={r1} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[2.1, 0.004, 8, 128]} />
        <meshBasicMaterial color="#1ba3b8" transparent opacity={0.35} />
      </mesh>
      <mesh ref={r2} rotation={[0, 0, Math.PI / 3]}>
        <torusGeometry args={[2.35, 0.003, 8, 128]} />
        <meshBasicMaterial color="#64dfdf" transparent opacity={0.25} />
      </mesh>
      <mesh ref={r3} rotation={[Math.PI / 1.8, Math.PI / 4, 0]}>
        <torusGeometry args={[2.6, 0.002, 8, 128]} />
        <meshBasicMaterial color="#b8a4e8" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function AmbientSparkles() {
  const ref = useRef<THREE.Points>(null!);
  const COUNT = 420;
  const { positions, colors } = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    const c = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = 3.2 + Math.random() * 2.3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.cos(phi);
      p[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const col = i % 4 === 0 ? GOLD : i % 3 === 0 ? PINK : CYAN;
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    return { positions: p, colors: c };
  }, []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.02;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={COUNT} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={COUNT} />
      </bufferGeometry>
      <pointsMaterial size={0.016} vertexColors transparent opacity={0.6} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

// ─── CameraDolly: scroll-driven camera Z lerp ──────────────────────────────

function CameraDolly({ shared }: { shared: SharedRefs }) {
  const { camera } = useThree();
  // Dolly from 5.4 (section just entered) to 1.7 (deep dive at section exit)
  useFrame(() => {
    const p = Math.max(0, Math.min(1, shared.scrollProgress));
    const eased = p * p * (3 - 2 * p); // smoothstep
    const targetZ = 5.4 - eased * 3.7;
    camera.position.z += (targetZ - camera.position.z) * 0.08;
    // Subtle FOV pull-in as we dive
    if ('fov' in camera) {
      const cam = camera as THREE.PerspectiveCamera;
      const targetFov = 38 - eased * 6;
      cam.fov += (targetFov - cam.fov) * 0.08;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

// ─── Top-level brain container with mouse tracking & rotation ──────────────

function BrainScene({ shared, onSelectSat }: { shared: SharedRefs; onSelectSat: (i: number | null) => void }) {
  const groupRef = useRef<THREE.Group>(null!);
  const { mouse } = useThree();

  // Build all surface neurons + edges once
  const { leftGeo, rightGeo, leftNeurons, rightNeurons, surfaceNeurons, surfaceData } = useMemo(() => {
    const leftGeo = makeLobeGeometry(1);
    const rightGeo = makeLobeGeometry(-1);
    const ln = sampleNeurons(leftGeo, 250, -0.18);
    const rn = sampleNeurons(rightGeo, 250, 0.18);
    const all = [...ln, ...rn];

    // Local connections only (each neuron to 3-5 nearest neighbors)
    const pairs: [number, number][] = [];
    const seen = new Set<string>();
    for (let i = 0; i < all.length; i++) {
      const ds: { j: number; d: number }[] = [];
      for (let j = 0; j < all.length; j++) {
        if (i === j) continue;
        ds.push({ j, d: all[i].distanceToSquared(all[j]) });
      }
      ds.sort((a, b) => a.d - b.d);
      const k = 3 + Math.floor(Math.random() * 3);
      for (let m = 0; m < k; m++) {
        const j = ds[m].j;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push([i, j]);
      }
    }
    return {
      leftGeo,
      rightGeo,
      leftNeurons: ln,
      rightNeurons: rn,
      surfaceNeurons: all,
      surfaceData: { neurons: all, edges: pairs },
    };
  }, []);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    shared.mouse.set(mouse.x, mouse.y);
    groupRef.current.rotation.y += dt * 0.14;
    const targetX = mouse.y * 0.22;
    const targetZ = -mouse.x * 0.18;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.05;
    groupRef.current.rotation.z += (targetZ - groupRef.current.rotation.z) * 0.05;
  });

  return (
    <group ref={groupRef}>
      <BrainHemispheres shared={shared} />
      <FresnelShell shared={shared} geometry={leftGeo} position={[-0.18, 0, 0]} />
      <FresnelShell shared={shared} geometry={rightGeo} position={[0.18, 0, 0]} />
      <SurfaceNetwork shared={shared} data={surfaceData} />
      <CrossBridges shared={shared} leftNeurons={leftNeurons} rightNeurons={rightNeurons} />
      <DeepNetwork shared={shared} />
      <CognitiveCore shared={shared} />
      <InputSatellites shared={shared} surfaceNeurons={surfaceNeurons} onSelect={onSelectSat} />
      <OutputBeams shared={shared} surfaceNeurons={surfaceNeurons} />
      <OrbitRings />
      <AmbientSparkles />
    </group>
  );
}

// ─── Public component ──────────────────────────────────────────────────────

interface LogLine {
  id: number;
  kind: 'in' | 'out' | 'sync';
  label: string;
  source: string;
  color: string;
}

export default function NeuralBrain() {
  const sharedRef = useRef<SharedRefs>({
    mouse: new THREE.Vector2(),
    stateIdx: 0,
    events: [],
    metrics: { input: 0, output: 0, sync: 0 },
    selectedSat: null,
    scrollProgress: 0,
    satellitePositions: Array.from({ length: 6 }, () => new THREE.Vector3()),
    satellitePulses: Array(6).fill(0),
  });

  const [stateIdx, setStateIdx] = useState(0);
  const [log, setLog] = useState<LogLine[]>([]);
  const [metrics, setMetrics] = useState({ input: 0, output: 0, sync: 0 });
  const [visible, setVisible] = useState(false);
  const [selectedSat, setSelectedSat] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const logIdRef = useRef(0);

  // Scroll-driven camera dolly
  const { scrollYProgress } = useScroll({
    target: sectionRef as React.RefObject<HTMLElement>,
    offset: ['start end', 'end start'],
  });
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    // Map [0, 1] (section entering → exiting) into a 0..1 "dive" curve:
    // 0–0.25: still entering, no zoom yet
    // 0.25–0.75: zoom from 0 to 1
    // 0.75–1: stay at max
    const eased = Math.max(0, Math.min(1, (v - 0.25) / 0.5));
    sharedRef.current.scrollProgress = eased;
  });

  const handleSelectSat = (i: number | null) => {
    sharedRef.current.selectedSat = i;
    setSelectedSat(i);
  };

  // ESC clears satellite selection
  useEffect(() => {
    if (selectedSat === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleSelectSat(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSat]);

  // Pause R3F rendering when the section is off-screen (saves GPU; prevents WebGL context-lost)
  useEffect(() => {
    if (!sectionRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 }
    );
    obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  // Cycle through cognitive states every 5.5s — paused while a satellite is selected
  useEffect(() => {
    if (selectedSat !== null) return; // hold current state for focused study
    const id = setInterval(() => {
      setStateIdx((i) => {
        const next = (i + 1) % COG_STATES.length;
        sharedRef.current.stateIdx = next;
        return next;
      });
    }, 5500);
    return () => clearInterval(id);
  }, [selectedSat]);

  // Drain event buffer → log + metrics
  useEffect(() => {
    const id = setInterval(() => {
      const evs = sharedRef.current.events;
      if (evs.length > 0) {
        const newLines: LogLine[] = evs.splice(0, evs.length).map((e) => ({
          id: logIdRef.current++,
          ...e,
        }));
        setLog((prev) => [...newLines.reverse(), ...prev].slice(0, 9));
      }
      const m = sharedRef.current.metrics;
      setMetrics({ input: m.input, output: m.output, sync: m.sync });
    }, 250);
    return () => clearInterval(id);
  }, []);

  const current = COG_STATES[stateIdx];

  return (
    <section
      id="brain"
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at center, #14101c 0%, #07060c 60%, #05040a 100%)',
      }}
    >
      {/* Top heading */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none">
        <p
          className="text-[#1ba3b8] text-[11px] tracking-[0.6em] uppercase mb-3"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          The Mind Behind the Machine
        </p>
        <h2
          className="text-4xl md:text-6xl font-black leading-none"
          style={{
            fontFamily: 'var(--font-inter)',
            background: 'linear-gradient(180deg, #ffffff 0%, #1ba3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Neural<span className="text-[#64dfdf]">.</span>Network
        </h2>
        <p
          className="text-white/40 text-xs tracking-[0.4em] uppercase mt-3"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          Where logic meets intuition
        </p>
      </div>

      {/* Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0.25, 4.6], fov: 38 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
          frameloop={visible ? 'always' : 'demand'}
        >
          <ambientLight intensity={0.45} />
          <pointLight position={[3, 2, 4]} intensity={1.4} color="#1ba3b8" />
          <pointLight position={[-3, -1, 2]} intensity={1.1} color="#64dfdf" />
          <pointLight position={[0, 3, -2]} intensity={0.6} color="#b8a4e8" />
          <BrainScene shared={sharedRef.current} onSelectSat={handleSelectSat} />
          <CameraDolly shared={sharedRef.current} />
        </Canvas>
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 38%, rgba(5,4,10,0.65) 80%, rgba(5,4,10,0.95) 100%)',
        }}
      />

      {/* State indicator (top-left) */}
      <div
        className="absolute top-8 left-8 z-10 pointer-events-none"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: current.hue,
              boxShadow: `0 0 12px ${current.hue}`,
              animation: selectedSat === null ? undefined : 'none',
            }}
          />
          <p className="text-[9px] tracking-[0.45em] uppercase text-white/40">
            Cognitive State{selectedSat !== null && <span className="text-[#ff7eb3] ml-2">· LOCKED</span>}
          </p>
        </div>
        <p
          className="text-2xl font-black transition-colors duration-1000"
          style={{
            color: current.hue,
            textShadow: `0 0 18px ${current.hue}66`,
            fontFamily: 'var(--font-inter)',
          }}
        >
          {current.id}
        </p>
        <p className="text-white/45 text-[10px] tracking-[0.2em] uppercase mt-1">
          {current.label}
        </p>
        {/* Tempo bar */}
        <div className="w-32 h-[2px] bg-white/8 mt-3 relative overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full transition-all duration-700"
            style={{
              width: `${Math.min(100, current.tempo * 60)}%`,
              background: `linear-gradient(90deg, ${current.hue}, #ffffff)`,
              boxShadow: `0 0 8px ${current.hue}`,
            }}
          />
        </div>
        <p className="text-white/30 text-[8px] tracking-[0.3em] uppercase mt-1">
          Tempo · {current.tempo.toFixed(2)}x
        </p>
      </div>

      {/* Metrics panel (top-right) */}
      <div
        className="absolute top-8 right-8 z-10 pointer-events-none text-right"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <p className="text-[9px] tracking-[0.45em] uppercase text-white/40 mb-3">Signal Flow</p>
        <div className="space-y-2">
          <div className="flex items-center justify-end gap-3">
            <span className="text-white/35 text-[9px] tracking-[0.25em] uppercase">Input</span>
            <span className="text-[#7fd9a3] text-lg font-black tabular-nums" style={{ fontFamily: 'var(--font-inter)', textShadow: '0 0 10px rgba(127,217,163,0.5)' }}>
              {metrics.input.toString().padStart(4, '0')}
            </span>
            <div className="w-2 h-2 rounded-full bg-[#7fd9a3]" style={{ boxShadow: '0 0 8px #7fd9a3' }} />
          </div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-white/35 text-[9px] tracking-[0.25em] uppercase">Output</span>
            <span className="text-[#ff7eb3] text-lg font-black tabular-nums" style={{ fontFamily: 'var(--font-inter)', textShadow: '0 0 10px rgba(255,126,179,0.5)' }}>
              {metrics.output.toString().padStart(4, '0')}
            </span>
            <div className="w-2 h-2 rounded-full bg-[#ff7eb3]" style={{ boxShadow: '0 0 8px #ff7eb3' }} />
          </div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-white/35 text-[9px] tracking-[0.25em] uppercase">Sync</span>
            <span className="text-[#64dfdf] text-lg font-black tabular-nums" style={{ fontFamily: 'var(--font-inter)', textShadow: '0 0 10px rgba(100,223,223,0.5)' }}>
              {metrics.sync.toString().padStart(4, '0')}
            </span>
            <div className="w-2 h-2 rounded-full bg-[#64dfdf]" style={{ boxShadow: '0 0 8px #64dfdf' }} />
          </div>
        </div>
      </div>

      {/* Signal log (bottom-left) */}
      <div
        className="absolute bottom-12 left-8 z-10 pointer-events-none space-y-1"
        style={{ fontFamily: 'var(--font-mono)', maxWidth: '340px' }}
      >
        <p className="text-[9px] tracking-[0.45em] uppercase text-white/40 mb-2">Live Signals</p>
        {log.length === 0 ? (
          <p className="text-white/20 text-[8.5px] tracking-widest uppercase">awaiting transmission…</p>
        ) : (
          log.map((line, i) => {
            const arrow = line.kind === 'in' ? '→' : line.kind === 'out' ? '↗' : '·';
            return (
              <p
                key={line.id}
                className="text-[8.5px] tracking-wide"
                style={{ color: line.color, opacity: Math.max(0.12, 1 - i * 0.12) }}
              >
                <span className="opacity-60">{arrow}</span>{' '}
                <span className="opacity-70">{line.source}</span>{' '}
                <span className="font-bold">{line.label}</span>
              </p>
            );
          })
        )}
      </div>

      {/* Legend (bottom-right) */}
      <div
        className="absolute bottom-12 right-8 z-10 pointer-events-none space-y-1.5"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <p className="text-[9px] tracking-[0.45em] uppercase text-white/40 mb-2 text-right">Channels</p>
        {[
          ['#7fd9a3', 'Input · External feeds'],
          ['#ff7eb3', 'Output · Decisions'],
          ['#1ba3b8', 'Memory · Hebbian'],
          ['#64dfdf', 'Synapse · Sync'],
          ['#b8a4e8', 'Deep · Inference'],
        ].map(([col, l]) => (
          <div key={l} className="flex items-center justify-end gap-2">
            <p className="text-[8.5px] tracking-[0.18em] text-white/50">{l}</p>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: col, boxShadow: `0 0 6px ${col}` }} />
          </div>
        ))}
      </div>

      {/* Satellite detail panel — appears when a satellite is selected */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-500"
        style={{
          bottom: selectedSat !== null ? '110px' : '70px',
          opacity: selectedSat !== null ? 1 : 0,
          transform: `translateX(-50%) translateY(${selectedSat !== null ? '0' : '12px'})`,
          pointerEvents: selectedSat !== null ? 'auto' : 'none',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {selectedSat !== null && (() => {
          const meta = SAT_META[selectedSat];
          return (
            <div
              className="border border-[#7fd9a3]/40 px-5 py-3 min-w-[300px]"
              style={{
                background: 'rgba(7,8,12,0.92)',
                backdropFilter: 'blur(18px)',
                boxShadow: '0 0 30px rgba(127,217,163,0.18)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: '#7fd9a3', boxShadow: '0 0 8px #7fd9a3' }}
                  />
                  <p className="text-[#7fd9a3] text-[10px] tracking-[0.35em] font-bold">
                    {meta.name}
                  </p>
                </div>
                <button
                  onClick={() => handleSelectSat(null)}
                  aria-label="Close"
                  className="text-white/30 hover:text-[#1ba3b8] text-[10px] tracking-widest"
                  data-hover="true"
                >
                  ESC ×
                </button>
              </div>
              <p className="text-white/45 text-[9px] tracking-[0.18em] uppercase mb-3">
                {meta.role}
              </p>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <p className="text-white/25 text-[7.5px] tracking-[0.25em] uppercase">Feed</p>
                  <p className="text-[#1ba3b8] text-[11px] mt-0.5">{meta.feed}</p>
                </div>
                <div>
                  <p className="text-white/25 text-[7.5px] tracking-[0.25em] uppercase">Rate</p>
                  <p className="text-[#64dfdf] text-[11px] mt-0.5">{meta.rate}</p>
                </div>
              </div>
              <p className="text-[#7fd9a3]/60 text-[8px] tracking-[0.2em] uppercase mt-3 border-t border-white/8 pt-2">
                ✦ Boosting throughput · firing at 3.5× rate
              </p>
            </div>
          );
        })()}
      </div>

      {/* Corner frames */}
      <div className="absolute top-6 left-6 w-12 h-12 border-l border-t border-[#1ba3b8]/30 pointer-events-none z-10" />
      <div className="absolute top-6 right-6 w-12 h-12 border-r border-t border-[#64dfdf]/30 pointer-events-none z-10" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-l border-b border-[#1ba3b8]/30 pointer-events-none z-10" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-r border-b border-[#64dfdf]/30 pointer-events-none z-10" />

      {/* Bottom hint */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/20 text-[8px] tracking-[0.4em] uppercase pointer-events-none z-10"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        Click satellites · scroll to dive in · move cursor to focus attention
      </div>
    </section>
  );
}
