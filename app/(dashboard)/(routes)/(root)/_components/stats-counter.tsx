'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type StatItem = {
  value: string;
  label: string;
};

type StatsCounterProps = {
  stats: StatItem[];
};

function parseStatValue(value: string) {
  const match = value.trim().match(/^(\d+)(.*)$/);
  if (!match) {
    return { target: 0, suffix: value };
  }

  return {
    target: Number(match[1]),
    suffix: match[2] ?? ''
  };
}

export function StatsCounter({ stats }: StatsCounterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [values, setValues] = useState<number[]>(() => stats.map(() => 0));

  const parsedStats = useMemo(() => stats.map((stat) => parseStatValue(stat.value)), [stats]);

  useEffect(() => {
    const currentRef = containerRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasStarted) return;
        setHasStarted(true);
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(currentRef);

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const durationMs = 1200;
    const start = performance.now();

    let rafId = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setValues(parsedStats.map((stat) => Math.round(stat.target * easedProgress)));

      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(rafId);
  }, [hasStarted, parsedStats]);

  return (
    <div
      ref={containerRef}
      className="mt-10 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0"
    >
      {stats.map((stat, index) => (
        <div key={stat.label} className="flex flex-col items-center gap-5 px-5 md:px-12">
          <span className="font-poppins text-[60px] font-semibold text-[#EC4130] leading-[1.4]">
            {values[index]}
            {parsedStats[index]?.suffix}
          </span>
          <span className="font-poppins text-lg text-white leading-[2em]">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
