'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const SKILL_GROUPS = [
  {
    label: 'AI & Automation',
    skills: ['Claude (Anthropic)', 'Claude Code', 'OpenAI / GPT-4', 'n8n Workflows', 'LLM Integration', 'Copilot Studio', 'Botpress', 'Power Automate', 'Prompt Engineering'],
  },
  {
    label: 'BI & Data',
    skills: ['Power BI', 'DAX / SSAS', 'Azure Synapse', 'PostgreSQL', 'SQL Server', 'Azure Data Lake', 'Databricks', 'ETL / ELT', 'Tableau'],
  },
  {
    label: 'Dev & Platform',
    skills: ['PowerApps', 'Odoo ERP', 'Microsoft 365', 'Graph API', 'Docker', 'Azure ML Studio', 'VS Code', 'Cursor', 'Agile / Scrum'],
  },
];

const KEY_BUILDS = [
  { title: 'CFO AI Suite', desc: '10 production AI tools (AP, AR, audit, procurement, budgeting) each deployed in under 3 days', tag: 'Olive Green Holding · 2026' },
  { title: 'AI PA Bot', desc: 'Schedules meetings from a single Telegram message using Claude AI + Microsoft 365 Graph API. Zero clicks.', tag: 'Automation · 2025' },
  { title: 'RFID Smart Construction', desc: 'Full RFID ecosystem for Oil & Gas GCC projects — Smart Yard, Warehouse, Gate, and Fuel systems', tag: 'CCC · 2014–Present' },
  { title: 'QF Long-Term Planning App', desc: 'Supports Qatar Foundation\'s Cultivating Multiversity strategy (2023–2032) with enterprise PowerApps', tag: 'Qatar Foundation · 2022' },
];

export default function Skills() {
  const titleRef = useRef<HTMLDivElement>(null);
  const isTitleInView = useInView(titleRef, { once: true, margin: '-60px' });
  const buildsRef = useRef<HTMLDivElement>(null);
  const isBuildsInView = useInView(buildsRef, { once: true, margin: '-60px' });

  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      {/* Skills */}
      <div ref={titleRef} className="mb-16">
        <motion.p
          initial={{ opacity: 0 }}
          animate={isTitleInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="text-[#c9a96e] text-xs tracking-[0.5em] uppercase mb-4"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          Technical Stack
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isTitleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl md:text-6xl font-black mb-12"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          What I<br />
          <span className="text-[#c9a96e]">Build With</span>
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8">
          {SKILL_GROUPS.map((group, gi) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isTitleInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2 + gi * 0.1 }}
            >
              <p
                className="text-[#c9a96e] text-xs tracking-[0.4em] uppercase mb-5 pb-3 border-b border-[#c9a96e]/20"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 border border-white/10 text-white/60 text-xs hover:border-[#c9a96e]/40 hover:text-white transition-colors duration-300"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Key builds */}
      <div ref={buildsRef}>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isBuildsInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="text-[#c9a96e] text-xs tracking-[0.5em] uppercase mb-4"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          Notable Projects
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isBuildsInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-6xl font-black mb-12"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Things I&apos;ve<br />
          <span className="text-[#c9a96e]">Shipped</span>
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-px bg-white/5">
          {KEY_BUILDS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isBuildsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.15 * i }}
              className="bg-[#0a0a0a] p-8 hover:bg-[#111] transition-colors duration-300 group"
              data-hover="true"
            >
              <p
                className="text-[#c9a96e]/60 text-[10px] tracking-[0.4em] uppercase mb-4"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {item.tag}
              </p>
              <h3
                className="text-white text-2xl font-black mb-3 group-hover:text-[#c9a96e] transition-colors duration-300"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                {item.title}
              </h3>
              <p
                className="text-white/40 text-sm leading-relaxed"
                style={{ fontFamily: 'var(--font-inter)', fontWeight: 300 }}
              >
                {item.desc}
              </p>
              <div className="mt-6 w-8 h-[1px] bg-[#c9a96e]/30 group-hover:w-16 transition-all duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
