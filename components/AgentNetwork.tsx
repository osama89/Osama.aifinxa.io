'use client';

import { useEffect, useRef, useState } from 'react';

// ─── TYPES ─────────────────────────────────────────────────────────────────

interface AgentNode {
  id: string;
  label: string;
  tier: 0 | 1 | 2 | 3;
  type: 'main' | 'core' | 'ai' | 'data' | 'ops' | 'alert' | 'time';
  angleRad: number;
  ringRatio: number;
  baseR: number;
  description: string;
  role: string;
  signals: string[];
}

interface Edge { from: string; to: string; w: number; dash: boolean; }

interface Particle {
  id: number; from: string; to: string;
  t: number; speed: number;
  color: string; label: string; size: number;
  trailWS: { wx: number; wy: number; wz: number }[];
  logged: boolean;
}

interface LogEntry { id: number; text: string; color: string; }

// ─── DATA ──────────────────────────────────────────────────────────────────

const D = (deg: number) => (deg * Math.PI) / 180;

const NODES: AgentNode[] = [
  // ── Tier 0 – MAIN
  { id:'main',     label:'MAIN AGENT',   tier:0, type:'main',  angleRad:0,      ringRatio:0,    baseR:34, description:'Autonomous top-level AI entity. Receives goals, delegates to core agents, synthesizes all outcomes.', role:'Supreme Coordinator', signals:['GOAL','PLAN','STATUS','SYNC'] },
  // ── Tier 1 – CORE
  { id:'orch',     label:'ORCHESTRATOR', tier:1, type:'core',  angleRad:D(270), ringRatio:0.22, baseR:22, description:'Sequences task execution, manages agent lifecycles, resolves inter-agent conflicts.',                 role:'Task Coordinator',   signals:['DISPATCH','SEQUENCE','SYNC'] },
  { id:'plan',     label:'PLANNER',      tier:1, type:'core',  angleRad:D(0),   ringRatio:0.22, baseR:20, description:'Decomposes high-level goals into executable sub-tasks via chain-of-thought reasoning.',              role:'Strategic Reasoner', signals:['PLAN','DECOMPOSE','REFINE'] },
  { id:'exec',     label:'EXECUTOR',     tier:1, type:'core',  angleRad:D(90),  ringRatio:0.22, baseR:20, description:'Runs tool calls, API requests, and code execution. Returns structured results upstream.',            role:'Action Runner',       signals:['EXEC','RESULT','ERROR'] },
  { id:'mon',      label:'MONITOR',      tier:1, type:'core',  angleRad:D(180), ringRatio:0.22, baseR:20, description:'Continuously observes all agents, detects drift, anomalies, and performance degradation.',          role:'System Observer',    signals:['WATCH','ALERT','METRIC'] },
  // ── Tier 2 – SPECIALISTS
  { id:'llm',      label:'LLM ENGINE',   tier:2, type:'ai',    angleRad:D(282), ringRatio:0.44, baseR:15, description:'Large language model inference. Handles reasoning, summarization, and generation.',                 role:'Language Model',      signals:['QUERY','RESPONSE','TOKEN'] },
  { id:'memory',   label:'MEMORY',       tier:2, type:'ai',    angleRad:D(322), ringRatio:0.44, baseR:14, description:'Vector database storing semantic memories, embeddings, and long-term context.',                    role:'Context Store',       signals:['STORE','RECALL','EMBED'] },
  { id:'scheduler',label:'SCHEDULER',    tier:2, type:'ops',   angleRad:D(2),   ringRatio:0.44, baseR:14, description:'Manages cron jobs, event triggers, and time-based workflow orchestration.',                        role:'Task Timer',          signals:['TICK','TRIGGER','QUEUE'] },
  { id:'workflow', label:'WORKFLOW',     tier:2, type:'ops',   angleRad:D(42),  ringRatio:0.44, baseR:14, description:'Power Automate / n8n flow engine automating multi-step business processes.',                      role:'Process Engine',      signals:['FLOW','STEP','COMPLETE'] },
  { id:'datalake', label:'DATA LAKE',    tier:2, type:'data',  angleRad:D(82),  ringRatio:0.44, baseR:14, description:'Raw telemetry streams, event logs, and structured business data.',                                 role:'Data Repository',     signals:['INGEST','QUERY','STREAM'] },
  { id:'erp',      label:'ERP / ODOO',   tier:2, type:'ops',   angleRad:D(122), ringRatio:0.44, baseR:14, description:'Enterprise resource planning — HR, finance, procurement, and operations sync.',                   role:'ERP Bridge',          signals:['SYNC','UPDATE','FETCH'] },
  { id:'report',   label:'REPORTING',    tier:2, type:'data',  angleRad:D(162), ringRatio:0.44, baseR:14, description:'Power BI dashboards and automated report generation and distribution.',                            role:'BI Engine',            signals:['RENDER','EXPORT','REFRESH'] },
  { id:'approval', label:'APPROVAL',     tier:2, type:'ops',   angleRad:D(202), ringRatio:0.44, baseR:13, description:'Human-in-the-loop decision gates for sensitive or irreversible actions.',                          role:'Human Gate',          signals:['REQUEST','APPROVE','REJECT'] },
  { id:'alert',    label:'ALERT',        tier:2, type:'alert', angleRad:D(242), ringRatio:0.44, baseR:13, description:'Anomaly detection engine with configurable thresholds and real-time notifications.',              role:'Alert System',        signals:['WARN','CRITICAL','NOTIFY'] },
  // ── Tier 3 – TIME (Y dimension — floats above main network)
  { id:'chronos',  label:'CHRONOS',      tier:3, type:'time',  angleRad:0,      ringRatio:0,    baseR:20, description:'Master temporal coordinator. Governs time-aware reasoning and synchronization across all agents.', role:'Temporal Hub',        signals:['TICK','EPOCH','CALIBRATE'] },
  { id:'past',     label:'PAST',         tier:3, type:'time',  angleRad:D(225), ringRatio:0.22, baseR:13, description:'Historical context engine. Replays events and extracts temporal patterns for learning.',            role:'History Engine',      signals:['REPLAY','PATTERN','LEARN'] },
  { id:'present',  label:'PRESENT',      tier:3, type:'time',  angleRad:D(315), ringRatio:0.22, baseR:13, description:'Real-time stream processor. Grounds all agents in current system state.',                          role:'Live Context',        signals:['NOW','STREAM','LIVE'] },
  { id:'future',   label:'FUTURE',       tier:3, type:'time',  angleRad:D(45),  ringRatio:0.22, baseR:13, description:'Predictive modeling engine. Forecasts outcomes to enable proactive autonomous planning.',          role:'Forecast Engine',     signals:['PREDICT','FORECAST','SIMULATE'] },
  { id:'tsync',    label:'T-SYNC',       tier:3, type:'time',  angleRad:D(135), ringRatio:0.22, baseR:12, description:'Cross-agent time sync. Prevents temporal drift and aligns event ordering in distributed tasks.',   role:'Time Sync',           signals:['ALIGN','DRIFT','ADJUST'] },
];

