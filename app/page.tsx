'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Nav from '@/components/Nav';
import Loader from '@/components/Loader';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Marquee from '@/components/Marquee';
import HorizontalScroll from '@/components/HorizontalScroll';
import RegionalReach from '@/components/RegionalReach';
import Contact from '@/components/Contact';
import Terminal from '@/components/Terminal';
import PlaygroundWindow from '@/components/PlaygroundWindow';

const NeuralBrain = dynamic(() => import('@/components/NeuralBrain'), { ssr: false });
const ObsidianGraph = dynamic(() => import('@/components/ObsidianGraph'), { ssr: false });

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [playgroundOpen, setPlaygroundOpen] = useState(false);

  // Auto-open terminal once loader finishes
  const handleLoaded = () => {
    setLoaded(true);
    setTerminalOpen(true);
  };

  // Keyboard shortcut: Ctrl+` toggles terminal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setTerminalOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <Loader onComplete={handleLoaded} />

      <Terminal
        isOpen={terminalOpen}
        onClose={() => setTerminalOpen(false)}
      />

      <PlaygroundWindow
        isOpen={playgroundOpen}
        onClose={() => setPlaygroundOpen(false)}
      />

      <main
        style={{
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.6s ease',
          pointerEvents: loaded ? 'auto' : 'none',
        }}
      >
        <Nav
          onTerminalOpen={() => setTerminalOpen(o => !o)}
          terminalOpen={terminalOpen}
          onPlaygroundOpen={() => setPlaygroundOpen(o => !o)}
          playgroundOpen={playgroundOpen}
        />
        <Hero />
        <About />
        <NeuralBrain />
        <ObsidianGraph />
        <Marquee />
        <HorizontalScroll />
        <RegionalReach />
        <Contact />
        <footer className="py-10 text-center border-t border-white/5">
          <p
            className="text-white/20 text-xs tracking-[0.4em] uppercase"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            © 2026 Osama AlAhmad · Dubai, UAE
          </p>
        </footer>
      </main>
    </>
  );
}
