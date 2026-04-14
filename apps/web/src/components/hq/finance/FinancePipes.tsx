'use client';

import React, { useState, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PipeProps {
  id: string;
  source: { x: number; y: number };
  target: { x: number; y: number };
  color?: string;
  delay?: number;
}

const FinancePipe: React.FC<PipeProps> = ({ 
  source, 
  target, 
  color = '#22d3ee', // Default Cyan-400
  delay = 0 
}) => {
  // Cubic Bezier path for smooth S-curve
  // Source is top-down flow: 
  // 控制点1: (startX, startY + dynamicHeight)
  // 控制点2: (endX, endY - dynamicHeight)
  const dy = Math.abs(target.y - source.y);
  const cp1 = { x: source.x, y: source.y + dy * 0.5 };
  const cp2 = { x: target.x, y: target.y - dy * 0.5 };
  
  const path = `M ${source.x} ${source.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${target.x} ${target.y}`;

  return (
    <g className="finance-pipe">
      {/* 1. Ultra-Wide Background Glow */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeOpacity="0.05"
        strokeLinecap="round"
      />
      
      {/* 2. Secondary Glow */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeOpacity="0.1"
        strokeLinecap="round"
      />

      {/* 3. Base Line (Subdued) */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeOpacity="0.2"
        strokeLinecap="round"
      />

      {/* 4. Animated Flow Path */}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ 
          pathLength: [0, 1],
          opacity: [0, 0.4, 0]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay
        }}
      />

      {/* 5. Moving Liquid Pulse */}
      <motion.circle
        r="2"
        fill={color}
        initial={{ offset: 0 }}
        animate={{ 
          offset: [0, 1] 
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "linear",
          delay: delay
        }}
      >
        <animateMotion 
          path={path} 
          dur="2.5s" 
          repeatCount="indefinite" 
          begin={`${delay}s`}
        />
      </motion.circle>
    </g>
  );
};

interface FinancePipesOverlayProps {
  totalCardRef: React.RefObject<HTMLDivElement>;
  deptRefs: React.RefObject<HTMLDivElement>[];
  containerRef: React.RefObject<HTMLDivElement>;
  deptIds: string[];
}

export const FinancePipesOverlay: React.FC<FinancePipesOverlayProps> = ({ 
  totalCardRef, 
  deptRefs, 
  containerRef,
  deptIds
}) => {
  const [pipes, setPipes] = useState<PipeProps[]>([]);

  const calculatePipes = useCallback(() => {
    if (!containerRef.current || !totalCardRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const totalRect = totalCardRef.current.getBoundingClientRect();

    // Origin: Bottom center of the Grand Total Card
    const startX = (totalRect.left + totalRect.width / 2) - containerRect.left;
    const startY = totalRect.bottom - containerRect.top;

    const newPipes = deptIds.map((id, index) => {
      const deptRef = deptRefs[index];
      if (!deptRef?.current) return null;

      const deptRect = deptRef.current.getBoundingClientRect();
      
      // Target: Top center of the Department Card
      const endX = (deptRect.left + deptRect.width / 2) - containerRect.left;
      const endY = deptRect.top - containerRect.top;

      return {
        id,
        source: { x: startX, y: startY },
        target: { x: endX, y: endY },
        color: index % 2 === 0 ? '#22d3ee' : '#8b5cf6', // Cyan and Violet alternates
        delay: index * 0.4
      };
    }).filter(Boolean) as PipeProps[];

    setPipes(newPipes);
  }, [containerRef, totalCardRef, deptRefs, deptIds]);

  useLayoutEffect(() => {
    calculatePipes();

    if (!containerRef.current) return;
    
    // ResizeObserver for dynamic layout shifts (responsive grid)
    const observer = new ResizeObserver(() => {
      calculatePipes();
    });

    observer.observe(containerRef.current);
    window.addEventListener('resize', calculatePipes);

    // Initial delay to ensure refs are ready after first paint
    const timer = setTimeout(calculatePipes, 100);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calculatePipes);
      clearTimeout(timer);
    };
  }, [calculatePipes, containerRef]);

  return (
    <svg 
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
      style={{ filter: 'drop-shadow(0 0 10px rgba(6,182,212,0.1))' }}
    >
      <AnimatePresence>
        {pipes.map((pipe) => (
          <FinancePipe key={pipe.id} {...pipe} />
        ))}
      </AnimatePresence>
    </svg>
  );
};
