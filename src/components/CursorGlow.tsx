import React, { useEffect, useRef } from 'react';
import { soundEngine } from '../utils/audio';

export const CursorGlow: React.FC = () => {
  const glowRef = useRef<HTMLDivElement>(null);
  const target = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  });
  const current = useRef({ x: target.current.x, y: target.current.y });

  useEffect(() => {
    // Check if on touch/coarse or small screen
    const isTouchOrMobile =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches ||
        'ontouchstart' in window ||
        window.innerWidth < 768);

    if (isTouchOrMobile) return;

    const ease = 0.12;
    let raf: number;

    const handleMove = (e: MouseEvent) => {
      const prevX = target.current.x;
      const prevY = target.current.y;
      target.current = { x: e.clientX, y: e.clientY };
      const dist = Math.hypot(e.clientX - prevX, e.clientY - prevY);
      if (dist > 5) {
        soundEngine.playLightMove(dist);
      }
    };

    const animate = () => {
      current.current.x += (target.current.x - current.current.x) * ease;
      current.current.y += (target.current.y - current.current.y) * ease;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${current.current.x - 350}px, ${current.current.y - 350}px, 0)`;
      }
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={glowRef} className="cursor-glow hidden md:block" />;
};

