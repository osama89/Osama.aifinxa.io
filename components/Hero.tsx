'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MotionLayerScroller } from './effects/MotionLayerScroller';
import { LiveLocation } from './effects/LiveLocation';
import { LiveWatch } from './effects/LiveWatch';

const AgentNetwork = dynamic(() => import('./AgentNetwork'), { ssr: false });

const ROLES = [
  'AI Product Owner.',
  'BI Solutions Lead.',
  'LLM Builder.',
  'Workflow Architect.',
];

function AnimatedRole() {
  const [roleIdx, setRoleIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const text = ROLES[roleIdx];
    let timeout: NodeJS.Timeout;

    if (!deleting && displayed.length < text.length) {
      timeout = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), 70);
    } else if (!deleting && displayed.length === text.length) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setRoleIdx((i) => (i + 1) % ROLES.length);
    }

    return () => clearTimeout(timeout);
  }, [displayed, deleting, roleIdx]);

  return (
    <span className="text-[#1ba3b8]">
      {displayed}
      <span className="inline-block w-[3px] h-[1em] bg-[#1ba3b8] ml-1 align-middle animate-pulse" />
    </span>
  );
}

const STATS = [
  { value: '13+', label: 'Years' },
  { value: '50+', label: 'Projects' },
  { value: '3', label: 'Companies Automated' },
  { value: '10', label: 'AI Tools Built' },
];

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const sphereScale = useTransform(scrollYProgress, [0, 1], [1, 0.7]);

  return (
    <section
      ref={containerRef}
      className="relative h-screen overflow-hidden flex items-center"
    >
      {/* Animated blueprint background FX — parallax grid layers + radial glow */}
      <div className="absolute inset-0 -z-10">
        <MotionLayerScroller />
      </div>
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />

      {/* Floating defect pins drifting in the background */}
      <FloatingPins />

      {/* Left half: text content */}
      <motion.div
        className="relative z-10 w-full md:w-1/2 px-8 md:px-16 lg:px-24"
        style={{ y: textY, opacity }}
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-[#1ba3b8] text-xs tracking-[0.5em] uppercase mb-6"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          AI & BI Professional · Dubai, UAE
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl md:text-6xl lg:text-7xl font-black leading-none mb-4"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          Osama<br />AlAhmad.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="text-2xl md:text-3xl font-black mb-8 h-10"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          <AnimatedRole />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="text-white/50 text-base leading-relaxed mb-10 max-w-md"
          style={{ fontFamily: 'var(--font-inter)', fontWeight: 300 }}
        >
          I don&apos;t just use AI — I build systems that make it work
          for real businesses. Over a decade turning complex requirements into
          intelligent, automated systems across construction, finance, HR,
          and enterprise operations throughout the GCC.
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.3 }}
          className="grid grid-cols-4 gap-6 max-w-sm"
        >
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p
                className="text-[#1ba3b8] text-xl font-black"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {value}
              </p>
              <p
                className="text-white/30 text-[10px] tracking-wide uppercase mt-1"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          className="flex items-center gap-6 mt-10"
        >
          <a
            href="#about"
            className="px-8 py-3 bg-[#1ba3b8] text-black text-xs tracking-[0.3em] uppercase font-medium hover:bg-white transition-colors duration-300"
            style={{ fontFamily: 'var(--font-inter)' }}
            data-hover="true"
          >
            About Me
          </a>
          <a
            href="#contact"
            className="text-white/50 text-xs tracking-[0.3em] uppercase hover:text-[#1ba3b8] transition-colors duration-300 flex items-center gap-3"
            style={{ fontFamily: 'var(--font-inter)' }}
            data-hover="true"
          >
            Contact
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </motion.div>
      </motion.div>

      {/* Right half: AI agent network */}
      <motion.div
        className="absolute right-0 top-0 w-full md:w-3/5 h-full"
        style={{ scale: sphereScale, opacity }}
      >
        {/* Gradient mask: dark on left edge, transparent on right */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, #0a0e14 0%, rgba(10,10,10,0.55) 18%, transparent 55%)',
          }}
        />
        <AgentNetwork />
      </motion.div>

      {/* Live tags — floating corner: location + Dubai clock */}
      <div className="pointer-events-none absolute right-6 top-24 z-20 hidden flex-col items-end gap-2 lg:flex">
        <div className="pointer-events-auto">
          <LiveLocation />
        </div>
        <div className="pointer-events-auto">
          <LiveWatch />
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-[#1ba3b8] to-transparent animate-pulse" />
      </motion.div>

      {/* Corner frames */}
      <div className="absolute top-8 left-8 w-10 h-10 border-l border-t border-[#1ba3b8]/30 pointer-events-none" />
      <div className="absolute bottom-8 left-8 w-10 h-10 border-l border-b border-[#1ba3b8]/30 pointer-events-none" />
    </section>
  );
}

/* Decorative floating pin marks drifting in the hero background */
function FloatingPins() {
  const pins = [
    { top: '18%', left: '8%', delay: 0, size: 14 },
    { top: '30%', left: '46%', delay: 0.4, size: 10 },
    { top: '62%', left: '12%', delay: 0.8, size: 12 },
    { top: '74%', left: '40%', delay: 1.2, size: 16 },
    { top: '45%', left: '30%', delay: 1.6, size: 8 },
    { top: '12%', left: '38%', delay: 2.0, size: 10 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block" aria-hidden>
      {pins.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 0.9, 0.9, 0], scale: [0.4, 1, 1, 0.8] }}
          transition={{
            duration: 5,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
          style={{ top: p.top, left: p.left, width: p.size, height: p.size }}
          className="absolute"
        >
          <div className="relative h-full w-full">
            <div className="absolute inset-0 rounded-full bg-[var(--color-accent-glow)] opacity-30 blur-md" />
            <div className="absolute inset-0 rounded-full border border-[var(--color-accent-glow)]/70 bg-[var(--color-accent)]/40" />
            <div className="absolute inset-[35%] rounded-full bg-[var(--color-accent-glow)]" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
