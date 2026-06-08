'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function SpikyBall() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const coreRef = useRef<THREE.Mesh>(null!);
  const { mouse } = useThree();

  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(2, 5);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v3 = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      v3.normalize();

      const x = v3.x, y = v3.y, z = v3.z;

      // Spiky displacement: only push outward
      const spike = Math.max(
        0,
        Math.sin(x * 8 + y * 6) *
          Math.cos(y * 9 + z * 7) *
          Math.sin(z * 7 + x * 5)
      );

      // Secondary smaller spikes for texture
      const microSpike = Math.max(
        0,
        Math.sin(x * 18 + z * 14) * Math.cos(y * 16 + x * 12) * 0.25
      );

      v3.multiplyScalar(2 + spike * 1.5 + microSpike);
      pos.setXYZ(i, v3.x, v3.y, v3.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      // Continuous auto-rotation
      meshRef.current.rotation.y += 0.004;
      // Mouse influence on X axis
      meshRef.current.rotation.x +=
        (mouse.y * -0.4 - meshRef.current.rotation.x) * 0.04;
    }
    if (coreRef.current) {
      // Pulsing core
      const pulse = 1 + Math.sin(t * 3) * 0.15;
      coreRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <>
      {/* Warm core glow lights */}
      <pointLight position={[0, 0, 0]} intensity={120} color="#ff5500" distance={6} decay={2} />
      <pointLight position={[0, 0, 0]} intensity={60} color="#ffaa33" distance={12} decay={2} />

      {/* Outer rim light */}
      <pointLight position={[4, 3, 3]} intensity={20} color="#1ba3b8" distance={15} decay={2} />

      {/* Spiky sphere */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial color="#e8ddd0" roughness={0.55} metalness={0.15} />
      </mesh>

      {/* Glowing orange core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.95} />
      </mesh>

      {/* Inner core halo */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.15} />
      </mesh>
    </>
  );
}

export default function ThreeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} color="#1a1008" />
      <directionalLight position={[5, 8, 5]} intensity={1} color="#fff5e0" />
      <SpikyBall />
    </Canvas>
  );
}
