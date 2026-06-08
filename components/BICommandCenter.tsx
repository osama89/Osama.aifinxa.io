'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

/* ── small count-up that fires on scroll-in ──────────────────────────── */
function CountUp({ to, suffix = '', duration = 1600 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

const KPIS = [
  { value: 12000, suffix: '+', label: 'Manual hours eliminated' },
  { value: 40, suffix: '+', label: 'Dashboards shipped' },
  { value: 10, suffix: '', label: 'AI tools deployed' },
  { value: 25, suffix: '+', label: 'Data sources unified' },
];

/* Illustrative series — representative of the kind of impact, not audited figures. */
const SERIES: Record<string, number[]> = {
  'Hours saved / quarter': [320, 540, 760, 980, 1180, 1460],
  'Manual tasks removed': [12, 28, 41, 63, 88, 120],
};
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'];

const DONUT = [
  { label: 'Automation', pct: 38, color: '#22d3ee' },
  { label: 'BI / dashboards', pct: 30, color: '#1ba3b8' },
  { label: 'AI tooling', pct: 20, color: '#c9960e' },
  { label: 'Data eng.', pct: 12, color: '#4ade80' },
];

export default function BICommandCenter() {
  const [seriesKey, setSeriesKey] = useState<keyof typeof SERIES>('Hours saved / quarter');
  const [hover, setHover] = useState<number | null>(null);
  const data = SERIES[seriesKey];
  const max = Math.max(...data);

  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-100px' });

  // donut geometry
  let acc = 0;
  const R = 52, C = 2 * Math.PI * R;

  return (
    <section ref={sectionRef} id="impact" className="relative isolate overflow-hidden border-y border-[var(--color-line)]/50 bg-[var(--color-surface)]/40 py-28 px-6 md:px-12">
      <div className="bg-blueprint-dense pointer-events-none absolute inset-0 -z-10 opacity-20" />

      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2">
            <span className="h-px w-8 bg-[var(--color-accent)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent-glow)]" style={{ fontFamily: 'var(--font-mono)' }}>Impact · command center</span>
            <span className="h-px w-8 bg-[var(--color-accent)]" />
          </div>
          <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight" style={{ fontFamily: 'var(--font-inter)' }}>
            The numbers behind <span className="text-accent-grad">the work.</span>
          </h2>
        </div>

        {/* KPI tiles */}
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {KPIS.map((k) => (
            <div key={k.label} className="rounded-xl border border-[var(--color-line)]/70 bg-[var(--color-bg)]/40 p-5 backdrop-blur">
              <div className="text-3xl font-black text-[var(--color-accent-glow)] md:text-4xl" style={{ fontFamily: 'var(--font-inter)' }}>
                <CountUp to={k.value} suffix={k.suffix} />
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/40" style={{ fontFamily: 'var(--font-mono)' }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Bar chart (2/3) */}
          <div className="rounded-xl border border-[var(--color-line)]/70 bg-[var(--color-bg)]/40 p-6 backdrop-blur lg:col-span-2">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-white/80" style={{ fontFamily: 'var(--font-inter)' }}>{seriesKey}</span>
              <div className="flex gap-1 rounded-lg border border-[var(--color-line)]/70 p-1">
                {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setSeriesKey(k)}
                    data-hover="true"
                    className={`rounded-md px-2.5 py-1 text-[10px] uppercase tracking-wider transition ${seriesKey === k ? 'bg-[var(--color-accent-2)] text-[#06121a]' : 'text-white/40 hover:text-white/70'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {k.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex h-48 items-end justify-between gap-2 md:gap-4">
              {data.map((v, i) => (
                <div key={i} className="group relative flex flex-1 flex-col items-center justify-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  {hover === i && (
                    <div className="absolute -top-7 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 font-mono text-[10px] text-[var(--color-accent-glow)]">{v.toLocaleString()}</div>
                  )}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={inView ? { height: `${(v / max) * 100}%` } : { height: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full rounded-t"
                    style={{ background: 'linear-gradient(180deg, #22d3ee, #138294)', minHeight: 4, opacity: hover === null || hover === i ? 1 : 0.4 }}
                  />
                  <span className="mt-2 font-mono text-[9px] text-white/30">{QUARTERS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut (1/3) */}
          <div className="rounded-xl border border-[var(--color-line)]/70 bg-[var(--color-bg)]/40 p-6 backdrop-blur">
            <span className="text-sm font-medium text-white/80" style={{ fontFamily: 'var(--font-inter)' }}>Where the work goes</span>
            <div className="mt-4 flex items-center gap-5">
              <svg viewBox="0 0 130 130" className="h-32 w-32 flex-shrink-0 -rotate-90">
                {DONUT.map((d) => {
                  const dash = (d.pct / 100) * C;
                  const seg = (
                    <motion.circle
                      key={d.label}
                      cx="65" cy="65" r={R} fill="none" stroke={d.color} strokeWidth="14"
                      strokeDasharray={`${dash} ${C - dash}`}
                      initial={{ strokeDashoffset: C }}
                      animate={inView ? { strokeDashoffset: -acc } : { strokeDashoffset: C }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      strokeLinecap="butt"
                    />
                  );
                  acc += dash;
                  return seg;
                })}
              </svg>
              <ul className="space-y-2">
                {DONUT.map((d) => (
                  <li key={d.label} className="flex items-center gap-2 text-[11px] text-white/55" style={{ fontFamily: 'var(--font-inter)' }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    {d.label}<span className="text-white/30">{d.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">Figures are representative of project impact</p>
      </div>
    </section>
  );
}
