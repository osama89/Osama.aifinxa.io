'use client';

/**
 * Shared camera + controls for every Playground scene.
 *
 * Sets the camera once on mount, then hands control to drei
 * OrbitControls so the user can grab-rotate, scroll-zoom, and
 * (optionally) the camera auto-orbits while idle.
 *
 * Respects prefers-reduced-motion: disables autoRotate when set.
 */

import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  position: [number, number, number];
  target?: [number, number, number];
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enableZoom?: boolean;
  enablePan?: boolean;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
}

export default function SceneCamera({
  position,
  target = [0, 0, 0],
  autoRotate = true,
  autoRotateSpeed = 0.5,
  enableZoom = true,
  enablePan = false,
  minDistance = 2,
  maxDistance = 60,
  minPolarAngle = 0.2,
  maxPolarAngle = Math.PI - 0.2,
}: Props) {
  const { camera } = useThree();
  const targetVec = useMemo(() => new THREE.Vector3(...target), [target]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(targetVec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return (
    <OrbitControls
      makeDefault
      target={targetVec}
      autoRotate={autoRotate && !reducedMotion}
      autoRotateSpeed={autoRotateSpeed}
      enableZoom={enableZoom}
      enablePan={enablePan}
      enableDamping
      dampingFactor={0.08}
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={minPolarAngle}
      maxPolarAngle={maxPolarAngle}
    />
  );
}
