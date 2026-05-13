'use client';

import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useInView } from 'framer-motion';
import Image from 'next/image';

const PhotoIntelligence = dynamic(() => import('./PhotoIntelligence'), { ssr: false });

const EXPERIENCE = [
  { role: 'Product Manager – AI-Native Platform Owner', company: 'Olive Green Holding', period: '2026 – Present' },
  { role: 'AI & BI Solutions Lead', company: 'Model Link Events', period: '2024 – 2025' },
  { role: 'Senior Business Intelligence Specialist', company: 'Qatar Foundation', period: '2022 – 2024' },
  { role: 'Sr. BI Analyst & Mobile Solutions Lead', company: 'Consolidated Contractors (CCC)', period: '2015 – 2022' },
  { role: 'Business Intelligence Analyst', company: 'Consolidated Contractors (CCC)', period: '2012 – 2015' },
];

// SSR-stable — no Math.random(), computed once at module parse time
const PARTICLES = [
  { left: '8%',  delay: '0s',    size: 3, duration: '4.2s' },
  { left: '18%', delay: '0.7s',  size: 2, duration: '5.1s' },
  { left: '27%', delay: '1.4s',  size: 4, duration: '3.8s' },
  { left: '35%', delay: '0.3s',  size: 2, duration: '4.7s' },
  { left: '44%', delay: '2.1s',  size: 3, duration: '5.5s' },
  { left: '52%', delay: '0.9s',  size: 2, duration: '4.0s' },
  { left: '61%', delay: '1.6s',  size: 4, duration: '3.5s' },
  { left: '69%', delay: '0.5s',  size: 3, duration: '4.9s' },
  { left: '75%', delay: '2.4s',  size: 2, duration: '5.2s' },
  { left: '82%', delay: '1.1s',  size: 3, duration: '4.4s' },
  { left: '88%', delay: '0.2s',  size: 2, duration: '3.9s' },
  { left: '14%', delay: '3.0s',  size: 4, duration: '5.8s' },
  { left: '56%', delay: '1.8s',  size: 2, duration: '4.6s' },
  { left: '92%', delay: '2.7s',  size: 3, duration: '4.3s' },
] as const;

