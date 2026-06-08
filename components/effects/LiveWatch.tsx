"use client";

import { useEffect, useState } from "react";

/**
 * LiveWatch — Combined analog + digital clock that ticks in real time,
 * displaying Dubai time (Asia/Dubai). Built as a small panel that sits in
 * the hero corner or footer.
 */
export function LiveWatch({
  timeZone = "Asia/Dubai",
  city = "Dubai · GMT+4",
  size = 64,
}: {
  timeZone?: string;
  city?: string;
  size?: number;
}) {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) {
    // SSR placeholder — keeps layout stable
    return (
      <div className="inline-flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]/80 px-3 py-2 backdrop-blur-md">
        <div
          className="rounded-full border border-[var(--color-line)] bg-[var(--color-bg)]"
          style={{ width: size, height: size }}
        />
        <div>
          <div className="font-mono text-[11px] tabular-nums text-[var(--color-ink)]">
            --:--:--
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-muted-2)]">
            {city}
          </div>
        </div>
      </div>
    );
  }

  // Compute hours/minutes/seconds in the target timezone via Intl
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(time);
  const part = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hh = parseInt(part("hour"), 10);
  const mm = parseInt(part("minute"), 10);
  const ss = parseInt(part("second"), 10);

  const hourAngle = (hh % 12) * 30 + mm * 0.5;
  const minAngle = mm * 6 + ss * 0.1;
  const secAngle = ss * 6;

  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]/80 px-3 py-2 backdrop-blur-md">
      {/* Analog */}
      <div
        className="relative rounded-full border border-[var(--color-line)] bg-[var(--color-bg)] shadow-[inset_0_0_12px_rgba(0,0,0,0.6)]"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {/* Tick marks */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          const major = i % 3 === 0;
          return (
            <span
              key={i}
              className={`absolute left-1/2 top-1/2 origin-bottom ${
                major ? "h-[6px] w-[1.5px]" : "h-[3px] w-[1px]"
              } -translate-x-1/2 ${major ? "bg-[var(--color-accent-glow)]" : "bg-[var(--color-muted-2)]"}`}
              style={{
                transform: `translate(-50%, -100%) rotate(${angle}deg) translateY(-${size / 2 - 4}px)`,
                transformOrigin: "50% 100%",
              }}
            />
          );
        })}
        {/* Hour hand */}
        <span
          className="absolute left-1/2 top-1/2 origin-bottom rounded-full bg-[var(--color-ink)]"
          style={{
            width: 2,
            height: size * 0.27,
            transform: `translateX(-50%) translateY(-100%) rotate(${hourAngle}deg)`,
            transformOrigin: "50% 100%",
          }}
        />
        {/* Minute hand */}
        <span
          className="absolute left-1/2 top-1/2 origin-bottom rounded-full bg-[var(--color-muted)]"
          style={{
            width: 1.5,
            height: size * 0.38,
            transform: `translateX(-50%) translateY(-100%) rotate(${minAngle}deg)`,
            transformOrigin: "50% 100%",
          }}
        />
        {/* Second hand */}
        <span
          className="absolute left-1/2 top-1/2 origin-bottom rounded-full bg-[var(--color-accent-glow)]"
          style={{
            width: 1,
            height: size * 0.42,
            transform: `translateX(-50%) translateY(-100%) rotate(${secAngle}deg)`,
            transformOrigin: "50% 100%",
            boxShadow: "0 0 4px rgba(34,211,238,0.7)",
          }}
        />
        {/* Pivot */}
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent-glow)] shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
      </div>

      {/* Digital */}
      <div className="flex flex-col">
        <div className="font-mono text-[13px] font-medium tabular-nums leading-none text-[var(--color-ink)]">
          {String(hh).padStart(2, "0")}
          <span className="text-[var(--color-accent-glow)]">:</span>
          {String(mm).padStart(2, "0")}
          <span className="text-[var(--color-muted-2)]">:</span>
          <span className="text-[var(--color-muted)]">{String(ss).padStart(2, "0")}</span>
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-muted-2)]">
          {city}
        </div>
      </div>
    </div>
  );
}
