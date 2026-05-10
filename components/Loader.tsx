'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_LINES = [
  { prompt: '›', text: 'init osama.portfolio --version=2.0', type: 'cmd' },
  { prompt: '✓', text: 'three.js engine mounted', type: 'ok' },
  { prompt: '✓', text: 'framer motion loaded', type: 'ok' },
  { prompt: '›', text: 'indexing cv data...', type: 'cmd' },
  { prompt: '✓', text: '13 years of experience loaded', type: 'ok' },
  { prompt: '✓', text: '50+ projects indexed', type: 'ok' },
  { prompt: '✓', text: 'cfr-ai-suite connected', type: 'ok' },
  { prompt: '›', text: 'launching portfolio...', type: 'cmd' },
];

export default function Loader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Smooth progress counter
    const pInterval = setInterval(() => {
      setProgress(p => {
        const next = p + Math.random() * 5 + 1.5;
        return next >= 100 ? 100 : next;
      });
    }, 55);

    // Reveal boot lines
    BOOT_LINES.forEach((_, i) => {
      setTimeout(() => setVisibleLines(i + 1), i * 320 + 250);
    });

    // Trigger exit
    const exitAt = BOOT_LINES.length * 320 + 600;
    const exitTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(onComplete, 900);
    }, exitAt);

    return () => {
      clearInterval(pInterval);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  const pct = Math.min(Math.round(progress), 100);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="loader"
          exit={{ opacity: 0, scale: 1.06 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden"
          style={{ backgroundColor: '#0a0a0a' }}
        >
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(201,169,110,0.06) 0%, transparent 70%)',
            }}
          />

          {/* Name + title */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="mb-16 text-center"
          >
            <p
              className="text-[#c9a96e] mb-5 tracking-[0.9em] uppercase"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}
            >
              Osama AlAhmad
            </p>
            <h1
              className="text-[clamp(4rem,12vw,9rem)] font-black leading-none text-white tracking-tight"
              style={{ fontFamily: 'var(--font-playfair)', letterSpacing: '-0.04em' }}
            >
              Portfolio
            </h1>
          </motion.div>

          {/* Boot lines */}
          <div className="w-72 space-y-2 mb-10">
            {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="flex gap-3 items-start"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.6 }}
              >
                <span style={{ color: line.type === 'ok' ? '#c9a96e' : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                  {line.prompt}
                </span>
                <span style={{ color: line.type === 'ok' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.25)' }}>
                  {line.text}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Progress track */}
          <div className="w-72 space-y-2">
            <div className="h-px bg-white/8 relative overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-[#c9a96e]"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.12, ease: 'linear' }}
              />
            </div>
            <p
              className="text-right tracking-[0.35em] text-white/20"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}
            >
              {pct}%
            </p>
          </div>

          {/* Corner brackets */}
          <div className="absolute top-8 left-8 w-8 h-8 border-l border-t border-[#c9a96e]/20" />
          <div className="absolute top-8 right-8 w-8 h-8 border-r border-t border-[#c9a96e]/20" />
          <div className="absolute bottom-8 left-8 w-8 h-8 border-l border-b border-[#c9a96e]/20" />
          <div className="absolute bottom-8 right-8 w-8 h-8 border-r border-b border-[#c9a96e]/20" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
