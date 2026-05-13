'use client';

/**
 * PlaygroundWindow — draggable Mac-style window hosting PlaygroundCanvas.
 *
 * Two-mode chrome: docked (680px, draggable) ↔ fullscreen (covers viewport).
 *  - Green traffic light toggles fullscreen
 *  - Esc exits fullscreen, or closes the window if already docked
 *
 * On open, a GSAP timeline cascades the chrome (title bar fade →
 * traffic lights pop in → title fade → body reveal). Respects
 * prefers-reduced-motion by skipping the timeline entirely.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import PlaygroundCanvas from './PlaygroundCanvas';

interface PlaygroundWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlaygroundWindow({ isOpen, onClose }: PlaygroundWindowProps) {
  const [minimized, setMinimized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset to docked state every time the window opens.
  useEffect(() => {
    if (isOpen) { setFullscreen(false); setMinimized(false); }
  }, [isOpen]);

  // Esc: exit fullscreen, or close the window when already docked.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (fullscreen) { setFullscreen(false); return; }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, fullscreen, onClose]);

  // Reduced motion gate for the GSAP timeline
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // GSAP open-cascade — runs once each time the window opens.
  useGSAP(() => {
    if (!isOpen || reducedMotion || !containerRef.current) return;
    const tl = gsap.timeline();
    tl.from('[data-pg-titlebar]', { opacity: 0, y: -6, duration: 0.28, ease: 'power2.out' })
      .from('[data-pg-traffic]',  { scale: 0, opacity: 0, stagger: 0.06, duration: 0.32, ease: 'back.out(1.8)' }, '-=0.16')
      .from('[data-pg-title]',    { opacity: 0, duration: 0.3 }, '-=0.18')
      .from('[data-pg-body]',     { opacity: 0, duration: 0.34, ease: 'power1.out' }, '-=0.22');
  }, { dependencies: [isOpen, reducedMotion], scope: containerRef });

  // Position / size — fixed full-viewport when fullscreen, docked otherwise.
  const windowStyle = fullscreen
    ? { top: 0, left: 0, right: 0, bottom: 0, cursor: 'default' as const }
    : { top: undefined, left: 'calc(50% + 40px)', right: undefined, bottom: undefined, cursor: 'grab' as const };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          drag={!fullscreen}
          dragMomentum={false}
          dragConstraints={{ top: -200, left: -700, right: 700, bottom: 500 }}
          initial={{ opacity: 0, scale: 0.92, x: 40, y: -8 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className={
            fullscreen
              ? 'fixed inset-0 z-[998] w-full h-full'
              : 'fixed top-28 z-[998] w-[680px] max-w-[90vw]'
          }
          style={windowStyle}
          whileDrag={fullscreen ? undefined : { cursor: 'grabbing' }}
        >
          <div
            className="border border-white/10 shadow-2xl overflow-hidden h-full flex flex-col"
            style={{ background: 'rgba(7, 7, 11, 0.97)', backdropFilter: 'blur(20px)' }}
          >
            {/* Title bar */}
            <div
              data-pg-titlebar
              className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/10 flex-shrink-0"
              style={{ userSelect: 'none' }}
            >
              {/* Traffic lights */}
              <button
                data-pg-traffic
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition flex-shrink-0"
                style={{ cursor: 'pointer' }}
                title="Close (Esc)"
                aria-label="Close playground"
              />
              <button
                data-pg-traffic
                onClick={(e) => { e.stopPropagation(); setMinimized((m) => !m); }}
                className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-90 transition flex-shrink-0"
                style={{ cursor: 'pointer' }}
                title={minimized ? 'Restore' : 'Minimise'}
                aria-label={minimized ? 'Restore playground' : 'Minimise playground'}
              />
              <button
                data-pg-traffic
                onClick={(e) => { e.stopPropagation(); setFullscreen((f) => !f); }}
                className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-90 transition flex-shrink-0"
                style={{ cursor: 'pointer' }}
                title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
                aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              />

              <span
                data-pg-title
                className="ml-3 flex-1 text-center text-white/30 tracking-[0.12em]"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}
              >
                playground{fullscreen ? ' · fullscreen' : ''}
              </span>

              <span
                className="text-[9px] tracking-[0.22em] uppercase text-white/30 hidden md:inline"
                style={{ fontFamily: 'var(--font-mono)' }}
                aria-hidden="true"
              >
                ◀ ▶  switch · Esc close
              </span>
            </div>

            {/* Body — height animates between 0 (minimised), 460 (docked), and fill (fullscreen) */}
            <AnimatePresence initial={false}>
              {!minimized && (
                <motion.div
                  data-pg-body
                  initial={{ height: 0 }}
                  animate={{ height: fullscreen ? '100%' : 460 }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="relative overflow-hidden flex-1"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <PlaygroundCanvas />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