const EDGES: Edge[] = [
  // Main → Core
  { from:'main', to:'orch', w:3, dash:false }, { from:'main', to:'plan', w:3, dash:false },
  { from:'main', to:'exec', w:3, dash:false }, { from:'main', to:'mon',  w:3, dash:false },
  // Core ↔ Core
  { from:'orch', to:'plan', w:2, dash:false }, { from:'plan', to:'exec', w:2, dash:false },
  { from:'mon',  to:'orch', w:2, dash:false },
  // Orch → Specialists
  { from:'orch', to:'llm',       w:2, dash:true }, { from:'orch', to:'memory',    w:2, dash:true },
  { from:'orch', to:'scheduler', w:1, dash:true },
  // Plan → Specialists
  { from:'plan', to:'workflow',  w:1, dash:true }, { from:'plan', to:'datalake',  w:1, dash:true },
  // Exec → Specialists
  { from:'exec', to:'erp',       w:1, dash:true }, { from:'exec', to:'report',    w:1, dash:true },
  { from:'exec', to:'workflow',  w:1, dash:true },
  // Mon → Specialists
  { from:'mon',  to:'alert',     w:2, dash:true }, { from:'mon',  to:'approval',  w:1, dash:true },
  // Specialist ↔ Specialist
  { from:'llm',      to:'memory',    w:1, dash:true }, { from:'datalake', to:'report',    w:1, dash:true },
  { from:'workflow', to:'scheduler', w:1, dash:true }, { from:'erp',      to:'datalake',  w:1, dash:true },
  { from:'alert',    to:'approval',  w:1, dash:true },
  // TIME → Main network (vertical Y connections)
  { from:'chronos', to:'main',      w:2, dash:false }, { from:'chronos', to:'scheduler', w:1, dash:true },
  // TIME internal
  { from:'chronos', to:'past',    w:2, dash:true }, { from:'chronos', to:'present', w:2, dash:true },
  { from:'chronos', to:'future',  w:2, dash:true }, { from:'chronos', to:'tsync',   w:2, dash:true },
  // TIME → domain specialists
  { from:'past',    to:'memory',   w:1, dash:true }, { from:'future',  to:'llm',      w:1, dash:true },
  { from:'present', to:'datalake', w:1, dash:true }, { from:'tsync',   to:'orch',     w:1, dash:true },
];

