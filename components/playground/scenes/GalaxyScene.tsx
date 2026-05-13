'use client';

/**
 * GalaxyScene — 5-arm spiral galaxy.
 *
 * ~12k particles laid out via a logarithmic spiral with arm jitter,
 * radial bulge in the core, and a vertical-thickness falloff. Colour
 * gradient goes warm yellow at the centre, gold mid-radius, cyan at
 * the outer rim — designed so the postprocessing Bloom in
 * PlaygroundCanvas catches the core hardest.
 *
 * Mouse acts as a soft gravitational perturbation: nearby particles
 * curve toward it (tangential push, not radial pull) so the disc
 * locally "spirals" around the cursor without collapsing.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import SceneCamera from '../lib/scene-camera';

const COUNT = 12000;
const ARMS = 5;
const RADIUS = 4.2;
const ARM_TIGHTNESS = 0.85;

const CORE   = new THREE.Color('#fff2a0');
const MID    = new THREE.Color('#c9a96e');
const RIM    = new THREE.Color('#64dfdf');
const ACCENT = new THREE.Color('#b8a4e8');

export default function GalaxyScene({ mouse }: { mouse: { x: number; y: number } }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors, baseRadii, baseAngles } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);
    const baseRadii = new Float32Array(COUNT);
    const baseAngles = new Float32Array(COUNT);
    const c = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      // radial distribution biased toward the core
      const t = Math.pow(Math.random(), 1.7);
      const r = t * RADIUS;
      const arm = i % ARMS;
      const armAngle = (arm / ARMS) * Math.PI * 2;
      // spiral angle — logarithmic in radius
      const spiralAngle = r * ARM_TIGHTNESS;
      // jitter perpendicular to the arm, scaled by radius so the disc thickens outward
      const jitter = (Math.random() - 0.5) * 0.55 * (0.3 + t);
      const angle = armAngle + spiralAngle + jitter;
      // thin disc — vertical jitter that decays with radius
      const y = (Math.random() - 0.5) * 0.35 * (1.2 - t);

      positions[i * 3 + 0] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      baseRadii[i] = r;
      baseAngles[i] = angle;

      // colour — 4-stop gradient by radius with a sprinkle of accent
      if (t < 0.18)        c.copy(CORE).lerp(MID,    t / 0.18);
      else if (t < 0.6)    c.copy(MID).lerp(RIM,     (t - 0.18) / 0.42);
      else                 c.copy(RIM);
      if (Math.random() < 0.04) c.copy(ACCENT); // rare violet stars

      // slight intensity boost in the core for bloom
      const intensity = t < 0.18 ? 1.5 : 1.0;
      colors[i * 3 + 0] = c.r * intensity;
      colors[i * 3 + 1] = c.g * intensity;
      colors[i * 3 + 2] = c.b * intensity;
    }
    return { positions, colors, baseRadii, baseAngles };
  }, []);

  // working vector — no per-frame alloc
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const pts = ref.current; if (!pts) return;
    const time = state.clock.elapsedTime;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;

    // cursor in world space (galaxy plane)
    const cx = mouse.x * RADIUS * 0.9;
    const cz = mouse.y * RADIUS * 0.5;

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const r = baseRadii[i];
      // angular velocity falls off with radius (Keplerian-ish), inner rotates faster
      const omega = 0.16 / (0.5 + r * 0.4);
      const a = baseAngles[i] + time * omega;
      let x = Math.cos(a) * r;
      let z = Math.sin(a) * r;

      // cursor perturbation — tangential push tangent to (x-cx, z-cz)
      const dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz + 0.6;
      const tangent = 1.4 / d2;
      x += -dz * tangent * dt * 4;
      z +=  dx * tangent * dt * 4;

      arr[ix]     = x;
      arr[ix + 2] = z;
      // gently bob Y for life
      arr[ix + 1] += Math.sin(time * 0.4 + i * 0.13) * 0.0008;
    }
    pos.needsUpdate = true;

    // very subtle whole-galaxy tumble
    pts.rotation.x = Math.sin(time * 0.05) * 0.06;
    tmp.set(0, 0, 0); // (keep the ref alive)
  });

  return (
    <>
      <SceneCamera position={[0, 3.2, 7.5]} target={[0, 0, 0]} autoRotateSpeed={0.18} maxDistance={20} minDistance={3} />
      <ambientLight intensity={0.05} />

      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={COUNT} />
          <bufferAttribute attach="attributes-color"    args={[colors, 3]}    count={COUNT} />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* dense core glow — bloom multiplies this */}
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#fff2c8" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.0, 32, 32]} />
        <meshBasicMaterial color="#c9a96e" transparent opacity={0.18} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}
