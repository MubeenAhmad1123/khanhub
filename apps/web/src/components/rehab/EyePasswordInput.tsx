'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface EyePasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export default function EyePasswordInput({
  value, onChange, placeholder = '••••••••',
  required = false, className = '', id, name
}: EyePasswordInputProps) {
  const [shown, setShown] = useState(false);
  const [focused, setFocused] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const blinkTimer = useRef<ReturnType<typeof setTimeout>>();

  const schedBlink = useCallback(() => {
    clearTimeout(blinkTimer.current);
    blinkTimer.current = setTimeout(() => {
      if (!shown) return;
      setIsBlinking(true);
      setTimeout(() => { setIsBlinking(false); schedBlink(); }, 120);
    }, 2500 + Math.random() * 2500);
  }, [shown]);

  useEffect(() => {
    if (shown) schedBlink();
    else { clearTimeout(blinkTimer.current); setPupilOffset({ x: 0, y: 0 }); }
    return () => clearTimeout(blinkTimer.current);
  }, [shown, schedBlink]);

  useEffect(() => {
    if (!shown) return;
    const handleMove = (e: MouseEvent) => {
      if (!svgRef.current || isBlinking) return;
      const rect = svgRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxMove = 1.8;
      const scale = dist > 0 ? Math.min(maxMove / dist, 1) * maxMove : 0;
      setPupilOffset({ x: (dx * scale) / maxMove, y: (dy * scale) / maxMove });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [shown, isBlinking]);

  const lidState = (() => {
    if (isBlinking) return 'blink';
    if (shown) return 'open';
    if (focused) return 'peek';
    return 'closed';
  })();

  const lTopD = {
    open:   'M1 11 Q8 3 15 11',
    peek:   'M1 11 Q8 6.5 15 11',
    blink:  'M1 11 Q8 11 15 11',
    closed: 'M1 11 Q8 11 15 11',
  }[lidState];

  const rTopD = {
    open:   'M13 11 Q20 3 27 11',
    peek:   'M13 11 Q20 6.5 27 11',
    blink:  'M13 11 Q20 11 27 11',
    closed: 'M13 11 Q20 11 27 11',
  }[lidState];

  const bottomLidOpacity = lidState === 'closed' ? 1 : lidState === 'peek' ? 0.5 : lidState === 'blink' ? 1 : 0;
  const pupilOpacity     = shown && !isBlinking ? 1 : 0;
  const slashOpacity     = shown ? 0 : 1;
  const px = pupilOffset.x;
  const py = pupilOffset.y;

  return (
    <div className="relative flex items-center">
      <input
        id={id}
        name={name}
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full pr-12 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShown(s => !s)}
        className="absolute right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
        tabIndex={-1}
        aria-label={shown ? 'Hide password' : 'Show password'}
      >
        <svg
          ref={svgRef}
          width="28" height="22" viewBox="0 0 28 22"
          fill="none" xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="lEc"><ellipse cx="8" cy="11" rx="6.5" ry="5"/></clipPath>
            <clipPath id="rEc"><ellipse cx="20" cy="11" rx="6.5" ry="5"/></clipPath>
          </defs>
          <ellipse cx="8"  cy="11" rx="6.5" ry="5" fill="white" stroke="currentColor" strokeWidth="1.3"/>
          <ellipse cx="20" cy="11" rx="6.5" ry="5" fill="white" stroke="currentColor" strokeWidth="1.3"/>
          <circle cx={8 + px}  cy={11 + py} r="2.6" fill="currentColor" opacity={pupilOpacity} clipPath="url(#lEc)"/>
          <circle cx={9 + px}  cy={9.8 + py} r="0.75" fill="white" opacity={pupilOpacity} clipPath="url(#lEc)"/>
          <circle cx={20 + px} cy={11 + py} r="2.6" fill="currentColor" opacity={pupilOpacity} clipPath="url(#rEc)"/>
          <circle cx={21 + px} cy={9.8 + py} r="0.75" fill="white" opacity={pupilOpacity} clipPath="url(#rEc)"/>
          <path d={lTopD} fill="#d1d5db" stroke="currentColor" strokeWidth="1.3" style={{ transition: 'd 0.1s' }}/>
          <path d={rTopD} fill="#d1d5db" stroke="currentColor" strokeWidth="1.3" style={{ transition: 'd 0.1s' }}/>
          <path d="M1 11 Q8 17 15 11"  fill="#d1d5db" stroke="currentColor" strokeWidth="1.3" opacity={bottomLidOpacity} style={{ transition: 'opacity 0.1s' }}/>
          <path d="M13 11 Q20 17 27 11" fill="#d1d5db" stroke="currentColor" strokeWidth="1.3" opacity={bottomLidOpacity} style={{ transition: 'opacity 0.1s' }}/>
          <line x1="3" y1="19" x2="25" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={slashOpacity} style={{ transition: 'opacity 0.15s' }}/>
        </svg>
      </button>
    </div>
  );
}
