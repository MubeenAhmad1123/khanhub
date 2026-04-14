'use client';

import React from 'react';
import { motion } from 'framer-motion';

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
  // Create a cubic bezier path for smooth flow
  // Mid points to create the "S" or "C" curve depending on relative position
  const midX = (source.x + target.x) / 2;
  const path = `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`;

  return (
    <g className="finance-pipe">
      {/* Background Pipe (Blurry glow foundation) */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeOpacity="0.05"
        strokeLinecap="round"
      />
      
      {/* Static Pipe Line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeOpacity="0.2"
        strokeLinecap="round"
      />

      {/* Animated Flow Pulse */}
      {active && (
        <motion.path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1],
            opacity: [0, 1, 0],
            strokeWidth: [3, 5, 3]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay
          }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      )}

      {/* Small Flow Particles */}
      {active && (
        <motion.circle
          r="3"
          fill={color}
          initial={{ offset: 0 }}
          animate={{ 
            cx: [source.x, midX, target.x],
            cy: [source.y, source.y, target.y], // Simplified path for particle animation
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
            delay: delay + 0.5
          }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      )}
    </g>
  );
};

export const FinancePipesOverlay: React.FC<{
  sourceRefs: Record<string, React.RefObject<HTMLDivElement>>;
  targetRef: React.RefObject<HTMLDivElement>;
  depts: string[];
}> = ({ sourceRefs, targetRef, depts }) => {
  const [pipes, setPipes] = React.useState<PipeProps[]>([]);

  React.useEffect(() => {
    const updatePipes = () => {
      if (!targetRef.current) return;
      
      const targetRect = targetRef.current.getBoundingClientRect();
      const parentRect = targetRef.current.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      const targetX = targetRect.left + targetRect.width / 2 - parentRect.left;
      const targetY = targetRect.top + targetRect.height / 2 - parentRect.top;

      const newPipes = depts.map((id, index) => {
        const ref = sourceRefs[id];
        if (!ref?.current) return null;
        
        const rect = ref.current.getBoundingClientRect();
        const startX = rect.left + rect.width / 2 - parentRect.left;
        const startY = rect.top + rect.height / 2 - parentRect.top;

        return {
          id,
          source: { x: targetX, y: targetY }, // Flow FROM center TO nodes
          target: { x: startX, y: startY },
          color: index % 2 === 0 ? '#6366f1' : '#10b981',
          delay: index * 0.4
        };
      }).filter(Boolean) as PipeProps[];

      setPipes(newPipes);
    };

    updatePipes();
    window.addEventListener('resize', updatePipes);
    return () => window.removeEventListener('resize', updatePipes);
  }, [sourceRefs, targetRef, depts]);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {pipes.map((p) => (
        <FinancePipe key={p.id} {...p} />
      ))}
    </svg>
  );
};
