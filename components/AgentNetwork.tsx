'use client';

import { useEffect, useRef, useState } from 'react';

// ─── TYPES ─────────────────────────────────────────────────────────────────

interface AgentNode {
  id: string;
  label: string;
  tier: 0 | 1 | 2;
  type: 'main' | 'core' | 'ai' | 'data' | 'ops' | 'alert';
  angleRad: number;
  ringRatio: number;
  baseR: number;
  description: string;
  role: string;
  signals: string[];
}

interface Edge {
  from: string;
  to: string;
  w: number;
  dash: boolean;
}

interface Particle {
  id: number;
  from: string;
  to: string;
  t: number;
  speed: number;
  color: string;
  label: string;
  size: number;
  trail: { x: number; y: number }[];
  logged: boolean;
}

interface LogEntry {
  id: number;
  text: string;
  color: string;
}

// ─── DATA ──────────────────────────────────────────────────────────────────

const D = (deg: number) => (deg * Math.PI) / 180;

const NODES: AgentNode[] = [
  {
    id: 'main', label: 'MAIN AGENT', tier: 0, type: 'main',
    angleRad: 0, ringRatio: 0, baseR: 34,
    description: 'Autonomous top-level AI entity. Receives goals, delegates to core agents, synthesizes and validates outcomes across the entire system.',
    role: 'Supreme Coordinator',
    signals: ['GOAL', 'PLAN', 'STATUS', 'SYNC'],
  },
  {
    id: 'orch', label: 'ORCHESTRATOR', tier: 1, type: 'core',
    angleRad: D(270), ringRatio: 0.22, baseR: 22,
    description: 'Sequences task execution, manages agent lifecycles, and resolves inter-agent conflicts in real time.',
    role: 'Task Coordinator',
    signals: ['DISPATCH', 'SEQUENCE', 'SYNC'],
  },
  {
    id: 'plan', label: 'PLANNER', tier: 1, type: 'core',
    angleRad: D(0), ringRatio: 0.22, baseR: 20,
    description: 'Decomposes high-level goals into executable sub-tasks using chain-of-thought reasoning and dependency analysis.',
    role: 'Strategic Reasoner',
    signals: ['PLAN', 'DECOMPOSE', 'REFINE'],
  },
  {
    id: 'exec', label: 'EXECUTOR', tier: 1, type: 'core',
    angleRad: D(90), ringRatio: 0.22, baseR: 20,
    description: 'Runs tool calls, API requests, and code execution in sandboxed environments. Returns structured results upstream.',
    role: 'Action Runner',
    signals: ['EXEC', 'RESULT', 'ERROR'],
  },
  {
    id: 'mon', label: 'MONITOR', tier: 1, type: 'core',
    angleRad: D(180), ringRatio: 0.22, baseR: 20,
    description: 'Observes system behavior continuously, detects drift, anomalies, and performance degradation across all agents.',
    role: 'System Observer',
    signals: ['WATCH', 'ALERT', 'METRIC'],
  },
  {
    id: 'llm', label: 'LLM ENGINE', tier: 2, type: 'ai',
    angleRad: D(282), ringRatio: 0.44, baseR: 15,
    description: 'Large language model inference layer. Handles reasoning, summarization, classification, and generation tasks.',
    role: 'Language Model',
    signals: ['QUERY', 'RESPONSE', 'TOKEN'],
  },
  {
    id: 'memory', label: 'MEMORY', tier: 2, type: 'ai',
    angleRad: D(322), ringRatio: 0.44, baseR: 14,
    description: 'Vector database storing semantic memories, embeddings, entity graphs, and long-term conversation context.',
    role: 'Context Store',
    signals: ['STORE', 'RECALL', 'EMBED'],
  },
  {
    id: 'scheduler', label: 'SCHEDULER', tier: 2, type: 'ops',
    angleRad: D(2), ringRatio: 0.44, baseR: 14,
    description: 'Manages cron jobs, event triggers, rate limiting, and time-based workflow orchestration across the system.',
    role: 'Task Timer',
    signals: ['TICK', 'TRIGGER', 'QUEUE'],
  },
  {
    id: 'workflow', label: 'WORKFLOW', tier: 2, type: 'ops',
    angleRad: D(42), ringRatio: 0.44, baseR: 14,
    description: 'Power Automate and n8n flow engine automating multi-step business processes with conditional branching.',
    role: 'Process Engine',
    signals: ['FLOW', 'STEP', 'COMPLETE'],
  },
  {
    id: 'datalake', label: 'DATA LAKE', tier: 2, type: 'data',
    angleRad: D(82), ringRatio: 0.44, baseR: 14,
    description: 'Raw telemetry streams, structured event logs, and historical business data ingestion and warehousing.',
    role: 'Data Repository',
    signals: ['INGEST', 'QUERY', 'STREAM'],
  },
  {
    id: 'erp', label: 'ERP / ODOO', tier: 2, type: 'ops',
    angleRad: D(122), ringRatio: 0.44, baseR: 14,
    description: 'Enterprise resource planning integration. Bidirectional sync of HR, finance, procurement, and operations.',
    role: 'ERP Bridge',
    signals: ['SYNC', 'UPDATE', 'FETCH'],
  },
  {
    id: 'report', label: 'REPORTING', tier: 2, type: 'data',
    angleRad: D(162), ringRatio: 0.44, baseR: 14,
    description: 'Power BI dashboard rendering, automated KPI report generation, scheduling, and stakeholder distribution.',
    role: 'BI Engine',
    signals: ['RENDER', 'EXPORT', 'REFRESH'],
  },
  {
    id: 'approval', label: 'APPROVAL', tier: 2, type: 'ops',
    angleRad: D(202), ringRatio: 0.44, baseR: 13,
    description: 'Human-in-the-loop decision gates for sensitive, high-stakes, or irreversible automated actions.',
    role: 'Human Gate',
    signals: ['REQUEST', 'APPROVE', 'REJECT'],
  },
  {
    id: 'alert', label: 'ALERT', tier: 2, type: 'alert',
    angleRad: D(242), ringRatio: 0.44, baseR: 13,
    description: 'Anomaly detection engine with configurable thresholds and real-time push notification routing.',
    role: 'Alert System',
    signals: ['WARN', 'CRITICAL', 'NOTIFY'],
  },
];

