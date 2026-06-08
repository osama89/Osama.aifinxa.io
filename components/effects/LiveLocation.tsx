"use client";

import { motion } from "framer-motion";
import { Ping } from "./Ping";

/**
 * LiveLocation — Floating tag indicating live origin.
 * Used in the hero corner.
 */
export function LiveLocation({
  label = "Dubai, UAE",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={`inline-flex items-center gap-2.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)]/80 px-3 py-1.5 text-xs backdrop-blur-md ${className}`}
    >
      <Ping size={8} />
      {/* MapPin (inline, no extra dep) */}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-accent-glow)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
        {label}
      </span>
    </motion.div>
  );
}
