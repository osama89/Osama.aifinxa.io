'use client';

const ITEMS = [
  'AI Product Owner',
  'LLM Integration',
  'Power BI',
  'Workflow Automation',
  'Azure Synapse',
  'n8n',
  'Claude AI',
  'Odoo ERP',
  'Dubai, UAE',
  'Enterprise AI',
  'Prompt Engineering',
  'Agent Systems',
];

export default function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-white/5 py-5 bg-[#0a0e14]">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0a0e14] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0a0e14] to-transparent z-10 pointer-events-none" />

      <div
        className="flex gap-12 whitespace-nowrap"
        style={{ animation: 'marquee-scroll 28s linear infinite' }}
      >
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span key={i} className="flex items-center gap-12 flex-shrink-0">
            <span
              className="text-white/25 text-xs tracking-[0.35em] uppercase"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              {item}
            </span>
            <span className="text-[#1ba3b8] text-[6px]">◆</span>
          </span>
        ))}
      </div>

    </div>
  );
}
