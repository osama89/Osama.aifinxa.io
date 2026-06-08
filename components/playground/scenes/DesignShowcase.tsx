'use client';

/**
 * DesignShowcase — Stitch-style preview of the design system.
 *
 * A DOM-only scene (no R3F, no WebGL) that renders the DESIGN.md tokens as
 * a generated marketing-page mockup. Lives inside the playground overlay
 * and swaps the R3F Canvas the same way PlayCanvas does.
 *
 * Tokens come from `design-tokens.generated.ts`, which is regenerated from
 * DESIGN.md by `scripts/sync-design-tokens.mjs` on every `npm run dev`/`build`.
 * Never hand-edit either file — change DESIGN.md and run `npm run design:sync`.
 */

import { useState, type CSSProperties } from 'react';
import { designTokens } from './design-tokens.generated';

// Label tokens always render uppercase — apply that here so callers don't
// have to remember. The generated TS keeps fields neutral so other consumers
// (export to JSON, Figma sync) can decide for themselves.
const UPPER: CSSProperties = { textTransform: 'uppercase' };
const labelCaps = (k: 'labelMd' | 'labelSm' | 'labelXs') =>
  ({ ...designTokens.type[k], ...UPPER }) as CSSProperties;

const tokens = {
  colors: designTokens.colors,
  type: {
    ...designTokens.type,
    // Display-xl/lg get a clamp() for responsive scaling inside the playground.
    // The generated tokens preserve the canonical 64px / 48px from DESIGN.md;
    // we wrap them here without losing fidelity to the source.
    displayXl: { ...designTokens.type.displayXl, fontSize: 'clamp(36px, 5.2vw, 64px)' },
    displayLg: { ...designTokens.type.displayLg, fontSize: 'clamp(28px, 3.6vw, 48px)' },
    labelMd:   labelCaps('labelMd'),
    labelSm:   labelCaps('labelSm'),
    labelXs:   labelCaps('labelXs'),
  },
} as const;

// Display order + label for the Tokens-tab swatches. Hex values come from
// `tokens.colors[key]` at render time so the swatches can never drift from
// what the rest of the preview shows.
const COLOR_ROLES: Array<[keyof typeof tokens.colors, string]> = [
  ['primary',   'PRIMARY'   ],
  ['secondary', 'SECONDARY' ],
  ['tertiary',  'TERTIARY'  ],
  ['neutral',   'NEUTRAL'   ],
  ['surface',   'SURFACE'   ],
  ['onNeutral', 'ON-NEUTRAL'],
];

const TYPE_SAMPLES: Array<[keyof typeof tokens.type, string]> = [
  ['displayXl', 'Display XL'],
  ['displayLg', 'Display LG'],
  ['displayMd', 'Display MD'],
  ['bodyLg',    'Body LG'],
  ['bodyMd',    'Body MD'],
  ['labelMd',   'Label MD'],
  ['labelSm',   'Label SM'],
];

// ── component ──────────────────────────────────────────────────────────────

