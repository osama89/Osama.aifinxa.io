'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

const GOLD = new THREE.Color('#c9a96e');
const CYAN = new THREE.Color('#64dfdf');
const VIOLET = new THREE.Color('#b8a4e8');

// Photo plane dimensions (matches the 3:4 aspect of the About photo)
const PW = 1.5;
const PH = 2.0;

// ─── Custom shader: photo with scanline reveal ─────────────────────────────

const REVEAL_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const REVEAL_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uReveal;     // 0..1
uniform float uEdgeWidth;  // glow band thickness
uniform vec3 uEdgeColor;   // scanline color
varying vec2 vUv;
void main() {
  // We reveal from bottom (vUv.y = 0) to top (vUv.y = 1)
  float threshold = 1.0 - uReveal;
  if (vUv.y < threshold) {
    discard;
  }
  vec4 color = texture2D(uMap, vUv);
  // Bright glow within edge band just above the threshold
  float edge = smoothstep(uEdgeWidth, 0.0, vUv.y - threshold);
  vec3 col = mix(color.rgb, uEdgeColor, edge * 0.85);
  // Add subtle horizontal scan-line stripes for hologram feel
  float lines = sin(vUv.y * 600.0) * 0.04;
  col += lines * vec3(0.5, 0.45, 0.3);
  gl_FragColor = vec4(col, 1.0);
}
`;

// ─── Photo card with neural overlay ─────────────────────────────────────────

interface CardProps {
  rotation: { x: number; y: number };
  dragging: boolean;
  isOpen: boolean;
}

const ECHO_COUNT = 6;

function PhotoCard({ rotation, dragging, isOpen }: CardProps) {
  const texture = useLoader(THREE.TextureLoader, '/images/photo.jpg');
  const groupRef = useRef<THREE.Group>(null!);
  const pulseRef = useRef(0);

  // Configure texture
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Materialization progress (0 → 1) driven by isOpen
  const matProgress = useRef(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      startTime.current = performance.now();
      matProgress.current = 0;
    } else {
      startTime.current = null;
      matProgress.current = 0;
    }
  }, [isOpen]);

  // Shader uniforms (created once)
  const revealUniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uReveal: { value: 0 },
      uEdgeWidth: { value: 0.05 },
      uEdgeColor: { value: new THREE.Color('#ffd58a') },
    }),
    [texture]
  );

  // Echo layers — refs so we can animate their Z + opacity
  const echoRefs = useRef<(THREE.Mesh | null)[]>(Array(ECHO_COUNT).fill(null));

  // Burst particles (released when reveal completes)
  const BURST_COUNT = 90;
  const burstPositions = useMemo(() => new Float32Array(BURST_COUNT * 3), []);
  const burstColors = useMemo(() => {
    const a = new Float32Array(BURST_COUNT * 3);
    for (let i = 0; i < BURST_COUNT; i++) {
      const c = i % 3 === 0 ? GOLD : i % 2 === 0 ? CYAN : VIOLET;
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    return a;
  }, []);
  const burstVels = useMemo(() => {
    return Array.from({ length: BURST_COUNT }, () => ({
      vx: (Math.random() - 0.5) * 0.04,
      vy: (Math.random() - 0.5) * 0.04,
      vz: (Math.random() - 0.5) * 0.04,
      life: 0,
    }));
  }, []);
  const burstRef = useRef<THREE.Points>(null!);
  const burstMatRef = useRef<THREE.PointsMaterial>(null!);
  const burstFired = useRef(false);

  // Sample neurons on the front face of the photo plane
  const { neuronPositions, neuronColors, edgePositions, edgeColors, edgePairs, neurons, edgeCount } = useMemo(() => {
    const NCOUNT = 110;
    const neurons: THREE.Vector3[] = [];
    for (let i = 0; i < NCOUNT; i++) {
      // Uniform distribution over the plane (front face at z ≈ 0.02)
      const x = (Math.random() - 0.5) * PW * 0.94;
      const y = (Math.random() - 0.5) * PH * 0.94;
      const z = 0.04 + Math.random() * 0.02;
      neurons.push(new THREE.Vector3(x, y, z));
    }
    // Connect each neuron to 3-5 nearest neighbors
    const pairs: [number, number][] = [];
    const seen = new Set<string>();
    for (let i = 0; i < neurons.length; i++) {
      const ds: { j: number; d: number }[] = [];
      for (let j = 0; j < neurons.length; j++) {
        if (i === j) continue;
        ds.push({ j, d: neurons[i].distanceToSquared(neurons[j]) });
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

    const np = new Float32Array(neurons.length * 3);
    const nc = new Float32Array(neurons.length * 3);
    neurons.forEach((p, i) => {
      np[i * 3] = p.x;
      np[i * 3 + 1] = p.y;
      np[i * 3 + 2] = p.z;
      const c = i % 6 === 0 ? GOLD : i % 4 === 0 ? VIOLET : CYAN;
      nc[i * 3] = c.r; nc[i * 3 + 1] = c.g; nc[i * 3 + 2] = c.b;
    });

    const ep = new Float32Array(pairs.length * 6);
    const ec = new Float32Array(pairs.length * 6);
    pairs.forEach(([a, b], i) => {
      const pa = neurons[a], pb = neurons[b];
      ep[i * 6] = pa.x; ep[i * 6 + 1] = pa.y; ep[i * 6 + 2] = pa.z;
      ep[i * 6 + 3] = pb.x; ep[i * 6 + 4] = pb.y; ep[i * 6 + 5] = pb.z;
      ec[i * 6] = 0.06; ec[i * 6 + 1] = 0.10; ec[i * 6 + 2] = 0.12;
      ec[i * 6 + 3] = 0.06; ec[i * 6 + 4] = 0.10; ec[i * 6 + 5] = 0.12;
    });

    return { neuronPositions: np, neuronColors: nc, edgePositions: ep, edgeColors: ec, edgePairs: pairs, neurons, edgeCount: pairs.length };
  }, []);

  // Active synapse flashes
  const flashes = useRef<{ edge: number; t: number; color: THREE.Color }[]>([]);
  const synapseRef = useRef<THREE.LineSegments>(null!);

  // Pulse particles moving along synapses
  const PULSE_COUNT = 18;
  const pulses = useRef(
    Array.from({ length: PULSE_COUNT }, () => ({
      edge: Math.floor(Math.random() * edgeCount),
      t: Math.random(),
      speed: 0.006 + Math.random() * 0.012,
      color: Math.random() < 0.5 ? GOLD : CYAN,
    }))
  );
  const pulsePositions = useMemo(() => new Float32Array(PULSE_COUNT * 3), []);
  const pulseColors = useMemo(() => {
    const a = new Float32Array(PULSE_COUNT * 3);
    pulses.current.forEach((p, i) => {
      a[i * 3] = p.color.r;
      a[i * 3 + 1] = p.color.g;
      a[i * 3 + 2] = p.color.b;
    });
    return a;
  }, []);
  const pulseRefMesh = useRef<THREE.Points>(null!);
  const neuronRef = useRef<THREE.Points>(null!);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    pulseRef.current += dt;

    // ── Materialization progress (1.2s scanline reveal) ─────────────────
    if (startTime.current !== null) {
      const elapsed = performance.now() - startTime.current;
      matProgress.current = Math.min(1, elapsed / 1200);
      revealUniforms.uReveal.value = matProgress.current;
      // Fire the burst once when reveal completes
      if (!burstFired.current && matProgress.current >= 1) {
        burstFired.current = true;
        for (let i = 0; i < BURST_COUNT; i++) {
          burstPositions[i * 3] = (Math.random() - 0.5) * 0.4;
          burstPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
          burstPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
          burstVels[i].vx = (Math.random() - 0.5) * 0.06;
          burstVels[i].vy = (Math.random() - 0.5) * 0.06;
          burstVels[i].vz = (Math.random() - 0.5) * 0.06;
          burstVels[i].life = 1;
        }
      }
    } else {
      burstFired.current = false;
      revealUniforms.uReveal.value = 0;
    }

    // ── Echo layers fan out as material progress passes 0.6 ─────────────
    const echoProgress = Math.max(0, (matProgress.current - 0.45) / 0.55);
    const eased = echoProgress * echoProgress * (3 - 2 * echoProgress);
    echoRefs.current.forEach((m, i) => {
      if (!m) return;
      const targetZ = -(i + 1) * 0.06;
      m.position.z = targetZ * eased;
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.32 / (i + 1)) * eased;
      // Gentle shimmer
      const shimmer = Math.sin(pulseRef.current * 1.4 + i * 0.7) * 0.04;
      m.position.x = shimmer * (i % 2 === 0 ? 1 : -1);
    });

    // ── Burst particles drift and fade ─────────────────────────────────
    if (burstFired.current && burstRef.current) {
      const posAttr = burstRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      for (let i = 0; i < BURST_COUNT; i++) {
        const v = burstVels[i];
        if (v.life > 0) {
          posArr[i * 3] += v.vx;
          posArr[i * 3 + 1] += v.vy;
          posArr[i * 3 + 2] += v.vz;
          v.vx *= 0.96; v.vy *= 0.96; v.vz *= 0.96;
          v.life -= dt * 0.7;
        }
      }
      posAttr.needsUpdate = true;
      if (burstMatRef.current) {
        const avgLife = burstVels.reduce((s, v) => s + Math.max(0, v.life), 0) / BURST_COUNT;
        burstMatRef.current.opacity = avgLife;
      }
    }

    // ── Group rotation: locked during materialization, free after ────────
    const dragWeight = matProgress.current;
    const targetRx = rotation.x * dragWeight;
    const targetRy = rotation.y * dragWeight;
    groupRef.current.rotation.x += (targetRx - groupRef.current.rotation.x) * 0.1;
    groupRef.current.rotation.y += (targetRy - groupRef.current.rotation.y) * 0.1;
    // Gentle idle sway when not dragging
    if (!dragging && matProgress.current >= 1) {
      groupRef.current.rotation.y += Math.sin(pulseRef.current * 0.4) * dt * 0.05;
    }

    // Synapse flashes
    if (Math.random() < 0.6) {
      const edge = Math.floor(Math.random() * edgeCount);
      const color = Math.random() < 0.55 ? CYAN : Math.random() < 0.5 ? GOLD : VIOLET;
      flashes.current.push({ edge, t: 1, color });
    }
    if (synapseRef.current) {
      const colorAttr = synapseRef.current.geometry.attributes.color as THREE.BufferAttribute;
      const arr = colorAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 6) {
        arr[i] = 0.05; arr[i + 1] = 0.09; arr[i + 2] = 0.11;
        arr[i + 3] = 0.05; arr[i + 4] = 0.09; arr[i + 5] = 0.11;
      }
      flashes.current = flashes.current.filter((f) => {
        f.t -= dt * 1.6;
        if (f.t <= 0) return false;
        const idx = f.edge * 6;
        const I = Math.min(1, f.t);
        arr[idx] = f.color.r * I; arr[idx + 1] = f.color.g * I; arr[idx + 2] = f.color.b * I;
        arr[idx + 3] = f.color.r * I; arr[idx + 4] = f.color.g * I; arr[idx + 5] = f.color.b * I;
        return true;
      });
      colorAttr.needsUpdate = true;
    }

    // Advance pulses
    if (pulseRefMesh.current) {
      const posAttr = pulseRefMesh.current.geometry.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      pulses.current.forEach((p, i) => {
        p.t += p.speed;
        if (p.t >= 1) {
          p.t = 0;
          p.edge = Math.floor(Math.random() * edgeCount);
          p.color = Math.random() < 0.5 ? GOLD : CYAN;
          pulseColors[i * 3] = p.color.r;
          pulseColors[i * 3 + 1] = p.color.g;
          pulseColors[i * 3 + 2] = p.color.b;
        }
        const [a, b] = edgePairs[p.edge];
        const pa = neurons[a], pb = neurons[b];
        posArr[i * 3] = pa.x + (pb.x - pa.x) * p.t;
        posArr[i * 3 + 1] = pa.y + (pb.y - pa.y) * p.t;
        posArr[i * 3 + 2] = pa.z + (pb.z - pa.z) * p.t;
      });
      posAttr.needsUpdate = true;
      (pulseRefMesh.current.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }

    if (neuronRef.current) {
      const m = neuronRef.current.material as THREE.PointsMaterial;
      m.size = 0.028 + Math.sin(pulseRef.current * 1.8) * 0.005;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Back glow plane */}
      <mesh position={[0, 0, -0.08]}>
        <planeGeometry args={[PW * 1.25, PH * 1.25]} />
        <meshBasicMaterial
          color="#c9a96e"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Echo layers — translucent photo copies fanning back in Z */}
      {Array.from({ length: ECHO_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { echoRefs.current[i] = el; }}
          position={[0, 0, 0]}
          renderOrder={-i - 1}
        >
          <planeGeometry args={[PW * (1 + i * 0.012), PH * (1 + i * 0.012)]} />
          <meshBasicMaterial
            map={texture}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Front photo plane — custom shader scanline reveal */}
      <mesh renderOrder={1}>
        <planeGeometry args={[PW, PH]} />
        <shaderMaterial
          vertexShader={REVEAL_VERTEX}
          fragmentShader={REVEAL_FRAGMENT}
          uniforms={revealUniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Materialization burst particles */}
      <points ref={burstRef} renderOrder={2}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[burstPositions, 3]} count={BURST_COUNT} />
          <bufferAttribute attach="attributes-color" args={[burstColors, 3]} count={BURST_COUNT} />
        </bufferGeometry>
        <pointsMaterial
          ref={burstMatRef}
          size={0.06}
          vertexColors
          transparent
          opacity={0}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Photo gold border frame */}
      <lineSegments position={[0, 0, 0.005]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(PW, PH)]} />
        <lineBasicMaterial color="#c9a96e" transparent opacity={0.8} />
      </lineSegments>

      {/* Inner frame, slightly inset */}
      <lineSegments position={[0, 0, 0.006]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(PW * 0.95, PH * 0.97)]} />
        <lineBasicMaterial color="#64dfdf" transparent opacity={0.35} />
      </lineSegments>

      {/* Neural points (in front of the photo) */}
      <points ref={neuronRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[neuronPositions, 3]} count={neurons.length} />
          <bufferAttribute attach="attributes-color" args={[neuronColors, 3]} count={neurons.length} />
        </bufferGeometry>
        <pointsMaterial
          size={0.028}
          vertexColors
          transparent
          opacity={0.95}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Synaptic connections */}
      <lineSegments ref={synapseRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} count={edgeCount * 2} />
          <bufferAttribute attach="attributes-color" args={[edgeColors, 3]} count={edgeCount * 2} />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Traveling pulse signals */}
      <points ref={pulseRefMesh}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pulsePositions, 3]} count={PULSE_COUNT} />
          <bufferAttribute attach="attributes-color" args={[pulseColors, 3]} count={PULSE_COUNT} />
        </bufferGeometry>
        <pointsMaterial
          size={0.07}
          vertexColors
          transparent
          opacity={1}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Corner accent brackets at each corner of the photo */}
      {[
        [-PW / 2, PH / 2, 0.01, 0],
        [PW / 2, PH / 2, 0.01, 1],
        [-PW / 2, -PH / 2, 0.01, 2],
        [PW / 2, -PH / 2, 0.01, 3],
      ].map(([x, y, z, i]) => {
        const len = 0.18;
        const dx = (i % 2 === 0) ? len : -len;
        const dy = (i < 2) ? -len : len;
        const verts = new Float32Array([
          x, y, z, x + dx, y, z,
          x, y, z, x, y + dy, z,
        ]);
        return (
          <lineSegments key={i}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[verts, 3]} count={4} />
            </bufferGeometry>
            <lineBasicMaterial color="#c9a96e" transparent opacity={0.9} />
          </lineSegments>
        );
      })}
    </group>
  );
}

// ─── Ambient sparkles around the scene ──────────────────────────────────────

function AmbientField() {
  const ref = useRef<THREE.Points>(null!);
  const { positions, colors } = useMemo(() => {
    const COUNT = 400;
    const p = new Float32Array(COUNT * 3);
    const c = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = 2.2 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.cos(phi);
      p[i * 3 + 2] = (r * Math.sin(phi) * Math.sin(theta)) - 1;
      const col = i % 4 === 0 ? GOLD : i % 3 === 0 ? VIOLET : CYAN;
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    return { positions: p, colors: c };
  }, []);
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.03;
      ref.current.rotation.x += dt * 0.008;
    }
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={400} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={400} />
      </bufferGeometry>
      <pointsMaterial
        size={0.018}
        vertexColors
        transparent
        opacity={0.55}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ─── Camera dolly driven by scroll ──────────────────────────────────────────

interface DollyProps { targetZ: number; }

function CameraDolly({ targetZ }: DollyProps) {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.z += (targetZ - camera.position.z) * 0.08;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ─── Modal ──────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PhotoIntelligence({ isOpen, onClose }: Props) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [targetZ, setTargetZ] = useState(3.4);
  const dragState = useRef({ active: false, sx: 0, sy: 0, startRx: 0, startRy: 0 });

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setRotation({ x: 0, y: 0 });
      setTargetZ(3.4);
    }
  }, [isOpen]);

  // ESC closes
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 0.25 : -0.25;
    setTargetZ((z) => Math.max(1.3, Math.min(7, z + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragState.current = {
      active: true,
      sx: e.clientX, sy: e.clientY,
      startRx: rotation.x, startRy: rotation.y,
    };
    setDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.active) return;
    const dx = e.clientX - dragState.current.sx;
    const dy = e.clientY - dragState.current.sy;
    setRotation({
      x: Math.max(-0.7, Math.min(0.7, dragState.current.startRx + dy * 0.005)),
      y: dragState.current.startRy + dx * 0.007,
    });
  };

  const handleMouseUp = () => {
    dragState.current.active = false;
    setDragging(false);
  };

  // Zoom progress 0–1 used to colorize HUD (0 = far, 1 = deep dive)
  const zoomProgress = Math.max(0, Math.min(1, (3.4 - targetZ) / 2.1));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background:
              'radial-gradient(ellipse at center, #14101c 0%, #07060c 65%, #03020a 100%)',
            cursor: dragging ? 'grabbing' : 'grab',
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Backdrop click to close (excluding center area) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute inset-0 w-full h-full"
            style={{ background: 'transparent', cursor: 'inherit', border: 'none' }}
            tabIndex={-1}
          />

          {/* The 3D canvas */}
          <div className="absolute inset-0 pointer-events-none">
            <Canvas
              camera={{ position: [0, 0, 3.4], fov: 42 }}
              gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
              dpr={[1, 2]}
            >
              <ambientLight intensity={0.7} />
              <pointLight position={[2, 2, 3]} intensity={1.2} color="#c9a96e" />
              <pointLight position={[-2, -1, 3]} intensity={0.9} color="#64dfdf" />
              <PhotoCard rotation={rotation} dragging={dragging} isOpen={isOpen} />
              <AmbientField />
              <CameraDolly targetZ={targetZ} />
            </Canvas>
          </div>

          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 35%, rgba(3,2,10,0.7) 85%, rgba(3,2,10,0.95) 100%)',
            }}
          />

          {/* Top HUD */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="absolute top-8 left-1/2 -translate-x-1/2 text-center pointer-events-none"
          >
            <p
              className="text-[#c9a96e] text-[10px] tracking-[0.6em] uppercase mb-2"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Intelligence Mode
            </p>
            <h2
              className="text-3xl md:text-4xl font-black"
              style={{
                fontFamily: 'var(--font-playfair)',
                background: 'linear-gradient(180deg, #ffffff 0%, #c9a96e 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              The Mind <span className="text-[#64dfdf]">·</span> Visualized
            </h2>
          </motion.div>

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close intelligence mode"
            className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center border border-[#c9a96e]/40 text-[#c9a96e] hover:bg-[#c9a96e] hover:text-black transition-all duration-300"
            style={{ fontFamily: 'var(--font-mono)', backdropFilter: 'blur(6px)' }}
            data-hover="true"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
            </svg>
          </button>

          {/* Zoom indicator (bottom left) */}
          <div className="absolute bottom-8 left-8 pointer-events-none" style={{ fontFamily: 'var(--font-mono)' }}>
            <p className="text-white/40 text-[9px] tracking-[0.35em] uppercase mb-2">Depth</p>
            <div className="w-40 h-[2px] bg-white/10 relative overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 h-full"
                style={{
                  width: `${zoomProgress * 100}%`,
                  background: 'linear-gradient(90deg, #c9a96e, #64dfdf)',
                  boxShadow: '0 0 10px rgba(100,223,223,0.6)',
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-[#64dfdf] text-[9px] tracking-widest mt-2">
              {Math.round(zoomProgress * 100)}% IMMERSION
            </p>
          </div>

          {/* Hint (bottom right) */}
          <div className="absolute bottom-8 right-8 pointer-events-none text-right" style={{ fontFamily: 'var(--font-mono)' }}>
            <p className="text-white/35 text-[8.5px] tracking-[0.3em] uppercase">Scroll · Dive Deeper</p>
            <p className="text-white/35 text-[8.5px] tracking-[0.3em] uppercase mt-1">Drag · Rotate</p>
            <p className="text-white/35 text-[8.5px] tracking-[0.3em] uppercase mt-1">Esc · Exit</p>
          </div>

          {/* Corner frames */}
          <div className="absolute top-6 left-6 w-10 h-10 border-l border-t border-[#c9a96e]/40 pointer-events-none" />
          <div className="absolute bottom-6 left-6 w-10 h-10 border-l border-b border-[#c9a96e]/40 pointer-events-none" />
          <div className="absolute top-6 right-6 w-10 h-10 border-r border-t border-[#64dfdf]/40 pointer-events-none" />
          <div className="absolute bottom-6 right-6 w-10 h-10 border-r border-b border-[#64dfdf]/40 pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
