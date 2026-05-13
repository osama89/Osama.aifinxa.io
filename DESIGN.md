---
version: alpha
name: Osama Portfolio — Heritage Gold
description: A premium-matte, editorial-noir identity for a personal portfolio. Sharp corners, generous letter-spacing, gold as the only chromatic accent against deep ink.
colors:
  primary: "#c9a96e"
  secondary: "#e8d5b0"
  tertiary: "#64dfdf"
  neutral: "#0a0a0a"
  surface: "#111111"
  on-primary: "#0a0a0a"
  on-neutral: "#ffffff"
  text-muted: "#a3a3a3"
  border-faint: "#1f1f1f"
typography:
  display-xl:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.015em
  display-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 300
    lineHeight: 1.55
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.18em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0.22em
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 9px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0.32em
rounded:
  none: 0px
  sm: 2px
  md: 4px
  lg: 8px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  "2xl": 80px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: 12px
  button-ghost:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-neutral}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.none}"
    padding: 8px
  card-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-neutral}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 16px
  tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.none}"
    padding: 8px
  tab-inactive:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-neutral}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.none}"
    padding: 8px
---

# Osama Portfolio — Heritage Gold

A DESIGN.md describing the visual identity of `osama.aifinxa.io`. This file is the human- and machine-readable source of truth for the palette, typography, spacing, and component tokens used across the site.

## Overview

Architectural minimalism meets editorial noir. The UI is built around deep ink, generous negative space, and a single chromatic accent — a warm, museum-catalog gold (`{colors.primary}`) — which is the sole driver of interaction. Everything that is gold is clickable; nothing else is.

Type does the heavy lifting. **Playfair Display** carries the narrative — long, slow, serif headlines that feel like a printed broadsheet. **Inter** sits underneath for body copy. **JetBrains Mono** handles every utility surface: tab labels, terminal output, technical metadata, navigation hints. Mono is always uppercase with generous tracking, evoking a precision instrument rather than a sentence.

Corners are sharp. Borders are hairlines. Motion is restrained — most interaction is a colour swap or a 200ms cross-fade, never a slam. The feel is "precise, expensive, considered" — closer to a Swiss design book than a SaaS dashboard.

## Colors

The palette is rooted in high-contrast neutrals and a single accent. There is intentionally no blue, no green chrome — only ink, paper, and gold.

- **Primary (`#c9a96e`):** Heritage gold. The sole driver of interaction — used for the cursor's hover ring, active tabs, primary buttons, links, callouts. If something is gold, you can click it.
- **Secondary (`#e8d5b0`):** Champagne. A lighter gold used for hover states, emphasis, secondary highlights. Never used standalone for interaction — always paired with primary as a state variant.
- **Tertiary (`#64dfdf`):** Lagoon teal. The only non-gold accent, reserved for technical/system surfaces — playground scene highlights, audio cues, debug indicators. Never appears in the main marketing surfaces.
- **Neutral (`#0a0a0a`):** Deep ink. The dominant background colour across the entire site. Not pure black — a fractional warm bias keeps it from feeling clinical.
- **Surface (`#111111`):** Card. One step up from neutral, used to lift floating panels, terminal windows, and the playground overlay.
- **On-primary (`#0a0a0a`):** Text and icons set against a gold background. Always the deep-ink neutral, never pure black.
- **On-neutral (`#ffffff`):** Default body text against the deep ink background. Pure white is used at 100%; lower hierarchy is expressed as 70%/55%/35%/18% opacity overlays.

## Typography

Three typefaces, each with a single, well-defined role. There is no general-purpose font — every level has a reason.

- **Display (Playfair Display, weights 700–900):** Hero headlines, section titles, tower names, exhibition-card titles. Always set tight (`-0.01em` to `-0.02em`) so the serifs lock together. Reserved for content that the reader is *meant* to slow down for.
- **Body (Inter, weights 300–500):** Paragraphs, descriptions, captions. Set at 1.6 line-height for long-form readability. Inter is the workhorse — never used for headlines, never used for labels.
- **Labels (JetBrains Mono, weights 400–500):** Tab strips, navigation chrome, terminal output, technical metadata. **Always uppercase, always tracked** (`0.18em`–`0.32em`). The wider the tracking, the smaller the size — `label-xs` at `9px / 0.32em` is the smallest legible mono usage and is reserved for ambient group labels and ◆ markers.

Sizes follow a Major Third scale (1.25×) from `9px` mono up to `64px` display. The display sizes are intentionally large — this is a portfolio, not an inbox; the headlines are meant to dominate.

## Layout

Spacing follows an 8-point grid (`{spacing.sm}` = 8px) with two exceptions: `xs` (4px) for hairline gaps inside tab strips, and `2xl` (80px) for breathing room between page sections.

Containers are full-bleed with internal padding rather than constrained max-widths. The site is built section-stack-first — `Loader → Nav → Hero → About → NeuralBrain → ObsidianGraph → Marquee → HorizontalScroll → Contact` — each section owns its own vertical rhythm.

The custom cursor (`cursor: none` globally; `CustomCursor.tsx` renders the visible ring) is part of the layout system. Interactive elements declare themselves with `data-hover="true"` so the cursor knows to expand on hover.

## Shapes

Sharp corners are the default — `{rounded.none}`. The optional scale exists for inline pills and the occasional avatar/badge, but the dominant surfaces (cards, buttons, tab strips, terminal chrome) are rectangular with hairline borders. Border colour is almost never solid white — `rgba(255,255,255,0.18)` is the canonical hairline for inactive states; the gold primary takes over on active/focus.

## Components

The component layer maps semantic UI patterns to token combinations. Each component declares its `backgroundColor`, `textColor`, `typography`, `rounded`, and `padding` by reference, so a token change in the front matter propagates everywhere.

- **`button-primary` / `button-primary-hover`:** Gold button with deep-ink text. The hover variant lightens to champagne. Used for the single primary action on any given screen.
- **`button-secondary`:** Transparent over deep ink, gold border, gold label. Used alongside `button-primary` when two actions are weighted equally.
- **`button-ghost`:** No background, no border — just white/70 text with a `data-hover` ring. Used for tertiary navigation (close buttons, "skip" links, inline dismissals).
- **`card-surface`:** The floating panel pattern — surface background, white text, hairline border, 16px padding. Used inside the playground overlay (paint picker, time control, tower info) and the terminal.
- **`tab-active` / `tab-inactive`:** The grouped tab strip pattern. Inactive tabs use `label-sm` mono with a faint border; active tabs flip the colours (gold fill, ink text) and gain a `motion.span` shared-layout pill underneath.

## Do's and Don'ts

- **Do** keep gold reserved for interaction. If something is gold and *isn't* clickable, the user has been lied to.
- **Do** lead with type. The site is text-forward — visuals exist to support the copy, not the other way around.
- **Do** preserve sharp corners. The brand is editorial, not friendly-rounded.
- **Don't** introduce new accent colours. The teal `{colors.tertiary}` exists because the playground needed a secondary system colour for technical UI; resist the urge to expand it.
- **Don't** mix typeface roles. Playfair for narrative, Inter for explanation, Mono for chrome — never the other way around.
- **Don't** soften the cursor. The `cursor: none` + `CustomCursor.tsx` system is load-bearing for the brand feel; do not revert to native cursors on individual elements.
