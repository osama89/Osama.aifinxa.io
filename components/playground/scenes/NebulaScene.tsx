'use client';

/**
 * NebulaScene — Lusion-style curl-noise fluid particle field.
 *
 * 2,500 emissive points integrated through a divergence-free curl-noise
 * velocity field (finite-difference derivative of stacked sines).
 * Colors shift in a 3-stop palette (gold/cyan/violet) per particle
 * position; the cursor acts as a swirl attractor with a soft falloff.
 *
 * Bloom-friendly: particles use AdditiveBlending and high emissive
 * intensity, so the Effects bloom pass picks them up cleanly.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import SceneCamera from '../lib/scene-camera';

const COUNT = 2500;
const BOUND = 4.0;

// pseudo noise — sin-stack, cheap and deterministic
function n(x: number, y: number, z: number, t: number): number {
  return (
    Math.sin(x * 1.7 + y * 1.3 + t * 0.6) +
    Math.cos(y * 2.1 - z * 1.5 + t * 0.4) * 0.7 +
    Math.sin(z * 1.9 + x * 1.1 - t * 0.5) * 0.5
  );
}

// curl noise — 3D divergence-free derivative of `n`
const EPS = 0.04;
function curl(out: THREE.Vector3, x: number, y: number, z: number, t: number) {
  const n_y1 = n(x, y + EPS, z, t);
  const n_y0 = n(x, y - EPS, z, t);
  const n_z1 = n(x, y, z + EPS, t);
  const n_z0 = n(x, y, z - EPS, t);
  const n_x1 = n(x + EPS, y, z, t);
  const n_x0 = n(x - EPS, y, z, t);
  out.set(
    (n_y1 - n_y0) - (n_z1 - n_z0),
    (n_z1 - n_z0) - (n_x1 - n_x0),
    (n_x1 - n_x0) - (n_y1 - n_y0),
  ).multiplyScalar(1 / (2 * EPS));
}

const GOLD   = new THREE.Color('#1ba3b8');
const CYAN   = new THREE.Color('#64dfdf');
const VIOLET = new THREE.Color('#b8a4e8');

export default function NebulaScene({ mouse }: { mouse: { x: number; y: number } }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);
    const sizes     = new Float32Array(COUNT);
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      // spawn in a sphere
      const r = Math.cbrt(Math.random()) * BOUND;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // tri-stop palette by radial band
      const t1 = Math.min(1, r / BOUND);
      if (t1 < 0.5) c.copy(GOLD).lerp(CYAN, t1 * 2);
      else           c.copy(CYAN).lerp(VIOLET, (t1 - 0.5) * 2);
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = 0.04 + Math.random() * 0.05;
    }
    return { positions, colors, sizes };
  }, []);

  // scratch vector for curl results — no per-frame allocation
  const v = useMemo(() => new THREE.Vector3(), []);
  const swirl = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const pts = ref.current; if (!pts) return;
    const t = state.clock.elapsedTime;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;

    // mouse-driven swirl attractor in world coords
    swirl.set(mouse.x * BOUND * 0.7, mouse.y * BOUND * 0.5, 0);

    const speed = 0.55;
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const x = arr[ix], y = arr[ix + 1], z = arr[ix + 2];

      curl(v, x * 0.5, y * 0.5, z * 0.5, t * 0.2);
      v.multiplyScalar(speed);

      // cursor swirl — perpendicular pull around the swirl axis
      const dx = swirl.x - x, dy = swirl.y - y, dz = swirl.z - z;
      const d2 = dx * dx + dy * dy + dz * dz + 0.4;
      const falloff = 1.6 / d2;
      v.x +=  dy * falloff;
      v.y += -dx * falloff;
      v.z +=  dz * 0.05 * falloff;

      arr[ix]     += v.x * dt;
      arr[ix + 1] += v.y * dt;
      arr[ix + 2] += v.z * dt;

      // soft wrap on a sphere — re-spawn drifted particles inward
      const r2 = arr[ix] * arr[ix] + arr[ix + 1] * arr[ix + 1] + arr[ix + 2] * arr[ix + 2];
      if (r2 > BOUND * BOUND) {
        const scale = (BOUND * 0.5) / Math.sqrt(r2);
        arr[ix]     *= scale;
        arr[ix + 1] *= scale;
        arr[ix + 2] *= scale;
      }
    }
    pos.needsUpdate = true;
    pts.rotation.y = t * 0.02;
  });

  return (
    <>
      <SceneCamera position={[0, 0, 7]} target={[0, 0, 0]} autoRotateSpeed={0.25} maxDistance={20} />
      <ambientLight intensity={0.2} />

      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={COUNT} />
          <bufferAttribute attach="attributes-color"    args={[colors, 3]}    count={COUNT} />
          <bufferAttribute attach="attributes-size"     args={[sizes, 1]}     count={COUNT} />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* dim core glow — gives the bloom something to spread from */}
      <mesh>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshBasicMaterial color="#fff2c0" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}
