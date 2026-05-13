'use client';

/**
 * Cinematic postprocessing stack for the Playground.
 *
 *   Bloom              — HDR glow on emissive surfaces
 *   ChromaticAberration — subtle RGB fringing (Lusion / Bruno Simon look)
 *   Vignette           — soft corner darkening, gives the canvas
 *                        a "photographic frame" feel
 *   SMAA               — edge antialiasing on top of MSAA
 *
 * Auto-disables when prefers-reduced-motion is set, or when
 * bloomIntensity is 0.
 */

import { useEffect, useState } from 'react';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  SMAA,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

export default function Effects({
  bloomIntensity = 0.6,
  bloomThreshold = 0.55,
  chromatic = 0.0008,
  vignetteDarkness = 0.55,
}: {
  bloomIntensity?: number;
  bloomThreshold?: number;
  chromatic?: number;
  vignetteDarkness?: number;
}) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (reduced || bloomIntensity <= 0) return null;

  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <ChromaticAberration
        offset={new THREE.Vector2(chromatic, chromatic)}
        radialModulation={false}
        modulationOffset={0}
        blendFunction={BlendFunction.NORMAL}
      />
      <Vignette
        offset={0.18}
        darkness={vignetteDarkness}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
