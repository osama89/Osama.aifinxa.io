'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const AI_SKILLS = [
  'Claude (Anthropic)', 'Claude Code', 'OpenAI / GPT-4', 'n8n Workflows',
  'Copilot Studio', 'Botpress', 'Power Automate', 'Prompt Engineering',
  'Azure AI Foundry', 'Azure ML Studio', 'Docker', 'Graph API',
  'Cursor', 'Replit', 'Base44', 'CodeX',
];

const BI_SKILLS = [
  'Power BI', 'DAX / SSAS', 'Azure Synapse', 'PostgreSQL', 'SQL Server',
  'Azure Data Lake', 'Databricks', 'ETL / ELT', 'Tableau',
  'SSRS', 'SSIS', 'IBM Cognos', 'Kibana', 'Azure SQL',
];

const DEV_SKILLS = [
  'PowerApps', 'Odoo ERP', 'Microsoft 365', 'VS Code',
  'VB.NET', 'HTML5 / jQuery', 'WordPress', 'RFID Systems',
  'Jira', 'Jupyter', 'Splunk', 'Agile / Scrum',
];

const BUILDS = [
  {
    title: 'CFO AI Suite',
    tag: 'Olive Green Holding · 2026',
    desc: '10 production-ready AI tools — AP, AR, audit, procurement, budgeting, financial modelling, HR, investment management. Each deployed in under 3 days.',
  },
  {
    title: 'AI PA Bot',
    tag: 'Automation · 2025',
    desc: 'Schedules meetings from a single Telegram message using Claude AI + Microsoft 365 Graph API. Zero clicks. Fully autonomous.',
  },
  {
    title: 'RFID Smart Construction',
    tag: 'CCC · 2014–Present',
    desc: 'Full RFID ecosystem for Oil & Gas GCC projects — Smart Yard, Smart Warehouse, Smart Gate, Smart Fuel. Real-time tracking across Habshan & PDO Oman.',
  },
  {
    title: 'QF Long-Term Planning App',
    tag: 'Qatar Foundation · 2022–Present',
    desc: "Enterprise PowerApps supporting QF's Cultivating Multiversity strategy (2023–2032). Nationwide relevance through ecosystem leverage and strategic impact tracking.",
  },
];

/* ─── Individual panels ─── */

