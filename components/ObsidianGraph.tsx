'use client';

/**
 * ObsidianGraph — interactive Obsidian-style force-directed graph
 * rendered from /graph/graph.json (built by `graphify update .`).
 *
 * 2D canvas + a tiny velocity-Verlet physics loop. No heavy deps:
 * keeps bundle small and matches the portfolio's other hand-rolled
 * canvas pieces.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─── types ─────────────────────────────────────────────────────────────────

interface RawNode {
  id: string;
  label: string;
  community?: number;
  file_type?: string;
  source_file?: string;
  source_location?: string | null;
}

interface RawLink {
  source: string;
  target: string;
  relation?: string;
  confidence?: string;
  weight?: number;
}

interface GraphJson {
  nodes: RawNode[];
  links: RawLink[];
}

interface Node extends RawNode {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  degree: number;
  fixed?: boolean;
}

interface Link {
  source: Node;
  target: Node;
  weight: number;
}

// ─── palette ───────────────────────────────────────────────────────────────

const GOLD = '#1ba3b8';
const GOLD_DIM = 'rgba(27, 163, 184,0.32)';
const SURFACE = '#0a0e14';

// 25 community colors — gold-leaning gradient with cool accents
const COMMUNITY_PALETTE = [
  '#1ba3b8', '#67e8f9', '#b8a4e8', '#64dfdf', '#7fd9a3',
  '#ff7eb3', '#7faad4', '#d9a26f', '#e07060', '#d4d4ff',
  '#a890e0', '#76c7c0', '#f0bb78', '#9aa5d4', '#c4b5fd',
  '#fbbf24', '#86efac', '#fda4af', '#a5b4fc', '#fcd34d',
  '#5eead4', '#fb923c', '#c084fc', '#facc15', '#94a3b8',
];

function colorForCommunity(c?: number): string {
  if (c === undefined || c === null) return '#666';
  return COMMUNITY_PALETTE[c % COMMUNITY_PALETTE.length];
}

// ─── component ─────────────────────────────────────────────────────────────

export default function ObsidianGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<Node[] | null>(null);
  const [links, setLinks] = useState<Link[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // view transform
  const viewRef = useRef({
    zoom: 1, panX: 0, panY: 0,
    dragging: false, dragX: 0, dragY: 0,
    panStartX: 0, panStartY: 0,
    mouseCX: 0, mouseCY: 0,    // canvas coords
    draggingNode: null as Node | null,
  });

  // visible-on-scroll gate (don't burn cycles offscreen)
  const inViewRef = useRef(false);

  const [selected, setSelected] = useState<Node | null>(null);
  const [hovered, setHovered]   = useState<Node | null>(null);
  const [query, setQuery]       = useState('');

  // ─── load graph.json ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    fetch('/graph/graph.json')
      .then((r) => {
        if (!r.ok) throw new Error(`graph.json: HTTP ${r.status}`);
        return r.json() as Promise<GraphJson>;
      })
      .then((data) => {
        if (cancelled) return;
        const idToNode = new Map<string, Node>();
        const degree = new Map<string, number>();
        for (const l of data.links) {
          degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
          degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
        }

        const W = 1200, H = 720;
        for (const n of data.nodes) {
          const d = degree.get(n.id) ?? 0;
          idToNode.set(n.id, {
            ...n,
            x: W / 2 + (Math.random() - 0.5) * W * 0.6,
            y: H / 2 + (Math.random() - 0.5) * H * 0.6,
            vx: 0, vy: 0,
            r: 2.4 + Math.min(8, Math.sqrt(d) * 1.6),
            degree: d,
          });
        }

        const ls: Link[] = [];
        for (const l of data.links) {
          const s = idToNode.get(l.source);
          const t = idToNode.get(l.target);
          if (s && t) ls.push({ source: s, target: t, weight: l.weight ?? 1 });
        }
        setNodes([...idToNode.values()]);
        setLinks(ls);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => { cancelled = true; };
  }, []);

  // ─── force simulation + render loop ──────────────────────────────────────

  useEffect(() => {
    if (!nodes || !links) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true })!;

    // observe visibility so we don't simulate when offscreen
    const io = new IntersectionObserver(
      (entries) => { inViewRef.current = entries[0].isIntersecting; },
      { threshold: 0.1 }
    );
    if (wrapRef.current) io.observe(wrapRef.current);

    let raf = 0; let alpha = 1; // cools toward 0

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!inViewRef.current) return;

      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (canvas.width !== W * devicePixelRatio || canvas.height !== H * devicePixelRatio) {
        canvas.width  = W * devicePixelRatio;
        canvas.height = H * devicePixelRatio;
      }
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      // ── physics ─────────────────────────────────────────────────────────
      if (alpha > 0.005) {
        // repulsion
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist2 = dx * dx + dy * dy + 0.01;
            const f = 1400 / dist2;          // 1/r^2 repulse
            const fx = (dx / Math.sqrt(dist2)) * f * alpha;
            const fy = (dy / Math.sqrt(dist2)) * f * alpha;
            a.vx -= fx; a.vy -= fy;
            b.vx += fx; b.vy += fy;
          }
        }
        // spring on edges
        for (const l of links) {
          const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const k = 0.03 * alpha;
          const target = 90;                 // ideal edge length
          const f = (dist - target) * k;
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          l.source.vx += fx; l.source.vy += fy;
          l.target.vx -= fx; l.target.vy -= fy;
        }
        // centering + damping + integrate
        const cx = W / 2, cy = H / 2;
        for (const n of nodes) {
          if (n.fixed) { n.vx = 0; n.vy = 0; continue; }
          n.vx += (cx - n.x) * 0.0008 * alpha;
          n.vy += (cy - n.y) * 0.0008 * alpha;
          n.vx *= 0.86; n.vy *= 0.86;
          n.x += n.vx; n.y += n.vy;
        }
        alpha *= 0.992;
      }

      // ── render ──────────────────────────────────────────────────────────
      ctx.fillStyle = SURFACE;
      ctx.fillRect(0, 0, W, H);

      const v = viewRef.current;
      ctx.save();
      ctx.translate(v.panX, v.panY);
      ctx.scale(v.zoom, v.zoom);

      // adjacency for highlight
      const focus = selected ?? hovered;
      const neighborIds = new Set<string>();
      if (focus) {
        neighborIds.add(focus.id);
        for (const l of links) {
          if (l.source.id === focus.id) neighborIds.add(l.target.id);
          if (l.target.id === focus.id) neighborIds.add(l.source.id);
        }
      }

      // edges
      for (const l of links) {
        const high = focus && (l.source.id === focus.id || l.target.id === focus.id);
        ctx.strokeStyle = high ? GOLD : 'rgba(255,255,255,0.05)';
        ctx.lineWidth   = high ? 0.9 / v.zoom : 0.45 / v.zoom;
        ctx.beginPath();
        ctx.moveTo(l.source.x, l.source.y);
        ctx.lineTo(l.target.x, l.target.y);
        ctx.stroke();
      }

      // nodes
      for (const n of nodes) {
        const dim = !!focus && !neighborIds.has(n.id);
        const isFocus = focus?.id === n.id;
        const color = colorForCommunity(n.community);
        ctx.globalAlpha = dim ? 0.18 : 1;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + (isFocus ? 2 : 0), 0, Math.PI * 2);
        ctx.fill();
        if (isFocus) {
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 1.8 / v.zoom;
          ctx.stroke();
        }
      }

      // labels (only when zoomed in enough or focused)
      ctx.globalAlpha = 1;
      const showAll = v.zoom > 1.7;
      ctx.font = `10px var(--font-mono), monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      for (const n of nodes) {
        const isFocus = focus?.id === n.id || neighborIds.has(n.id);
        if (!showAll && !isFocus) continue;
        ctx.fillText(n.label, n.x + n.r + 3, n.y + 3);
      }

      ctx.restore();
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [nodes, links, selected, hovered]);

  // ─── input handlers ──────────────────────────────────────────────────────

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const v = viewRef.current;
    return { x: (sx - v.panX) / v.zoom, y: (sy - v.panY) / v.zoom };
  }, []);

  const pickNode = useCallback((sx: number, sy: number): Node | null => {
    if (!nodes) return null;
    const w = screenToWorld(sx, sy);
    let hit: Node | null = null;
    let bestD = Infinity;
    for (const n of nodes) {
      const dx = n.x - w.x, dy = n.y - w.y;
      const d2 = dx * dx + dy * dy;
      const hr = (n.r + 4); // generous pick radius
      if (d2 <= hr * hr && d2 < bestD) { hit = n; bestD = d2; }
    }
    return hit;
  }, [nodes, screenToWorld]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const v = viewRef.current;
    v.mouseCX = sx; v.mouseCY = sy;
    const hit = pickNode(sx, sy);
    if (hit) {
      v.draggingNode = hit;
      hit.fixed = true;
    } else {
      v.dragging = true;
      v.dragX = sx; v.dragY = sy;
      v.panStartX = v.panX; v.panStartY = v.panY;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const v = viewRef.current;
    v.mouseCX = sx; v.mouseCY = sy;
    if (v.draggingNode) {
      const w = screenToWorld(sx, sy);
      v.draggingNode.x = w.x;
      v.draggingNode.y = w.y;
      v.draggingNode.vx = 0; v.draggingNode.vy = 0;
    } else if (v.dragging) {
      v.panX = v.panStartX + (sx - v.dragX);
      v.panY = v.panStartY + (sy - v.dragY);
    } else {
      setHovered(pickNode(sx, sy));
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const v = viewRef.current;
    if (v.draggingNode) {
      // click vs drag — if pointer barely moved, treat as select
      const rect = e.currentTarget.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const w0 = { x: v.draggingNode.x, y: v.draggingNode.y };
      const w1 = screenToWorld(sx, sy);
      const moved = Math.hypot(w0.x - w1.x, w0.y - w1.y);
      if (moved < 3) setSelected(v.draggingNode);
      v.draggingNode.fixed = false;
      v.draggingNode = null;
    }
    v.dragging = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const v = viewRef.current;
    const w = screenToWorld(sx, sy);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    v.zoom = Math.max(0.4, Math.min(4, v.zoom * factor));
    // keep cursor over same world point
    v.panX = sx - w.x * v.zoom;
    v.panY = sy - w.y * v.zoom;
  };

  // search filter — when set, highlight matches by treating first match as selected
  useEffect(() => {
    if (!nodes || !query.trim()) return;
    const q = query.toLowerCase();
    const hit = nodes.find((n) => n.label.toLowerCase().includes(q));
    if (hit) setSelected(hit);
  }, [query, nodes]);

  // neighbors of selected, for wikilinks panel
  const neighbors = useMemo(() => {
    if (!selected || !links) return [];
    const out: Node[] = [];
    const seen = new Set<string>();
    for (const l of links) {
      const other = l.source.id === selected.id ? l.target
                  : l.target.id === selected.id ? l.source : null;
      if (other && !seen.has(other.id)) { seen.add(other.id); out.push(other); }
    }
    return out;
  }, [selected, links]);

  const totalNodes = nodes?.length ?? 0;
  const totalEdges = links?.length ?? 0;
  const communities = nodes ? new Set(nodes.map((n) => n.community)).size : 0;

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <section
      id="obsidian"
      ref={wrapRef}
      className="relative w-full py-24 px-6 md:px-12"
      style={{ background: '#07070b' }}
    >
      {/* header */}
      <div className="max-w-7xl mx-auto mb-10">
        <div
          className="text-[10px] tracking-[0.4em] uppercase mb-3"
          style={{ color: GOLD, fontFamily: 'var(--font-mono)' }}
        >
          ◆  knowledge graph
        </div>
        <h2
          className="text-3xl md:text-5xl font-light leading-tight"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          The codebase as an <em className="italic" style={{ color: GOLD }}>Obsidian network</em>
        </h2>
        <p
          className="mt-4 text-white/50 text-sm max-w-2xl"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          Every file, function, and concept in this portfolio extracted by <span style={{ color: GOLD }}>graphify</span>,
          force-directed and clustered into {communities} communities.
          Drag to pan, scroll to zoom, click a node for its neighbors — the same wikilink navigation Obsidian gives you, embedded.
        </p>
      </div>

      {/* graph + side panel */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* canvas */}
        <div
          className="relative border overflow-hidden"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            background: 'radial-gradient(circle at 30% 20%, rgba(27, 163, 184,0.04), transparent 50%), #07070b',
            height: '620px',
          }}
        >
          {/* search */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search nodes…"
              className="bg-black/60 border px-2.5 py-1.5 text-xs outline-none"
              style={{
                fontFamily: 'var(--font-mono)',
                borderColor: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.8)',
                width: 180,
              }}
              data-hover="true"
            />
            {selected && (
              <button
                onClick={() => { setSelected(null); setQuery(''); }}
                data-hover="true"
                className="px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] border"
                style={{ fontFamily: 'var(--font-mono)', borderColor: 'rgba(27, 163, 184,0.4)', color: GOLD }}
              >
                clear
              </button>
            )}
          </div>

          {/* HUD */}
          <div
            className="absolute top-4 right-4 z-10 text-[10px] tracking-[0.22em] uppercase"
            style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}
          >
            {totalNodes} nodes · {totalEdges} edges · {communities} communities
          </div>

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-red-300/70">
              {error}
            </div>
          ) : !nodes ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="text-[10px] tracking-[0.3em] uppercase"
                style={{ color: GOLD_DIM, fontFamily: 'var(--font-mono)' }}
              >
                loading graph…
              </div>
            </div>
          ) : null}

          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            style={{ cursor: hovered ? 'pointer' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />

          {/* legend */}
          <div
            className="absolute bottom-4 left-4 z-10 text-[10px] tracking-[0.18em] uppercase"
            style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}
          >
            drag · scroll to zoom · click a node
          </div>
        </div>

        {/* inspector */}
        <aside
          className="border p-5 flex flex-col gap-4"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            background: 'rgba(10,10,14,0.75)',
            minHeight: 620,
          }}
        >
          <div
            className="text-[10px] tracking-[0.3em] uppercase"
            style={{ color: GOLD, fontFamily: 'var(--font-mono)' }}
          >
            ▣ inspector
          </div>

          {!selected ? (
            <div className="text-white/40 text-xs leading-relaxed" style={{ fontFamily: 'var(--font-inter)' }}>
              Select a node to see its file, community, and outgoing wikilinks. Hover only highlights connections —
              click to pin the inspector.
            </div>
          ) : (
            <>
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-white/35 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                  node
                </div>
                <div
                  className="text-lg break-words"
                  style={{ fontFamily: 'var(--font-inter)', color: GOLD }}
                >
                  {selected.label}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>
                <div>
                  <div className="text-white/35 uppercase tracking-[0.18em] mb-1">community</div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: colorForCommunity(selected.community) }}
                    />
                    <span className="text-white/80">#{selected.community ?? '—'}</span>
                  </div>
                </div>
                <div>
                  <div className="text-white/35 uppercase tracking-[0.18em] mb-1">type</div>
                  <div className="text-white/80">{selected.file_type ?? '—'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-white/35 uppercase tracking-[0.18em] mb-1">source</div>
                  <div className="text-white/80 break-all">{selected.source_file ?? '—'}{selected.source_location ? ` · ${selected.source_location}` : ''}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-white/35 uppercase tracking-[0.18em] mb-1">degree</div>
                  <div className="text-white/80">{selected.degree} connection{selected.degree === 1 ? '' : 's'}</div>
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <div className="text-[10px] tracking-[0.2em] uppercase text-white/35 mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                  wikilinks ({neighbors.length})
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
                  {neighbors.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setSelected(n)}
                      data-hover="true"
                      className="text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: 'rgba(255,255,255,0.7)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        background: 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: colorForCommunity(n.community) }}
                      />
                      <span className="truncate">[[{n.label}]]</span>
                    </button>
                  ))}
                  {neighbors.length === 0 && (
                    <div className="text-white/30 text-xs italic">isolated node — no edges</div>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
