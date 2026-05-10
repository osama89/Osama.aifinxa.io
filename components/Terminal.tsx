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
  { delay: 2000, prompt: '›', text: 'ls ./achievements/ | tail -5',          type: 'cmd' },
  { delay: 2380, prompt: '',  text: '[✓] CFO AI Suite — 10 tools in 3 days', type: 'ok'  },
  { delay: 2500, prompt: '',  text: '[✓] AI PA Bot — zero-click scheduling', type: 'ok'  },
  { delay: 2620, prompt: '',  text: '[✓] 3 companies fully automated',       type: 'ok'  },
  { delay: 2740, prompt: '',  text: '[✓] RFID ecosystem — Oil & Gas GCC',    type: 'ok'  },
  { delay: 2860, prompt: '',  text: '[✓] 50+ enterprise projects shipped',   type: 'ok'  },
  { delay: 3200, prompt: '›', text: 'run --mode=portfolio --scroll=enabled', type: 'cmd' },
  { delay: 3650, prompt: '',  text: '→ scroll down to explore.',             type: 'out' },
];

const FAKE_RESPONSES: Record<string, string | string[]> = {
  'help': ['commands: whoami, contact, skills, clear, ls', 'type any command to explore...'],
  'whoami': 'osama.alahmad — AI Product Owner · Dubai, UAE',
  'contact': ['email: osama.alahmad1989@hotmail.com', 'phone: +971 50 372 2060', 'linkedin: /in/osamaalahmad'],
  'skills': ['ai: claude, openai, n8n, copilot studio', 'bi: power bi, azure synapse, postgresql', 'dev: powerApps, odoo, docker'],
  'ls': 'achievements/  projects/  cv.pdf  linkedin.url',
  'clear': '__CLEAR__',
  'exit': '__CLOSE__',
  'date': new Date().toDateString(),
  'hi': 'Hello! Type "help" to see available commands.',
  'hello': 'Hello! Type "help" to see available commands.',
};

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Terminal({ isOpen, onClose }: TerminalProps) {
  const [minimized, setMinimized] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [input, setInput] = useState('');
  const [extraLines, setExtraLines] = useState<{ text: string; type: string }[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset & boot sequence on open
  useEffect(() => {
    if (!isOpen) {
      setVisibleLines(0);
      setExtraLines([]);
      return;
    }
    setMinimized(false);
    const timers = BOOT_SEQUENCE.map(({ delay }, i) =>
      setTimeout(() => setVisibleLines(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [visibleLines, extraLines]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    const result = FAKE_RESPONSES[trimmed];

    if (result === '__CLEAR__') {
      setExtraLines([]);
      return;
    }
    if (result === '__CLOSE__') {
      onClose();
      return;
    }

    const output = result
      ? Array.isArray(result) ? result : [result]
      : [`command not found: ${trimmed}. try "help"`];

    setExtraLines(prev => [
      ...prev,
      { text: `› ${cmd}`, type: 'cmd' },
      ...output.map(o => ({ text: o, type: 'out' })),
    ]);
  };

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
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] w-[540px] max-w-[90vw]"
          style={{ cursor: 'grab' }}
          whileDrag={{ cursor: 'grabbing' }}
        >
          {/* Window chrome */}
          <div
            className="border border-white/12 shadow-2xl"
            style={{ background: 'rgba(8, 8, 12, 0.96)', backdropFilter: 'blur(20px)' }}
          >
            {/* Title bar */}
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/8"
              style={{ userSelect: 'none' }}
            >
              {/* Traffic lights */}
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition-all flex-shrink-0 group"
                style={{ cursor: 'pointer' }}
                title="Close"
              >
                <span className="block w-full h-full rounded-full opacity-0 group-hover:opacity-100 text-[6px] text-black leading-none flex items-center justify-center">×</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMinimized(m => !m); }}
                className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-90 transition-all flex-shrink-0"
                style={{ cursor: 'pointer' }}
                title="Minimise"
              />
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: 'rgba(40,200,64,0.25)' }} />

              <span
                className="ml-2 flex-1 text-center text-white/25 tracking-[0.12em]"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}
              >
                osama@portfolio:~
              </span>

              <span
                className="text-white/15 tracking-[0.1em]"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}
              >
                bash
              </span>
            </div>

            {/* Body */}
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
                    style={{ height: '220px', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.75 }}
                    onClick={() => inputRef.current?.focus()}
                  >
                    {/* Boot sequence */}
                    {BOOT_SEQUENCE.slice(0, visibleLines).map((line, i) => (
                      <div key={i} className="flex gap-2.5">
                        {line.type === 'cmd' && (
                          <>
                            <span className="text-[#c9a96e] flex-shrink-0">{line.prompt}</span>
                            <span className="text-white/65">{line.text}</span>
                          </>
                        )}
                        {line.type === 'ok' && (
                          <span className="text-[#c9a96e] pl-5">{line.text}</span>
                        )}
                        {line.type === 'out' && (
                          <span className="text-white/35 pl-5">{line.text}</span>
                        )}
                      </div>
                    ))}

                    {/* Extra lines from user commands */}
                    {extraLines.map((line, i) => (
                      <div key={`x${i}`} className="flex gap-2.5">
                        {line.type === 'cmd' && <span className="text-[#c9a96e]">{line.text}</span>}
                        {line.type === 'out' && <span className="text-white/35 pl-5">{line.text}</span>}
                      </div>
                    ))}

                    {/* Cursor after boot finishes */}
                    {visibleLines >= BOOT_SEQUENCE.length && (
                      <div className="flex gap-2.5 items-center">
                        <span className="text-[#c9a96e]">›</span>
                        <span
                          className="inline-block w-[7px] bg-[#c9a96e]"
                          style={{ height: '13px', animation: 'blink-cursor 1.1s step-end infinite' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Input row */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (input.trim()) { handleCommand(input); setInput(''); }
                    }}
                    className="border-t border-white/8 flex items-center px-4 py-2.5 gap-2"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <span className="text-[#c9a96e] flex-shrink-0" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>›</span>
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="type a command…"
                      className="flex-1 bg-transparent text-white/60 outline-none placeholder-white/20"
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
