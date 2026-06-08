"use client";

import { useEffect, useRef } from "react";

/**
 * GlyphRain — Matrix-style falling glyphs on a canvas. Tuned to our
 * teal/cyan brand palette (not the cliché green). Designed to sit behind
 * featured UI like the iPhone mockup.
 *
 * Each column drops at its own speed, with the leading glyph brighter
 * than the trailing ones. Glyphs occasionally swap characters mid-fall.
 */
export function GlyphRain({
  className = "",
  fontSize = 14,
  speed = 1.2,
  density = 0.85,
  fadeAlpha = 0.085,
}: {
  className?: string;
  fontSize?: number;
  speed?: number;
  density?: number;
  fadeAlpha?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const chars =
      "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓ0123456789!@#$%^&*()_+|=<>SnagIT◆◇■□▲△●○✓";
    let dpr = 1;
    let columns = 0;
    let drops: { y: number; v: number; lead: boolean }[] = [];
    let raf = 0;

    function setup() {
      if (!canvas || !wrap || !ctx) return;
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
      ctx.scale(dpr, dpr);
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
      ctx.textBaseline = "top";
      columns = Math.ceil(rect.width / (fontSize * 0.7));
      drops = Array.from({ length: columns }).map(() => ({
        y: Math.random() * -rect.height,
        v: speed * (0.5 + Math.random() * 1.5),
        lead: Math.random() < density,
      }));
      // Black background once
      ctx.fillStyle = "rgba(10, 14, 20, 1)";
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    function frame() {
      if (!canvas || !wrap || !ctx) return;
      const rect = wrap.getBoundingClientRect();
      // Trail fade
      ctx.fillStyle = `rgba(10, 14, 20, ${fadeAlpha})`;
      ctx.fillRect(0, 0, rect.width, rect.height);

      for (let i = 0; i < columns; i++) {
        const d = drops[i];
        if (!d || !d.lead) continue;
        const x = i * fontSize * 0.7;
        const ch = chars[Math.floor(Math.random() * chars.length)];

        // Trail (dim cyan)
        ctx.fillStyle = "rgba(19, 130, 148, 0.55)";
        ctx.fillText(ch, x, d.y - fontSize);

        // Head (bright)
        ctx.fillStyle = "rgba(165, 243, 252, 0.95)";
        ctx.shadowColor = "rgba(34, 211, 238, 0.85)";
        ctx.shadowBlur = 6;
        ctx.fillText(ch, x, d.y);
        ctx.shadowBlur = 0;

        d.y += fontSize * d.v;
        if (d.y > rect.height + 60) {
          d.y = -Math.random() * 100;
          d.v = speed * (0.5 + Math.random() * 1.5);
        }
      }

      raf = requestAnimationFrame(frame);
    }

    setup();
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(setup);
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [fontSize, speed, density, fadeAlpha]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`} aria-hidden>
      <canvas ref={canvasRef} className="block h-full w-full opacity-60" />
      {/* Inner edge fade */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(10,14,20,0.85) 85%)",
        }}
      />
    </div>
  );
}
