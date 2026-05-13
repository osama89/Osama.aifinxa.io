// Mirrors graphify-out/graph.json into public/graph/graph.json so the
// browser can fetch it from a static path. Idempotent and silent on no-op.
//
// Run by:
//   npm run graph:sync   (also runs `graphify update .` first)
//   npm run dev          (via `predev`)
//   .git/hooks/post-commit  (after `graphify hook install`)

import { mkdirSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = dirname(dirname(__filename));

const src = join(root, 'graphify-out', 'graph.json');
const dst = join(root, 'public', 'graph', 'graph.json');

if (!existsSync(src)) {
  console.warn(`[graph:sync] no source at ${src} — run \`graphify update .\` first`);
  process.exit(0);
}

mkdirSync(dirname(dst), { recursive: true });
copyFileSync(src, dst);

const bytes = statSync(dst).size;
console.log(`[graph:sync] ${src} -> ${dst} (${bytes} bytes)`);
