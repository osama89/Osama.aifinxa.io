---
version: alpha
name: Osama Portfolio — Blueprint Steel
description: A dark blueprint-industrial identity for a personal portfolio. Steel-blue surfaces, a teal-to-cyan accent that drives every interaction, amber as the single warm counterweight, and a precision-instrument typographic system in Inter + JetBrains Mono.
colors:
  primary: "#1ba3b8"
  secondary: "#67e8f9"
  tertiary: "#c9960e"
  neutral: "#0a0e14"
  surface: "#101820"
  on-primary: "#06121a"
  on-neutral: "#e5e9f0"
  text-muted: "#7a8899"
  border-faint: "#2a3a4e"
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: -0.03em
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: -0.025em
  display-md:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.14
    letterSpacing: -0.02em
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
  sm: 6px
  md: 10px
  lg: 16px
  xl: 22px
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
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 12px
  button-ghost:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-neutral}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: 8px
  card-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-neutral}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 16px
  tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: 8px
  tab-inactive:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-neutral}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: 8px
---

# Osama Portfolio — Blueprint Steel

A DESIGN.md describing the visual identity of `osama.aifinxa.io`. This file is the human- and machine-readable source of truth for the palette, typography, spacing, and component tokens used across the site. The identity is a dark, blueprint-industrial system: steel-blue surfaces under a teal-to-cyan accent, amber as the single warm counterweight, and a precision-instrument typographic voice.

## Overview

Engineering-blueprint minimalism rendered in deep navy steel. The UI is built around a near-black blue-ink ground (`{colors.neutral}`), faint blueprint grid lines, and a teal-to-cyan accent (`{colors.primary}` rising to `{colors.secondary}`) that drives every piece of interaction. Where the old identity used a single warm gold, this one runs cool: cyan is the system's pulse, amber (`{colors.tertiary}`) is the only warm note and is reserved for status and emphasis.

Type is a precision instrument, not a broadsheet. **Inter** carries everything — set tight and heavy at display sizes so the headlines read like machined plate, set calm at body sizes for readability. **JetBrains Mono** handles every utility surface: tab labels, terminal output, technical metadata, navigation hints. Mono is always uppercase with generous tracking, evoking an oscilloscope readout rather than a sentence.

Surfaces lift on hairline steel borders and faint cyan glows. Motion is restrained — a colour swap, a 200ms cross-fade, a slow grid drift — never a slam. The feel is "instrument-grade, technical, expensive" — closer to a control-room console than a SaaS dashboard.

## Colors

The palette is rooted in cool steel neutrals with a cyan accent and a single amber counterweight. There is intentionally no gold, no warm chrome on the primary surfaces — only blue-ink, steel, cyan, and a disciplined amber for status.

- **Primary (`#1ba3b8`):** Signal teal. The sole driver of interaction — used for the cursor's hover ring, active tabs, primary buttons, links, callouts, borders on focus. If something is teal, you can act on it.
- **Secondary (`#67e8f9`):** Cyan glow. A brighter cyan used for hover states, emphasis, gradient end-stops, and glow highlights. Always paired with primary as a state variant, never standalone for static UI.
- **Tertiary (`#c9960e`):** Instrument amber. The only warm accent, reserved for status, live indicators, warnings, and technical counters. The cool/warm tension is deliberate; resist expanding it into general decoration.
- **Neutral (`#0a0e14`):** Blue-ink. The dominant background across the entire site. Not pure black — a navy-steel bias keeps it reading as a blueprint ground, not a void.
- **Surface (`#101820`):** Steel panel. One step up from neutral, used to lift floating panels, terminal windows, and the playground overlay.
- **On-primary (`#06121a`):** Text and icons set against a teal background. A deep blue-ink, never pure black.
- **On-neutral (`#e5e9f0`):** Default body text against the blue-ink background. Cool off-white, never pure `#fff`; lower hierarchy is expressed as 70%/55%/35%/18% opacity overlays.
- **Text-muted (`#7a8899`):** Steel-grey for secondary copy, captions, and inactive labels.
- **Border-faint (`#2a3a4e`):** The canonical hairline for inactive borders, dividers, and the blueprint grid.

