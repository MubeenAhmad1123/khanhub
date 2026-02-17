'use client';

import { useEffect, useRef, useState } from 'react';

export default function CarLottie() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const animationRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAnimation = async () => {
      try {
        const lottie = await import('lottie-web');
        const response = await fetch('/car.json');
        const animationData = await response.json();

        if (containerRef.current && isMounted && !animationRef.current) {
          animationRef.current = lottie.default.loadAnimation({
            container: containerRef.current,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData,
          });
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Error loading Lottie animation:', error);
      }
    };

    loadAnimation();

    return () => {
      isMounted = false;
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full h-auto aspect-square"
      style={{
        minHeight: '180px',
        maxHeight: '400px',
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.5s ease-in',
      }}
      aria-label="Animated medical transport vehicle illustration"
      role="img"
    />
  );
}