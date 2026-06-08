"use client";

import Image from "next/image";
import { useRef } from "react";

/**
 * InteractivePortrait — A portrait card that tilts on cursor and whose
 * accent gradient tracks the mouse. Supports either initials OR a real
 * photo (preferred). Used in the inventor section.
 */
export function InteractivePortrait({
  initials,
  photoSrc,
  photoAlt,
  name,
  role,
  meta,
}: {
  initials?: string;
  photoSrc?: string;
  photoAlt?: string;
  name: string;
  role: string;
  meta: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const wrap = wrapRef.current;
    const card = cardRef.current;
    if (!wrap || !card) return;
    const rect = wrap.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (py - 0.5) * -12;
    const ry = (px - 0.5) * 14;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    card.style.setProperty("--mx", `${px * 100}%`);
    card.style.setProperty("--my", `${py * 100}%`);
  }
  function reset() {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
  }

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className="relative mx-auto"
      style={{ perspective: 900 }}
    >
      <div
        ref={cardRef}
        className="relative h-[420px] w-[320px] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-[0_30px_80px_-20px_rgba(34,211,238,0.3)] transition-transform duration-300 ease-out will-change-transform"
        style={
          {
            transformStyle: "preserve-3d",
            ["--mx" as string]: "50%",
            ["--my" as string]: "50%",
          } as React.CSSProperties
        }
      >
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-gradient-to-br from-[var(--color-steel)] via-[var(--color-surface)] to-[#0c1218]">
          {/* Photo or initials */}
          {photoSrc ? (
            <div
              className="relative h-full w-full overflow-hidden"
              style={{ transform: "translateZ(0)" }}
            >
              <Image
                src={photoSrc}
                alt={photoAlt ?? name}
                fill
                priority
                sizes="320px"
                className="object-cover"
              />
              {/* Duotone overlay to brand the photo */}
              <div
                className="pointer-events-none absolute inset-0 mix-blend-color"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(19, 130, 148, 0.18), rgba(10, 14, 20, 0.55))",
                }}
              />
              {/* Bottom gradient for caption legibility */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-[#040608] via-[#040608cc] to-transparent" />

              {/* Cursor-following accent */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(280px circle at var(--mx) var(--my), rgba(34,211,238,0.22), transparent 60%)",
                  mixBlendMode: "screen",
                }}
              />

              {/* Blueprint texture overlay (very subtle) */}
              <div className="pointer-events-none absolute inset-0 bg-blueprint-dense opacity-[0.08]" />

              {/* Scanline */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.05]"
                style={{
                  background:
                    "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)",
                }}
              />

              {/* Caption block */}
              <div
                className="absolute inset-x-5 bottom-5 z-10"
                style={{ transform: "translateZ(30px)" }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-accent-glow)]">
                  {role}
                </div>
                <div className="mt-1.5 text-lg font-semibold tracking-tight text-white">
                  {name}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-400">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    {meta}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <InitialsBlock initials={initials ?? "?"} name={name} role={role} meta={meta} />
          )}

          {/* Corner glints */}
          <div className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-[var(--color-accent-glow)]/70" />
          <div className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-[var(--color-accent-glow)]/70" />
          <div className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-[var(--color-accent-glow)]/70" />
          <div className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-[var(--color-accent-glow)]/70" />
        </div>
      </div>

      {/* Glow halo behind card */}
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-[var(--color-accent)]/15 blur-3xl" />
    </div>
  );
}

function InitialsBlock({
  initials,
  name,
  role,
  meta,
}: {
  initials: string;
  name: string;
  role: string;
  meta: string;
}) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center p-6">
      <div className="absolute inset-0 bg-blueprint-dense opacity-30" />
      <div
        className="relative flex h-32 w-32 items-center justify-center rounded-full border border-[var(--color-accent)]/40 bg-gradient-to-br from-[var(--color-accent)]/30 to-[var(--color-accent-glow)]/10 text-4xl font-semibold text-[var(--color-accent-glow)] shadow-[0_0_60px_-10px_rgba(34,211,238,0.5)]"
        style={{ transform: "translateZ(40px)" }}
      >
        {initials}
      </div>
      <div className="relative mt-5 text-center" style={{ transform: "translateZ(30px)" }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-muted-2)]">
          {role}
        </div>
        <div className="mt-1.5 text-base font-medium text-[var(--color-ink)]">
          {name}
        </div>
      </div>
      <div
        className="absolute inset-x-4 bottom-4 flex items-center justify-between text-[9px] text-[var(--color-muted-2)]"
        style={{ transform: "translateZ(20px)" }}
      >
        <span>{meta}</span>
        <span className="font-mono">2026</span>
      </div>
    </div>
  );
}
