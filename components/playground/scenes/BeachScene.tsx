'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment } from '@react-three/drei';
import SceneCamera from '../lib/scene-camera';

// ─── water shader — vertex displacement + foam ─────────────────────────────

const WATER_VERT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  varying vec3 vNormal;

  // cheap pseudo noise via stacked sines
  float waveHeight(vec2 p, float t) {
    return sin(p.x * 0.55 + t * 1.2) * 0.22
         + cos(p.y * 0.42 - t * 0.95) * 0.18
         + sin((p.x + p.y) * 0.8 + t * 1.7) * 0.10
         + sin(p.x * 1.6 - t * 0.5) * 0.05;
  }

  void main() {
    vUv = uv;
    vec3 p = position;

    float h  = waveHeight(p.xy, uTime);
    // finite-difference normal for lighting
    float hx = waveHeight(p.xy + vec2(0.1, 0.0), uTime);
    float hy = waveHeight(p.xy + vec2(0.0, 0.1), uTime);
    vec3 n = normalize(vec3(h - hx, h - hy, 0.2));
    vNormal = n;

    p.z += h;
    vWave = h;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const WATER_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3  uSun;
  varying vec2  vUv;
  varying float vWave;
  varying vec3  vNormal;

  void main() {
    vec3 deep    = vec3(0.02, 0.10, 0.22);
    vec3 mid     = vec3(0.06, 0.32, 0.50);
    vec3 shallow = vec3(0.32, 0.66, 0.74);
    vec3 base = mix(deep, mid, smoothstep(-0.25, 0.0, vWave));
    base = mix(base, shallow, smoothstep(0.0, 0.28, vWave));

    // specular highlight from sun
    float spec = pow(max(0.0, dot(vNormal, normalize(uSun))), 32.0);
    base += spec * vec3(1.0, 0.92, 0.78) * 0.8;

    // foam crest where wave is high
    float foam = smoothstep(0.22, 0.32, vWave);
    base = mix(base, vec3(0.92, 0.94, 0.95), foam * 0.85);

    // gentle distance fog band — fades into the horizon plane
    float horizonFade = smoothstep(0.0, 0.7, vUv.y);
    base = mix(vec3(0.85, 0.78, 0.62), base, horizonFade);

    gl_FragColor = vec4(base, 1.0);
  }
`;

function Water() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  useFrame((state) => {
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSun:  { value: new THREE.Vector3(0.5, 0.7, -1).normalize() },
  }), []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]}>
      <planeGeometry args={[26, 18, 120, 90]} />
      <shaderMaterial
        ref={mat}
        vertexShader={WATER_VERT}
        fragmentShader={WATER_FRAG}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// ─── sky gradient sphere (cheap atmosphere) ────────────────────────────────

const SKY_FRAG = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    float y = clamp(vWorld.y / 12.0 + 0.35, 0.0, 1.0);
    vec3 horizon = vec3(0.96, 0.82, 0.62);
    vec3 zenith  = vec3(0.05, 0.10, 0.25);
    vec3 col = mix(horizon, zenith, smoothstep(0.0, 1.0, y));
    // sun glow at low altitude
    float sun = smoothstep(0.0, 0.18, y) * (1.0 - smoothstep(0.18, 0.45, y));
    col += sun * vec3(1.0, 0.78, 0.45) * 0.6;
    gl_FragColor = vec4(col, 1.0);
  }
`;
const SKY_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function Sky() {
  return (
    <mesh>
      <sphereGeometry args={[30, 32, 32]} />
      <shaderMaterial vertexShader={SKY_VERT} fragmentShader={SKY_FRAG} side={THREE.BackSide} />
    </mesh>
  );
}

// ─── palm tree — trunk + fronds ────────────────────────────────────────────

function Palm({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.09, 1.6, 8]} />
        <meshStandardMaterial color="#3d2818" roughness={0.9} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2;
        const tilt = 0.55 + Math.sin(i) * 0.08;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.18, 1.7, Math.sin(a) * 0.18]}
                rotation={[Math.cos(a) * tilt, a, Math.sin(a) * tilt]}>
            <coneGeometry args={[0.12, 0.7, 6]} />
            <meshStandardMaterial color="#2d6a3e" roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── beach floor (sand) ────────────────────────────────────────────────────

function Sand() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 6.5]} receiveShadow>
      <planeGeometry args={[26, 10, 1, 1]} />
      <meshStandardMaterial color="#e8d09a" roughness={0.95} />
    </mesh>
  );
}

// ─── scene ─────────────────────────────────────────────────────────────────

export default function BeachScene({ mouse }: { mouse: { x: number; y: number } }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, mouse.x * 0.18, 0.04);
    }
  });

  const palmSpots: [number, number, number][] = useMemo(() => ([
    [-5, 0, 5], [-3, 0, 7], [4, 0, 6], [6, 0, 5.5], [-7, 0, 4], [7.5, 0, 4.2],
  ]), []);

  return (
    <>
      <SceneCamera position={[0, 2.5, 6]} target={[0, 0.4, -2]} autoRotateSpeed={0.3} minDistance={4} maxDistance={18} maxPolarAngle={Math.PI / 2 - 0.05} />
      <Environment preset="sunset" background={false} environmentIntensity={0.6} />
      <ambientLight intensity={0.25} color="#fff4d6" />
      <directionalLight position={[6, 10, -4]} intensity={1.4} color="#ffe4b0" castShadow />
      <hemisphereLight args={['#ffe1a8', '#1b2c4a', 0.35]} />

      <Sky />

      <group ref={groupRef}>
        <Water />
        <Sand />
        {palmSpots.map((p, i) => <Palm key={i} position={p} />)}

        {/* sun disk — visible on the horizon */}
        <mesh position={[0, 1.6, -14]}>
          <circleGeometry args={[1.4, 32]} />
          <meshBasicMaterial color="#fff3c0" transparent opacity={0.95} />
        </mesh>
      </group>
    </>
  );
}
