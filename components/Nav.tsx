'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const links = [
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

interface NavProps {
  onTerminalOpen: () => void;
  terminalOpen: boolean;
  onPlaygroundOpen: () => void;
  playgroundOpen: boolean;
}

export default function Nav({ onTerminalOpen, terminalOpen, onPlaygroundOpen, playgroundOpen }: NavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-8 py-5 flex items-center justify-between transition-all duration-500"
      style={{
        backgroundColor: scrolled ? 'rgba(10,10,10,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
      }}
    >
      <a
        href="#"
        className="text-[#c9a96e] text-sm tracking-[0.4em] uppercase font-light"
        style={{ fontFamily: 'var(--font-inter)' }}
        data-hover="true"
      >
        Osama
      </a>

      <nav className="flex items-center gap-6">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="relative text-white/60 hover:text-white text-xs tracking-[0.3em] uppercase transition-colors duration-300 group"
            style={{ fontFamily: 'var(--font-inter)' }}
            data-hover="true"
          >
            {link.label}
            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#c9a96e] group-hover:w-full transition-all duration-300" />
          </a>
        ))}

        {/* Playground toggle */}
        <button
          onClick={onPlaygroundOpen}
          data-hover="true"
          title="Open playground"
          className="flex items-center gap-2 border px-3.5 py-1.5 transition-all duration-300"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            color: playgroundOpen ? '#c9a96e' : 'rgba(255,255,255,0.4)',
            borderColor: playgroundOpen ? 'rgba(201,169,110,0.5)' : 'rgba(255,255,255,0.12)',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="5 3 19 12 5 21 5 3" fill={playgroundOpen ? '#c9a96e' : 'none'} />
          </svg>
          PLAYGROUND
        </button>

        {/* Terminal toggle */}
        <button
          onClick={onTerminalOpen}
          data-hover="true"
          title="Open terminal (Ctrl+`)"
          className="flex items-center gap-2 border px-3.5 py-1.5 transition-all duration-300"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            color: terminalOpen ? '#c9a96e' : 'rgba(255,255,255,0.4)',
            borderColor: terminalOpen ? 'rgba(201,169,110,0.5)' : 'rgba(255,255,255,0.12)',
          }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: terminalOpen ? '#c9a96e' : 'rgba(255,255,255,0.2)',
              animation: terminalOpen ? 'blink-cursor 1.5s step-end infinite' : 'none',
            }}
          />
          TERMINAL
        </button>
      </nav>
    </motion.header>
  );
}
