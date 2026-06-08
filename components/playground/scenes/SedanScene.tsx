'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ContactShadows, Environment, MeshReflectorMaterial } from '@react-three/drei';
import SceneCamera from '../lib/scene-camera';

export default function SedanScene({ mouse, paintColor = '#c8ccd2' }: { mouse: { x: number; y: number }; paintColor?: string }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = groupRef.current; if (!g) return;
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, mouse.y * 0.05, 0.08);
  });

  // pearl/iridescent paint, color is reactive
  const body = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: paintColor, metalness: 0.7, roughness: 0.28,
    clearcoat: 1.0, clearcoatRoughness: 0.06,
    iridescence: 0.25,
  }), [paintColor]);
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#0a0e14', metalness: 0.2, roughness: 0.05,
    transmission: 0.55, transparent: true, opacity: 0.55,
  }), []);
  const rubber = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#15151a', metalness: 0.05, roughness: 0.92,
  }), []);
  const rim = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#e6e6e6', metalness: 1, roughness: 0.2,
  }), []);
  const trim = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#101015', metalness: 0.4, roughness: 0.4,
  }), []);

  return (
    <>
      <SceneCamera position={[5, 2, 5]} target={[0, 0.55, 0]} autoRotateSpeed={0.55} minDistance={3} maxDistance={12} />

      <Environment preset="city" background={false} environmentIntensity={0.9} />

      <ambientLight intensity={0.04} />
      <directionalLight
        position={[6, 9, 4]}
        intensity={1.2}
        color="#fffbe6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0008}
      />
      <pointLight position={[-3, 2, -2]} intensity={0.3} color="#a890e0" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <MeshReflectorMaterial
          blur={[300, 80]}
          resolution={1024}
          mixBlur={1}
          mixStrength={50}
          roughness={0.65}
          depthScale={1.0}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0a0a0e"
          metalness={0.6}
          mirror={0.65}
        />
      </mesh>
      <ContactShadows position={[0, -0.11, 0]} opacity={0.5} blur={2.0} far={4} resolution={512} />

      <group ref={groupRef}>
        {/* 3-box silhouette: hood, cabin, trunk — classic saloon */}
        {/* hood */}
        <mesh castShadow position={[1.05, 0.5, 0]} material={body}>
          <boxGeometry args={[0.85, 0.36, 1.18]} />
        </mesh>
        {/* cabin lower */}
        <mesh castShadow position={[-0.05, 0.52, 0]} material={body}>
          <boxGeometry args={[1.65, 0.42, 1.22]} />
        </mesh>
        {/* trunk */}
        <mesh castShadow position={[-1.1, 0.5, 0]} material={body}>
          <boxGeometry args={[0.78, 0.34, 1.18]} />
        </mesh>
        {/* roof */}
        <mesh castShadow position={[-0.1, 0.9, 0]} material={body}>
          <boxGeometry args={[1.3, 0.22, 1.05]} />
        </mesh>
        {/* windshield */}
        <mesh position={[0.55, 0.78, 0]} rotation={[0, 0, -0.42]} material={glass}>
          <boxGeometry args={[0.5, 0.34, 1.0]} />
        </mesh>
        {/* rear window */}
        <mesh position={[-0.75, 0.78, 0]} rotation={[0, 0, 0.42]} material={glass}>
          <boxGeometry args={[0.5, 0.34, 1.0]} />
        </mesh>
        {/* side windows */}
        {[0.55, -0.55].map((z) => (
          <mesh key={z} position={[-0.1, 0.82, z]} material={glass}>
            <boxGeometry args={[1.25, 0.3, 0.03]} />
          </mesh>
        ))}
        {/* door cut lines — fake gaps */}
        {[0.32, -0.32].map((x) => (
          <mesh key={x} position={[x, 0.5, 0.615]} material={trim}>
            <boxGeometry args={[0.015, 0.4, 0.005]} />
          </mesh>
        ))}
        {[0.32, -0.32].map((x) => (
          <mesh key={x + 100} position={[x, 0.5, -0.615]} material={trim}>
            <boxGeometry args={[0.015, 0.4, 0.005]} />
          </mesh>
        ))}

        {/* grille + bumper */}
        <mesh position={[1.46, 0.42, 0]} material={trim}>
          <boxGeometry args={[0.04, 0.2, 0.85]} />
        </mesh>
        {/* headlights */}
        {[0.45, -0.45].map((z) => (
          <mesh key={z} position={[1.48, 0.52, z]}>
            <boxGeometry args={[0.04, 0.12, 0.3]} />
            <meshStandardMaterial color="#fff5d0" emissive="#fff2a0" emissiveIntensity={1.8} />
          </mesh>
        ))}
        {/* taillights */}
        {[0.42, -0.42].map((z) => (
          <mesh key={z} position={[-1.49, 0.55, z]}>
            <boxGeometry args={[0.03, 0.13, 0.34]} />
            <meshStandardMaterial color="#7a1a1a" emissive="#ff5050" emissiveIntensity={1.3} />
          </mesh>
        ))}

        {/* wheels */}
        {[[1.05, 0.65], [1.05, -0.65], [-1.05, 0.65], [-1.05, -0.65]].map(([x, z], i) => (
          <group key={i} position={[x, 0.2, z]}>
            <mesh material={rubber} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.32, 0.32, 0.22, 24]} />
            </mesh>
            <mesh material={rim} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.225, 8]} />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}
