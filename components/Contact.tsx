'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

export default function Contact() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section id="contact" className="py-32 px-6 md:px-12 max-w-4xl mx-auto" ref={ref}>
      <motion.p
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="text-[#c9a96e] text-xs tracking-[0.5em] uppercase mb-6 text-center"
        style={{ fontFamily: 'var(--font-inter)' }}
      >
        Get In Touch
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="text-5xl md:text-6xl font-black text-center mb-4"
        style={{ fontFamily: 'var(--font-playfair)' }}
      >
        Let&apos;s Create<br />
        <span className="text-[#c9a96e]">Together</span>
      </motion.h2>

      {/* Contact details */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="flex flex-wrap justify-center gap-8 mb-12"
      >
        {[
          { label: 'Phone', value: '+971 50 372 2060', href: 'tel:+971503722060' },
          { label: 'Email', value: 'osama.alahmad1989@hotmail.com', href: 'mailto:osama.alahmad1989@hotmail.com' },
          { label: 'Location', value: 'Dubai, UAE', href: null },
        ].map(({ label, value, href }) => (
          <div key={label} className="text-center">
            <p className="text-white/30 text-[10px] tracking-[0.4em] uppercase mb-1" style={{ fontFamily: 'var(--font-inter)' }}>
              {label}
            </p>
            {href ? (
              <a href={href} className="text-white/70 text-sm hover:text-[#c9a96e] transition-colors duration-300" style={{ fontFamily: 'var(--font-inter)' }}>
                {value}
              </a>
            ) : (
              <p className="text-white/70 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>{value}</p>
            )}
          </div>
        ))}
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, delay: 0.3 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-white/40 text-xs tracking-widest uppercase mb-2"
                   style={{ fontFamily: 'var(--font-inter)' }}>
              Name
            </label>
            <input
              type="text"
              required
              placeholder="Your name"
              className="w-full bg-transparent border-b border-white/20 py-3 text-white placeholder-white/20 outline-none focus:border-[#c9a96e] transition-colors duration-300"
              style={{ fontFamily: 'var(--font-inter)', fontWeight: 300 }}
            />
          </div>
          <div>
            <label className="block text-white/40 text-xs tracking-widest uppercase mb-2"
                   style={{ fontFamily: 'var(--font-inter)' }}>
              Email
            </label>
            <input
              type="email"
              required
              placeholder="your@email.com"
              className="w-full bg-transparent border-b border-white/20 py-3 text-white placeholder-white/20 outline-none focus:border-[#c9a96e] transition-colors duration-300"
              style={{ fontFamily: 'var(--font-inter)', fontWeight: 300 }}
            />
          </div>
        </div>

        <div>
          <label className="block text-white/40 text-xs tracking-widest uppercase mb-2"
                 style={{ fontFamily: 'var(--font-inter)' }}>
            Message
          </label>
          <textarea
            required
            rows={4}
            placeholder="Tell me about your project..."
            className="w-full bg-transparent border-b border-white/20 py-3 text-white placeholder-white/20 outline-none focus:border-[#c9a96e] transition-colors duration-300 resize-none"
            style={{ fontFamily: 'var(--font-inter)', fontWeight: 300 }}
          />
        </div>

        <div className="flex justify-center pt-6">
          {!sent ? (
            <button
              type="submit"
              className="relative group px-12 py-4 border border-[#c9a96e] text-[#c9a96e] text-sm tracking-[0.3em] uppercase overflow-hidden hover:text-black transition-colors duration-500"
              style={{ fontFamily: 'var(--font-inter)' }}
              data-hover="true"
            >
              <span className="absolute inset-0 bg-[#c9a96e] -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
              <span className="relative">Send Message</span>
            </button>
          ) : (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[#c9a96e] text-sm tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Message sent. I&apos;ll be in touch.
            </motion.p>
          )}
        </div>
      </motion.form>
    </section>
  );
}
