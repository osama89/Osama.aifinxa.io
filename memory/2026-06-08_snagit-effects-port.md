# 2026-06-08 — Port SnagIT effects: live location, Dubai clock, 3D world map, hero FX

## What

Ported four SnagIT website features into the portfolio (same Blueprint Steel palette):

1. **Live location tag** + **Dubai analog/digital clock** — floating top-right of the Hero.
2. **3D WebGL world map** (rotating globe, GCC pins, animated arc trails, real continents
   from `land-110m.json`) — in a new **"Based in Dubai · GCC"** section before Contact.
3. **Animated hero background FX** — parallax blueprint grid layers + radial cyan glow
   (`MotionLayerScroller`) and drifting `FloatingPins`.
4. **Interactive portrait ID card** (tilt-on-cursor, duotone, scanlines) — placed in the
   new region section. NOTE: the About section already has a rich photo card using the same
   `/images/photo.jpg`; the region-section card is a smaller "operator ID" variant. Either
   is easy to drop if it reads as redundant.

## Source

`OneDrive…/OGH-ProjectMgmt/SnagIT/Website/components/effects` (and `sections/RegionalReach.tsx`,
`sections/Hero.tsx`).

## Files added

- `components/effects/Ping.tsx` (clsx dependency removed → template string)
- `components/effects/LiveLocation.tsx` (lucide-react MapPin → inline SVG; label "Dubai, UAE")
- `components/effects/LiveWatch.tsx` (verbatim; Asia/Dubai timezone)
- `components/effects/MotionLayerScroller.tsx` (verbatim)
- `components/effects/InteractivePortrait.tsx` (verbatim; next/image)
- `components/effects/GlobeWebGL.tsx` (verbatim; R3F + drei OrbitControls + topojson)
- `components/RegionalReach.tsx` (NEW section, Osama-adapted copy)
- `public/land-110m.json` (53.9 KB world-atlas topojson, copied from SnagIT)

## Files changed

- `app/globals.css` — added a `:root` block of SnagIT-compatible `--color-*` vars
  (`--color-bg/-surface/-steel/-line/-accent/-accent-2/-accent-glow/-amber/-ink/-muted/-muted-2`)
  so ported components render in the Blueprint Steel palette. (Utility classes like
  `.bg-blueprint`, `.bg-radial-fade`, `.card` were already added during the re-theme.)
- `components/Hero.tsx` — imported MotionLayerScroller + LiveLocation + LiveWatch; added the
  background FX layer (-z-10), a local `FloatingPins` component, and the floating
  location+clock cluster (top-right, lg only). Pins constrained to left/center so they don't
  collide with the AgentNetwork (right) or the clock cluster (top-right).
- `app/page.tsx` — import + render `<RegionalReach />` between HorizontalScroll and Contact.

## Dependencies

- `topojson-client` (runtime), `@types/topojson-client`, `@types/topojson-specification`,
  `@types/geojson` (dev). Installed via npm. R3F/drei/three/framer-motion already present.

## Verification

- `npx tsc --noEmit` → exit 0.
- `npm run build` → compiled successfully, TypeScript passed, static pages generated.
- Dev runtime: `/` 200, `/land-110m.json` 200 (55 KB), new `id="region"` section + clock +
  portrait SSR-render; no runtime errors in dev log; globe (ssr:false) fetches map data OK.
- Same caveat as the re-theme: no real-browser screenshot (interceptor/agent-browser not
  installed). Eyeball `npm run dev` to confirm the globe rotation + clock visuals.

## Rollback

`git restore .` (plus remove untracked: components/effects/, components/RegionalReach.tsx,
public/land-110m.json) and `npm install` to drop the topojson deps from package.json.