function PanelStats() {
  return (
    <div className="w-screen h-full flex-shrink-0 flex flex-col justify-center px-12 md:px-24 border-r border-white/5 relative overflow-hidden">
      {/* Background number */}
      <span
        className="absolute right-6 bottom-6 text-[22rem] font-black leading-none select-none pointer-events-none"
        style={{ fontFamily: 'var(--font-inter)', color: 'rgba(27, 163, 184,0.04)' }}
      >
        01
      </span>

      <p className="text-[#1ba3b8] text-xs tracking-[0.5em] uppercase mb-8" style={{ fontFamily: 'var(--font-inter)' }}>
        Who I Am
      </p>

      <h2 className="text-5xl md:text-7xl font-black leading-none mb-12" style={{ fontFamily: 'var(--font-inter)' }}>
        13 Years<br />
        <span className="text-[#1ba3b8]">Building.</span>
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl">
        {[
          { value: '13+', label: 'Years Experience', sub: 'GCC & UAE' },
          { value: '50+', label: 'Projects Shipped', sub: 'Enterprise Scale' },
          { value: '10', label: 'AI Tools Built', sub: '2026 alone' },
          { value: '3', label: 'Companies', sub: 'Fully Automated' },
        ].map(({ value, label, sub }) => (
          <div key={label} className="border-t border-white/10 pt-4">
            <p className="text-4xl md:text-5xl font-black text-[#1ba3b8] mb-2" style={{ fontFamily: 'var(--font-inter)' }}>
              {value}
            </p>
            <p className="text-white/70 text-xs font-medium tracking-wide" style={{ fontFamily: 'var(--font-inter)' }}>
              {label}
            </p>
            <p className="text-white/25 text-[10px] tracking-widest uppercase mt-1" style={{ fontFamily: 'var(--font-inter)' }}>
              {sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelAI() {
  return (
    <div className="w-screen h-full flex-shrink-0 flex flex-col justify-center px-12 md:px-24 border-r border-white/5 relative overflow-hidden">
      <span
        className="absolute right-6 bottom-6 text-[22rem] font-black leading-none select-none pointer-events-none"
        style={{ fontFamily: 'var(--font-inter)', color: 'rgba(27, 163, 184,0.04)' }}
      >
        02
      </span>

      <p className="text-[#1ba3b8] text-xs tracking-[0.5em] uppercase mb-8" style={{ fontFamily: 'var(--font-inter)' }}>
        Technical Stack
      </p>

      <h2 className="text-5xl md:text-7xl font-black leading-none mb-12" style={{ fontFamily: 'var(--font-inter)' }}>
        AI &amp;<br />
        <span className="text-[#1ba3b8]">Automation.</span>
      </h2>

      <div className="flex flex-wrap gap-3 max-w-2xl">
        {AI_SKILLS.map((skill) => (
          <span
            key={skill}
            className="px-4 py-2 border border-white/10 text-white/60 text-sm hover:border-[#1ba3b8]/50 hover:text-white transition-all duration-300"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

function PanelBI() {
  return (
    <div className="w-screen h-full flex-shrink-0 flex flex-col justify-center px-12 md:px-24 border-r border-white/5 relative overflow-hidden">
      <span
        className="absolute right-6 bottom-6 text-[22rem] font-black leading-none select-none pointer-events-none"
        style={{ fontFamily: 'var(--font-inter)', color: 'rgba(27, 163, 184,0.04)' }}
      >
        03
      </span>

      <p className="text-[#1ba3b8] text-xs tracking-[0.5em] uppercase mb-8" style={{ fontFamily: 'var(--font-inter)' }}>
        Data & Platform
      </p>

      <h2 className="text-5xl md:text-7xl font-black leading-none mb-10" style={{ fontFamily: 'var(--font-inter)' }}>
        BI &amp;<br />
        <span className="text-[#1ba3b8]">Intelligence.</span>
      </h2>

      <div className="grid grid-cols-2 gap-10 max-w-2xl">
        <div>
          <p className="text-[#1ba3b8]/60 text-[10px] tracking-[0.4em] uppercase mb-4 pb-2 border-b border-[#1ba3b8]/20" style={{ fontFamily: 'var(--font-inter)' }}>
            BI &amp; Data
          </p>
          <div className="flex flex-wrap gap-2">
            {BI_SKILLS.map(s => (
              <span key={s} className="px-3 py-1.5 border border-white/10 text-white/60 text-xs hover:border-[#1ba3b8]/40 hover:text-white transition-colors duration-300" style={{ fontFamily: 'var(--font-inter)' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[#1ba3b8]/60 text-[10px] tracking-[0.4em] uppercase mb-4 pb-2 border-b border-[#1ba3b8]/20" style={{ fontFamily: 'var(--font-inter)' }}>
            Dev &amp; Platform
          </p>
          <div className="flex flex-wrap gap-2">
            {DEV_SKILLS.map(s => (
              <span key={s} className="px-3 py-1.5 border border-white/10 text-white/60 text-xs hover:border-[#1ba3b8]/40 hover:text-white transition-colors duration-300" style={{ fontFamily: 'var(--font-inter)' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelBuilds() {
  return (
    <div className="w-screen h-full flex-shrink-0 flex flex-col justify-center px-12 md:px-24 relative overflow-hidden">
      <span
        className="absolute right-6 bottom-6 text-[22rem] font-black leading-none select-none pointer-events-none"
        style={{ fontFamily: 'var(--font-inter)', color: 'rgba(27, 163, 184,0.04)' }}
      >
        04
      </span>

      <p className="text-[#1ba3b8] text-xs tracking-[0.5em] uppercase mb-8" style={{ fontFamily: 'var(--font-inter)' }}>
        Notable Projects
      </p>

      <h2 className="text-5xl md:text-6xl font-black leading-none mb-10" style={{ fontFamily: 'var(--font-inter)' }}>
        Things I&apos;ve<br />
        <span className="text-[#1ba3b8]">Shipped.</span>
      </h2>

      <div className="grid grid-cols-2 gap-px bg-white/5 max-w-3xl">
        {BUILDS.map((item) => (
          <div
            key={item.title}
            className="bg-[#0a0e14] p-6 hover:bg-[#101820] transition-colors duration-300 group"
          >
            <p className="text-[#1ba3b8]/60 text-[9px] tracking-[0.4em] uppercase mb-3" style={{ fontFamily: 'var(--font-inter)' }}>
              {item.tag}
            </p>
            <h3 className="text-white text-lg font-black mb-2 group-hover:text-[#1ba3b8] transition-colors duration-300" style={{ fontFamily: 'var(--font-inter)' }}>
              {item.title}
            </h3>
            <p className="text-white/40 text-xs leading-relaxed" style={{ fontFamily: 'var(--font-inter)', fontWeight: 300 }}>
              {item.desc}
            </p>
            <div className="mt-4 w-6 h-[1px] bg-[#1ba3b8]/30 group-hover:w-12 transition-all duration-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main horizontal scroll container ─── */

export default function HorizontalScroll() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const x = useTransform(scrollYProgress, [0, 1], ['0vw', '-300vw']);

  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div ref={containerRef} style={{ height: '450vh' }}>
      {/* Progress bar */}
      <div className="sticky top-0 z-50 h-[2px] bg-white/5">
        <motion.div
          style={{ width: progressWidth }}
          className="h-full bg-[#1ba3b8]"
        />
      </div>

      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen overflow-hidden" style={{ marginTop: '-2px' }}>
        {/* Section label */}
        <div className="absolute top-6 right-8 z-20 flex items-center gap-3">
          <span className="text-white/20 text-[10px] tracking-[0.4em] uppercase" style={{ fontFamily: 'var(--font-inter)' }}>
            Scroll →
          </span>
        </div>

        {/* Horizontal track */}
        <motion.div
          style={{ x }}
          className="flex h-full"
        >
          <PanelStats />
          <PanelAI />
          <PanelBI />
          <PanelBuilds />
        </motion.div>
      </div>
    </div>
  );
}
