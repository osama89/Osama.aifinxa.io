'use client';

/**
 * PlaygroundWindow — draggable, resizable Mac-style window hosting PlaygroundCanvas.
 *
 * Two-mode chrome: docked (resizable, draggable) ↔ fullscreen (covers viewport).
 *  - Green traffic light toggles fullscreen
 *  - Bottom-right corner handle resizes the docked window (clamps to viewport)
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

// Docked-mode size envelope. Defaults are generous enough that the SHOWCASE
// → DESIGN mockup renders without scrolling on most laptops.
const DEFAULT_W = 1000;
const DEFAULT_H = 680;
const MIN_W = 480;
const MIN_H = 360;

export default function PlaygroundWindow({ isOpen, onClose }: PlaygroundWindowProps) {
  const [minimized, setMinimized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [resizing, setResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset to docked state every time the window opens. Size is preserved
  // across open/close so the user's choice sticks within the session.
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

  // Position / size — fixed full-viewport when fullscreen; pixel-controlled docked.
  // Positioning (top-20) comes from the className; inline style only sets the
  // size and cursor.
  const windowStyle = fullscreen
    ? { top: 0, left: 0, right: 0, bottom: 0, cursor: 'default' as const }
    : {
        left: 'calc(50% + 40px)',
        cursor: resizing ? ('nwse-resize' as const) : ('grab' as const),
        width: size.w,
        maxWidth: '95vw',
      };

  // Resize drag state. We keep the active anchor in a ref so the global
  // listeners (attached once per drag, removed on unmount or pointerup)
  // always read the live values without re-binding.
  const resizeAnchor = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (ev: PointerEvent) => {
      const a = resizeAnchor.current;
      if (!a) return;
      const maxW = window.innerWidth  * 0.95;
      const maxH = window.innerHeight * 0.9;
      setSize({
        w: Math.max(MIN_W, Math.min(maxW, a.w + (ev.clientX - a.x))),
        h: Math.max(MIN_H, Math.min(maxH, a.h + (ev.clientY - a.y))),
      });
    };
    const onUp = () => setResizing(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };
  }, [resizing]);

  const onResizeStart = (e: React.PointerEvent) => {
    if (fullscreen || minimized) return;
    e.stopPropagation();
    e.preventDefault();
    resizeAnchor.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    setResizing(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          drag={!fullscreen && !resizing}
          dragMomentum={false}
          dragConstraints={{ top: -200, left: -700, right: 700, bottom: 500 }}
          initial={{ opacity: 0, scale: 0.92, x: 40, y: -8 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className={
            fullscreen
              ? 'fixed inset-0 z-[998] w-full h-full'
              : 'fixed top-20 z-[998]'
          }
          style={windowStyle}
          whileDrag={fullscreen || resizing ? undefined : { cursor: 'grabbing' }}
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

            {/* Body — height animates between 0 (minimised), size.h (docked), and fill (fullscreen) */}
            <AnimatePresence initial={false}>
              {!minimized && (
                <motion.div
                  data-pg-body
                  initial={{ height: 0 }}
                  animate={{ height: fullscreen ? '100%' : size.h }}
                  exit={{ height: 0 }}
                  // Skip the height tween while the user is actively dragging
                  // the corner — otherwise every pointer move queues a 280ms
                  // animation and the resize visibly lags.
                  transition={resizing ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="relative overflow-hidden flex-1"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <PlaygroundCanvas />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Corner resize handle — bottom-right. Pointer-driven; updates
                `size` on every move. Hidden when fullscreen / minimised. */}
            {!fullscreen && !minimized && (
              <div
                onPointerDown={onResizeStart}
                onMouseDown={(e) => e.stopPropagation()}
                data-hover="true"
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize playground"
                title="Drag to resize"
                className="absolute right-0 bottom-0 w-5 h-5 flex items-end justify-end pr-1 pb-0.5 z-10"
                style={{ cursor: 'nwse-resize', touchAction: 'none' }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    lineHeight: 1,
                    color: 'var(--design-color-primary, #c9a96e)',
                    opacity: resizing ? 1 : 0.55,
                    transition: 'opacity 140ms',
                  }}
                >
                  ◢
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
