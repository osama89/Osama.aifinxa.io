'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const URL = 'https://2016.makemepulse.com/';

interface PlaygroundWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlaygroundWindow({ isOpen, onClose }: PlaygroundWindowProps) {
  const [minimized, setMinimized] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleReopen = () => {
    setLoading(true);
    setMinimized(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={{ top: -200, left: -700, right: 700, bottom: 500 }}
          initial={{ opacity: 0, scale: 0.88, x: 60, y: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.88 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-28 z-[998] w-[680px] max-w-[90vw]"
          style={{ left: 'calc(50% + 40px)', cursor: 'grab' }}
          whileDrag={{ cursor: 'grabbing' }}
        >
          <div
            className="border border-white/10 shadow-2xl overflow-hidden"
            style={{ background: 'rgba(7, 7, 11, 0.97)', backdropFilter: 'blur(20px)' }}
          >
            {/* Title bar */}
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/8"
              style={{ userSelect: 'none' }}
            >
              {/* Traffic lights */}
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition flex-shrink-0"
                style={{ cursor: 'pointer' }}
                title="Close"
              />
              <button
                onClick={(e) => { e.stopPropagation(); setMinimized(m => !m); if (minimized) handleReopen(); }}
                className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-90 transition flex-shrink-0"
                style={{ cursor: 'pointer' }}
                title="Minimise"
              />
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: 'rgba(40,200,64,0.2)' }} />

              <span
                className="ml-3 flex-1 text-center text-white/20 tracking-[0.12em]"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}
              >
                playground
              </span>
            </div>

            {/* Iframe body */}
            <AnimatePresence>
              {!minimized && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 460 }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.24 }}
                  className="relative overflow-hidden"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Loading shimmer */}
                  {loading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4" style={{ background: '#07070b' }}>
                      <div className="w-8 h-8 border border-[#c9a96e]/30 border-t-[#c9a96e] rounded-full" style={{ animation: 'spin 0.9s linear infinite' }} />
                      <p className="text-white/20 tracking-[0.3em] uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                        loading site...
                      </p>
                    </div>
                  )}

                  <iframe
                    src={URL}
                    title="Playground — makemepulse"
                    className="w-full border-0 block"
                    style={{ height: '460px', display: 'block' }}
                    onLoad={() => setLoading(false)}
                    allow="fullscreen"
                  />

                  {/* Overlay patches to hide social media icons in the iframe */}
                  {/* Bottom-left corner (Instagram / Facebook) */}
                  <div className="absolute bottom-0 left-0 w-28 h-14 pointer-events-none" style={{ background: '#07070b' }} />
                  {/* Bottom-right corner (Twitter / X) */}
                  <div className="absolute bottom-0 right-0 w-28 h-14 pointer-events-none" style={{ background: '#07070b' }} />
                  {/* Bottom center bar if any */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-10 pointer-events-none" style={{ background: '#07070b' }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
