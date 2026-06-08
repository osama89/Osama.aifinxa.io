'use client';

import { useEffect, useRef, useState } from 'react';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export default function SensoryFX() {
  const [soundOn, setSoundOn] = useState(false);
  const [secret, setSecret] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(false);
  soundOnRef.current = soundOn;

  /* ── WebAudio blips ─────────────────────────────────────────────── */
  function blip(freq: number, dur: number, type: OscillatorType, gain: number) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  function enableSound() {
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AC();
    }
    ctxRef.current?.resume();
    setSoundOn(true);
    blip(660, 0.12, 'sine', 0.04);
  }

  useEffect(() => {
    const isInteractive = (t: EventTarget | null) =>
      t instanceof Element && t.closest('a, button, [data-hover], input');

    const onOver = (e: MouseEvent) => { if (soundOnRef.current && isInteractive(e.target)) blip(880, 0.05, 'sine', 0.02); };
    const onDown = () => { if (soundOnRef.current) blip(320, 0.09, 'triangle', 0.05); };

    document.addEventListener('mouseover', onOver);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mousedown', onDown);
    };
  }, []);

  /* ── Konami code ────────────────────────────────────────────────── */
  useEffect(() => {
    let idx = 0;
    const onKey = (e: KeyboardEvent) => {
      const want = KONAMI[idx];
      if (e.key.toLowerCase() === want.toLowerCase()) {
        idx++;
        if (idx === KONAMI.length) { idx = 0; setSecret(true); }
      } else {
        idx = e.key === KONAMI[0] ? 1 : 0;
      }
      if (e.key === 'Escape') setSecret(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* Sound toggle — bottom-left, off by default */}
      <button
        onClick={() => (soundOn ? setSoundOn(false) : enableSound())}
        data-hover="true"
        title={soundOn ? 'Mute' : 'Enable sound'}
        className="fixed bottom-5 left-5 z-[60] flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition-colors"
        style={{
          borderColor: soundOn ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.12)',
          background: 'rgba(10,14,20,0.6)',
          color: soundOn ? '#22d3ee' : 'rgba(255,255,255,0.4)',
        }}
      >
        {soundOn ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" />
          </svg>
        )}
      </button>

      {secret && <SecretWarp onClose={() => setSecret(false)} />}
    </>
  );
}

/* ── Konami-unlocked fullscreen starfield warp ────────────────────── */
function SecretWarp({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);

    type Star = { x: number; y: number; z: number };
    const stars: Star[] = Array.from({ length: 520 }, () => ({
      x: (Math.sin(performance.now() + Math.random() * 1000) * w) - w / 2,
      y: (Math.random() - 0.5) * h,
      z: Math.random() * w,
    }));
    // seed deterministically-ish without Math.random reliance issues
    stars.forEach((s) => { s.x = (Math.random() - 0.5) * w; s.y = (Math.random() - 0.5) * h; s.z = Math.random() * w; });

    let raf = 0;
    const draw = () => {
      ctx.fillStyle = 'rgba(6,12,18,0.4)';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      for (const s of stars) {
        s.z -= 8;
        if (s.z <= 0) { s.x = (Math.random() - 0.5) * w; s.y = (Math.random() - 0.5) * h; s.z = w; }
        const k = 128 / s.z;
        const px = s.x * k, py = s.y * k;
        const pz = w / s.z;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${103 + pz * 20},${232},${249},${Math.min(1, pz / 4)})`;
        ctx.arc(px, py, Math.min(2.4, pz * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <div className="fixed inset-0 z-[9000] cursor-pointer" onClick={onClose}>
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-[#22d3ee]/80">dev mode unlocked</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl" style={{ fontFamily: 'var(--font-inter)' }}>
          You found the konami code.
        </h2>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">click anywhere or press esc to exit</p>
      </div>
    </div>
  );
}
