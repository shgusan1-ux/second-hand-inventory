'use client';

import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

const OCEAN_IMAGES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1476673160081-cf065607f449?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1414609245224-afa02bfb3fda?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1468413253725-0d5181091126?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1439405326854-014607f694d7?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1520942702018-0862200e6873?w=1920&h=1080&fit=crop&q=80',
];

// Random Ken Burns directions
const KB_VARIANTS = [
  { from: 'scale(1) translate(0%, 0%)',   to: 'scale(1.15) translate(-2%, -1%)' },
  { from: 'scale(1.1) translate(-2%, 0%)', to: 'scale(1) translate(1%, 1%)' },
  { from: 'scale(1) translate(0%, 0%)',   to: 'scale(1.12) translate(2%, -2%)' },
  { from: 'scale(1.1) translate(1%, 1%)', to: 'scale(1) translate(-1%, 0%)' },
  { from: 'scale(1.05) translate(0%, 2%)', to: 'scale(1.15) translate(-1%, -1%)' },
];

export function OceanVideoBackground({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [showNext, setShowNext] = useState(false);
  const [kbCurrent, setKbCurrent] = useState(0);
  const [kbNext, setKbNext] = useState(1);

  useEffect(() => {
    const rand = Math.floor(Math.random() * OCEAN_IMAGES.length);
    setCurrentIndex(rand);
    setNextIndex((rand + 1) % OCEAN_IMAGES.length);
    setKbCurrent(Math.floor(Math.random() * KB_VARIANTS.length));
    setKbNext(Math.floor(Math.random() * KB_VARIANTS.length));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowNext(true);
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setKbCurrent(kbNext);
        setNextIndex((prev) => {
          let next = Math.floor(Math.random() * OCEAN_IMAGES.length);
          while (next === prev) next = Math.floor(Math.random() * OCEAN_IMAGES.length);
          return next;
        });
        setKbNext(Math.floor(Math.random() * KB_VARIANTS.length));
        setShowNext(false);
      }, 2200);
    }, 12000);

    return () => clearInterval(interval);
  }, [nextIndex, kbNext]);

  const currentKB = KB_VARIANTS[kbCurrent];
  const nextKB = KB_VARIANTS[kbNext];

  return (
    <div className={cn('relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-slate-950', className)}>
      <div
        key={`cur-${currentIndex}`}
        className="absolute inset-0 bg-cover bg-center"
        style={{
          transition: 'opacity 2s ease-in-out',
          opacity: showNext ? 0 : 1,
          backgroundImage: `url(${OCEAN_IMAGES[currentIndex]})`,
          animation: `kb-${kbCurrent} 14s ease-in-out forwards`,
        }}
      />
      <div
        key={`nxt-${nextIndex}`}
        className="absolute inset-0 bg-cover bg-center"
        style={{
          transition: 'opacity 2s ease-in-out',
          opacity: showNext ? 1 : 0,
          backgroundImage: `url(${OCEAN_IMAGES[nextIndex]})`,
          animation: `kb-${kbNext} 14s ease-in-out forwards`,
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50 z-[1]" />

      <div className="relative z-[2] flex flex-col items-center justify-center min-h-screen w-full">
        {children}
      </div>

      <style jsx>{`
        ${KB_VARIANTS.map((v, i) => `
          @keyframes kb-${i} {
            0% { transform: ${v.from}; }
            100% { transform: ${v.to}; }
          }
        `).join('')}
      `}</style>
    </div>
  );
}