## Typography

Two typefaces, each with a single, well-defined role. There is no serif — the old Playfair display voice is retired in favour of a tighter, more technical system.

- **Display (Inter, weights 700–800):** Hero headlines, section titles, card titles. Set tight (`-0.02em` to `-0.03em`) and heavy so the type reads like machined plate. Reserved for content the reader is meant to anchor on.
- **Body (Inter, weights 300–400):** Paragraphs, descriptions, captions. Set at 1.6 line-height for long-form readability. Body and display share the family but never the weight or tracking.
- **Labels (JetBrains Mono, weights 400–500):** Tab strips, navigation chrome, terminal output, technical metadata. **Always uppercase, always tracked** (`0.18em`–`0.32em`). The wider the tracking, the smaller the size — `label-xs` at `9px / 0.32em` is the smallest legible mono usage, reserved for ambient group labels and ◆ markers.

Sizes follow a Major Third scale (1.25×) from `9px` mono up to `64px` display. Display sizes stay large — this is a portfolio, not an inbox.

## Layout

Spacing follows an 8-point grid (`{spacing.sm}` = 8px) with two exceptions: `xs` (4px) for hairline gaps inside tab strips, and `2xl` (80px) for breathing room between page sections.

Containers are full-bleed with internal padding rather than constrained max-widths. The site is built section-stack-first — `Loader → Nav → Hero → About → NeuralBrain → ObsidianGraph → Marquee → HorizontalScroll → Contact` — each section owns its own vertical rhythm. Faint blueprint grid backgrounds and radial cyan fades tie the sections into one console surface.

The custom cursor (`cursor: none` globally; `CustomCursor.tsx` renders the visible ring) is part of the layout system. Interactive elements declare themselves with `data-hover="true"` so the cursor knows to expand on hover.

## Shapes

Soft-but-technical corners — `{rounded.md}` (10px) is the working default for panels and buttons, `{rounded.lg}` (16px) for large cards, `{rounded.sm}` (6px) for pills and chips. Borders are hairlines in `{colors.border-faint}`; the teal primary takes over on active/focus, often with a faint cyan glow ring.

## Components

The component layer maps semantic UI patterns to token combinations. Each component declares its `backgroundColor`, `textColor`, `typography`, `rounded`, and `padding` by reference, so a token change in the front matter propagates everywhere.

- **`button-primary` / `button-primary-hover`:** Teal button with blue-ink text. The hover variant brightens to cyan glow. Used for the single primary action on any given screen.
- **`button-secondary`:** Transparent over blue-ink, teal border, teal label. Used alongside `button-primary` when two actions are weighted equally.
- **`button-ghost`:** No background, no border — just ink/70 text with a `data-hover` ring. Used for tertiary navigation (close buttons, "skip" links, inline dismissals).
- **`card-surface`:** The floating panel pattern — steel-panel background, ink text, hairline border, 16px padding, soft 16px radius. Used inside the playground overlay and the terminal.
- **`tab-active` / `tab-inactive`:** The grouped tab strip pattern. Inactive tabs use `label-sm` mono with a faint border; active tabs flip to teal fill with ink text and gain a `motion.span` shared-layout pill underneath.

## Do's and Don'ts

- **Do** keep teal reserved for interaction. If something is teal and *isn't* actionable, the user has been lied to.
- **Do** let the blueprint ground carry the mood — faint grid lines and radial cyan fades over deep navy steel.
- **Do** keep amber disciplined: status, live pulses, counters. It is the only warm note.
- **Don't** reintroduce gold or warm primary surfaces — the identity is cool steel now.
- **Don't** mix typeface roles. Inter for narrative and explanation, Mono for chrome — never Mono for paragraphs.
- **Don't** soften the cursor. The `cursor: none` + `CustomCursor.tsx` system is load-bearing for the brand feel; do not revert to native cursors on individual elements.
