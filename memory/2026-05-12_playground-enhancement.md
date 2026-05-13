---
date: 2026-05-12
operation: playground-enhancement-pass
skills_used:
  - core-3d-animation:react-three-fiber
  - core-3d-animation:threejs-webgl
  - extended-3d-scroll:lightweight-3d-effects
  - ui-ux-pro-max
  - motion-framer
new_deps:
  - "@react-three/postprocessing@^3.0.4"
---

# Playground enhancement pass

## What changed

1. **Postprocessing pipeline** — added `@react-three/postprocessing` and a reusable `components/playground/lib/effects.tsx` wrapper (Bloom + ChromaticAberration). Per-scene bloom intensity table lives in `PlaygroundCanvas.tsx` (`DEMOS` array, `bloom` field). Auto-disabled when `prefers-reduced-motion: reduce`.

2. **Unified camera + controls** — every scene now uses `components/playground/lib/scene-camera.tsx`, which sets the initial camera pose then hands off to drei `<OrbitControls makeDefault enableDamping autoRotate />`. Replaces 6 separate hand-rolled `CameraRig` functions across CarScene/TruckScene/SedanScene/BeachScene/EarthScene/DubaiScene. User can drag-rotate and scroll-zoom every scene; autoRotate disables under reduced motion.

3. **New NEBULA scene** — `components/playground/scenes/NebulaScene.tsx`. 2,500 particles integrated through a divergence-free curl-noise field (finite-difference derivative of stacked sines), tri-stop palette (gold→cyan→violet) by radial band, mouse-driven swirl attractor, AdditiveBlending. Designed to maximize bloom interaction (intensity 1.4, threshold 0.15) — the most Lusion-feeling scene in the set.

4. **UX/a11y refinements per ui-ux-pro-max rules**:
   - Tabs grouped into `GENERATIVE / VEHICLES / WORLD` with category labels and dividers
   - Tab buttons: 36px tall, ≥44px wide, `aria-pressed`, `aria-label` includes scene description, `focus-visible` ring (rules §1 `focus-states` + §2 `touch-target-size`)
   - Tower close-button: now 32×32 hit area instead of inline icon (§2 `touch-target-size`)
   - AnimatePresence cross-fade on scene hint + Dubai info panel (§7 `motion-meaning`, exit-faster-than-enter respected)
   - All animations gated on `prefers-reduced-motion` (§7 `reduced-motion`)
   - Hint text contrast raised from `rgba(255,255,255,0.4)` to `0.55` (§6 `color-accessible-pairs`)
   - Suspense fallback inside Canvas now renders a rotating gold torus loader instead of `null`

## Per-scene bloom budget

| Scene | bloom | threshold | rationale |
|---|---|---|---|
| nebula | 1.4 | 0.15 | The hero scene — particles are emissive points |
| earth | 0.75 | 0.55 | Sun + city lights need glow |
| sports / orb / wave / particles | 0.4 | 0.55 | Subtle paint reflections + emissive accents |
| beach | 0.25 | 0.55 | Water specular only — keep horizon natural |

## Files

```
NEW:
  components/playground/lib/scene-camera.tsx        Shared camera + OrbitControls
  components/playground/lib/effects.tsx             Bloom/Chromatic wrapper
  components/playground/scenes/NebulaScene.tsx      Curl-noise fluid particles

REWROTE:
  components/PlaygroundCanvas.tsx                   Bloom, NEBULA tab, grouped UX, AnimatePresence transitions, reduced-motion

EDITED (CameraRig → SceneCamera):
  components/playground/scenes/CarScene.tsx
  components/playground/scenes/TruckScene.tsx
  components/playground/scenes/SedanScene.tsx
  components/playground/scenes/BeachScene.tsx
  components/playground/scenes/EarthScene.tsx
  components/playground/scenes/DubaiScene.tsx

CHANGED:
  package.json (+@react-three/postprocessing)
```

## Verification

- `tsc --noEmit` — clean
- Dev server (port 3000, PID 16852) — `✓ Compiled in 903ms`, HTTP 200
- No new warnings in `.next/dev/logs/next-development.log` related to the changes
- 2 moderate npm audit advisories in transitive deps (pre-existing, not from this work)

## Outstanding / future

- **Day/night Dubai** + time-of-day slider — not done; would need a `timeOfDay` uniform threaded through Ground/sky materials in DubaiScene plus a side control
- **Paint color picker** for vehicles — not done; would lift body material color out of the scene file into a prop
- **PlayCanvas alt build** — skill is loaded, not used here; portfolio is committed to R3F
