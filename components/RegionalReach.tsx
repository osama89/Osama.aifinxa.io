'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { InteractivePortrait } from '@/components/effects/InteractivePortrait';

// WebGL globe is client-only (touches window/WebGL immediately).
const GlobeWebGL = dynamic(
  () => import('@/components/effects/GlobeWebGL').then((m) => m.GlobeWebGL),
  { ssr: false, loading: () => <GlobeSkeleton /> },
);

function GlobeSkeleton() {
  return (
    <div className="relative aspect-square w-full max-w-[560px]">
      <div className="absolute inset-[-10%] rounded-full bg-[var(--color-accent)]/20 blur-3xl" />
      <div className="relative h-full w-full rounded-full border border-[var(--color-line)]/40 bg-[var(--color-surface)]/40" />
    </div>
  );
}

const CITIES = [
  'Dubai',
  'Abu Dhabi',
  'Riyadh',
  'Doha',
  'Muscat',
  'Kuwait City',
  'Manama',
];

export default function RegionalReach() {
  return (
    <section
      id="region"
      className="relative overflow-hidden border-y border-[var(--color-line)]/60 bg-[var(--color-surface)] py-28 lg:py-36"
    >
      {/* Blueprint ground */}
      <div className="bg-blueprint pointer-events-none absolute inset-0 opacity-25" />
      <div className="bg-radial-fade pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2">
            <span className="h-px w-8 bg-[var(--color-accent)]" />
            <span
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent-glow)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Based in Dubai
            </span>
            <span className="h-px w-8 bg-[var(--color-accent)]" />
          </div>
          <h2
            className="mt-4 text-balance text-4xl font-black leading-[1.05] tracking-tight md:text-5xl lg:text-6xl"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            From the <span className="text-accent-grad">GCC</span>,
            <br />
            <span className="text-[var(--color-muted)]">for the GCC.</span>
          </h2>
          <p
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[var(--color-muted)] md:text-lg"
            style={{ fontFamily: 'var(--font-inter)', fontWeight: 300 }}
          >
            Over a decade building AI-first and business-intelligence systems on
            live projects across the Gulf — construction, oil &amp; gas, finance,
            and enterprise operations. On the ground, in the region, in the timezone.
          </p>
        </div>

        {/* Portrait + globe */}
        <div className="mt-16 grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left — operator ID card */}
          <div className="flex justify-center lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <InteractivePortrait
                photoSrc="/images/photo.jpg"
                name="Osama AlAhmad"
                role="AI Product Owner"
                meta="Dubai · GMT+4 · Live"
              />
            </motion.div>
          </div>

          {/* Right — globe (BIG) */}
          <div className="flex items-center justify-center lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[640px]"
            >
              <GlobeWebGL />
            </motion.div>
          </div>
        </div>

        {/* City chips */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-2.5">
          {CITIES.map((city) => (
            <span
              key={city}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)]/60 bg-[var(--color-bg)]/40 px-3.5 py-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-glow)] shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
              <span
                className="text-xs text-[var(--color-ink)]"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {city}
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
