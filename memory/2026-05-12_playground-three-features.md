---
date: 2026-05-12
operation: playground-three-extensions
skills_used:
  - core-3d-animation:react-three-fiber
  - extended-3d-scroll:playcanvas-engine
  - motion-framer
  - ui-ux-pro-max
new_deps:
  - "playcanvas@^2.x"
---

# Playground — three extensions (day/night Dubai, vehicle paint, PlayCanvas engine)

## What changed

### 1. Day/night Dubai
- `components/playground/scenes/DubaiScene.tsx` — added `timeOfDay` prop (0..1) and a `computeSky(t)` helper that returns sun direction/intensity/colour, ambient, sky top/horizon, ground + water tints, and `nightBoost = 1 - daylight`.
- New `<Sky />` background sphere with a custom 2-stop gradient shader (zenith ↔ horizon), animated each frame from CSS color strings.
- Tower window emissive material rebuilt per `(highlighted, nightBoost)` — windows go warm (#fff2a0) at night, dim at noon. Filler skyline picks up the same boost.
- Ground + Gulf water colors animate with daylight.
- New control panel in `PlaygroundCanvas.tsx`: time-of-day slider (0.005 step), DAY / NIGHT / AUTO buttons. AUTO cycles `t` by +0.005 every 60ms (~60s full cycle).
- Default `timeOfDay = 0.78` (sunset) because it shows the shader work best.

### 2. Vehicle paint picker
- `CarScene` / `TruckScene` / `SedanScene` — body material lifted to a `paintColor` prop with the original colour kept as the default. `useMemo` dep added so the material rebuilds on change.
- `PlaygroundCanvas` keeps `paint: { car, truck, sedan }` state, renders an 8-swatch grid (gold, black, beige, blue, red, navy, charcoal, silver) when on a vehicle tab. Active swatch gets a 2px ring + 8% scale bump.

### 3. PlayCanvas engine variant
- New dep `playcanvas` (~400KB). New file `components/playground/PlayCanvasDemo.tsx`.
- 3×3 grid of cubes, each with its own `pc.StandardMaterial` (metalness workflow), gentle bob + rotation, palette-cycle on click.
- Manual ray-vs-AABB picking using `pc.Ray` + `pc.BoundingBox.intersectsRay` — no physics dep needed.
- Three-point lighting (warm key + cool fill + amber rim), camera auto-orbits at radius 7.
- `pc.Application.destroy()` runs on unmount; window resize listener cleaned up.
- New tab group ENGINES with a single PLAYCANVAS tab. `PlaygroundCanvas` swaps the entire R3F `<Canvas>` for `<PlayCanvasDemo />` when active, so two WebGL contexts never coexist.
- Component is dynamic-imported via `next/dynamic({ ssr: false, loading: <golden text> })` — the playcanvas runtime only loads when the user picks the tab.

## ui-ux-pro-max checks applied

- Time slider — uses native `input[type=range]` with `accent-color: GOLD` (system control over fully custom, per HIG rule `system-controls`)
- All new buttons ≥36px tall, ≥44px min-width, `aria-pressed`, `aria-label`
- Tabs panel still grouped (GENERATIVE / VEHICLES / WORLD / ENGINES) with dividers
- Auto-cycle button has clear pressed-state styling (gold border + tint)
- All overlays gated through framer's `AnimatePresence` with reduced-motion respected
- PlayCanvas default clear colour matches the rest of the playground (#07070b) for visual continuity

## Files

```
NEW
  components/playground/PlayCanvasDemo.tsx

REWROTE
  components/playground/scenes/DubaiScene.tsx        — timeOfDay + Sky + sun/ambient + nightBoost
  components/PlaygroundCanvas.tsx                    — ENGINES group, paint state, time slider, swap R3F↔PC

EDITED
  components/playground/scenes/CarScene.tsx          — paintColor prop
  components/playground/scenes/TruckScene.tsx        — paintColor prop
  components/playground/scenes/SedanScene.tsx        — paintColor prop
  package.json                                        — +playcanvas
```

## Verification

- `tsc --noEmit` — clean (caught one `Vec3.scale` → `mulScalar` issue, fixed)
- Dev server: `✓ Compiled in 2.6s` (initial PC parse) → `✓ Compiled in 76ms` (incremental). HTTP 200.
- No new warnings in `.next/dev/logs/next-development.log` from this work.

## Outstanding / known limitations

- The Auto-cycle interval ticks every 60ms — keeps `setTimeOfDay` running and triggers a re-memo on `computeSky`. Material objects are recreated each tick for all visible towers (74 buildings). Acceptable but not free; if perf becomes an issue, materials should switch to `useRef`+`useFrame` updates instead of useMemo rebuilds.
- The Dubai filler skyline `useMemo` was previously dependency-free; with `nightBoost` now driving its emissive, each frame re-renders 64 boxes. Three's per-frame material upload is cheap, no change needed.
- The PlayCanvas scene currently shares no styling/data with the R3F scenes. Could be extended (e.g. mirror the Dubai data into a PC scene) but that's out of scope.
- A11y: the time slider's value isn't announced to screen readers as anything more than "0..1". A future polish pass should add `aria-valuetext` showing the formatted clock time.
