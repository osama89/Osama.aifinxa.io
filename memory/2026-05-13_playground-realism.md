---
date: 2026-05-13
operation: playground-realism-pass
skills_used:
  - core-3d-animation:react-three-fiber
  - core-3d-animation:threejs-webgl
  - extended-3d-scroll:lightweight-3d-effects
goal: shift the playground from "stylised procedural" toward photoreal
---

# Playground realism pass

## What changed

### 1. Canvas-level color + shadow pipeline (`components/PlaygroundCanvas.tsx`)
- `<Canvas shadows={{ type: THREE.PCFShadowMap }}>` — shadows on. PCFShadowMap is the explicit type (PCFSoftShadowMap is deprecated in Three 0.184).
- `gl: { toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, outputColorSpace: THREE.SRGBColorSpace }`. ACES gives the cinematic highlight-roll-off that distinguishes "WebGL demo" from "real camera".

### 2. drei `<Environment>` per scene
Photoreal IBL via Poly Haven HDRIs hosted on the pmndrs/assets JSDelivr CDN. `background={false}` so each scene keeps its own backdrop:

| Scene | preset | intensity |
|---|---|---|
| Sports / Truck / Sedan | `city` | 0.85–0.9 |
| Orb | `studio` | 0.7 |
| Beach | `sunset` | 0.6 |
| Earth | `night` | 0.25 |
| Dubai | — | (custom sky shader stays authoritative) |
| Particles / Wave / Swarm / Nebula / Galaxy | — | (additive blending / pointcloud, no IBL benefit) |

The HDRIs are ~3MB each, cached after first load. Suspense fallback (gold torus) covers the load.

### 3. Cinematic Effects (`components/playground/lib/effects.tsx`)
Postprocessing stack rewrote in order:
1. `SMAA` — edge antialiasing
2. `Bloom` — emissive glow (existing)
3. `ChromaticAberration` — subtle RGB fringe (existing)
4. `Vignette` (NEW) — corner darkening, "photographic frame" effect (offset 0.18, darkness 0.55)

EffectComposer multisampling dropped to 0 since SMAA replaces MSAA.

### 4. Reflective showroom floor for vehicles
Replaced the flat dark `<cylinderGeometry>` plinth in Car/Truck/Sedan with drei `<MeshReflectorMaterial>`:
- 14×14 (cars) / 16×16 (truck) plane at the wheel-touch Y position
- `blur=[300, 80]`, `mixStrength=40–50`, `mirror=0.55–0.65`, `roughness=0.65–0.7`
- ContactShadows kept on top (0.45–0.5 opacity) for grounded contact darkening
- Wheels' touch-point geometry recalculated per scene (radius 0.32 / 0.32 / 0.42), floor positioned at -0.12 / -0.14 / -0.20 respectively

### 5. Earth — cloud layer + better lighting
- New `<Clouds>` component: 1.235-radius sphere with a custom GLSL fragment shader (fbm noise → alpha mask, sharpened with `smoothstep(0.50, 0.72)`). Day-side clouds brighten to white; night-side tints deep blue. Rotates at 0.0018 rad/frame, slightly slower than the planet.
- Sun-direction uniform shared with the existing Earth shader so the cloud terminator matches the planet's.
- Environment `night` preset adds dim starlight to the atmosphere fresnel without overwhelming the day-side.

### 6. Per-scene lighting rebalance
Where Environment now provides ambient + IBL, the old three-point + ambient scaffolds were over-bright. Reduced:
- Vehicles: ambient 0.25–0.32 → 0.04–0.05; replaced two spotLights with one shadow-casting directional (intensity 1.2–1.3) + one rim pointLight (intensity 0.25–0.3).
- Beach: ambient 0.45 → 0.25, directional 1.2 → 1.4, hemisphere 0.4 → 0.35.
- Orb: ambient 0.4 → 0.15, directional 0.9 → 0.6.

All shadow-casting directionals got proper bounds (`shadow-camera-{near,far,left,right,top,bottom}`) and `shadow-mapSize-width/height={2048}` for crisp edges, plus `shadow-bias=-0.0008` to kill acne.

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| Dev compile | 224ms incremental after the shadow-type fix |
| HTTP | 200 · 115 KB |
| New runtime warnings | none (resolved the PCFSoftShadowMap deprecation by setting `shadows={{ type: THREE.PCFShadowMap }}` explicitly) |

## Notes / caveats

- `<Environment>` fetches HDRIs from `cdn.jsdelivr.net/gh/pmndrs/assets`. First load on each preset costs ~3MB; cached after. Offline-first deployments would need to vendor the HDRIs into `public/hdr/` and use `<Environment files="/hdr/...exr" />`.
- ACES tone mapping mildly darkens the WebGL portion vs the raw HTML around it. Exposure 1.1 compensates. If the gold of the rest of the site starts looking pale next to scenes, drop exposure to 1.0.
- MeshReflectorMaterial does its own render pass (1024×1024) per frame. The three vehicle scenes pay ~+2ms per frame for this. Other scenes are unaffected.
- The pre-existing `THREE.Clock: This module has been deprecated` warning is unrelated — it originates in drei's animation utilities.
- The `WebGLRenderer: Context Lost` log when rapidly switching scenes is the same as before; the engine recovers automatically.

## Files

```
NEW (within existing files):
  Clouds component in components/playground/scenes/EarthScene.tsx

EDITED
  components/PlaygroundCanvas.tsx                         shadows + ACES tone mapping + Orb env
  components/playground/lib/effects.tsx                   Vignette + SMAA
  components/playground/scenes/CarScene.tsx               Environment + MeshReflectorMaterial + lighting
  components/playground/scenes/TruckScene.tsx             same
  components/playground/scenes/SedanScene.tsx             same
  components/playground/scenes/BeachScene.tsx             Environment "sunset"
  components/playground/scenes/EarthScene.tsx             Environment "night" + Clouds layer
```
