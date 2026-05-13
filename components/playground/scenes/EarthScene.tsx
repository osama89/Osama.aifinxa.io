'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Stars, Environment } from '@react-three/drei';
import SceneCamera from '../lib/scene-camera';

// ─── procedural earth shader — continents from noise ────────────────────────

const EARTH_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const EARTH_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3  uSun;
  varying vec3  vWorldPos;
  varying vec3  vNormal;
  varying vec3  vViewDir;

  // hash-based pseudo noise — cheap continents
  float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                    mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                    mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.0; a*=0.5; } return s; }

  void main() {
    vec3 n = normalize(vNormal);

    // continents driven by 3D noise on the sphere
    float landMask = fbm(n * 2.2 + vec3(uTime * 0.005, 0.0, 0.0));
    landMask = smoothstep(0.45, 0.6, landMask);

    vec3 ocean = mix(vec3(0.02, 0.08, 0.22), vec3(0.04, 0.22, 0.42), 0.5 + 0.5 * sin(vWorldPos.y * 4.0));
    vec3 land  = mix(vec3(0.18, 0.32, 0.14), vec3(0.55, 0.45, 0.22), fbm(n * 4.0));
    vec3 surface = mix(ocean, land, landMask);

    // ice caps
    float pole = smoothstep(0.78, 0.92, abs(n.y));
    surface = mix(surface, vec3(0.95, 0.97, 1.0), pole);

    // day / night terminator
    float lambert = max(0.0, dot(n, normalize(uSun)));
    float day = smoothstep(0.0, 0.18, lambert);
    vec3 nightCities = vec3(1.0, 0.7, 0.3) * pow(landMask, 2.0) * 0.6 * (1.0 - day);
    vec3 lit = surface * (0.15 + 0.85 * day) + nightCities;

    // fresnel atmosphere bleed
    float rim = pow(1.0 - max(0.0, dot(vViewDir, n)), 2.4);
    lit += vec3(0.35, 0.6, 1.0) * rim * 0.5;

    gl_FragColor = vec4(lit, 1.0);
  }
`;

function Earth({ tilt }: { tilt: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSun:  { value: new THREE.Vector3(1, 0.4, 0.6).normalize() },
  }), []);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y += 0.0024;
    if (mat.current) {
      mat.current.uniforms.uTime.value = state.clock.elapsedTime;
      // animated sun direction
      const a = state.clock.elapsedTime * 0.08;
      mat.current.uniforms.uSun.value.set(Math.cos(a), 0.45, Math.sin(a)).normalize();
    }
  });

  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <sphereGeometry args={[1.2, 96, 96]} />
      <shaderMaterial ref={mat} vertexShader={EARTH_VERT} fragmentShader={EARTH_FRAG} uniforms={uniforms} />
    </mesh>
  );
}

// ─── atmosphere — slightly larger backside-rendered fresnel sphere ─────────

const ATMOS_FRAG = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float fres = pow(1.0 - max(0.0, dot(vViewDir, normalize(vNormal))), 2.5);
    gl_FragColor = vec4(vec3(0.30, 0.62, 1.0), fres * 0.8);
  }
`;
const ATMOS_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

// ─── clouds — animated procedural alpha shell over the Earth ───────────────

const CLOUDS_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const CLOUDS_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3  uSun;
  varying vec3  vNormal;
  varying vec3  vWorldPos;

  float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                    mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                    mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.0; a*=0.5; } return s; }

  void main() {
    vec3 n = normalize(vNormal);
    // drift the noise field — clouds creep across the sphere
    vec3 q = n * 2.4 + vec3(uTime * 0.012, uTime * 0.006, 0.0);
    float c = fbm(q);
    // sharp cloud mask
    float alpha = smoothstep(0.50, 0.72, c) * 0.85;

    // sun-lit clouds brighten, terminator clouds redden
    float lit = max(0.0, dot(n, normalize(uSun)));
    vec3 daySide  = vec3(1.0, 0.98, 0.95);
    vec3 nightSide = vec3(0.10, 0.12, 0.18);
    vec3 col = mix(nightSide, daySide, smoothstep(0.0, 0.35, lit));

    gl_FragColor = vec4(col, alpha);
  }
`;

function Clouds({ tilt }: { tilt: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSun:  { value: new THREE.Vector3(1, 0.4, 0.6).normalize() },
  }), []);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y += 0.0018; // slightly slower than Earth
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      const a = state.clock.elapsedTime * 0.08;
      matRef.current.uniforms.uSun.value.set(Math.cos(a), 0.45, Math.sin(a)).normalize();
    }
  });

  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <sphereGeometry args={[1.235, 96, 96]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={CLOUDS_VERT}
        fragmentShader={CLOUDS_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[1.32, 64, 64]} />
      <shaderMaterial
        vertexShader={ATMOS_VERT}
        fragmentShader={ATMOS_FRAG}
        side={THREE.BackSide}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── sun + lens flare proxy ─────────────────────────────────────────────────

function Sun() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const a = state.clock.elapsedTime * 0.08;
    if (ref.current) {
      ref.current.position.set(Math.cos(a) * 6, 1.4, Math.sin(a) * 6);
    }
  });
  return (
    <group ref={ref}>
      <pointLight intensity={2.2} color="#ffe7b0" distance={20} />
      <mesh>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshBasicMaterial color="#fff2a0" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.65, 32, 32]} />
        <meshBasicMaterial color="#ff9d40" transparent opacity={0.25} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// ─── moon — small companion ─────────────────────────────────────────────────

function Moon() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const a = -state.clock.elapsedTime * 0.16;
    if (ref.current) {
      ref.current.position.set(Math.cos(a) * 2.3, 0.4, Math.sin(a) * 2.3);
      ref.current.rotation.y += 0.005;
    }
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.16, 32, 32]} />
        <meshStandardMaterial color="#c2c0b0" roughness={0.95} />
      </mesh>
    </group>
  );
}

export default function EarthScene({ mouse }: { mouse: { x: number; y: number } }) {
  const tilt = useMemo(() => 0.41, []); // 23.5° in radians ≈ 0.41
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = groupRef.current; if (!g) return;
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, mouse.x * 0.4, 0.05);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -mouse.y * 0.2, 0.05);
  });

  return (
    <>
      <SceneCamera position={[0, 1.4, 5]} target={[0, 0, 0]} autoRotateSpeed={0.35} minDistance={2.2} maxDistance={20} />
      <Environment preset="night" background={false} environmentIntensity={0.25} />
      <ambientLight intensity={0.05} />
      <Stars radius={60} depth={60} count={6000} factor={2.5} fade speed={0.4} />

      <group ref={groupRef}>
        <Earth tilt={tilt} />
        <Clouds tilt={tilt} />
        <Atmosphere />
        <Moon />
      </group>

      <Sun />
    </>
  );
}
