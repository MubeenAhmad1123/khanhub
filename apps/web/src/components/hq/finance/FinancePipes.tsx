'use client';

import React, { useState, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PipeProps {
  id: string;
  source: { x: number; y: number };
  target: { x: number; y: number };
  active?: boolean;
  color?: string;
  delay?: number;
}

export const FinancePipe: React.FC<PipeProps> = ({ 
  source, 
  target, 
  active = true, 
  color = '#3b82f6', 
  delay = 0 
}) => {
  // Vertical S-curve logic
  const midY = (source.y + target.y) / 2;
  const path = `M ${source.x} ${source.y} C ${source.x} ${midY}, ${target.x} ${midY}, ${target.x} ${target.y}`;

  return (
    <g className="finance-pipe">
      {/* Background Glow Path */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeOpacity="0.03"
        strokeLinecap="round"
      />
      
      {/* Subdued Base Line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeOpacity="0.1"
        strokeLinecap="round"
      />

      {/* Primary Flow Path */}
      {active && (
        <motion.path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1],
            opacity: [0, 0.4, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay
          }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      )}

      {/* Moving Particle Pulse */}
      {active && (
        <motion.circle
          r="2.5"
          fill={color}
          initial={{ offset: 0 }}
          animate={{ 
            cx: [source.x, source.x, target.x, target.x],
            cy: [source.y, midY, midY, target.y],
            opacity: [0, 1, 1, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
            delay: delay + 0.5
          }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      )}
    </g>
  );
};

interface FinancePipesOverlayProps {
  containerRef: React.RefObject<HTMLDivElement>;
  sourceRef: React.RefObject<HTMLDivElement>;
  targetRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  depts: string[];
}

export const FinancePipesOverlay: React.FC<FinancePipesOverlayProps> = ({ 
  containerRef,
  sourceRef, 
  targetRefs, 
  depts 
}) => {
  const [pipes, setPipes] = useState<PipeProps[]>([]);

  const calculatePipes = useCallback(() => {
    if (!containerRef.current || !sourceRef.current || !targetRefs.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const sourceRect = sourceRef.current.getBoundingClientRect();

    // Source coordinates: Center-Bottom of the Total Card
    const sourceX = (sourceRect.left + sourceRect.width / 2) - containerRect.left;
    const sourceY = sourceRect.bottom - containerRect.top;

    const newPipes = depts.map((id, index) => {
      const targetEl = targetRefs.current[id];
      if (!targetEl) return null;

      const targetRect = targetEl.getBoundingClientRect();
      
      // Target coordinates: Center-Top of the Department Card
      const targetX = (targetRect.left + targetRect.width / 2) - containerRect.left;
      const targetY = targetRect.top - containerRect.top;

      return {
        id,
        source: { x: sourceX, y: sourceY },
        target: { x: targetX, y: targetY },
        color: index % 2 === 0 ? '#6366f1' : '#10b981', // Indigo and Emerald alternates
        delay: index * 0.3
      };
    }).filter(Boolean) as PipeProps[];

    setPipes(newPipes);
  }, [containerRef, sourceRef, targetRefs, depts]);

  useLayoutEffect(() => {
    // Initial calculation
    calculatePipes();

    // ResizeObserver for dynamic layout shifts
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(() => {
      calculatePipes();
    });

    observer.observe(containerRef.current);
    
    // Also listen to window resize for global shifts
    window.addEventListener('resize', calculatePipes);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calculatePipes);
    };
  }, [calculatePipes, containerRef]);

  return (
    <svg 
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
      style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.05))' }}
    >
      <AnimatePresence>
        {pipes.map((pipe) => (
          <FinancePipe key={pipe.id} {...pipe} />
        ))}
      </AnimatePresence>
    </svg>
  );
};