const TYPE_COLOR: Record<string, string> = {
  main: '#c9a96e', core: '#d4d4ff', ai: '#b8a4e8',
  data: '#7faad4', ops: '#d9a26f',  alert: '#e07060', time: '#64dfdf',
};

let pid = 0, lid = 0;

// ─── COMPONENT ─────────────────────────────────────────────────────────────

export default function AgentNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    zoom: 1,
    panX: 0, panY: 0,
    rotX: 0.55, rotY: 0.25,
    dragging: false,
    dragSX: 0, dragSY: 0,
    rotStartX: 0, rotStartY: 0,
    hovered: null as string | null,
    selected: null as string | null,
    particles: [] as Particle[],
    edgeHeat: {} as Record<string, number>,
    dashOffset: 0, pulseT: 0,
    broadcastT: -1, frame: 0,
  });

  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);
  const [hovered, setHovered]           = useState<string | null>(null);
  const [log, setLog]                   = useState<LogEntry[]>([]);
  const logRef  = useRef<LogEntry[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let dpr = 1, W = 0, H = 0;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      W = canvas!.offsetWidth; H = canvas!.offsetHeight;
      canvas!.width  = W * dpr; canvas!.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── 3D coordinate helpers ─────────────────────────────────────

    function R() { return Math.min(W, H) * 0.36; }

    function nodeWP(n: AgentNode): { wx: number; wy: number; wz: number } {
      if (n.tier === 0) return { wx: 0, wy: 0, wz: 0 };
      if (n.tier === 3) {
        const ty = -R() * 0.55;
        if (n.id === 'chronos') return { wx: 0, wy: ty, wz: 0 };
        const tr = R() * n.ringRatio;
        return { wx: Math.cos(n.angleRad) * tr, wy: ty, wz: Math.sin(n.angleRad) * tr };
      }
      const radius = R() * (n.ringRatio / 0.44);
      return { wx: Math.cos(n.angleRad) * radius, wy: 0, wz: Math.sin(n.angleRad) * radius };
    }

    function proj(wx: number, wy: number, wz: number) {
      const s = stateRef.current;
      // Rotate Y axis
      const cosY = Math.cos(s.rotY), sinY = Math.sin(s.rotY);
      const x1 = wx * cosY + wz * sinY;
      const z1 = -wx * sinY + wz * cosY;
      // Rotate X axis
      const cosX = Math.cos(s.rotX), sinX = Math.sin(s.rotX);
      const y2 = wy * cosX - z1 * sinX;
      const z2 = wy * sinX + z1 * cosX;
      // Perspective
      const fov  = 520;
      const sc   = s.zoom * fov / Math.max(fov + z2, 1);
      return { x: W / 2 + s.panX + x1 * sc, y: H / 2 + s.panY + y2 * sc, z: z2, sc };
    }

    function hitTest(px: number, py: number): string | null {
      let best: string | null = null, bestZ = Infinity;
      for (const n of NODES) {
        const wp = nodeWP(n);
        const p  = proj(wp.wx, wp.wy, wp.wz);
        const r  = n.baseR * p.sc;
        if ((px - p.x) ** 2 + (py - p.y) ** 2 < r * r && p.z < bestZ) {
          bestZ = p.z; best = n.id;
        }
      }
      return best;
    }

    // ── Logging & particles ───────────────────────────────────────

    function addLog(text: string, color: string) {
      const e: LogEntry = { id: lid++, text, color };
      logRef.current = [e, ...logRef.current].slice(0, 10);
      setLog([...logRef.current]);
    }

    function spawn(fromId: string, toId: string, size?: number) {
      const fn = NODES.find(n => n.id === fromId);
      const tn = NODES.find(n => n.id === toId);
      if (!fn || !tn) return;
      const color = TYPE_COLOR[fn.type];
      stateRef.current.particles.push({
        id: pid++, from: fromId, to: toId, t: 0,
        speed: 0.0025 + Math.random() * 0.004,
        color, label: fn.signals[Math.floor(Math.random() * fn.signals.length)],
        size: size ?? (2 + Math.random() * 2),
        trailWS: [], logged: false,
      });
      stateRef.current.edgeHeat[`${fromId}→${toId}`] = 1;
    }

    function broadcast() {
      stateRef.current.broadcastT = 0;
      NODES.forEach(n => {
        if (n.id !== 'main') setTimeout(() => spawn('main', n.id, 4), Math.random() * 800);
      });
      addLog('MAIN AGENT ⟶ BROADCAST ⟶ ALL AGENTS', '#c9a96e');
    }

    // Seed initial particles
    for (let i = 0; i < 20; i++) {
      const e = EDGES[Math.floor(Math.random() * EDGES.length)];
      const rv = Math.random() < 0.38;
      spawn(rv ? e.to : e.from, rv ? e.from : e.to);
      stateRef.current.particles[stateRef.current.particles.length - 1].t = Math.random();
    }

    // ── Draw helpers ──────────────────────────────────────────────

    function drawFloorGrid() {
      const r  = R() * 1.12;
      const steps = 10;
      ctx.lineWidth = 0.5;
      for (let i = -steps; i <= steps; i++) {
        const t = i / steps, c = t * r;
        const p1 = proj(c, 0, -r), p2 = proj(c, 0, r);
        const p3 = proj(-r, 0, c), p4 = proj(r, 0, c);
        const az = Math.max(0, 0.028 - ((p1.z + p2.z) / 2) * 0.00005);
        ctx.strokeStyle = `rgba(255,255,255,${az})`;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.stroke();
      }
    }

    function drawTimePlatform() {
      const r = R(), ty = -r * 0.55, pr = r * 0.30, steps = 6;
      // Grid
      ctx.lineWidth = 0.5;
      for (let i = -steps; i <= steps; i++) {
        const t = i / steps, c = t * pr;
        ctx.strokeStyle = 'rgba(100,223,223,0.07)';
        const p1 = proj(c, ty, -pr), p2 = proj(c, ty, pr);
        const p3 = proj(-pr, ty, c), p4 = proj(pr, ty, c);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.stroke();
      }
      // Platform border ring
      ctx.strokeStyle = 'rgba(100,223,223,0.14)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let s = 0; s <= 60; s++) {
        const a = (s / 60) * Math.PI * 2;
        const pt = proj(Math.cos(a) * pr, ty, Math.sin(a) * pr);
        s === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      // Vertical beam from origin to platform
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(100,223,223,0.18)'; ctx.lineWidth = 1;
      const bot = proj(0, 0, 0), top = proj(0, ty, 0);
      ctx.beginPath(); ctx.moveTo(bot.x, bot.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawAxes() {
      const r = R() * 0.48;
      const o = proj(0, 0, 0);
      const axes = [
        { ep: proj(r, 0, 0),  color: 'rgba(255,90,90,0.25)',   label: 'X', lc: 'rgba(255,90,90,0.5)'  },
        { ep: proj(0, -r, 0), color: 'rgba(100,223,223,0.25)', label: 'Y', lc: 'rgba(100,223,223,0.5)' },
        { ep: proj(0, 0, r),  color: 'rgba(100,150,255,0.25)', label: 'Z', lc: 'rgba(100,150,255,0.5)' },
      ];
      ctx.lineWidth = 1;
      ctx.font = '8px "JetBrains Mono", monospace';
      axes.forEach(({ ep, color, label, lc }) => {
        ctx.strokeStyle = color;
        ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(ep.x, ep.y); ctx.stroke();
        ctx.fillStyle = lc; ctx.fillText(label, ep.x + 4, ep.y - 2);
      });
    }

    // ── Main draw loop ────────────────────────────────────────────

    function draw() {
      if (W === 0 || H === 0) { animRef.current = requestAnimationFrame(draw); return; }
      const s = stateRef.current;
      ctx.clearRect(0, 0, W, H);
      s.dashOffset -= 0.38; s.pulseT += 0.018; s.frame++;

      drawFloorGrid();
      drawTimePlatform();
      drawAxes();

      // Broadcast pulse
      if (s.broadcastT >= 0) {
        const origin = proj(0, 0, 0);
        const maxR = R() * 0.7 * s.zoom;
        for (let w = 0; w < 2; w++) {
          const wt = Math.min(1, s.broadcastT + w * 0.18);
          ctx.beginPath(); ctx.arc(origin.x, origin.y, wt * maxR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(201,169,110,${(1 - wt) * (w === 0 ? 0.5 : 0.25)})`;
          ctx.lineWidth = w === 0 ? 2 : 1; ctx.stroke();
        }
        s.broadcastT += 0.01;
        if (s.broadcastT > 1) s.broadcastT = -1;
      }

      // Edge heat decay
      for (const k of Object.keys(s.edgeHeat)) s.edgeHeat[k] = Math.max(0, s.edgeHeat[k] - 0.013);

      // Pre-project all nodes (painter's algorithm)
      const cache = new Map<string, ReturnType<typeof proj>>();
      NODES.forEach(n => { const wp = nodeWP(n); cache.set(n.id, proj(wp.wx, wp.wy, wp.wz)); });

      // ── Edges ─────────────────────────────────────────────────
      for (const e of EDGES) {
        const nf = NODES.find(n => n.id === e.from)!;
        const sf = cache.get(e.from)!, st = cache.get(e.to)!;
        const isActive = s.hovered === e.from || s.hovered === e.to
                      || s.selected === e.from || s.selected === e.to;
        const heat = Math.max(s.edgeHeat[`${e.from}→${e.to}`] || 0,
                              s.edgeHeat[`${e.to}→${e.from}`]   || 0);
        const color = TYPE_COLOR[nf.type];
        const depthA = Math.max(0.35, 1 - Math.max(0, (sf.z + st.z) / 2) * 0.0008);

        if (heat > 0.05) {
          ctx.save(); ctx.beginPath(); ctx.moveTo(sf.x, sf.y); ctx.lineTo(st.x, st.y);
          ctx.lineWidth = (e.w + 2) * 2.5; ctx.strokeStyle = color;
          ctx.globalAlpha = heat * 0.11 * depthA; ctx.stroke(); ctx.restore();
        }
        ctx.save(); ctx.beginPath(); ctx.moveTo(sf.x, sf.y); ctx.lineTo(st.x, st.y);
        if (e.dash) { ctx.setLineDash([4, 5]); ctx.lineDashOffset = s.dashOffset; }
        const baseA = e.w === 3 ? 0.22 : e.w === 2 ? 0.14 : 0.09;
        ctx.lineWidth = isActive ? e.w * 0.85 + 0.4 : e.w * 0.6;
        ctx.strokeStyle = isActive ? color : 'rgba(255,255,255,1)';
        ctx.globalAlpha = (isActive ? 0.6 : baseA + heat * 0.28) * depthA;
        ctx.stroke(); ctx.restore();
      }

      // ── Particles ─────────────────────────────────────────────
      for (const p of s.particles) {
        const nf = NODES.find(n => n.id === p.from)!, nt = NODES.find(n => n.id === p.to)!;
        const pfW = nodeWP(nf), ptW = nodeWP(nt);
        const wx = pfW.wx + (ptW.wx - pfW.wx) * p.t;
        const wy = pfW.wy + (ptW.wy - pfW.wy) * p.t;
        const wz = pfW.wz + (ptW.wz - pfW.wz) * p.t;
        p.trailWS.push({ wx, wy, wz });
        if (p.trailWS.length > 18) p.trailWS.shift();

        const trail = p.trailWS.map(pt => proj(pt.wx, pt.wy, pt.wz));
        for (let i = 1; i < trail.length; i++) {
          const a = i / trail.length;
          ctx.beginPath();
          ctx.moveTo(trail[i-1].x, trail[i-1].y); ctx.lineTo(trail[i].x, trail[i].y);
          ctx.strokeStyle = p.color; ctx.globalAlpha = a * 0.5;
          ctx.lineWidth = a * p.size * trail[i].sc * 0.5; ctx.stroke();
        }
        ctx.globalAlpha = 1;

        const head = trail[trail.length - 1];
        if (head) {
          const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, p.size * head.sc * 2.6);
          g.addColorStop(0, p.color); g.addColorStop(0.4, p.color + '99'); g.addColorStop(1, 'transparent');
          ctx.beginPath(); ctx.arc(head.x, head.y, p.size * head.sc * 2.6, 0, Math.PI * 2);
          ctx.fillStyle = g; ctx.fill();

          if (s.zoom > 0.5 && p.t > 0.08 && p.t < 0.88) {
            ctx.save();
            ctx.font = `500 ${Math.max(6, 7 * head.sc)}px 'JetBrains Mono', monospace`;
            ctx.fillStyle = p.color; ctx.globalAlpha = 0.65; ctx.textAlign = 'center';
            ctx.fillText(p.label, head.x, head.y - p.size * head.sc * 3.5);
            ctx.restore();
          }
        }

        if (!p.logged && p.t > 0.5) {
          p.logged = true;
          addLog(`${p.from.toUpperCase()} → ${p.to.toUpperCase()}: ${p.label}`, p.color);
        }
      }
      ctx.globalAlpha = 1;

      s.particles = s.particles.filter(p => { p.t += p.speed; return p.t < 1; });
      if (s.frame % 34 === 0) {
        const e = EDGES[Math.floor(Math.random() * EDGES.length)];
        const rv = Math.random() < 0.38;
        spawn(rv ? e.to : e.from, rv ? e.from : e.to);
      }

      // ── Nodes – back to front ──────────────────────────────────
      const sorted = [...NODES].sort((a, b) => (cache.get(b.id)!.z) - (cache.get(a.id)!.z));

      for (const n of sorted) {
        const sc = cache.get(n.id)!;
        const r  = n.baseR * sc.sc;
        const color = TYPE_COLOR[n.type];
        const isH = s.hovered === n.id, isSel = s.selected === n.id;
        const dA = Math.max(0.38, 1 - Math.max(0, sc.z) * 0.0009);

        // MAIN: triple pulse rings
        if (n.tier === 0) {
          for (let ri = 0; ri < 3; ri++) {
            const pr = r + (Math.sin(s.pulseT + ri * 1.15) * 0.5 + 0.5) * r * (0.55 + ri * 0.38);
            ctx.beginPath(); ctx.arc(sc.x, sc.y, pr, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.globalAlpha = Math.max(0, (0.07 - ri * 0.018 + Math.sin(s.pulseT) * 0.025)) * dA;
            ctx.lineWidth = 1; ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

        // CHRONOS: rotating dashed ring + clock hand
        if (n.id === 'chronos') {
          ctx.beginPath(); ctx.arc(sc.x, sc.y, r * 1.65, 0, Math.PI * 2);
          ctx.setLineDash([5, 4]); ctx.lineDashOffset = s.dashOffset * 0.6;
          ctx.strokeStyle = color; ctx.globalAlpha = 0.28 * dA; ctx.lineWidth = 0.8; ctx.stroke();
          ctx.setLineDash([]);
          // Minute hand
          const ha = s.pulseT * 1.8;
          ctx.beginPath(); ctx.moveTo(sc.x, sc.y);
          ctx.lineTo(sc.x + Math.cos(ha) * r * 0.65, sc.y + Math.sin(ha) * r * 0.65);
          ctx.strokeStyle = color; ctx.lineWidth = 1.5 * sc.sc; ctx.globalAlpha = 0.7 * dA; ctx.stroke();
          // Second hand (faster)
          const sa = s.pulseT * 6;
          ctx.beginPath(); ctx.moveTo(sc.x, sc.y);
          ctx.lineTo(sc.x + Math.cos(sa) * r * 0.55, sc.y + Math.sin(sa) * r * 0.55);
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8 * sc.sc; ctx.globalAlpha = 0.35 * dA; ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Core: idle breathing ring
        if (n.tier === 1) {
          const pr = r + Math.sin(s.pulseT * 0.7 + n.angleRad) * r * 0.25;
          ctx.beginPath(); ctx.arc(sc.x, sc.y, pr, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = (0.06 + Math.sin(s.pulseT * 0.7 + n.angleRad) * 0.03) * dA;
          ctx.lineWidth = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
        }

        // TIME sub-nodes: flicker
        if (n.tier === 3 && n.id !== 'chronos') {
          ctx.beginPath(); ctx.arc(sc.x, sc.y, r * 1.4, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = (0.08 + Math.sin(s.pulseT * 1.2 + n.angleRad * 3) * 0.05) * dA;
          ctx.lineWidth = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
        }

        // Hover / select glow
        if ((isH || isSel) && n.tier !== 0) {
          const glow = ctx.createRadialGradient(sc.x, sc.y, r * 0.5, sc.x, sc.y, r * 3.4);
          glow.addColorStop(0, color + '44'); glow.addColorStop(1, 'transparent');
          ctx.beginPath(); ctx.arc(sc.x, sc.y, r * 3.4, 0, Math.PI * 2);
          ctx.fillStyle = glow; ctx.fill();
        }

        // Node body gradient
        const bg = ctx.createRadialGradient(sc.x - r * 0.28, sc.y - r * 0.28, 0, sc.x, sc.y, r);
        bg.addColorStop(0, color + (n.tier === 0 ? 'ee' : 'bb'));
        bg.addColorStop(1, color + '33');
        ctx.globalAlpha = dA;
        ctx.beginPath(); ctx.arc(sc.x, sc.y, r, 0, Math.PI * 2);
        ctx.fillStyle = bg; ctx.fill();

        // Border
        ctx.beginPath(); ctx.arc(sc.x, sc.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = isSel ? '#ffffff' : color;
        ctx.lineWidth = isSel ? 2.5 : n.tier === 0 ? 1.5 : 1;
        ctx.globalAlpha = (isSel ? 1 : 0.65) * dA; ctx.stroke(); ctx.globalAlpha = 1;

        // MAIN inner decoration
        if (n.tier === 0) {
          ctx.save();
          ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.5 * sc.sc;
          ctx.beginPath();
          ctx.moveTo(sc.x - r*0.38, sc.y); ctx.lineTo(sc.x + r*0.38, sc.y);
          ctx.moveTo(sc.x, sc.y - r*0.38); ctx.lineTo(sc.x, sc.y + r*0.38);
          ctx.stroke();
          ctx.font = `bold ${r * 0.42}px 'JetBrains Mono', monospace`;
          ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('AI', sc.x, sc.y);
          ctx.restore();
        }

        // Core center dot
        if (n.tier === 1) {
          ctx.globalAlpha = dA;
          ctx.beginPath(); ctx.arc(sc.x, sc.y, r * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill(); ctx.globalAlpha = 1;
        }

        // Label
        const lsz = Math.max(6, Math.min(10, 9 * sc.sc));
        ctx.save();
        ctx.font = `500 ${lsz}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = isH || isSel ? '#ffffff' : color;
        ctx.globalAlpha = ((isH || isSel) ? 1 : 0.72) * dA;
        ctx.fillText(n.label, sc.x, sc.y + r + 4 * sc.sc);
        if (n.tier === 3 && sc.sc > 0.6) {
          ctx.font = `400 ${Math.max(5, 5.5 * sc.sc)}px 'JetBrains Mono', monospace`;
          ctx.globalAlpha = 0.32 * dA;
          ctx.fillText('T-LAYER', sc.x, sc.y + r + 4 * sc.sc + lsz + 2);
        }
        ctx.restore();
      }

      // ── HUD ─────────────────────────────────────────────────────
      ctx.save();
      ctx.font = `9px 'JetBrains Mono', monospace`;
      ctx.fillStyle = 'rgba(201,169,110,0.32)'; ctx.textAlign = 'left';
      ctx.fillText(`SIG ${s.particles.length.toString().padStart(2,'0')}  ·  NODES ${NODES.length}  ·  EDGES ${EDGES.length}`, 12, H - 14);
      ctx.textAlign = 'right';
      ctx.fillText(`ROT ${(s.rotY*57.3).toFixed(0)}° ${(s.rotX*57.3).toFixed(0)}°  ·  ${(s.zoom*100).toFixed(0)}%`, W - 12, H - 14);
      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    // ── Event listeners ───────────────────────────────────────────

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const s = stateRef.current;
      s.zoom = Math.min(3, Math.max(0.3, s.zoom * (e.deltaY > 0 ? 0.91 : 1.10)));
    }

    function onMouseDown(e: MouseEvent) {
      const s = stateRef.current;
      s.dragging = true;
      s.dragSX = e.clientX; s.dragSY = e.clientY;
      s.rotStartX = s.rotX; s.rotStartY = s.rotY;
    }

    function onMouseMove(e: MouseEvent) {
      const s = stateRef.current;
      const rect = canvas!.getBoundingClientRect();
      if (s.dragging) {
        s.rotY = s.rotStartY + (e.clientX - s.dragSX) * 0.007;
        s.rotX = Math.max(0.05, Math.min(1.5, s.rotStartX + (e.clientY - s.dragSY) * 0.007));
      } else {
        const h = hitTest(e.clientX - rect.left, e.clientY - rect.top);
        if (h !== s.hovered) { s.hovered = h; setHovered(h); canvas!.style.cursor = h ? 'pointer' : 'grab'; }
      }
    }

    function onMouseUp(e: MouseEvent) {
      const s = stateRef.current;
      const moved = Math.abs(e.clientX - s.dragSX) + Math.abs(e.clientY - s.dragSY);
      s.dragging = false;
      if (moved < 6) {
        const rect = canvas!.getBoundingClientRect();
        const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
        if (hit === 'main' && s.selected === 'main') broadcast();
        s.selected = hit === s.selected ? null : hit;
        setSelectedNode(hit ? NODES.find(n => n.id === hit) ?? null : null);
      }
    }

    function onMouseLeave() { stateRef.current.dragging = false; stateRef.current.hovered = null; setHovered(null); }

    let lastPinch = 0;
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        lastPinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      } else {
        const s = stateRef.current;
        s.dragging = true;
        s.dragSX = e.touches[0].clientX; s.dragSY = e.touches[0].clientY;
        s.rotStartX = s.rotX; s.rotStartY = s.rotY;
      }
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        stateRef.current.zoom = Math.min(3, Math.max(0.3, stateRef.current.zoom * d / lastPinch));
        lastPinch = d;
      } else {
        const s = stateRef.current;
        s.rotY = s.rotStartY + (e.touches[0].clientX - s.dragSX) * 0.007;
        s.rotX = Math.max(0.05, Math.min(1.5, s.rotStartX + (e.touches[0].clientY - s.dragSY) * 0.007));
      }
    }
    function onTouchEnd() { stateRef.current.dragging = false; }

    canvas.addEventListener('wheel',      onWheel,      { passive: false });
    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      canvas.removeEventListener('wheel',      onWheel);
      canvas.removeEventListener('mousedown',  onMouseDown);
      canvas.removeEventListener('mousemove',  onMouseMove);
      canvas.removeEventListener('mouseup',    onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

  // ─── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full" style={{ cursor: 'grab' }}>
      <canvas ref={canvasRef} className="w-full h-full block" style={{ touchAction: 'none' }} />

      {/* Node info panel */}
      <div
        className="absolute top-4 left-4 transition-all duration-300 pointer-events-none"
        style={{ opacity: selectedNode ? 1 : 0, transform: selectedNode ? 'translateY(0)' : 'translateY(-6px)' }}
      >
        {selectedNode && (
          <div className="border border-white/10 px-4 py-3 min-w-[230px] max-w-[270px]"
            style={{ background: 'rgba(7,7,11,0.93)', backdropFilter: 'blur(18px)', fontFamily: 'var(--font-mono)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TYPE_COLOR[selectedNode.type] }} />
              <p className="text-[10px] tracking-[0.2em]" style={{ color: TYPE_COLOR[selectedNode.type] }}>{selectedNode.label}</p>
            </div>
            <p className="text-white/30 text-[8px] tracking-widest uppercase mb-2">{selectedNode.role}</p>
            <p className="text-white/45 text-[9px] leading-relaxed mb-3">{selectedNode.description}</p>
            <div className="flex gap-5 mb-3">
              <div>
                <p className="text-[#c9a96e] text-sm font-bold">{['MAIN','CORE','SUB','TIME'][selectedNode.tier]}</p>
                <p className="text-white/25 text-[7px] tracking-widest uppercase">Layer</p>
              </div>
              <div>
                <p className="text-[#c9a96e] text-sm font-bold capitalize">{selectedNode.type}</p>
                <p className="text-white/25 text-[7px] tracking-widest uppercase">Type</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedNode.signals.map(sig => (
                <span key={sig} className="text-[7.5px] px-1.5 py-0.5 border border-white/10"
                  style={{ color: TYPE_COLOR[selectedNode.type] }}>{sig}</span>
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
      <div className="absolute left-4 space-y-1 pointer-events-none" style={{ bottom:'32px', fontFamily:'var(--font-mono)' }}>
        {log.slice(0, 7).map((entry, i) => (
          <p key={entry.id} className="text-[8px] tracking-wide"
            style={{ color: entry.color, opacity: Math.max(0.15, 1 - i * 0.13) }}>
            {entry.text}
          </p>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 pointer-events-none space-y-1.5"
        style={{ fontFamily:'var(--font-mono)', opacity: hovered ? 0 : 0.5, transition:'opacity 0.4s' }}>
        {([
          ['main','Main Agent'], ['core','Core Agents'], ['time','Time Layer · Y'],
          ['ai','AI Layer'],     ['data','Data Layer'],  ['ops','Ops Layer'], ['alert','Alert'],
        ] as [string,string][]).map(([t, l]) => (
          <div key={t} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TYPE_COLOR[t] }} />
            <p className="text-[7.5px] tracking-[0.15em] text-white/40">{l}</p>
          </div>
        ))}
      </div>

      {/* Axis badge */}
      <div className="absolute pointer-events-none flex gap-2.5"
        style={{ bottom:'48px', right:'12px', fontFamily:'var(--font-mono)' }}>
        {[['X','rgba(255,90,90,0.6)'],['Y','rgba(100,223,223,0.6)'],['Z','rgba(100,150,255,0.6)']].map(([ax,col]) => (
          <span key={ax} className="text-[9px] font-bold tracking-widest" style={{ color: col }}>{ax}</span>
        ))}
      </div>

      {/* Hints */}
      <div className="absolute right-4 pointer-events-none"
        style={{ bottom:'32px', opacity: hovered ? 0 : 0.28, transition:'opacity 0.4s', fontFamily:'var(--font-mono)' }}>
        <p className="text-[7.5px] tracking-[0.18em] text-white/35 text-right">DRAG · ROTATE 3D</p>
        <p className="text-[7.5px] tracking-[0.18em] text-white/35 text-right">SCROLL · ZOOM</p>
        <p className="text-[7.5px] tracking-[0.18em] text-white/35 text-right">CLICK · INSPECT</p>
        <p className="text-[7.5px] tracking-[0.18em] text-[#64dfdf]/40 text-right mt-1">Y-AXIS · TIME LAYER</p>
      </div>
    </div>
  );
}
