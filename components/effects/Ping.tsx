"use client";

import { motion } from "framer-motion";

/**
 * Ping — Concentric radar pings, useful as a "live" indicator.
 */
export function Ping({
  size = 12,
  color = "var(--color-accent-glow)",
  count = 3,
  className = "",
}: {
  size?: number;
  color?: string;
  count?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full"
          style={{ background: color }}
          animate={{ scale: [1, 2.6], opacity: [0.55, 0] }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            delay: i * 0.7,
            ease: "easeOut",
          }}
        />
      ))}
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: color, boxShadow: `0 0 10px ${color}` }}
      />
    </span>
  );
}
