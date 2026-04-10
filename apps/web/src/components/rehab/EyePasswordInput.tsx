'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

const GLITCH_CHARS = '!@#$%^&*<>?[]{}ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const getRandomChar = () => GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];

interface EyePasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
  label?: string;
}

export default function EyePasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  required = false,
  className = '',
  id,
  name,
  label,
}: EyePasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [eyeState, setEyeState] = useState<'closed' | 'peek' | 'open' | 'blink'>('closed');
  const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });
  const [displayChars, setDisplayChars] = useState<string[]>([]);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const blinkTimeout = useRef<NodeJS.Timeout | null>(null);

  // Sync display characters immediately when value or visibility changes
  useEffect(() => {
    if (isVisible) {
      setDisplayChars(value.split(''));
    } else {
      setDisplayChars(value.split('').map(() => '●'));
    }
  }, [value, isVisible]);

  // Handle Eye State Transitions
  useEffect(() => {
    if (isVisible) {
      setEyeState('open');
    } else if (isFocused) {
      setEyeState('peek');
    } else {
      setEyeState('closed');
    }
  }, [isVisible, isFocused]);

  // Self-managed blinking for realistic feel
  const scheduleBlink = useCallback(() => {
    if (blinkTimeout.current) clearTimeout(blinkTimeout.current);
    if (!isVisible) return;

    blinkTimeout.current = setTimeout(() => {
      setEyeState('blink');
      setTimeout(() => {
        setEyeState('open');
        scheduleBlink();
      }, 150);
    }, 3000 + Math.random() * 4000);
  }, [isVisible]);

  useEffect(() => {
    scheduleBlink();
    return () => { if (blinkTimeout.current) clearTimeout(blinkTimeout.current); };
  }, [isVisible, scheduleBlink]);

  // Mouse tracking for pupils
  useEffect(() => {
    if (!isVisible || eyeState === 'blink') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const maxMove = 1.5;
      const scale = distance > 0 ? Math.min(maxMove / distance, 1) : 0;
      
      setPupilPos({ x: dx * scale, y: dy * scale });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isVisible, eyeState]);

  const toggleVisibility = () => setIsVisible(!isVisible);

  // SVG Path Data for Eyelids
  const getEyelidPath = (side: 'left' | 'right') => {
    const xBase = side === 'left' ? 8 : 24;
    switch (eyeState) {
      case 'open': return `M${xBase - 6} 11 Q${xBase} 4 ${xBase + 6} 11`;
      case 'peek': return `M${xBase - 6} 11 Q${xBase} 7 ${xBase + 6} 11`;
      case 'blink':
      case 'closed': return `M${xBase - 6} 11 Q${xBase} 11 ${xBase + 6} 11`;
      default: return `M${xBase - 6} 11 Q${xBase} 11 ${xBase + 6} 11`;
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${isFocused ? 'text-teal-400' : 'text-gray-500'}`}>
          {label}
        </label>
      )}

      <div className={`relative flex items-center h-12 rounded-xl border transition-all duration-300 overflow-hidden ${
        isFocused 
          ? 'border-teal-500/50 bg-[#0f172a] shadow-[0_0_15px_rgba(20,184,166,0.1)]' 
          : 'border-white/10 bg-[#0d1117]'
      }`}>
        {/* Real Input (Hidden Text) */}
        <input
          id={id}
          name={name}
          type="password"
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          className="absolute inset-0 w-full h-full px-4 pr-14 bg-transparent border-none outline-none text-transparent caret-teal-400 font-mono text-sm z-10"
          autoComplete="off"
        />

        {/* Visual Layer (Display Characters) */}
        <div className="flex items-center gap-1.5 px-4 pointer-events-none select-none overflow-hidden max-w-[calc(100%-56px)]">
          {displayChars.length === 0 ? (
            <span className="text-gray-600 font-mono text-sm opacity-50">{placeholder}</span>
          ) : (
            displayChars.map((char, i) => (
              <span 
                key={i} 
                className={`flex-shrink-0 transition-all duration-200 font-mono ${
                  isVisible ? 'text-teal-50 text-sm' : 'text-teal-500/40 text-lg translate-y-[1px]'
                }`}
                style={{ 
                  animation: !isVisible ? `pulse-dot 2s infinite ${i * 0.15}s` : 'none' 
                }}
              >
                {char}
              </span>
            ))
          )}
        </div>

        {/* Eye Toggle Button */}
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/5 rounded-lg transition-colors z-20 group"
          title={isVisible ? "Hide Password" : "Show Password"}
        >
          <svg
            ref={svgRef}
            width="36"
            height="20"
            viewBox="0 0 32 22"
            className="transition-transform duration-300 group-hover:scale-110"
          >
            <defs>
              <clipPath id="eye-clip-l"><ellipse cx="8" cy="11" rx="6" ry="4.5" /></clipPath>
              <clipPath id="eye-clip-r"><ellipse cx="24" cy="11" rx="6" ry="4.5" /></clipPath>
              <radialGradient id="iris-gradient">
                <stop offset="0%" stopColor="#99f6e4" />
                <stop offset="60%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#0f766e" />
              </radialGradient>
            </defs>

            {/* Sclera (White part) */}
            <ellipse cx="8" cy="11" rx="6" ry="4.5" className="stroke-teal-500/30 fill-[#0d1520]" strokeWidth="1" />
            <ellipse cx="24" cy="11" rx="6" ry="4.5" className="stroke-teal-500/30 fill-[#0d1520]" strokeWidth="1" />

            {/* Iris & Pupil */}
            <g clipPath="url(#eye-clip-l)" className="transition-opacity duration-300" style={{ opacity: isVisible ? 1 : 0 }}>
              <circle cx={8 + pupilPos.x} cy={11 + pupilPos.y} r="3" fill="url(#iris-gradient)" />
              <circle cx={8 + pupilPos.x} cy={11 + pupilPos.y} r="1.2" fill="#020617" />
              <circle cx={8.8 + pupilPos.x} cy={10 + pupilPos.y} r="0.6" fill="white" fillOpacity="0.8" />
            </g>
            <g clipPath="url(#eye-clip-r)" className="transition-opacity duration-300" style={{ opacity: isVisible ? 1 : 0 }}>
              <circle cx={24 + pupilPos.x} cy={11 + pupilPos.y} r="3" fill="url(#iris-gradient)" />
              <circle cx={24 + pupilPos.x} cy={11 + pupilPos.y} r="1.2" fill="#020617" />
              <circle cx={24.8 + pupilPos.x} cy={10 + pupilPos.y} r="0.6" fill="white" fillOpacity="0.8" />
            </g>

            {/* Eyelids */}
            <path 
              d={getEyelidPath('left')} 
              className="stroke-teal-400 fill-[#0d1117] transition-all duration-150" 
              strokeWidth="1.2" 
              strokeLinecap="round" 
            />
            <path 
              d={getEyelidPath('right')} 
              className="stroke-teal-400 fill-[#0d1117] transition-all duration-150" 
              strokeWidth="1.2" 
              strokeLinecap="round" 
            />

            {/* Bottom Eyelid (only visible when closed/peek) */}
            <path 
              d="M2 11 Q8 18 14 11" 
              className={`stroke-teal-800 fill-[#0d1117] transition-opacity duration-200 ${eyeState === 'open' ? 'opacity-0' : 'opacity-100'}`} 
              strokeWidth="1" 
            />
            <path 
              d="M18 11 Q24 18 30 11" 
              className={`stroke-teal-800 fill-[#0d1117] transition-opacity duration-200 ${eyeState === 'open' ? 'opacity-0' : 'opacity-100'}`} 
              strokeWidth="1" 
            />

            {/* Slash (Static when locked) */}
            {!isVisible && (
              <line x1="4" y1="18" x2="28" y2="4" className="stroke-teal-500/50" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      <style jsx>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.9) translateY(1px); }
          50% { opacity: 0.8; transform: scale(1.1) translateY(1px); }
        }
      `}</style>
    </div>
  );
}