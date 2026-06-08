'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_SEQUENCE = [
  { delay: 200,  prompt: '›', text: 'whoami',                                type: 'cmd' },
  { delay: 620,  prompt: '',  text: 'osama.alahmad — AI Product Owner · Dubai, UAE', type: 'out' },
  { delay: 1050, prompt: '›', text: 'cat ./profile.json',                    type: 'cmd' },
  { delay: 1420, prompt: '',  text: '{ role: "AI-Native Platform Owner",',   type: 'out' },
  { delay: 1480, prompt: '',  text: '  company: "Olive Green Holding",',     type: 'out' },
  { delay: 1540, prompt: '',  text: '  experience: "13+ years",',            type: 'out' },
  { delay: 1600, prompt: '',  text: '  location: "Dubai, UAE" }',            type: 'out' },
  { delay: 2000, prompt: '›', text: 'ai --init',                             type: 'cmd' },
  { delay: 2380, prompt: '',  text: '[✓] AI twin online — ask me anything about Osama', type: 'ok'  },
  { delay: 2520, prompt: '',  text: "type 'help' for commands · or just type a question", type: 'out' },
];

type Line = { text: string; type: string };
type ChatMsg = { role: 'user' | 'assistant'; content: string };

const STATIC: Record<string, string | string[]> = {
  help: [
    'commands:',
    '  whoami · skills · projects · experience · contact · hire',
    '  agent <task>   — decompose a task into an AI pipeline',
    '  ask <question> — ask the AI twin explicitly',
    '  clear · exit',
    '— or just type a question; anything unrecognised goes to the AI twin.',
  ],
  whoami: 'osama.alahmad — AI Product Owner · BI Professional · Dubai, UAE',
  contact: ['linkedin: linkedin.com/in/osamaalahmad', 'email: oalahmad@seeinstitute.ae'],
  skills: [
    'ai:    claude · openai · n8n · copilot studio · agentic workflows',
    'bi:    power bi · azure synapse · postgresql · etl',
    'build: power apps · odoo · docker · typescript · next.js',
  ],
  projects: [
    '[✓] CFO AI Suite — 10 finance tools in 3 days',
    '[✓] AI PA bot — zero-click scheduling',
    '[✓] 3 companies fully automated',
    '[✓] RFID ecosystem — Oil & Gas GCC',
    '[✓] 50+ enterprise projects shipped',
  ],
  experience: [
    'Olive Green Holding — AI-Native Platform Owner (2026–now)',
    'Model Link Events — AI & BI Solutions Lead (2024–25)',
    'Qatar Foundation — Senior BI Specialist (2022–24)',
    'Consolidated Contractors — BI / Mobile Lead (2012–22)',
  ],
  hire: ['Osama is open to high-impact AI/BI work across the GCC.', '→ linkedin.com/in/osamaalahmad'],
  sudo: 'permission denied: nice try 😏 — but you can hire him: linkedin.com/in/osamaalahmad',
};

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Terminal({ isOpen, onClose }: TerminalProps) {
  const [minimized, setMinimized] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [input, setInput] = useState('');
  const [extraLines, setExtraLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [streamText, setStreamText] = useState('');
  const chatRef = useRef<ChatMsg[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setVisibleLines(0);
      setExtraLines([]);
      setStreamText('');
      chatRef.current = [];
      return;
    }
    setMinimized(false);
    const timers = BOOT_SEQUENCE.map(({ delay }, i) =>
      setTimeout(() => setVisibleLines(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [visibleLines, extraLines, streamText]);

  const push = (lines: Line[]) => setExtraLines((prev) => [...prev, ...lines]);

  async function streamChat(question: string) {
    chatRef.current = [...chatRef.current, { role: 'user' as const, content: question }].slice(-16);
    setBusy(true);
    setStreamText('');
    let acc = '';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatRef.current }),
      });
      if (!res.body) throw new Error('no stream');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setStreamText(acc);
      }
    } catch {
      acc = acc || 'AI twin unavailable — reach Osama on linkedin.com/in/osamaalahmad';
    }
    chatRef.current = [...chatRef.current, { role: 'assistant' as const, content: acc }].slice(-16);
    push([{ text: acc, type: 'ai' }]);
    setStreamText('');
    setBusy(false);
  }

  async function runAgent(task: string) {
    setBusy(true);
    push([{ text: `dispatching agents for: ${task}`, type: 'out' }]);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      const plan = await res.json();
      if (plan?.steps?.length) {
        for (const s of plan.steps) {
          push([{ text: `[${s.agent}] ${s.title} — ${s.detail}`, type: 'ok' }]);
        }
        if (plan.summary) push([{ text: plan.summary, type: 'out' }]);
      } else {
        push([{ text: plan?.error || 'no plan produced', type: 'err' }]);
      }
    } catch {
      push([{ text: 'agent endpoint unavailable', type: 'err' }]);
    }
    setBusy(false);
  }

  function handleSubmit(value: string) {
    const cmd = value.trim();
    if (!cmd) return;
    push([{ text: `› ${cmd}`, type: 'cmd' }]);
    const lower = cmd.toLowerCase();

    if (lower === 'clear') return setExtraLines([]);
    if (lower === 'exit') return onClose();

    if (lower.startsWith('agent ')) return void runAgent(cmd.slice(6).trim());
    if (lower === 'agent') return push([{ text: 'usage: agent <task>', type: 'out' }]);
    if (lower.startsWith('ask ')) return void streamChat(cmd.slice(4).trim());

    const hit = STATIC[lower];
    if (hit) {
      push((Array.isArray(hit) ? hit : [hit]).map((t) => ({ text: t, type: 'out' })));
      return;
    }
    // Anything else → the AI twin.
    void streamChat(cmd);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="terminal"
          drag
          dragMomentum={false}
          dragConstraints={{ top: -300, left: -600, right: 600, bottom: 500 }}
          initial={{ opacity: 0, scale: 0.88, y: -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: -10 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] w-[560px] max-w-[92vw]"
          style={{ cursor: 'grab' }}
          whileDrag={{ cursor: 'grabbing' }}
        >
          <div
            className="border border-white/12 shadow-2xl"
            style={{ background: 'rgba(8, 12, 18, 0.96)', backdropFilter: 'blur(20px)' }}
          >
            {/* Title bar */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/8" style={{ userSelect: 'none' }}>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition-all flex-shrink-0 group"
                style={{ cursor: 'pointer' }}
                title="Close"
              >
                <span className="block w-full h-full rounded-full opacity-0 group-hover:opacity-100 text-[6px] text-black leading-none flex items-center justify-center">×</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMinimized((m) => !m); }}
                className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-90 transition-all flex-shrink-0"
                style={{ cursor: 'pointer' }}
                title="Minimise"
              />
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: 'rgba(34,211,238,0.3)' }} />
              <span className="ml-2 flex-1 text-center text-white/25 tracking-[0.12em]" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                osama@portfolio:~ · ai twin
              </span>
              <span className="text-[#1ba3b8]/50 tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                {busy ? '● thinking' : '● online'}
              </span>
            </div>

            <AnimatePresence>
              {!minimized && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div
                    ref={bodyRef}
                    className="px-4 pt-3 pb-2 overflow-y-auto space-y-0.5"
                    style={{ height: '260px', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.75 }}
                    onClick={() => inputRef.current?.focus()}
                  >
                    {BOOT_SEQUENCE.slice(0, visibleLines).map((line, i) => (
                      <div key={i} className="flex gap-2.5">
                        {line.type === 'cmd' && (<><span className="text-[#1ba3b8] flex-shrink-0">{line.prompt}</span><span className="text-white/65">{line.text}</span></>)}
                        {line.type === 'ok' && <span className="text-[#1ba3b8] pl-5">{line.text}</span>}
                        {line.type === 'out' && <span className="text-white/35 pl-5">{line.text}</span>}
                      </div>
                    ))}

                    {extraLines.map((line, i) => (
                      <div key={`x${i}`} className="flex gap-2.5">
                        {line.type === 'cmd' && <span className="text-[#1ba3b8]">{line.text}</span>}
                        {line.type === 'ok' && <span className="text-[#1ba3b8]/90 pl-5 whitespace-pre-wrap">{line.text}</span>}
                        {line.type === 'err' && <span className="text-[#e07060] pl-5">{line.text}</span>}
                        {line.type === 'out' && <span className="text-white/35 pl-5 whitespace-pre-wrap">{line.text}</span>}
                        {line.type === 'ai' && <span className="text-[#67e8f9]/90 pl-5 whitespace-pre-wrap">{line.text}</span>}
                      </div>
                    ))}

                    {busy && streamText && (
                      <div className="flex gap-2.5">
                        <span className="text-[#67e8f9]/90 pl-5 whitespace-pre-wrap">{streamText}<span className="inline-block w-[7px] bg-[#67e8f9] ml-0.5" style={{ height: '12px', animation: 'blink-cursor 1.1s step-end infinite' }} /></span>
                      </div>
                    )}
                    {busy && !streamText && (
                      <div className="flex gap-2.5"><span className="text-white/30 pl-5">thinking<span className="animate-pulse">…</span></span></div>
                    )}

                    {visibleLines >= BOOT_SEQUENCE.length && !busy && (
                      <div className="flex gap-2.5 items-center">
                        <span className="text-[#1ba3b8]">›</span>
                        <span className="inline-block w-[7px] bg-[#1ba3b8]" style={{ height: '13px', animation: 'blink-cursor 1.1s step-end infinite' }} />
                      </div>
                    )}
                  </div>

                  <form
                    onSubmit={(e) => { e.preventDefault(); if (!busy && input.trim()) { handleSubmit(input); setInput(''); } }}
                    className="border-t border-white/8 flex items-center px-4 py-2.5 gap-2"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <span className="text-[#1ba3b8] flex-shrink-0" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>›</span>
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={busy ? 'thinking…' : "ask me anything… or type 'help'"}
                      disabled={busy}
                      className="flex-1 bg-transparent text-white/70 outline-none placeholder-white/20 disabled:opacity-50"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', cursor: 'text' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
