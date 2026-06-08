"use client";

import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { useRef } from "react";

/**
 * MotionLayerScroller — Multi-depth parallax background.
 * Three layers: deep grid (slow), mid blueprint, foreground accents (fast).
 */
export function MotionLayerScroller({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["0%", "-40%"]);
  const y3 = useTransform(scrollYProgress, [0, 1], ["0%", "-60%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.4, 0.7, 0.4]);

  return (
    <div ref={ref} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <Layer y={y1} opacity={opacity}>
        <div className="bg-blueprint absolute inset-[-20%]" />
      </Layer>
      <Layer y={y2} opacity={opacity}>
        <div className="bg-blueprint-dense absolute inset-[-30%] opacity-50" />
      </Layer>
      <Layer y={y3} opacity={opacity}>
        <div
          className="absolute inset-[-40%]"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(34, 211, 238, 0.15), transparent 60%), radial-gradient(circle at 80% 70%, rgba(19, 130, 148, 0.18), transparent 60%)",
          }}
        />
      </Layer>
    </div>
  );
}

function Layer({
  children,
  y,
  opacity,
}: {
  children: React.ReactNode;
  y: MotionValue<string>;
  opacity: MotionValue<number>;
}) {
  return (
    <motion.div style={{ y, opacity }} className="absolute inset-0">
      {children}
    </motion.div>
  );
}
