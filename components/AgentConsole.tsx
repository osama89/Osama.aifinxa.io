'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Step = { agent: string; title: string; detail: string };
type Plan = { summary: string; steps: Step[] };

const AGENT_COLOR: Record<string, string> = {
  ORCHESTRATOR: '#67e8f9',
  RESEARCH: '#1ba3b8',
  DATA: '#c9960e',
  BUILD: '#22d3ee',
  REVIEW: '#4ade80',
  DEPLOY: '#1ba3b8',
};

const SUGGESTIONS = [
  'Automate monthly board reporting from our ERP',
  'Build an AI assistant for site inspections',
  'Migrate Excel trackers to a live BI dashboard',
];

export default function AgentConsole() {
  const [task, setTask] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decompose(t: string) {
    const trimmed = t.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: trimmed }),
      });
      const data = await res.json();
      if (data?.steps?.length) setPlan(data);
      else setError(data?.error || 'No plan produced.');
    } catch {
      setError('The planner is unavailable right now.');
    }
    setLoading(false);
  }

  return (
    <section id="agent" className="relative isolate overflow-hidden py-28 px-6 md:px-12">
      <div className="bg-blueprint pointer-events-none absolute inset-0 -z-10 opacity-20" />

      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2">
            <span className="h-px w-8 bg-[var(--color-accent)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent-glow)]" style={{ fontFamily: 'var(--font-mono)' }}>
              Agentic demo
            </span>
            <span className="h-px w-8 bg-[var(--color-accent)]" />
          </div>
          <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight" style={{ fontFamily: 'var(--font-inter)' }}>
            Hand me a task. <span className="text-accent-grad">Watch it decompose.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm md:text-base text-white/50" style={{ fontFamily: 'var(--font-inter)', fontWeight: 300 }}>
            This is how Osama thinks about automation — break the goal into a pipeline of specialised agents, then ship. Type a real task and a live model will plan it.
          </p>
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); decompose(task); }}
          className="mx-auto mt-10 flex max-w-2xl items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]/70 p-2 backdrop-blur"
        >
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g. Automate our monthly board reporting…"
            data-hover="true"
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white/80 outline-none placeholder-white/25"
            style={{ fontFamily: 'var(--font-inter)' }}
          />
          <button
            type="submit"
            disabled={loading}
            data-hover="true"
            className="rounded-lg bg-[var(--color-accent-2)] px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-[#06121a] transition hover:bg-[var(--color-accent-glow)] disabled:opacity-50"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            {loading ? 'Planning…' : 'Decompose'}
          </button>
        </form>

        {/* Suggestions */}
        {!plan && !loading && (
          <div className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setTask(s); decompose(s); }}
                data-hover="true"
                className="rounded-full border border-[var(--color-line)]/70 px-3 py-1.5 text-[11px] text-white/45 transition hover:border-[var(--color-accent-2)]/60 hover:text-[var(--color-accent-glow)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && <p className="mt-8 text-center text-sm text-[#e07060]">{error}</p>}

        {/* Pipeline */}
        <AnimatePresence mode="wait">
          {(loading || plan) && (
            <motion.div
              key={plan ? 'plan' : 'loading'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-12 space-y-3"
            >
              {loading && (
                <div className="flex items-center justify-center gap-3 py-10 text-white/40">
                  <span className="h-2 w-2 animate-ping rounded-full bg-[var(--color-accent-glow)]" />
                  <span className="font-mono text-xs uppercase tracking-[0.25em]">orchestrator is routing the task…</span>
                </div>
              )}

              {plan?.steps.map((step, i) => {
                const color = AGENT_COLOR[step.agent] ?? '#1ba3b8';
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="relative flex items-start gap-4 rounded-xl border border-[var(--color-line)]/70 bg-[var(--color-surface)]/50 p-4 backdrop-blur"
                  >
                    {/* connector */}
                    {i < (plan.steps.length - 1) && (
                      <span className="absolute left-[34px] top-[52px] h-[calc(100%-28px)] w-px bg-[var(--color-line)]" />
                    )}
                    {/* node */}
                    <div className="relative mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ border: `1px solid ${color}`, background: `${color}1a` }}>
                      <motion.span
                        className="absolute inset-0 rounded-full"
                        style={{ border: `1px solid ${color}` }}
                        initial={{ opacity: 0.6, scale: 1 }}
                        animate={{ opacity: 0, scale: 2 }}
                        transition={{ delay: i * 0.18, duration: 1.2, repeat: 1 }}
                      />
                      <span className="font-mono text-[10px] font-bold" style={{ color }}>{i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color }}>{step.agent}</span>
                        <span className="text-sm font-semibold text-white/90" style={{ fontFamily: 'var(--font-inter)' }}>{step.title}</span>
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-white/45" style={{ fontFamily: 'var(--font-inter)' }}>{step.detail}</p>
                    </div>
                  </motion.div>
                );
              })}

              {plan?.summary && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: plan.steps.length * 0.18 + 0.2 }}
                  className="pt-4 text-center text-xs text-white/40"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {plan.summary}
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
