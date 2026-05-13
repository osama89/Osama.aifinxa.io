// Parses DESIGN.md and emits two generated artefacts:
//
//   app/design-tokens.generated.css
//     A `@theme inline` block with all DESIGN.md tokens exposed as Tailwind
//     utilities (`bg-primary`, `text-display-xl`, etc.) and a set of
//     `--design-*` custom properties for direct `var()` use. Also re-exports
//     the project's legacy colour names (`gold`, `gold-light`, `dark`,
//     `surface`) as aliases of the new semantic names so existing call sites
//     keep working.
//
//   components/playground/scenes/design-tokens.generated.ts
//     The same tokens as a typed TS module. Imported by DesignShowcase.tsx
//     so the playground preview never drifts from DESIGN.md.
//
// The DESIGN.md frontmatter is the single source of truth. Do not hand-edit
// the generated files. Run `npm run design:sync` (or any `predev`/`prebuild`
// — they call this script automatically) to regenerate.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const root = dirname(dirname(__filename));

const src = join(root, 'DESIGN.md');
const outCss = join(root, 'app', 'design-tokens.generated.css');
const outTs  = join(root, 'components', 'playground', 'scenes', 'design-tokens.generated.ts');

if (!existsSync(src)) {
  console.warn(`[design:sync] no DESIGN.md at ${src} — skipping`);
  process.exit(0);
}

// ── parse frontmatter ──────────────────────────────────────────────────────

const raw = readFileSync(src, 'utf8');
const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!m) {
  console.error(`[design:sync] DESIGN.md has no YAML frontmatter`);
  process.exit(1);
}

const tokens = parseYaml(m[1]);

// Map DESIGN.md fontFamily names → the CSS vars layout.tsx defines.
// next/font/google injects these CSS variables at the <html> level.
const FONT_VAR = {
  'Playfair Display': 'var(--font-playfair)',
  'Inter': 'var(--font-inter)',
  'JetBrains Mono': 'var(--font-mono)',
};

// Legacy colour aliases this site already uses in JSX / Tailwind utilities.
// Keeping them mapped to the new semantic names lets globals.css and the
// existing arbitrary-value classes (`bg-[#0a0a0a]` etc.) keep working.
const LEGACY = {
  gold: 'primary',
  'gold-light': 'secondary',
  dark: 'neutral',
};

// ── helpers ────────────────────────────────────────────────────────────────

// Convert a YAML value to a CSS dimension. Bare numbers become px.
const dim = (v) => typeof v === 'number' ? `${v}px` : String(v);
// Line-height is special: unitless numbers are valid CSS and represent a
// multiplier of font-size — that's what the spec recommends.
const lh  = (v) => typeof v === 'number' ? String(v) : String(v);

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

// ── CSS output ─────────────────────────────────────────────────────────────

const cssLines = [
  '/* GENERATED FROM DESIGN.md — DO NOT EDIT */',
  '/* Run `npm run design:sync` to regenerate. */',
  '',
  '@theme inline {',
];

// Colours — semantic names from DESIGN.md
for (const [k, v] of Object.entries(tokens.colors ?? {})) {
  cssLines.push(`  --color-${k}: ${v};`);
}

// Legacy colour aliases — kept so existing code paths keep working.
for (const [legacy, semantic] of Object.entries(LEGACY)) {
  if (tokens.colors?.[semantic]) {
    cssLines.push(`  --color-${legacy}: ${tokens.colors[semantic]};`);
  }
}
// `surface` exists under the same name in both old + new, no alias needed.

cssLines.push('');

// Typography — emit text-{name} font sizes + companion `--font-*` families.
for (const [k, t] of Object.entries(tokens.typography ?? {})) {
  cssLines.push(`  --text-${k}: ${dim(t.fontSize)};`);
  cssLines.push(`  --font-weight-${k}: ${t.fontWeight ?? 400};`);
  if (t.letterSpacing != null) cssLines.push(`  --tracking-${k}: ${dim(t.letterSpacing)};`);
  if (t.lineHeight   != null) cssLines.push(`  --leading-${k}: ${lh(t.lineHeight)};`);
}

cssLines.push('}', '');

// :root — granular custom properties for direct var() use elsewhere.
cssLines.push(':root {');

for (const [k, v] of Object.entries(tokens.colors ?? {})) {
  cssLines.push(`  --design-color-${k}: ${v};`);
}

for (const [k, t] of Object.entries(tokens.typography ?? {})) {
  cssLines.push(`  --design-text-${k}-family: ${FONT_VAR[t.fontFamily] ?? `'${t.fontFamily}'`};`);
  cssLines.push(`  --design-text-${k}-size: ${dim(t.fontSize)};`);
  cssLines.push(`  --design-text-${k}-weight: ${t.fontWeight ?? 400};`);
  if (t.letterSpacing != null) cssLines.push(`  --design-text-${k}-letter: ${dim(t.letterSpacing)};`);
  if (t.lineHeight   != null) cssLines.push(`  --design-text-${k}-line: ${lh(t.lineHeight)};`);
}

for (const [k, v] of Object.entries(tokens.spacing ?? {})) {
  cssLines.push(`  --design-spacing-${k}: ${dim(v)};`);
}

for (const [k, v] of Object.entries(tokens.rounded ?? {})) {
  cssLines.push(`  --design-rounded-${k}: ${dim(v)};`);
}

cssLines.push('}', '');

writeFileSync(outCss, cssLines.join('\n'), 'utf8');

// ── TS output ──────────────────────────────────────────────────────────────

const tsColors = Object.entries(tokens.colors ?? {})
  .map(([k, v]) => `  ${JSON.stringify(camel(k))}: ${JSON.stringify(v)},`)
  .join('\n');

const tsType = Object.entries(tokens.typography ?? {}).map(([k, t]) => {
  const fam = FONT_VAR[t.fontFamily] ?? t.fontFamily;
  const parts = [
    `fontFamily: ${JSON.stringify(fam)}`,
    `fontSize: ${JSON.stringify(dim(t.fontSize))}`,
    `fontWeight: ${t.fontWeight ?? 400}`,
  ];
  if (t.lineHeight   != null) parts.push(`lineHeight: ${typeof t.lineHeight === 'number' ? t.lineHeight : JSON.stringify(t.lineHeight)}`);
  if (t.letterSpacing != null) parts.push(`letterSpacing: ${JSON.stringify(dim(t.letterSpacing))}`);
  return `  ${JSON.stringify(camel(k))}: { ${parts.join(', ')} },`;
}).join('\n');

const tsSpacing = Object.entries(tokens.spacing ?? {})
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(dim(v))},`)
  .join('\n');

const tsRounded = Object.entries(tokens.rounded ?? {})
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(dim(v))},`)
  .join('\n');

const ts = `// GENERATED FROM DESIGN.md — DO NOT EDIT
// Run \`npm run design:sync\` to regenerate.

export const designTokens = {
  name: ${JSON.stringify(tokens.name ?? '')},
  description: ${JSON.stringify(tokens.description ?? '')},
  colors: {
${tsColors}
  },
  type: {
${tsType}
  },
  spacing: {
${tsSpacing}
  },
  rounded: {
${tsRounded}
  },
} as const;

export type DesignTokens = typeof designTokens;
`;

writeFileSync(outTs, ts, 'utf8');

console.log(`[design:sync] ${src} -> ${outCss}`);
console.log(`[design:sync] ${src} -> ${outTs}`);