export default function About() {
  const sectionRef    = useRef<HTMLDivElement>(null);
  const textRef       = useRef<HTMLDivElement>(null);
  const photoRef      = useRef<HTMLDivElement>(null);
  const photoWrapRef  = useRef<HTMLDivElement>(null);
  const [focusOpen, setFocusOpen] = useState(false);

  const isInView      = useInView(textRef,      { once: true, margin: '-100px' });
  const isPhotoInView = useInView(photoWrapRef, { once: true, margin: '-80px' });

  // 3D mouse-tracking tilt — targets the inner photoRef, not the wrappers
  useEffect(() => {
    const el = photoRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      if (e.clientX > window.innerWidth * 0.6) {
        el.style.transition = 'transform 0.8s cubic-bezier(0.16,1,0.3,1)';
        el.style.transform  = 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale(1)';
        return;
      }
      const rect = el.getBoundingClientRect();
      const rx = ((e.clientY - (rect.top  + rect.height / 2)) / rect.height) * -10;
      const ry = ((e.clientX - (rect.left + rect.width  / 2)) / rect.width)  *  12;
      el.style.transition = 'transform 0.12s ease';
      el.style.transform  = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
    };

    const onLeave = () => {
      el.style.transition = 'transform 0.9s cubic-bezier(0.16,1,0.3,1)';
      el.style.transform  = 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale(1)';
    };

    window.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="py-24 px-6 md:px-12 max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-start"
    >

      {/* ── Photo column ─────────────────────────────────────── */}
      <motion.div
        ref={photoWrapRef}
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={isPhotoInView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{
          boxShadow: [
            '0 0 0 1px rgba(201,169,110,0.3), 0 0 30px 4px rgba(201,169,110,0.12)',
            '0 0 0 1px rgba(201,169,110,0.5), 0 0 50px 8px rgba(201,169,110,0.22)',
            '0 0 0 1px rgba(201,169,110,0.3), 0 0 30px 4px rgba(201,169,110,0.12)',
          ],
          transition: { boxShadow: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } },
        }}
        style={{ position: 'relative' }}
      >
        {/* Float wrapper — float CSS lives here so it doesn't conflict with the JS tilt transform */}
        <div style={{ animation: 'photo-float 4s ease-in-out infinite', willChange: 'transform' }}>

          {/* tilt target — overflow clipping boundary */}
          <div
            ref={photoRef}
            onClick={() => setFocusOpen(true)}
            role="button"
            tabIndex={0}
            aria-label="Enter intelligence mode"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFocusOpen(true); }}
            data-hover="true"
            className="relative overflow-hidden aspect-[3/4] cursor-pointer group"
            style={{ willChange: 'transform' }}
          >
            <Image
              src="/images/photo.jpg"
              alt="Osama AlAhmad"
              fill
              className="object-cover object-top"
              style={{ imageOrientation: 'from-image' }}
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />

            {/* z-10: Bottom gradient fade */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 10,
                background: 'linear-gradient(to bottom, transparent 55%, rgba(10,10,10,0.65) 100%)',
              }}
            />

            {/* z-10: Top-left gloss highlight */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 10,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)',
              }}
            />

            {/* z-20: Holographic foil shimmer — diagonal iridescent band that slides across */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 20,
                background: 'linear-gradient(135deg, transparent 0%, rgba(255,220,150,0.07) 30%, rgba(180,160,255,0.07) 55%, rgba(100,200,255,0.05) 75%, transparent 100%)',
                mixBlendMode: 'screen',
                animation: 'holo-slide 5s ease-in-out infinite',
              }}
            />

            {/* z-30: Gold scan line — sweeps top to bottom every 3.5s */}
            <div
              className="absolute left-0 w-full pointer-events-none"
              style={{
                zIndex: 30,
                height: '2px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(201,169,110,0.55) 50%, transparent 100%)',
                animation: 'scan-sweep 3.5s linear infinite',
              }}
            />

            {/* z-30: Gold sparkle particles — rise from just above the stats bar */}
            {PARTICLES.map((p, i) => (
              <div
                key={i}
                className="absolute pointer-events-none rounded-full"
                style={{
                  zIndex: 30,
                  left: p.left,
                  bottom: '86px',
                  width: p.size,
                  height: p.size,
                  backgroundColor: '#c9a96e',
                  boxShadow: `0 0 ${p.size * 2}px rgba(201,169,110,0.85)`,
                  animation: `particle-rise ${p.duration} ${p.delay} ease-out infinite`,
                }}
              />
            ))}

            {/* z-35: Hover prompt — fades in on hover to invite the click */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                zIndex: 35,
                background: 'radial-gradient(ellipse at center, rgba(201,169,110,0.18) 0%, transparent 65%)',
              }}
            >
              <div className="text-center" style={{ fontFamily: 'var(--font-mono)' }}>
                <div className="w-12 h-12 mx-auto mb-3 border border-[#c9a96e]/70 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a96e" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M3 12a9 9 0 0118 0M3 12a9 9 0 0018 0" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-[#c9a96e] text-[9px] tracking-[0.5em] uppercase">Click · Explore</p>
                <p className="text-white/50 text-[8px] tracking-[0.4em] uppercase mt-1">Intelligence Mode</p>
              </div>
            </div>

            {/* z-40: Corner frames */}
            <div className="absolute inset-0 border border-[#c9a96e]/20 pointer-events-none" style={{ zIndex: 40 }} />
            <div className="absolute top-4 left-4 w-10 h-10 border-l-2 border-t-2 border-[#c9a96e]/60 pointer-events-none" style={{ zIndex: 40 }} />
            <div className="absolute bottom-4 right-4 w-10 h-10 border-r-2 border-b-2 border-[#c9a96e]/60 pointer-events-none" style={{ zIndex: 40 }} />

            {/* z-50: Stats overlay */}
            <div className="absolute bottom-6 left-6 right-6 pointer-events-none" style={{ zIndex: 50 }}>
              <div className="bg-black/80 backdrop-blur-sm border border-white/10 p-5 grid grid-cols-3 gap-3">
                {[['13+', 'Years'], ['50+', 'Projects'], ['UAE', 'Based']].map(([n, l]) => (
                  <div key={l} className="text-center">
                    <p className="text-[#c9a96e] text-xl font-black" style={{ fontFamily: 'var(--font-playfair)' }}>{n}</p>
                    <p className="text-white/40 text-[10px] tracking-widest uppercase mt-1" style={{ fontFamily: 'var(--font-inter)' }}>{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Text column ──────────────────────────────────────── */}
      <div ref={textRef} className="pt-4">
        <motion.p
          initial={{ opacity: 0, x: 30 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-[#c9a96e] text-xs tracking-[0.5em] uppercase mb-6"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          About
        </motion.p>

        <div className="mb-8 overflow-hidden">
          {['Building systems', 'that think,', 'decide, and act.'].map((line, i) => (
            <div key={i} className="overflow-hidden">
              <motion.p
                initial={{ y: '110%', opacity: 0 }}
                animate={isInView ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.9, delay: i * 0.13, ease: [0.22, 1, 0.36, 1] }}
                className="text-4xl md:text-5xl font-black leading-tight"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                {line}
              </motion.p>
            </div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-white/50 leading-relaxed mb-10 text-sm"
          style={{ fontFamily: 'var(--font-inter)', fontWeight: 300 }}
        >
          AI Product Owner and Business Intelligence Professional based in Dubai, UAE,
          with over a decade of experience turning complex business requirements into
          intelligent, automated systems — across construction, finance, HR, and enterprise
          operations throughout the GCC. What started as deep expertise in Power BI and data
          engineering has evolved into building AI-first systems where LLMs, automation
          workflows, and ERP data work together to eliminate manual work entirely.
          Co-leader of the Power Platform User Group community in Dubai.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="space-y-4 mb-10"
        >
          {EXPERIENCE.map((job, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.7 + i * 0.1 }}
              className="flex items-start gap-4"
            >
              <div className="w-[1px] h-full bg-[#c9a96e]/30 mt-2 flex-shrink-0 self-stretch" />
              <div>
                <p className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-inter)' }}>
                  {job.role}
                </p>
                <p className="text-[#c9a96e]/70 text-xs mt-0.5" style={{ fontFamily: 'var(--font-inter)' }}>
                  {job.company}
                  <span className="text-white/20 ml-2">· {job.period}</span>
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.a
          href="https://www.linkedin.com/in/osamaalahmad/"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="inline-flex items-center gap-4 group"
          data-hover="true"
        >
          <span
            className="text-sm tracking-[0.3em] uppercase text-[#c9a96e] group-hover:text-white transition-colors duration-300"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            LinkedIn Profile
          </span>
          <span className="w-12 h-[1px] bg-[#c9a96e] group-hover:w-20 transition-all duration-500" />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a96e" strokeWidth="1.5">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.a>
      </div>

      <PhotoIntelligence isOpen={focusOpen} onClose={() => setFocusOpen(false)} />
    </section>
  );
}
