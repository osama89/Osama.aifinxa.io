'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ContactShadows, Environment, MeshReflectorMaterial } from '@react-three/drei';
import SceneCamera from '../lib/scene-camera';

export default function TruckScene({ mouse, paintColor = '#2a3140' }: { mouse: { x: number; y: number }; paintColor?: string }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = groupRef.current; if (!g) return;
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, mouse.y * 0.05, 0.08);
  });

  const body = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: paintColor, metalness: 0.6, roughness: 0.35,
    clearcoat: 0.85, clearcoatRoughness: 0.12,
  }), [paintColor]);

  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#0a0a0a', metalness: 0.2, roughness: 0.05,
    transmission: 0.5, transparent: true, opacity: 0.6,
  }), []);

  const rubber = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0d0d12', metalness: 0.05, roughness: 0.9,
  }), []);
  const rim = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#bbbbbb', metalness: 1, roughness: 0.3,
  }), []);
  const bedLiner = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#15161c', metalness: 0.2, roughness: 0.95,
  }), []);

  return (
    <>
      <SceneCamera position={[5.5, 2.8, 6]} target={[0, 0.9, 0]} autoRotateSpeed={0.45} minDistance={3.5} maxDistance={14} />

      <Environment preset="city" background={false} environmentIntensity={0.85} />

      <ambientLight intensity={0.05} />
      <directionalLight
        position={[6, 10, 5]}
        intensity={1.3}
        color="#fffbe6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={22}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0008}
      />
      <pointLight position={[-4, 2, -3]} intensity={0.3} color="#7faad4" />

      {/* polished showroom floor — sits where the wheels touch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <MeshReflectorMaterial
          blur={[300, 80]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={0.7}
          depthScale={1.0}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0a0a0e"
          metalness={0.6}
          mirror={0.55}
        />
      </mesh>
      <ContactShadows position={[0, -0.19, 0]} opacity={0.5} blur={2.0} far={4.5} resolution={512} />

      <group ref={groupRef}>
        {/* chassis / cab */}
        <mesh castShadow position={[0.55, 0.7, 0]} material={body}>
          <boxGeometry args={[1.3, 0.9, 1.4]} />
        </mesh>
        {/* cab roof slope */}
        <mesh position={[0.45, 1.1, 0]} material={body}>
          <boxGeometry args={[1.05, 0.18, 1.32]} />
        </mesh>
        {/* windshield */}
        <mesh position={[1.05, 0.95, 0]} rotation={[0, 0, -0.32]} material={glass}>
          <boxGeometry args={[0.42, 0.55, 1.25]} />
        </mesh>
        {/* side windows */}
        {[0.7, -0.7].map((z) => (
          <mesh key={z} position={[0.5, 0.95, z]} material={glass}>
            <boxGeometry args={[1.0, 0.35, 0.04]} />
          </mesh>
        ))}

        {/* bed (rear cargo) */}
        <mesh castShadow position={[-0.95, 0.55, 0]} material={body}>
          <boxGeometry args={[1.55, 0.55, 1.45]} />
        </mesh>
        {/* bed liner (inset top) */}
        <mesh position={[-0.95, 0.78, 0]} material={bedLiner}>
          <boxGeometry args={[1.4, 0.04, 1.3]} />
        </mesh>
        {/* bed walls */}
        <mesh position={[-0.95, 0.86, 0.7]} material={body}>
          <boxGeometry args={[1.55, 0.2, 0.08]} />
        </mesh>
        <mesh position={[-0.95, 0.86, -0.7]} material={body}>
          <boxGeometry args={[1.55, 0.2, 0.08]} />
        </mesh>
        <mesh position={[-1.72, 0.86, 0]} material={body}>
          <boxGeometry args={[0.08, 0.2, 1.45]} />
        </mesh>

        {/* front grille / bumper */}
        <mesh position={[1.32, 0.45, 0]} material={body}>
          <boxGeometry args={[0.18, 0.55, 1.3]} />
        </mesh>
        {/* headlights */}
        {[0.5, -0.5].map((z) => (
          <mesh key={z} position={[1.42, 0.65, z]}>
            <boxGeometry args={[0.06, 0.18, 0.32]} />
            <meshStandardMaterial color="#fff5d0" emissive="#fff2a0" emissiveIntensity={1.8} />
          </mesh>
        ))}
        {/* taillights */}
        {[0.55, -0.55].map((z) => (
          <mesh key={z} position={[-1.72, 0.65, z]}>
            <boxGeometry args={[0.04, 0.16, 0.32]} />
            <meshStandardMaterial color="#7a1a1a" emissive="#ff4444" emissiveIntensity={1.3} />
          </mesh>
        ))}

        {/* large wheels — pickups sit tall */}
        {[[1.0, 0.78], [1.0, -0.78], [-1.0, 0.78], [-1.0, -0.78]].map(([x, z], i) => (
          <group key={i} position={[x, 0.22, z]}>
            <mesh material={rubber} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.42, 0.42, 0.3, 24]} />
            </mesh>
            <mesh material={rim} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.24, 0.24, 0.305, 6]} />
            </mesh>
          </group>
        ))}

        {/* roof rack rails */}
        {[0.55, -0.55].map((z) => (
          <mesh key={z} position={[0.45, 1.25, z]} material={body}>
            <boxGeometry args={[1.0, 0.04, 0.04]} />
          </mesh>
        ))}
      </group>
    </>
  );
}