export default function DesignShowcase() {
  const [tab, setTab] = useState<'preview' | 'tokens' | 'spec'>('preview');

  return (
    <div
      className="w-full h-full overflow-auto"
      style={{ background: tokens.colors.neutral, color: tokens.colors.onNeutral }}
    >
      {/* fake browser chrome */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-2 border-b"
        style={{ background: 'rgba(8,8,12,0.92)', backdropFilter: 'blur(10px)', borderColor: tokens.colors.borderFaint }}
      >
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3a3a3a' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3a3a3a' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: tokens.colors.primary }} />
        </div>
        <div
          className="flex-1 px-3 py-1 border"
          style={{ ...tokens.type.labelXs, color: tokens.colors.textMuted, borderColor: tokens.colors.borderFaint, background: 'rgba(0,0,0,0.4)' }}
        >
          design.md/preview ◆ generated from DESIGN.md
        </div>
        <div className="flex gap-1">
          {(['preview', 'tokens', 'spec'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-hover="true"
              className="h-7 px-2.5 border transition-colors"
              style={{
                ...tokens.type.labelXs,
                background: tab === t ? tokens.colors.primary : 'transparent',
                color: tab === t ? tokens.colors.onPrimary : 'rgba(255,255,255,0.7)',
                borderColor: tab === t ? tokens.colors.primary : 'rgba(255,255,255,0.18)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'preview' && <PreviewMockup />}
      {tab === 'tokens'  && <TokenInspector />}
      {tab === 'spec'    && <SpecPanel />}
    </div>
  );
}

// ── preview tab — Stitch-style landing mockup ─────────────────────────────

function PreviewMockup() {
  return (
    <div className="relative">
      {/* fake nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: tokens.colors.borderFaint }}>
        <div style={{ ...tokens.type.labelMd, color: tokens.colors.primary }}>◆ HERITAGE</div>
        <div className="hidden md:flex gap-5">
          {['Work', 'About', 'Journal', 'Contact'].map((l) => (
            <span key={l} style={{ ...tokens.type.labelSm, color: 'rgba(255,255,255,0.65)' }}>{l}</span>
          ))}
        </div>
        <button
          data-hover="true"
          className="h-8 px-3 border transition-colors"
          style={{ ...tokens.type.labelSm, background: tokens.colors.primary, color: tokens.colors.onPrimary, borderColor: tokens.colors.primary }}
        >
          Hire
        </button>
      </nav>

      {/* hero */}
      <section className="px-6 md:px-10 py-12 md:py-16">
        <div style={{ ...tokens.type.labelSm, color: tokens.colors.primary }} className="mb-4">
          ◆ Portfolio · 2026
        </div>
        <h1 style={{ ...tokens.type.displayXl, color: tokens.colors.onNeutral, maxWidth: '14ch' }}>
          Architecture<br />in motion.
        </h1>
        <p className="mt-5" style={{ ...tokens.type.bodyLg, color: 'rgba(255,255,255,0.7)', maxWidth: '52ch' }}>
          A studio practice exploring computational design, environmental simulation, and
          editorial restraint. Built sharp, set in serifs, lit in gold.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            data-hover="true"
            className="h-10 px-4 border transition-colors"
            style={{ ...tokens.type.labelMd, background: tokens.colors.primary, color: tokens.colors.onPrimary, borderColor: tokens.colors.primary }}
          >
            View work →
          </button>
          <button
            data-hover="true"
            className="h-10 px-4 border transition-colors"
            style={{ ...tokens.type.labelMd, background: 'transparent', color: tokens.colors.primary, borderColor: tokens.colors.primary }}
          >
            Read journal
          </button>
        </div>
      </section>

      {/* feature card grid */}
      <section className="px-6 md:px-10 pb-10 grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { tag: 'Generative',  title: 'Particle Atlas',     body: 'A flow-field study mapping cursor input to vector wind in real time.' },
          { tag: 'Architecture',title: 'Tower Cartography',  body: 'Twelve Dubai landmarks rendered procedurally, each tuned to a tone.' },
          { tag: 'Systems',     title: 'Knowledge Graph',    body: 'AST-derived map of this codebase. 169 nodes. 25 communities. Zero LLM cost.' },
        ].map((c) => (
          <article
            key={c.title}
            className="p-4 border transition-colors hover:border-[#1ba3b8]"
            style={{ background: tokens.colors.surface, borderColor: tokens.colors.borderFaint }}
          >
            <div style={{ ...tokens.type.labelXs, color: tokens.colors.primary }}>◆ {c.tag}</div>
            <h3 className="mt-2.5" style={{ ...tokens.type.displayMd }}>{c.title}</h3>
            <p className="mt-2" style={{ ...tokens.type.bodySm, color: 'rgba(255,255,255,0.6)' }}>{c.body}</p>
            <div className="mt-4 pt-3 border-t" style={{ borderColor: tokens.colors.borderFaint }}>
              <span style={{ ...tokens.type.labelXs, color: 'rgba(255,255,255,0.45)' }}>case study →</span>
            </div>
          </article>
        ))}
      </section>

      {/* stat strip */}
      <section className="px-6 md:px-10 py-8 border-t grid grid-cols-3 gap-4" style={{ borderColor: tokens.colors.borderFaint }}>
        {[
          { v: '12',  l: 'Live scenes'  },
          { v: '169', l: 'Graph nodes'  },
          { v: '04',  l: 'Engines'      },
        ].map((s) => (
          <div key={s.l}>
            <div style={{ ...tokens.type.displayLg, color: tokens.colors.primary, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
            <div className="mt-1" style={{ ...tokens.type.labelXs, color: 'rgba(255,255,255,0.45)' }}>{s.l}</div>
          </div>
        ))}
      </section>

      {/* footer caption */}
      <footer className="px-6 md:px-10 py-5 flex items-center justify-between border-t" style={{ borderColor: tokens.colors.borderFaint }}>
        <span style={{ ...tokens.type.labelXs, color: 'rgba(255,255,255,0.4)' }}>
          ◆ generated from DESIGN.md · @google/design.md@0.1.1
        </span>
        <span style={{ ...tokens.type.labelXs, color: tokens.colors.primary }}>
          osama.aifinxa.io
        </span>
      </footer>
    </div>
  );
}

// ── tokens tab — palette + type scale + components ────────────────────────

function TokenInspector() {
  return (
    <div className="px-6 md:px-10 py-8 space-y-10">
      <section>
        <div style={{ ...tokens.type.labelMd, color: tokens.colors.primary }} className="mb-4">◆ Colors</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {COLOR_ROLES.map(([key, label]) => {
            const hex = tokens.colors[key];
            return (
              <div key={key} className="flex items-center gap-3 p-3 border" style={{ borderColor: tokens.colors.borderFaint, background: tokens.colors.surface }}>
                <div className="w-12 h-12 border" style={{ background: hex, borderColor: 'rgba(255,255,255,0.08)' }} />
                <div className="flex-1 min-w-0">
                  <div style={{ ...tokens.type.labelSm, color: tokens.colors.onNeutral }}>{label}</div>
                  <div style={{ ...tokens.type.labelXs, color: 'rgba(255,255,255,0.45)' }} className="mt-1">{hex}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div style={{ ...tokens.type.labelMd, color: tokens.colors.primary }} className="mb-4">◆ Typography</div>
        <div className="space-y-4">
          {TYPE_SAMPLES.map(([key, label]) => {
            const style = tokens.type[key];
            return (
              <div key={key} className="flex items-baseline gap-6 pb-3 border-b" style={{ borderColor: tokens.colors.borderFaint }}>
                <div className="w-24 shrink-0" style={{ ...tokens.type.labelXs, color: 'rgba(255,255,255,0.5)' }}>{label}</div>
                <div style={style}>The quick brown fox</div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div style={{ ...tokens.type.labelMd, color: tokens.colors.primary }} className="mb-4">◆ Components</div>
        <div className="flex flex-wrap gap-3">
          <button data-hover="true" className="h-10 px-4 border" style={{ ...tokens.type.labelMd, background: tokens.colors.primary, color: tokens.colors.onPrimary, borderColor: tokens.colors.primary }}>
            button-primary
          </button>
          <button data-hover="true" className="h-10 px-4 border" style={{ ...tokens.type.labelMd, background: tokens.colors.secondary, color: tokens.colors.onPrimary, borderColor: tokens.colors.secondary }}>
            primary-hover
          </button>
          <button data-hover="true" className="h-10 px-4 border" style={{ ...tokens.type.labelMd, background: 'transparent', color: tokens.colors.primary, borderColor: tokens.colors.primary }}>
            button-secondary
          </button>
          <button data-hover="true" className="h-10 px-4" style={{ ...tokens.type.labelSm, background: 'transparent', color: 'rgba(255,255,255,0.7)' }}>
            button-ghost
          </button>
        </div>
      </section>
    </div>
  );
}

// ── spec tab — quick reference ─────────────────────────────────────────────

function SpecPanel() {
  return (
    <div className="px-6 md:px-10 py-8 space-y-6 max-w-3xl">
      <div>
        <div style={{ ...tokens.type.labelMd, color: tokens.colors.primary }} className="mb-3">◆ DESIGN.md</div>
        <p style={{ ...tokens.type.bodyMd, color: 'rgba(255,255,255,0.78)' }}>
          A single Markdown file with YAML frontmatter that describes the entire visual identity:
          palette, typography, spacing, components, and the prose rationale behind each choice.
          Human-editable. Agent-consumable. Lints clean against the alpha spec.
        </p>
      </div>

      <pre
        className="p-4 overflow-auto border"
        style={{
          ...tokens.type.bodySm,
          fontFamily: 'var(--font-mono)',
          background: tokens.colors.surface,
          borderColor: tokens.colors.borderFaint,
          color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.55,
        }}
      >{`---
version: alpha
name: Osama Portfolio — Heritage Gold
colors:
  primary:   "#1ba3b8"   # interaction
  secondary: "#67e8f9"   # hover / emphasis
  tertiary:  "#64dfdf"   # technical UI
  neutral:   "#0a0e14"   # page background
typography:
  display-xl: Playfair 900 · 64px
  body-md:    Inter 400 · 16px
  label-md:   JetBrains Mono 500 · 12px / 0.18em
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor:       "{colors.on-primary}"
---`}</pre>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border" style={{ borderColor: tokens.colors.borderFaint, background: tokens.colors.surface }}>
          <div style={{ ...tokens.type.labelXs, color: tokens.colors.primary }} className="mb-2">◆ lint</div>
          <pre style={{ ...tokens.type.bodySm, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.7)' }}>npm run design -- lint DESIGN.md</pre>
        </div>
        <div className="p-4 border" style={{ borderColor: tokens.colors.borderFaint, background: tokens.colors.surface }}>
          <div style={{ ...tokens.type.labelXs, color: tokens.colors.primary }} className="mb-2">◆ export tailwind</div>
          <pre style={{ ...tokens.type.bodySm, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.7)' }}>npm run design -- export --format tailwind DESIGN.md</pre>
        </div>
      </div>
    </div>
  );
}
