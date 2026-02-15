'use client';

import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

export default function CarLottie() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/car.json', // IMPORTANT - from public folder
    });

    return () => animation.destroy();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-md h-[300px] md:h-[400px]"
    />
  );
}
