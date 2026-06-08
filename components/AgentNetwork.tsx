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
  main: '#1ba3b8', core: '#d4d4ff', ai: '#b8a4e8',
  data: '#7faad4', ops: '#d9a26f',  alert: '#e07060', time: '#64dfdf',
};

// ─── Main agent cognitive states (cycling) ────────────────────────────────

interface MainCogState {
  id: string;
  label: string;
  color: string;
  glyph: 6 | 8 | 5 | 4; // number of vertices for the inner crystal
}

const MAIN_COG: MainCogState[] = [
  { id: 'SCAN',     label: 'Observing environment',     color: '#64dfdf', glyph: 8 },
  { id: 'PLAN',     label: 'Decomposing goals',         color: '#b8a4e8', glyph: 6 },
  { id: 'DISPATCH', label: 'Delegating to agents',      color: '#1ba3b8', glyph: 5 },
  { id: 'SYNTH',    label: 'Synthesizing results',      color: '#7faad4', glyph: 4 },
  { id: 'LEARN',    label: 'Reinforcing memory',        color: '#d4d4ff', glyph: 6 },
];

const MAIN_VERBS = ['DISPATCH', 'SYNC', 'DELEGATE', 'ROUTE', 'LEARN', 'PLAN', 'OBSERVE', 'DECIDE'];

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
    // Main agent extras
    mouseCX: 0, mouseCY: 0,        // mouse in canvas coords (for iris tracking)
    mainRot: 0,                     // continuous rotation of inner crystalline core
    cogIdx: 0,                      // cycling cognitive state index
    cogTimer: 0,                    // seconds within current cog state
    autoBroadcastIn: 12,            // seconds until next auto-broadcast
    signalsPerSec: 0,               // sliding throughput counter
    signalsThisSec: 0,
    secondTimer: 0,
    scoutTimer: 0,
    shockwaves: [] as { t: number }[],         // broadcast shockwave rings
    nodeActivity: {} as Record<string, number>, // decay-tracked traffic per node
    activePartnerId: null as string | null,    // dominant subordinate
  });

  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);
  const [hovered, setHovered]           = useState<string | null>(null);
  const [log, setLog]                   = useState<LogEntry[]>([]);
  // Main agent HUD console state
  const [hud, setHud] = useState({
    cogIdx: 0,
    queue: 0,
    throughput: 0,
    broadcastIn: 12,
    locked: false,
    partnerLabel: null as string | null,
  });
  const logRef  = useRef<LogEntry[]>([]);
  const animRef = useRef<number>(0);
  const broadcastRef = useRef<() => void>(() => {});

  // HUD sync: read stateRef into React state at 4Hz for the main agent console
  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current;
      setHud({
        cogIdx: s.cogIdx,
        queue: s.particles.length,
        throughput: s.signalsPerSec,
        broadcastIn: Math.max(0, Math.ceil(s.autoBroadcastIn)),
        locked: s.selected === 'main',
        partnerLabel: s.activePartnerId
          ? (NODES.find(n => n.id === s.activePartnerId)?.label ?? null)
          : null,
      });
    }, 250);
    return () => clearInterval(id);
  }, []);

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
      stateRef.current.signalsThisSec++;
      // Track per-node traffic (excluding the main agent so the "partner" is a subordinate)
      if (fromId !== 'main') stateRef.current.nodeActivity[fromId] = (stateRef.current.nodeActivity[fromId] || 0) + 1;
      if (toId   !== 'main') stateRef.current.nodeActivity[toId]   = (stateRef.current.nodeActivity[toId]   || 0) + 1;
    }

    function broadcast() {
      stateRef.current.broadcastT = 0;
      stateRef.current.autoBroadcastIn = 12;
      stateRef.current.shockwaves.push({ t: 0 });
      NODES.forEach(n => {
        if (n.id !== 'main') setTimeout(() => spawn('main', n.id, 4), Math.random() * 800);
      });
      addLog('MAIN AGENT ⟶ BROADCAST ⟶ ALL AGENTS', '#1ba3b8');
    }
    broadcastRef.current = broadcast;

    function spawnScout() {
      // Main agent sends a probing signal to a random subordinate
      const target = NODES.filter(n => n.id !== 'main')[Math.floor(Math.random() * (NODES.length - 1))];
      spawn('main', target.id, 2.5);
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

    // ── Main agent rich drawing ───────────────────────────────────
    function drawMainAgent(sc: { x: number; y: number; z: number; sc: number }, r: number) {
      const s = stateRef.current;
      const cog = MAIN_COG[s.cogIdx];
      const color = cog.color;

      // 1) Outer dashed ring (slowly rotating)
      ctx.save();
      ctx.translate(sc.x, sc.y);
      ctx.rotate(s.mainRot * 0.3);
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.6, 0, Math.PI * 2);
      ctx.setLineDash([5, 8]);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      // Tick marks
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const r1 = r * 2.55;
        const r2 = r * 2.7;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
        ctx.lineWidth = i % 6 === 0 ? 1.2 : 0.6;
        ctx.globalAlpha = i % 6 === 0 ? 0.55 : 0.18;
        ctx.strokeStyle = color;
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // 2) Auto-broadcast countdown — a partial arc that fills as time runs out
      const countdownP = 1 - Math.max(0, s.autoBroadcastIn) / 12;
      ctx.save();
      ctx.translate(sc.x, sc.y);
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.0, -Math.PI / 2, -Math.PI / 2 + countdownP * Math.PI * 2);
      ctx.strokeStyle = countdownP > 0.85 ? '#ffffff' : color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;

      // 3) Inner concentric rings (rotating)
      ctx.save();
      ctx.translate(sc.x, sc.y);
      [
        { rr: r * 1.65, rot: s.mainRot * -0.5, alpha: 0.35, w: 1 },
        { rr: r * 1.45, rot: s.mainRot * 0.7,  alpha: 0.5,  w: 0.8 },
      ].forEach(({ rr, rot, alpha, w }) => {
        ctx.save();
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 1.5);
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = w;
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
      ctx.globalAlpha = 1;

      // 4) Rotating command text around the perimeter
      ctx.save();
      ctx.translate(sc.x, sc.y);
      const textR = r * 2.15;
      ctx.font = `600 ${Math.max(8, 8.5 * sc.sc)}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.55;
      const verbs = MAIN_VERBS;
      const verbStep = (Math.PI * 2) / verbs.length;
      for (let i = 0; i < verbs.length; i++) {
        const a = i * verbStep + s.mainRot * 0.15;
        ctx.save();
        ctx.rotate(a + Math.PI / 2);
        ctx.translate(0, -textR);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(verbs[i], 0, 0);
        ctx.restore();
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // 5) Three orbiting status indicators
      const indicators = [
        { color: '#64dfdf', label: 'CPU', radius: r * 1.85, speed: 0.6,  phase: 0 },
        { color: '#1ba3b8', label: 'MEM', radius: r * 2.05, speed: -0.4, phase: 2 },
        { color: '#ff7eb3', label: 'THR', radius: r * 1.7,  speed: 0.9,  phase: 4 },
      ];
      indicators.forEach((ind) => {
        const a = s.mainRot * ind.speed + ind.phase;
        const ix = sc.x + Math.cos(a) * ind.radius;
        const iy = sc.y + Math.sin(a) * ind.radius;
        // Trail
        for (let t = 1; t <= 6; t++) {
          const ta = a - ind.speed * 0.02 * t;
          const tx = sc.x + Math.cos(ta) * ind.radius;
          const ty = sc.y + Math.sin(ta) * ind.radius;
          ctx.beginPath();
          ctx.arc(tx, ty, 1.5 * (1 - t / 6), 0, Math.PI * 2);
          ctx.fillStyle = ind.color;
          ctx.globalAlpha = 0.3 * (1 - t / 6);
          ctx.fill();
        }
        // Head
        ctx.beginPath();
        ctx.arc(ix, iy, 3, 0, Math.PI * 2);
        ctx.fillStyle = ind.color;
        ctx.globalAlpha = 1;
        ctx.fill();
        // Label
        ctx.font = `500 7px 'JetBrains Mono', monospace`;
        ctx.fillStyle = ind.color;
        ctx.globalAlpha = 0.85;
        ctx.textAlign = 'center';
        ctx.fillText(ind.label, ix, iy - 6);
      });
      ctx.globalAlpha = 1;

      // 6) Main agent body — crystalline polygon (replaces flat circle)
      const verts = cog.glyph * 2; // ring of n*2 vertices, alternating inner/outer for star
      const innerR = r * 0.55;
      const outerR = r;
      ctx.save();
      ctx.translate(sc.x, sc.y);
      ctx.rotate(s.mainRot);
      // Glow background
      const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.2);
      bg.addColorStop(0, color + 'cc');
      bg.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();
      // Star polygon body
      ctx.beginPath();
      for (let i = 0; i < verts; i++) {
        const a = (i / verts) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? outerR : innerR;
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const fill = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
      fill.addColorStop(0, color + 'ee');
      fill.addColorStop(0.5, color + '88');
      fill.addColorStop(1, color + '33');
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // Inner counter-rotating glyph
      ctx.rotate(-s.mainRot * 2);
      ctx.beginPath();
      for (let i = 0; i < verts; i++) {
        const a = (i / verts) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? outerR * 0.45 : innerR * 0.45;
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = '#000000';
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;

      // 7) Mouse-tracking iris (a small pupil that looks toward the cursor)
      const dx = s.mouseCX - sc.x;
      const dy = s.mouseCY - sc.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const irisR = r * 0.18;
      const irisX = sc.x + (dx / len) * irisR;
      const irisY = sc.y + (dy / len) * irisR;
      // White ring (cornea)
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, r * 0.30, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
      // Black pupil offset toward mouse
      ctx.beginPath();
      ctx.arc(irisX, irisY, r * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      // Tiny cyan iris highlight
      ctx.beginPath();
      ctx.arc(irisX - r * 0.04, irisY - r * 0.04, r * 0.035, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // 8) State label below
      ctx.font = `700 ${Math.max(8, 9 * sc.sc)}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.95;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(cog.id, sc.x, sc.y + r + 14 * sc.sc);
      ctx.font = `500 ${Math.max(7, 7 * sc.sc)}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText('MAIN AGENT', sc.x, sc.y + r + 14 * sc.sc + 11);
      ctx.globalAlpha = 1;

      // 9) LOCKED indicator — when user has selected the main agent, state cycle is paused
      if (s.selected === 'main') {
        ctx.save();
        ctx.translate(sc.x, sc.y);
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.9, 0, Math.PI * 2);
        ctx.setLineDash([3, 5]);
        ctx.lineDashOffset = s.dashOffset * 1.6;
        ctx.strokeStyle = '#ff7eb3';
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.75;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = `600 ${Math.max(7, 8 * sc.sc)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = '#ff7eb3';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('· LOCKED ·', 0, -r * 2.9 - 4);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
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

      // ── Main agent timers (run ~60 fps so dt ≈ 1/60) ───────────────
      const dt = 1 / 60;
      s.mainRot += dt * 0.6;

      // Pause the cycle while the user has selected the main agent — gives them time to study one state
      if (s.selected !== 'main') {
        s.cogTimer += dt;
        if (s.cogTimer > 5.0) {
          s.cogTimer = 0;
          s.cogIdx = (s.cogIdx + 1) % MAIN_COG.length;
        }
      }

      s.autoBroadcastIn -= dt;
      if (s.autoBroadcastIn <= 0) {
        broadcast();
      }

      // Decay per-node activity counts; compute the dominant subordinate ("active partner")
      let bestId: string | null = null;
      let bestScore = 0;
      for (const id in s.nodeActivity) {
        s.nodeActivity[id] = Math.max(0, s.nodeActivity[id] - dt * 0.6);
        if (s.nodeActivity[id] > bestScore) {
          bestScore = s.nodeActivity[id];
          bestId = id;
        }
      }
      s.activePartnerId = bestScore >= 2 ? bestId : null;

      s.scoutTimer += dt;
      if (s.scoutTimer > 1.2) {
        s.scoutTimer = 0;
        if (Math.random() < 0.7) spawnScout();
      }

      // Throughput counter (signals/sec via sliding 1-second window)
      s.secondTimer += dt;
      s.signalsThisSec += 0; // incremented at spawn time below
      if (s.secondTimer >= 1) {
        s.signalsPerSec = s.signalsThisSec;
        s.signalsThisSec = 0;
        s.secondTimer = 0;
      }

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
          ctx.strokeStyle = `rgba(27, 163, 184,${(1 - wt) * (w === 0 ? 0.5 : 0.25)})`;
          ctx.lineWidth = w === 0 ? 2 : 1; ctx.stroke();
        }
        s.broadcastT += 0.01;
        if (s.broadcastT > 1) s.broadcastT = -1;
      }

      // Broadcast shockwaves — 3 concentric expanding rings per wave, white inner + gold outer
      if (s.shockwaves.length > 0) {
        const origin = proj(0, 0, 0);
        const maxR = R() * 1.6 * s.zoom;
        s.shockwaves = s.shockwaves.filter((sw) => {
          sw.t += dt * 0.9;
          if (sw.t >= 1) return false;
          for (let ring = 0; ring < 3; ring++) {
            const phase = Math.max(0, sw.t - ring * 0.08);
            if (phase <= 0) continue;
            const rad = phase * maxR;
            const a = Math.max(0, (1 - phase)) * 0.55 * (1 - ring * 0.28);
            ctx.beginPath();
            ctx.arc(origin.x, origin.y, rad, 0, Math.PI * 2);
            ctx.strokeStyle = ring === 0 ? '#ffffff' : '#1ba3b8';
            ctx.lineWidth = ring === 0 ? Math.max(0.5, 2.5 - phase * 2) : Math.max(0.4, 1.5 - phase);
            ctx.globalAlpha = a;
            ctx.stroke();
          }
          return true;
        });
        ctx.globalAlpha = 1;
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

        // MAIN: dedicated rich rendering — skip the default node body
        if (n.tier === 0) {
          // Active partner beam — drawn BEFORE the agent body so the agent sits on top
          if (s.activePartnerId) {
            const partnerSc = cache.get(s.activePartnerId);
            if (partnerSc) {
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(sc.x, sc.y);
              ctx.lineTo(partnerSc.x, partnerSc.y);
              ctx.strokeStyle = '#1ba3b8';
              ctx.lineWidth = 3 + Math.sin(s.pulseT * 4) * 0.6;
              ctx.globalAlpha = 0.55;
              ctx.shadowBlur = 14;
              ctx.shadowColor = '#1ba3b8';
              ctx.stroke();
              ctx.shadowBlur = 0;
              // Small dot at the partner end
              ctx.beginPath();
              ctx.arc(partnerSc.x, partnerSc.y, 4 + Math.sin(s.pulseT * 5) * 0.8, 0, Math.PI * 2);
              ctx.fillStyle = '#1ba3b8';
              ctx.globalAlpha = 0.9;
              ctx.fill();
              ctx.restore();
              ctx.globalAlpha = 1;
            }
          }

          // Triple pulse rings (kept — they look great)
          for (let ri = 0; ri < 3; ri++) {
            const pr = r + (Math.sin(s.pulseT + ri * 1.15) * 0.5 + 0.5) * r * (0.55 + ri * 0.38);
            ctx.beginPath(); ctx.arc(sc.x, sc.y, pr, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.globalAlpha = Math.max(0, (0.07 - ri * 0.018 + Math.sin(s.pulseT) * 0.025)) * dA;
            ctx.lineWidth = 1; ctx.stroke();
          }
          ctx.globalAlpha = 1;
          drawMainAgent(sc, r);
          continue; // skip default body, decoration, label
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
        if (isH || isSel) {
          const glow = ctx.createRadialGradient(sc.x, sc.y, r * 0.5, sc.x, sc.y, r * 3.4);
          glow.addColorStop(0, color + '44'); glow.addColorStop(1, 'transparent');
          ctx.beginPath(); ctx.arc(sc.x, sc.y, r * 3.4, 0, Math.PI * 2);
          ctx.fillStyle = glow; ctx.fill();
        }

        // Node body gradient
        const bg = ctx.createRadialGradient(sc.x - r * 0.28, sc.y - r * 0.28, 0, sc.x, sc.y, r);
        bg.addColorStop(0, color + 'bb');
        bg.addColorStop(1, color + '33');
        ctx.globalAlpha = dA;
        ctx.beginPath(); ctx.arc(sc.x, sc.y, r, 0, Math.PI * 2);
        ctx.fillStyle = bg; ctx.fill();

        // Border
        ctx.beginPath(); ctx.arc(sc.x, sc.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = isSel ? '#ffffff' : color;
        ctx.lineWidth = isSel ? 2.5 : 1;
        ctx.globalAlpha = (isSel ? 1 : 0.65) * dA; ctx.stroke(); ctx.globalAlpha = 1;

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
      ctx.fillStyle = 'rgba(27, 163, 184,0.32)'; ctx.textAlign = 'left';
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
      // Always track cursor in canvas coords for the main agent's iris
      s.mouseCX = e.clientX - rect.left;
      s.mouseCY = e.clientY - rect.top;
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

      {/* MAIN AGENT command console (top-center) */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <div
          className="border border-[#1ba3b8]/30 px-4 py-2.5 flex items-center gap-5"
          style={{
            background: 'rgba(7,7,11,0.78)',
            backdropFilter: 'blur(18px)',
            boxShadow: '0 0 24px rgba(27, 163, 184,0.14)',
            minWidth: 360,
          }}
        >
          {/* State */}
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: MAIN_COG[hud.cogIdx].color,
                boxShadow: `0 0 8px ${MAIN_COG[hud.cogIdx].color}`,
              }}
            />
            <div>
              <p className="text-white/30 text-[6.5px] tracking-[0.35em] uppercase">
                State{hud.locked && <span className="text-[#ff7eb3] ml-2">· LOCKED</span>}
              </p>
              <p
                className="text-[10px] font-bold tracking-[0.18em] transition-colors duration-700"
                style={{ color: MAIN_COG[hud.cogIdx].color }}
              >
                {MAIN_COG[hud.cogIdx].id}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-white/8" />

          {/* Partner */}
          <div>
            <p className="text-white/30 text-[6.5px] tracking-[0.35em] uppercase">Partner</p>
            <p className="text-[#1ba3b8] text-[10px] font-bold truncate max-w-[100px]">
              {hud.partnerLabel ?? '—'}
            </p>
          </div>

          {/* Queue */}
          <div>
            <p className="text-white/30 text-[6.5px] tracking-[0.35em] uppercase">Queue</p>
            <p className="text-[#64dfdf] text-[10px] font-bold tabular-nums">
              {hud.queue.toString().padStart(2, '0')}
            </p>
          </div>

          {/* Throughput */}
          <div>
            <p className="text-white/30 text-[6.5px] tracking-[0.35em] uppercase">Sig/s</p>
            <p className="text-[#ff7eb3] text-[10px] font-bold tabular-nums">
              {hud.throughput.toString().padStart(2, '0')}
            </p>
          </div>

          {/* Next broadcast countdown */}
          <div>
            <p className="text-white/30 text-[6.5px] tracking-[0.35em] uppercase">Next</p>
            <p
              className="text-[10px] font-bold tabular-nums transition-colors"
              style={{
                color: hud.broadcastIn <= 3 ? '#ffffff' : '#1ba3b8',
                textShadow: hud.broadcastIn <= 3 ? '0 0 8px #ffffff' : 'none',
              }}
            >
              {hud.broadcastIn}s
            </p>
          </div>

          {/* Broadcast now button */}
          <button
            onClick={() => broadcastRef.current()}
            className="ml-1 border border-[#1ba3b8]/50 text-[#1ba3b8] hover:bg-[#1ba3b8] hover:text-black transition-colors duration-200 px-2.5 py-1 text-[8px] tracking-[0.25em]"
            data-hover="true"
          >
            BROADCAST
          </button>
        </div>
        {/* Sub-label */}
        <p
          className="text-white/30 text-[7px] tracking-[0.4em] uppercase text-center mt-1.5 transition-colors duration-700"
          style={{ color: MAIN_COG[hud.cogIdx].color + '99' }}
        >
          {MAIN_COG[hud.cogIdx].label}
        </p>
      </div>

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
                <p className="text-[#1ba3b8] text-sm font-bold">{['MAIN','CORE','SUB','TIME'][selectedNode.tier]}</p>
                <p className="text-white/25 text-[7px] tracking-widest uppercase">Layer</p>
              </div>
              <div>
                <p className="text-[#1ba3b8] text-sm font-bold capitalize">{selectedNode.type}</p>
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
              <p className="text-[#1ba3b8]/40 text-[7.5px] tracking-[0.15em] mt-3 border-t border-white/8 pt-2">
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