const EDGES: Edge[] = [
  // MAIN → CORE (weight 3, solid)
  { from: 'main', to: 'orch', w: 3, dash: false },
  { from: 'main', to: 'plan', w: 3, dash: false },
  { from: 'main', to: 'exec', w: 3, dash: false },
  { from: 'main', to: 'mon',  w: 3, dash: false },
  // CORE ↔ CORE (weight 2, solid)
  { from: 'orch', to: 'plan', w: 2, dash: false },
  { from: 'plan', to: 'exec', w: 2, dash: false },
  { from: 'mon',  to: 'orch', w: 2, dash: false },
  // ORCH → SPECIALISTS
  { from: 'orch', to: 'llm',       w: 2, dash: true },
  { from: 'orch', to: 'memory',    w: 2, dash: true },
  { from: 'orch', to: 'scheduler', w: 1, dash: true },
  // PLAN → SPECIALISTS
  { from: 'plan', to: 'workflow',  w: 1, dash: true },
  { from: 'plan', to: 'datalake',  w: 1, dash: true },
  // EXEC → SPECIALISTS
  { from: 'exec', to: 'erp',       w: 1, dash: true },
  { from: 'exec', to: 'report',    w: 1, dash: true },
  { from: 'exec', to: 'workflow',  w: 1, dash: true },
  // MON → SPECIALISTS
  { from: 'mon',  to: 'alert',     w: 2, dash: true },
  { from: 'mon',  to: 'approval',  w: 1, dash: true },
  // SPECIALIST ↔ SPECIALIST
  { from: 'llm',      to: 'memory',    w: 1, dash: true },
  { from: 'datalake', to: 'report',    w: 1, dash: true },
  { from: 'workflow', to: 'scheduler', w: 1, dash: true },
  { from: 'erp',      to: 'datalake',  w: 1, dash: true },
  { from: 'alert',    to: 'approval',  w: 1, dash: true },
];

const TYPE_COLOR: Record<string, string> = {
  main:  '#c9a96e',
  core:  '#d4d4ff',
  ai:    '#b8a4e8',
  data:  '#7faad4',
  ops:   '#d9a26f',
  alert: '#e07060',
};

