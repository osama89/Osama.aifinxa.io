# 2026-06-08 — Re-theme: Heritage Gold → Blueprint Steel

## What

Re-themed the entire portfolio from the gold/Playfair editorial-noir identity to a
dark **blueprint-industrial** identity matching the SnagIT website. Teal-to-cyan accent,
amber counterweight, navy-steel ground, Inter + JetBrains Mono (serif dropped).

Installed the **`impeccable`** design skill (`.agents/skills/impeccable/`, `skills-lock.json`)
— the same skill used to build SnagIT — and applied its brand-register methodology
(DESIGN.md is the source of truth; portfolio = "design IS the product").

## Palette / type mapping

| Role            | Old (gold)        | New (steel)        |
|-----------------|-------------------|--------------------|
| primary accent  | `#c9a96e`         | `#1ba3b8` (teal)   |
| secondary       | `#e8d5b0`         | `#67e8f9` (cyan)   |
| tertiary        | `#64dfdf` (kept)  | `#c9960e` (amber)* |
| neutral / bg    | `#0a0a0a`         | `#0a0e14` (navy)   |
| surface         | `#111111`         | `#101820` (steel)  |
| on-neutral text | `#ffffff`         | `#e5e9f0` (ink)    |
| display font    | Playfair Display  | Inter 700/800      |

\* `#64dfdf` literals in components were left as-is (already cyan, harmonizes); the
DESIGN.md `tertiary` token was repointed to amber for status/live accents.

## Files changed

- `DESIGN.md` — rewrote frontmatter (colors, typography, rounded scale) + prose. New name
  "Osama Portfolio — Blueprint Steel". This is the source of truth; `npm run design:sync`
  regenerates `app/design-tokens.generated.css` + `components/playground/scenes/design-tokens.generated.ts`.
- `app/globals.css` — new navy ground, teal scrollbar/selection; **added SnagIT utilities**:
  `.bg-blueprint`, `.bg-blueprint-dense`, `.bg-radial-fade`, `.noise`, `.text-gradient`,
  `.text-accent-grad`, `.hr-accent`, `.card`, `.card-glow`, `.pulse-dot`, `.marquee-track`.
  All pre-existing keyframes (shimmer, marquee-scroll, scan-sweep, particle-rise, holo-slide…)
  were preserved — components depend on them. Added `@source not "../graphify-out"` and
  `@source not "../notes"` so Tailwind stops minting dead `text-[#c9a96e]` classes from
  code snippets embedded in the graph cache / wiki.
- `app/layout.tsx` — removed Playfair_Display font load; Inter now carries weights
  300–800 (display needs 700/800); body bg → `#0a0e14`, text → `#e5e9f0`.
- 26 component files — scripted literal sweep: `#c9a96e`/`rgb(201,169,110)` → teal,
  `#e8d5b0`/`rgb(232,213,176)` → cyan, `#0a0a0a` → navy, `#111`/`#111111` → steel,
  `var(--font-playfair)` → `var(--font-inter)`. (Generated token files were excluded from
  the sweep and instead regenerated from DESIGN.md.)

## Verification

- `npx tsc --noEmit` → exit 0.
- `npm run build` → compiled successfully, TypeScript passed, 4 static pages generated.
- Built production CSS: 0 occurrences of `#c9a96e`, 0 `font-playfair`; teal + navy present.
- Dev server served `/` HTTP 200; rendered HTML had 0 gold, 0 playfair, 163 teal refs.
- NOTE: no real-browser screenshot — neither `interceptor` nor `agent-browser` is installed
  on this machine. Visual verification was limited to served HTML + compiled CSS inspection.
  Recommend a manual `npm run dev` + eyeball pass, or install Interceptor, before deploying.

## Rollback

Working tree was clean (only `.obsidian/workspace.json`) at start, so `git restore .` reverts
everything. Or roll back individual files. The one-shot `scripts/retheme-sweep.mjs` used for
the literal sweep was deleted after running (idempotent; recreate from this log if needed).
