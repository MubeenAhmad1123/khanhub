'use client';

import { useEffect, useState } from 'react';

type AnimatedCounterProps = {
  from?: number;
  to: number;
  duration?: number; // ms
  className?: string;
  suffix?: string;
};

export function AnimatedCounter({
  from = 0,
  to,
  duration = 1500,
  className = '',
  suffix = '',
}: AnimatedCounterProps) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    let frame: number;
    const start = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.round(from + (to - from) * eased);
      setValue(current);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [from, to, duration]);

  return (
    <span className={className}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}
