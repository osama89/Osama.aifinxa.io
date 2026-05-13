'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ContactShadows, Environment, MeshReflectorMaterial } from '@react-three/drei';
import SceneCamera from '../lib/scene-camera';

// ─── sports car — procedural low-poly ──────────────────────────────────────

export default function CarScene({ mouse, paintColor = '#c9a96e' }: { mouse: { x: number; y: number }; paintColor?: string }) {
  const groupRef = useRef<THREE.Group>(null);

  // hover tilt with cursor
  useFrame(() => {
    const g = groupRef.current; if (!g) return;
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, mouse.y * 0.05, 0.08);
  });

  // glossy paint material — physical for clearcoat. Color is reactive.
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: paintColor,
    metalness: 0.55,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    reflectivity: 0.6,
  }), [paintColor]);

  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#0a0a0a',
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.55,
    transparent: true,
    opacity: 0.55,
  }), []);

  const rubber = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#15151a', metalness: 0.1, roughness: 0.85,
  }), []);

  const rim = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#dddddd', metalness: 1, roughness: 0.25,
  }), []);

  return (
    <>
      <SceneCamera position={[5, 2.2, 5]} target={[0, 0.55, 0]} autoRotateSpeed={0.6} minDistance={3} maxDistance={12} />

      {/* HDRI image-based lighting — the photorealism base layer */}
      <Environment preset="city" background={false} environmentIntensity={0.85} />

      {/* one strong key light for crisp shadow casting + a gold rim */}
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
      <pointLight position={[-3, 2, -2]} intensity={0.25} color="#64dfdf" />

      {/* polished showroom floor — sits where the wheels touch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <MeshReflectorMaterial
          blur={[300, 80]}
          resolution={1024}
          mixBlur={1}
          mixStrength={45}
          roughness={0.7}
          depthScale={1.0}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0a0a0e"
          metalness={0.6}
          mirror={0.6}
        />
      </mesh>
      <ContactShadows position={[0, -0.13, 0]} opacity={0.45} blur={2.0} far={4} resolution={512} />

      <group ref={groupRef} position={[0, 0, 0]}>
        {/* main body — low + wide */}
        <mesh castShadow position={[0, 0.42, 0]} material={paint}>
          <boxGeometry args={[2.6, 0.42, 1.1]} />
        </mesh>
        {/* nose wedge */}
        <mesh castShadow position={[1.0, 0.32, 0]} rotation={[0, 0, -0.18]} material={paint}>
          <boxGeometry args={[0.9, 0.3, 1.05]} />
        </mesh>
        {/* rear haunches */}
        <mesh castShadow position={[-0.9, 0.5, 0]} material={paint}>
          <boxGeometry args={[0.95, 0.5, 1.18]} />
        </mesh>
        {/* cabin */}
        <mesh castShadow position={[-0.05, 0.78, 0]} material={paint}>
          <boxGeometry args={[1.35, 0.34, 0.95]} />
        </mesh>
        {/* windshield slope (glass) */}
        <mesh position={[0.42, 0.78, 0]} rotation={[0, 0, -0.55]} material={glass}>
          <boxGeometry args={[0.62, 0.34, 0.92]} />
        </mesh>
        {/* rear glass */}
        <mesh position={[-0.62, 0.78, 0]} rotation={[0, 0, 0.5]} material={glass}>
          <boxGeometry args={[0.55, 0.34, 0.92]} />
        </mesh>

        {/* spoiler */}
        <mesh position={[-1.35, 0.78, 0]} material={paint}>
          <boxGeometry args={[0.14, 0.05, 1.2]} />
        </mesh>
        <mesh position={[-1.32, 0.86, 0]} material={paint}>
          <boxGeometry args={[0.06, 0.16, 1.18]} />
        </mesh>

        {/* headlights — emissive */}
        {[0.55, -0.55].map((z) => (
          <mesh key={z} position={[1.42, 0.42, z]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#fff5d0" emissive="#fff2a0" emissiveIntensity={2.2} />
          </mesh>
        ))}
        {/* taillights */}
        {[0.5, -0.5].map((z) => (
          <mesh key={z} position={[-1.42, 0.52, z]}>
            <boxGeometry args={[0.06, 0.1, 0.32]} />
            <meshStandardMaterial color="#7a1a1a" emissive="#ff4444" emissiveIntensity={1.4} />
          </mesh>
        ))}

        {/* wheels */}
        {[[1.0, 0.7], [1.0, -0.7], [-1.0, 0.7], [-1.0, -0.7]].map(([x, z], i) => (
          <group key={i} position={[x, 0.18, z]}>
            <mesh material={rubber} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.32, 0.32, 0.22, 24]} />
            </mesh>
            <mesh material={rim} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              <cylinderGeometry args={[0.18, 0.18, 0.225, 6]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* nameplate */}
      <Nameplate text="SPORTS — procedural" />
    </>
  );
}

function Nameplate({ text }: { text: string }) {
  // 3D-positioned billboard text using a sprite-equivalent quad
  // No font loading — uses canvas texture.
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 64;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, 512, 64);
    ctx.font = '500 22px ui-monospace, JetBrains Mono, monospace';
    ctx.fillStyle = '#c9a96e';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 38);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [text]);

  return (
    <sprite position={[0, 1.7, 0]} scale={[3.2, 0.4, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}
