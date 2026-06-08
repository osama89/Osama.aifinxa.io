'use client';

import { useEffect, useRef, useState } from 'react';

const TRAIL = 4; // number of echo dots

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;
    // trail positions, each lags the previous
    const tx = new Array(TRAIL).fill(0);
    const ty = new Array(TRAIL).fill(0);
    let hovered: Element | null = null;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX - 4}px, ${mouseY - 4}px)`;
    };

    const animate = () => {
      // Magnetic pull: ease ring toward hovered element's centre.
      let targetX = mouseX, targetY = mouseY;
      if (hovered) {
        const r = hovered.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        targetX = mouseX + (cx - mouseX) * 0.32;
        targetY = mouseY + (cy - mouseY) * 0.32;
      }
      ringX += (targetX - ringX) * 0.16;
      ringY += (targetY - ringY) * 0.16;
      const size = isHovering ? 60 : 38;
      ring.style.transform = `translate(${ringX - size / 2}px, ${ringY - size / 2}px)`;

      // Trail: each echo chases the previous with a softer lerp.
      let px = mouseX, py = mouseY;
      for (let i = 0; i < TRAIL; i++) {
        tx[i] += (px - tx[i]) * (0.35 - i * 0.06);
        ty[i] += (py - ty[i]) * (0.35 - i * 0.06);
        const el = trailRefs.current[i];
        if (el) el.style.transform = `translate(${tx[i] - 3}px, ${ty[i] - 3}px)`;
        px = tx[i];
        py = ty[i];
      }
      raf = requestAnimationFrame(animate);
    };

    const onEnter = (e: Event) => { hovered = e.currentTarget as Element; setIsHovering(true); };
    const onLeave = () => { hovered = null; setIsHovering(false); };

    const onDown = (e: MouseEvent) => {
      setIsClicking(true);
      // click ripple
      const ripple = document.createElement('div');
      ripple.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:8px;height:8px;border:1px solid #22d3ee;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:9997;`;
      document.body.appendChild(ripple);
      ripple.animate(
        [{ width: '8px', height: '8px', opacity: 0.9 }, { width: '70px', height: '70px', opacity: 0 }],
        { duration: 600, easing: 'cubic-bezier(0.22,1,0.36,1)' },
      ).onfinish = () => ripple.remove();
    };
    const onUp = () => setIsClicking(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);

    const interactives = document.querySelectorAll('a, button, [data-hover], input, textarea');
    interactives.forEach((el) => {
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });

    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      interactives.forEach((el) => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
      cancelAnimationFrame(raf);
    };
  }, [isHovering]);

  return (
    <>
      {/* Trail echoes (render behind the dot) */}
      {Array.from({ length: TRAIL }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { trailRefs.current[i] = el; }}
          className="fixed top-0 left-0 z-[9996] pointer-events-none rounded-full"
          style={{
            width: 6,
            height: 6,
            background: '#22d3ee',
            opacity: (1 - i / TRAIL) * 0.18,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
      {/* Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 z-[9999] pointer-events-none"
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: isHovering ? '#1ba3b8' : '#ffffff',
          transition: 'background-color 0.2s, transform 0.05s',
          transform: isClicking ? 'scale(0.5)' : 'scale(1)',
        }}
      />
      {/* Ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 z-[9998] pointer-events-none"
        style={{
          width: isHovering ? 60 : 38,
          height: isHovering ? 60 : 38,
          borderRadius: '50%',
          border: `1px solid ${isHovering ? '#22d3ee' : 'rgba(255,255,255,0.6)'}`,
          boxShadow: isHovering ? '0 0 18px rgba(34,211,238,0.4)' : 'none',
          transition: 'width 0.3s ease, height 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        }}
      />
    </>
  );
}