let pid = 0;
let lid = 0;

// ─── COMPONENT ─────────────────────────────────────────────────────────────

export default function AgentNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    zoom: 1,
    panX: 0,
    panY: 0,
    dragging: false,
    dragSX: 0, dragSY: 0,
    panSX: 0, panSY: 0,
    hovered: null as string | null,
    selected: null as string | null,
    particles: [] as Particle[],
    edgeHeat: {} as Record<string, number>,
    dashOffset: 0,
    pulseT: 0,
    broadcastT: -1,
    frame: 0,
  });
  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logRef = useRef<LogEntry[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let dpr = 1, W = 0, H = 0;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      W = canvas!.offsetWidth;
      H = canvas!.offsetHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function nodePos(n: AgentNode): { wx: number; wy: number } {
      if (n.tier === 0) return { wx: 0, wy: 0 };
      const R = Math.min(W, H) * 0.42 * (n.ringRatio / 0.44);
      return { wx: Math.cos(n.angleRad) * R, wy: Math.sin(n.angleRad) * R };
    }

    function ws(wx: number, wy: number): { x: number; y: number } {
      const s = stateRef.current;
      return { x: wx * s.zoom + s.panX + W / 2, y: wy * s.zoom + s.panY + H / 2 };
    }

    function hitTest(px: number, py: number): string | null {
      const s = stateRef.current;
      for (const n of NODES) {
        const np = nodePos(n);
        const sc = ws(np.wx, np.wy);
        const r = n.baseR * s.zoom;
        if ((px - sc.x) ** 2 + (py - sc.y) ** 2 < r * r) return n.id;
      }
      return null;
    }

    function addLog(text: string, color: string) {
      const entry: LogEntry = { id: lid++, text, color };
      logRef.current = [entry, ...logRef.current].slice(0, 10);
      setLog([...logRef.current]);
    }

    function spawnParticle(fromId: string, toId: string, size?: number) {
      const fn = NODES.find(n => n.id === fromId);
      const tn = NODES.find(n => n.id === toId);
      if (!fn || !tn) return;
      const color = TYPE_COLOR[fn.type];
      const label = fn.signals[Math.floor(Math.random() * fn.signals.length)];
      stateRef.current.particles.push({
        id: pid++, from: fromId, to: toId,
        t: 0,
        speed: 0.0025 + Math.random() * 0.004,
        color, label,
        size: size ?? (2 + Math.random() * 2),
        trail: [],
        logged: false,
      });
      stateRef.current.edgeHeat[`${fromId}→${toId}`] = 1;
    }

    function broadcast() {
      stateRef.current.broadcastT = 0;
      for (const n of NODES) {
        if (n.id === 'main') continue;
        setTimeout(() => spawnParticle('main', n.id, 4), Math.random() * 700);
      }
      addLog('MAIN AGENT ⟶ BROADCAST ⟶ ALL AGENTS', '#c9a96e');
    }

    // Seed particles
    for (let i = 0; i < 16; i++) {
      const e = EDGES[Math.floor(Math.random() * EDGES.length)];
      const rev = Math.random() < 0.38;
      spawnParticle(rev ? e.to : e.from, rev ? e.from : e.to);
      stateRef.current.particles[stateRef.current.particles.length - 1].t = Math.random();
    }

    function draw() {
      if (W === 0 || H === 0) { animRef.current = requestAnimationFrame(draw); return; }

      const s = stateRef.current;
      ctx.clearRect(0, 0, W, H);

      s.dashOffset -= 0.38;
      s.pulseT += 0.018;
      s.frame++;

      // ── Background grid ──────────────────────────────
      const gs = 36 * s.zoom;
      const ox = ((s.panX + W / 2) % gs + gs) % gs;
      const oy = ((s.panY + H / 2) % gs + gs) % gs;
      ctx.strokeStyle = 'rgba(255,255,255,0.022)';
      ctx.lineWidth = 0.5;
      for (let gx = ox - gs; gx < W + gs; gx += gs) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gy = oy - gs; gy < H + gs; gy += gs) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }

      // ── Tier rings ───────────────────────────────────
      const cp = ws(0, 0);
      ctx.setLineDash([3, 6]);
      ctx.lineWidth = 0.5;
      for (const ratio of [0.22, 0.44]) {
        const ringR = Math.min(W, H) * 0.42 * (ratio / 0.44) * s.zoom;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = ratio === 0.22 ? 'rgba(212,212,255,0.06)' : 'rgba(127,170,212,0.05)';
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // ── Broadcast ring ───────────────────────────────
      if (s.broadcastT >= 0) {
        const maxR = Math.min(W, H) * 0.6 * s.zoom;
        for (let wave = 0; wave < 2; wave++) {
          const wt = Math.min(1, s.broadcastT + wave * 0.18);
          const bR = wt * maxR;
          const alpha = (1 - wt) * (wave === 0 ? 0.45 : 0.22);
          ctx.beginPath();
          ctx.arc(cp.x, cp.y, bR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(201,169,110,${alpha})`;
          ctx.lineWidth = wave === 0 ? 2 : 1;
          ctx.stroke();
        }
        s.broadcastT += 0.01;
        if (s.broadcastT > 1) s.broadcastT = -1;
      }

      // ── Decay edge heat ──────────────────────────────
      for (const key of Object.keys(s.edgeHeat)) {
        s.edgeHeat[key] = Math.max(0, s.edgeHeat[key] - 0.014);
      }

      // ── Edges ─────────────────────────────────────────
      for (const e of EDGES) {
        const nf = NODES.find(n => n.id === e.from)!;
        const nt = NODES.find(n => n.id === e.to)!;
        const pf = nodePos(nf); const pt = nodePos(nt);
        const sf = ws(pf.wx, pf.wy); const st = ws(pt.wx, pt.wy);

        const isActive = s.hovered === e.from || s.hovered === e.to
                      || s.selected === e.from || s.selected === e.to;
        const heat = Math.max(
          s.edgeHeat[`${e.from}→${e.to}`] || 0,
          s.edgeHeat[`${e.to}→${e.from}`] || 0,
        );
        const color = TYPE_COLOR[nf.type];

        // Glow pass when hot
        if (heat > 0.05) {
          ctx.save();
          ctx.beginPath(); ctx.moveTo(sf.x, sf.y); ctx.lineTo(st.x, st.y);
          ctx.lineWidth = (e.w + 2) * s.zoom * 2.5;
          ctx.strokeStyle = color;
          ctx.globalAlpha = heat * 0.12;
          ctx.stroke();
          ctx.restore();
        }

        // Main edge line
        ctx.save();
        ctx.beginPath(); ctx.moveTo(sf.x, sf.y); ctx.lineTo(st.x, st.y);
        if (e.dash) { ctx.setLineDash([4 * s.zoom, 5 * s.zoom]); ctx.lineDashOffset = s.dashOffset; }
        const baseAlpha = e.w === 3 ? 0.2 : e.w === 2 ? 0.13 : 0.08;
        ctx.lineWidth = (isActive ? e.w * 0.85 + 0.4 : e.w * 0.6) * s.zoom;
        ctx.strokeStyle = isActive ? color : 'rgba(255,255,255,1)';
        ctx.globalAlpha = isActive ? 0.55 : baseAlpha + heat * 0.28;
        ctx.stroke();
        ctx.restore();
      }

      // ── Particles ────────────────────────────────────
      for (const p of s.particles) {
        const nf = NODES.find(n => n.id === p.from)!;
        const nt = NODES.find(n => n.id === p.to)!;
        const pf = nodePos(nf); const pt = nodePos(nt);
        const wx = pf.wx + (pt.wx - pf.wx) * p.t;
        const wy = pf.wy + (pt.wy - pf.wy) * p.t;
        const sc = ws(wx, wy);

        p.trail.push({ x: sc.x, y: sc.y });
        if (p.trail.length > 20) p.trail.shift();

        // Trail
        for (let i = 1; i < p.trail.length; i++) {
          const a = i / p.trail.length;
          ctx.beginPath();
          ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = a * 0.5;
          ctx.lineWidth = a * p.size * s.zoom * 0.55;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Head glow
        const g = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, p.size * s.zoom * 2.4);
        g.addColorStop(0, p.color);
        g.addColorStop(0.35, p.color + '99');
        g.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, p.size * s.zoom * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        // Signal label
        if (s.zoom > 0.55 && p.t > 0.08 && p.t < 0.88) {
          ctx.save();
          ctx.font = `500 ${Math.max(6, 7 * s.zoom)}px 'JetBrains Mono', monospace`;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.65;
          ctx.textAlign = 'center';
          ctx.fillText(p.label, sc.x, sc.y - p.size * s.zoom * 3.2);
          ctx.restore();
        }

        // Log at ~50%
        if (!p.logged && p.t > 0.5) {
          p.logged = true;
          addLog(`${p.from.toUpperCase()} → ${p.to.toUpperCase()}: ${p.label}`, p.color);
        }
      }
      ctx.globalAlpha = 1;

      // Advance & cull particles
      s.particles = s.particles.filter(p => { p.t += p.speed; return p.t < 1; });

      // Spawn new particles
      if (s.frame % 36 === 0) {
        const e = EDGES[Math.floor(Math.random() * EDGES.length)];
        const rev = Math.random() < 0.38;
        spawnParticle(rev ? e.to : e.from, rev ? e.from : e.to);
      }

      // ── Nodes ─────────────────────────────────────────
      for (const n of NODES) {
        const np = nodePos(n);
        const sc = ws(np.wx, np.wy);
        const r = n.baseR * s.zoom;
        const color = TYPE_COLOR[n.type];
        const isH = s.hovered === n.id;
        const isSel = s.selected === n.id;

        // MAIN AGENT: three pulsing rings
        if (n.tier === 0) {
          for (let ri = 0; ri < 3; ri++) {
            const pr = r + (Math.sin(s.pulseT + ri * 1.15) * 0.5 + 0.5) * r * (0.55 + ri * 0.38);
            ctx.beginPath();
            ctx.arc(sc.x, sc.y, pr, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.globalAlpha = Math.max(0, 0.07 - ri * 0.018 + Math.sin(s.pulseT) * 0.025);
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

        // CORE/SPECIALIST: hover/select glow
        if ((isH || isSel) && n.tier > 0) {
          const glow = ctx.createRadialGradient(sc.x, sc.y, r * 0.5, sc.x, sc.y, r * 3.2);
          glow.addColorStop(0, color + '44');
          glow.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(sc.x, sc.y, r * 3.2, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }

        // Idle pulse for core agents
        if (n.tier === 1) {
          const phase = n.angleRad;
          const idleR = r + Math.sin(s.pulseT * 0.7 + phase) * r * 0.25;
          ctx.beginPath();
          ctx.arc(sc.x, sc.y, idleR, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.06 + Math.sin(s.pulseT * 0.7 + phase) * 0.03;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Node body
        const bg = ctx.createRadialGradient(sc.x - r * 0.28, sc.y - r * 0.28, 0, sc.x, sc.y, r);
        bg.addColorStop(0, color + (n.tier === 0 ? 'ee' : 'bb'));
        bg.addColorStop(1, color + '33');
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, r, 0, Math.PI * 2);
        ctx.fillStyle = bg;
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = isSel ? '#ffffff' : color;
        ctx.lineWidth = isSel ? 2.5 : (n.tier === 0 ? 1.5 : 1);
        ctx.globalAlpha = isSel ? 1 : 0.65;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // MAIN: "AI" label + cross
        if (n.tier === 0) {
          ctx.save();
          ctx.strokeStyle = 'rgba(0,0,0,0.55)';
          ctx.lineWidth = 1.5 * s.zoom;
          ctx.beginPath();
          ctx.moveTo(sc.x - r * 0.38, sc.y); ctx.lineTo(sc.x + r * 0.38, sc.y);
          ctx.moveTo(sc.x, sc.y - r * 0.38); ctx.lineTo(sc.x, sc.y + r * 0.38);
          ctx.stroke();
          ctx.font = `bold ${r * 0.42}px 'JetBrains Mono', monospace`;
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('AI', sc.x, sc.y);
          ctx.restore();
        }

        // CORE: small center dot
        if (n.tier === 1) {
          ctx.beginPath();
          ctx.arc(sc.x, sc.y, r * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fill();
        }

        // Node label
        const lsz = Math.max(6.5, Math.min(10, 9 * s.zoom));
        ctx.save();
        ctx.font = `500 ${lsz}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isH || isSel ? '#ffffff' : color;
        ctx.globalAlpha = isH || isSel ? 1 : 0.72;
        ctx.fillText(n.label, sc.x, sc.y + r + 5 * s.zoom);
        ctx.restore();

        // Tier badge for core agents
        if (n.tier === 1 && s.zoom > 0.65) {
          ctx.save();
          ctx.font = `400 ${Math.max(5.5, 6 * s.zoom)}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.38;
          ctx.fillText('CORE', sc.x, sc.y + r + 5 * s.zoom + lsz + 3);
          ctx.restore();
        }
      }

      // ── HUD ───────────────────────────────────────────
      ctx.save();
      ctx.font = `9px 'JetBrains Mono', monospace`;
      ctx.fillStyle = 'rgba(201,169,110,0.32)';
      ctx.textAlign = 'left';
      ctx.fillText(
        `SIGNALS ${s.particles.length.toString().padStart(2, '0')}  ·  AGENTS ${NODES.length}  ·  EDGES ${EDGES.length}`,
        12, H - 14,
      );
      ctx.textAlign = 'right';
      ctx.fillText(`${(s.zoom * 100).toFixed(0)}%`, W - 12, H - 14);
      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    // ── Event listeners ─────────────────────────────────

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const s = stateRef.current;
      const factor = e.deltaY > 0 ? 0.91 : 1.10;
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left - W / 2;
      const my = e.clientY - rect.top - H / 2;
      const nz = Math.min(3, Math.max(0.3, s.zoom * factor));
      s.panX = mx - (mx - s.panX) * (nz / s.zoom);
      s.panY = my - (my - s.panY) * (nz / s.zoom);
      s.zoom = nz;
    }

    function onMouseDown(e: MouseEvent) {
      const s = stateRef.current;
      s.dragging = true;
      s.dragSX = e.clientX; s.dragSY = e.clientY;
      s.panSX = s.panX; s.panSY = s.panY;
    }

    function onMouseMove(e: MouseEvent) {
      const s = stateRef.current;
      const rect = canvas!.getBoundingClientRect();
      if (s.dragging) {
        s.panX = s.panSX + (e.clientX - s.dragSX);
        s.panY = s.panSY + (e.clientY - s.dragSY);
      } else {
        const h = hitTest(e.clientX - rect.left, e.clientY - rect.top);
        if (h !== s.hovered) {
          s.hovered = h;
          setHovered(h);
          canvas!.style.cursor = h ? 'pointer' : 'grab';
        }
      }
    }

    function onMouseUp(e: MouseEvent) {
      const s = stateRef.current;
      const moved = Math.abs(e.clientX - s.dragSX) + Math.abs(e.clientY - s.dragSY);
      s.dragging = false;
      if (moved < 6) {
        const rect = canvas!.getBoundingClientRect();
        const hitId = hitTest(e.clientX - rect.left, e.clientY - rect.top);
        if (hitId === 'main' && s.selected === 'main') broadcast();
        s.selected = hitId === s.selected ? null : hitId;
        setSelectedNode(hitId ? NODES.find(n => n.id === hitId) ?? null : null);
      }
    }

    function onMouseLeave() {
      stateRef.current.dragging = false;
      stateRef.current.hovered = null;
      setHovered(null);
    }

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);

    let lastPinch = 0;
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        lastPinch = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
      } else {
        const s = stateRef.current;
        s.dragging = true;
        s.dragSX = e.touches[0].clientX; s.dragSY = e.touches[0].clientY;
        s.panSX = s.panX; s.panSY = s.panY;
      }
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        stateRef.current.zoom = Math.min(3, Math.max(0.3, stateRef.current.zoom * d / lastPinch));
        lastPinch = d;
      } else {
        const s = stateRef.current;
        s.panX = s.panSX + (e.touches[0].clientX - s.dragSX);
        s.panY = s.panSY + (e.touches[0].clientY - s.dragSY);
      }
    }
    function onTouchEnd() { stateRef.current.dragging = false; }
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <div className="relative w-full h-full" style={{ cursor: 'grab' }}>
      <canvas ref={canvasRef} className="w-full h-full block" style={{ touchAction: 'none' }} />

      {/* Selected node info */}
      <div
        className="absolute top-4 left-4 transition-all duration-300 pointer-events-none"
        style={{
          opacity: selectedNode ? 1 : 0,
          transform: selectedNode ? 'translateY(0)' : 'translateY(-6px)',
        }}
      >
        {selectedNode && (
          <div
            className="border border-white/10 px-4 py-3 min-w-[230px] max-w-[270px]"
            style={{ background: 'rgba(7,7,11,0.93)', backdropFilter: 'blur(18px)', fontFamily: 'var(--font-mono)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: TYPE_COLOR[selectedNode.type] }}
              />
              <p className="text-[10px] tracking-[0.2em]" style={{ color: TYPE_COLOR[selectedNode.type] }}>
                {selectedNode.label}
              </p>
            </div>
            <p className="text-white/30 text-[8px] tracking-widest uppercase mb-2">{selectedNode.role}</p>
            <p className="text-white/45 text-[9px] leading-relaxed mb-3">{selectedNode.description}</p>
            <div className="flex gap-5 mb-3">
              <div>
                <p className="text-[#c9a96e] text-sm font-bold">
                  {['MAIN', 'CORE', 'SUB'][selectedNode.tier]}
                </p>
                <p className="text-white/25 text-[7px] tracking-widest uppercase">Layer</p>
              </div>
              <div>
                <p className="text-[#c9a96e] text-sm font-bold capitalize">{selectedNode.type}</p>
                <p className="text-white/25 text-[7px] tracking-widest uppercase">Type</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedNode.signals.map(sig => (
                <span
                  key={sig}
                  className="text-[7.5px] px-1.5 py-0.5 border border-white/10"
                  style={{ color: TYPE_COLOR[selectedNode.type] }}
                >
                  {sig}
                </span>
              ))}
            </div>
            {selectedNode.tier === 0 && (
              <p className="text-[#c9a96e]/40 text-[7.5px] tracking-[0.15em] mt-3 border-t border-white/8 pt-2">
                CLICK AGAIN → BROADCAST TO ALL
              </p>
            )}
          </div>
        )}
      </div>

      {/* Activity log */}
      <div
        className="absolute left-4 space-y-1 pointer-events-none"
        style={{ bottom: '32px', fontFamily: 'var(--font-mono)' }}
      >
        {log.slice(0, 7).map((entry, i) => (
          <p
            key={entry.id}
            className="text-[8px] tracking-wide"
            style={{ color: entry.color, opacity: Math.max(0.15, 1 - i * 0.13) }}
          >
            {entry.text}
          </p>
        ))}
      </div>

      {/* Legend */}
      <div
        className="absolute top-4 right-4 pointer-events-none space-y-1.5"
        style={{ fontFamily: 'var(--font-mono)', opacity: hovered ? 0 : 0.5, transition: 'opacity 0.4s' }}
      >
        {([
          ['main', 'Main Agent'],
          ['core', 'Core Agents'],
          ['ai',   'AI Layer'],
          ['data', 'Data Layer'],
          ['ops',  'Ops Layer'],
          ['alert','Alert'],
        ] as [string, string][]).map(([type, label]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TYPE_COLOR[type] }} />
            <p className="text-[7.5px] tracking-[0.15em] text-white/40">{label}</p>
          </div>
        ))}
      </div>

      {/* Interaction hints (bottom-right) */}
      <div
        className="absolute right-4 pointer-events-none"
        style={{ bottom: '32px', opacity: hovered ? 0 : 0.3, transition: 'opacity 0.4s', fontFamily: 'var(--font-mono)' }}
      >
        <p className="text-[7.5px] tracking-[0.18em] text-white/35 text-right">SCROLL · ZOOM</p>
        <p className="text-[7.5px] tracking-[0.18em] text-white/35 text-right">DRAG · PAN</p>
        <p className="text-[7.5px] tracking-[0.18em] text-white/35 text-right">CLICK · INSPECT</p>
        <p className="text-[7.5px] tracking-[0.18em] text-[#c9a96e]/40 text-right mt-1">CLICK MAIN · BROADCAST</p>
      </div>
    </div>
  );
}
