'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import Image from 'next/image';

const CARDS = [
  {
    id: 1,
    title: 'The Vision',
    category: 'Leadership',
    span: 'col-span-1 row-span-2',
    filter: 'none',
    overlayColor: 'rgba(201,169,110,0.15)',
    position: 'object-top',
  },
  {
    id: 2,
    title: 'Monochrome',
    category: 'Portrait',
    span: 'col-span-1 row-span-1',
    filter: 'grayscale(100%) contrast(1.1)',
    overlayColor: 'rgba(0,0,0,0.2)',
    position: 'object-top',
  },
  {
    id: 3,
    title: 'Vintage',
    category: 'Editorial',
    span: 'col-span-1 row-span-1',
    filter: 'sepia(80%) contrast(1.05) brightness(0.9)',
    overlayColor: 'rgba(100,60,0,0.25)',
    position: 'object-center',
  },
  {
    id: 4,
    title: 'In Motion',
    category: 'Video',
    span: 'col-span-2 row-span-1',
    filter: 'none',
    overlayColor: 'rgba(0,0,0,0.3)',
    position: 'object-center',
    isVideo: true,
  },
  {
    id: 5,
    title: 'Cinematic',
    category: 'Dark',
    span: 'col-span-1 row-span-1',
    filter: 'grayscale(60%) brightness(0.7) contrast(1.3)',
    overlayColor: 'rgba(10,5,0,0.4)',
    position: 'object-top',
  },
  {
    id: 6,
    title: 'Clarity',
    category: 'Clean',
    span: 'col-span-1 row-span-2',
    filter: 'saturate(1.2) brightness(1.05)',
    overlayColor: 'rgba(0,10,30,0.2)',
    position: 'object-top',
  },
];

function GalleryCard({ card, index }: { card: (typeof CARDS)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      className={card.span}
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.8, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <Tilt
        tiltMaxAngleX={6}
        tiltMaxAngleY={6}
        glareEnable
        glareMaxOpacity={0.1}
        glareColor="#c9a96e"
        glarePosition="all"
        scale={1.02}
        transitionSpeed={900}
        className="w-full h-full"
      >
        <div
          className="relative w-full h-full min-h-[220px] overflow-hidden group bg-black"
          data-hover="true"
        >
          {/* Media */}
          {card.isVideo ? (
            <video
              src="/videos/hero.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: card.filter }}
            />
          ) : (
            <div className="absolute inset-0">
              <Image
                src="/images/photo.jpg"
                alt={card.title}
                fill
                className={`object-cover ${card.position} transition-transform duration-700 group-hover:scale-105`}
                style={{
                  filter: card.filter,
                  imageOrientation: 'from-image',
                }}
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
          )}

          {/* Color overlay tint */}
          <div
            className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-0"
            style={{ backgroundColor: card.overlayColor }}
          />

          {/* Film frame corners */}
          <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-[#c9a96e]/50 pointer-events-none" />
          <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-[#c9a96e]/50 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-l-2 border-b-2 border-[#c9a96e]/50 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-r-2 border-b-2 border-[#c9a96e]/50 pointer-events-none" />

          {/* Hover info overlay */}
          <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex flex-col items-start justify-end p-5">
            <p
              className="text-[#c9a96e] text-[10px] tracking-[0.4em] uppercase mb-1"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              {card.category}
            </p>
            <h3
              className="text-white text-xl font-bold"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              {card.title}
            </h3>
            {card.isVideo && (
              <p
                className="text-white/40 text-xs mt-2"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                ▶ Live footage
              </p>
            )}
          </div>

          {/* Light leak */}
          <div
            className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-[0.07] pointer-events-none"
            style={{ background: 'radial-gradient(circle, #c9a96e, transparent)' }}
          />
        </div>
      </Tilt>
    </motion.div>
  );
}

export default function Gallery() {
  const titleRef = useRef<HTMLDivElement>(null);
  const isTitleInView = useInView(titleRef, { once: true, margin: '-60px' });

  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div ref={titleRef} className="mb-16">
        <motion.p
          initial={{ opacity: 0, x: -30 }}
          animate={isTitleInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-[#c9a96e] text-xs tracking-[0.5em] uppercase mb-4"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          Gallery
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isTitleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl md:text-6xl font-black"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Through the<br />
          <span className="text-[#c9a96e]">Lens</span>
        </motion.h2>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isTitleInView ? { scaleX: 1 } : {}}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 h-[1px] w-24 bg-[#c9a96e] origin-left"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 auto-rows-[220px]">
        {CARDS.map((card, i) => (
          <GalleryCard key={card.id} card={card} index={i} />
        ))}
      </div>
    </section>
  );
}
