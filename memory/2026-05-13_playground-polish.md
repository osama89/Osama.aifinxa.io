---
date: 2026-05-13
operation: playground-polish-pass
skills_used:
  - core-3d-animation:react-three-fiber
  - core-3d-animation:gsap-scrolltrigger
  - motion-framer
  - animated-component-libraries
---

# Playground polish pass

## What shipped

### 1. GALAXY scene (`components/playground/scenes/GalaxyScene.tsx`)
- 12,000 particles distributed across 5 logarithmic-spiral arms with per-arm jitter and a radial-bulge core
- Vertex colours form a 4-stop gradient (warm-core → gold-mid → cyan-rim, sprinkled violet rare stars), boosted +50% inside the core for stronger bloom interaction
- Keplerian rotation: inner orbits faster than outer, no rigid-body wheeling
- Mouse acts as a tangential perturbation — particles curve *around* the cursor (not toward it), preserving the disc
- Two additive core-glow spheres ensure the postprocessing Bloom (intensity 1.6, threshold 0.15) has something dense to spread from
- Wired into `PlaygroundCanvas` as the 6th GENERATIVE tab

### 2. layoutId tab indicator (motion-framer)
- Replaced the per-tab `background` toggle with a shared `<motion.span layoutId="tab-pill">` inside the active button. Framer Motion morphs the single gold pill between tabs with a `spring(380, 30)` so it visibly flies between buttons rather than appearing instantly.
- Active text colour and gold border still apply per tab so the destination is clear before the pill arrives.
- Reduced-motion branch renders a plain `<span>` instead of `<motion.span>`, so no morph runs.

### 3. CountUp Dubai stats
- Tiny inline `CountUp` component at the bottom of `PlaygroundCanvas.tsx` — ease-out cubic from 0 to target via `requestAnimationFrame`, no extra dep.
- Used in the tower info panel for height (`{n}m`) and floors. Year + neighbourhood stay static (they're facts, not metrics).
- Animation restarts on every tower switch because the wrapping `motion.div` already has `key={selected.id}`, forcing a remount of CountUp.

### 4. Arrow-key tab navigation
- `useEffect` on `PlaygroundCanvas` listens globally for `ArrowLeft` / `ArrowRight`. Cycles `DEMOS` index with wrap-around.
- Skips when the event target is `INPUT`/`TEXTAREA`/`SELECT` — preserves the Dubai time slider's native left/right step behaviour.

### 5. Fullscreen mode + Esc handling (`components/PlaygroundWindow.tsx`)
- Green traffic light is now a real fullscreen toggle (was a static placeholder).
- Fullscreen state: window swaps from `fixed top-28 w-[680px]` chrome to `fixed inset-0 w-full h-full`. Drag is disabled. Body height switches from `460` to `100%`.
- `PlaygroundCanvas` root and `PlayCanvasDemo` root both changed from `style={{ height: 460 }}` to `className="h-full"`, so they inherit the parent height in both modes.
- Esc key — exits fullscreen, or closes the window when already docked.
- Title bar now shows "playground · fullscreen" in fullscreen, plus a "◀ ▶ switch · Esc close" hint on `md+`.

### 6. GSAP open-cascade timeline (`@gsap/react`)
- `useGSAP` hook scoped to the window container runs a 4-step `gsap.timeline` every time `isOpen` flips to true:
  1. Title bar fade from `y: -6`
  2. Three traffic lights pop in with `stagger: 0.06` and `back.out(1.8)` easing
  3. Title text fade
  4. Body reveal fade
- Total duration ~0.6s, all overlapping (`'-=0.16'` style). Pre-existing Framer entrance on the window itself (scale + slide) still plays — the GSAP layer adds the internal cascade.
- Gated on `prefers-reduced-motion` — entire timeline skipped when set.
- `useGSAP` handles cleanup automatically via the `scope` option.

## Files

```
NEW
  components/playground/scenes/GalaxyScene.tsx

EDITED
  components/PlaygroundCanvas.tsx          GALAXY tab + render case, layoutId pill,
                                           CountUp component + usage, ←/→ keydown,
                                           h-full root
  components/PlaygroundWindow.tsx          fullscreen state + 3rd traffic light,
                                           Esc handler, GSAP open timeline, h-full body
  components/playground/PlayCanvasDemo.tsx h-full root (was fixed 460)
```

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| Dev compile | 141ms incremental |
| HTTP | 200 · 115 KB |
| New warnings in dev log | none |

## Notes / caveats

- `useGSAP` is from `@gsap/react@^2.1.2`, already in deps from earlier work; no new package.
- The layoutId animation depends on framer-motion's layout system. If something ever wraps the tab strip in a `<motion.div layout>`, it'll fight the pill — keep the parent non-`layout`.
- Fullscreen reuses the window's existing z-index (`z-[998]`). The Terminal sits at the same z; if both are open simultaneously the most-recently-opened wins. Fine for now.
- 13 demos total (Particles, Orb, Swarm, Wave, Nebula, **Galaxy**, Sports, Truck, Sedan, Beach, Earth, Dubai, PlayCanvas).
