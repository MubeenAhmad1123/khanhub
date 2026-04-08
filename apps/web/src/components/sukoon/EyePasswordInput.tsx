'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

const GLITCH = '!@#$%^&*<>?[]{}ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const rnd = () => GLITCH[Math.floor(Math.random() * GLITCH.length)];

const STATUS = {
  locked: { text: '[ LOCKED ]', color: '#1e3a4a' },
  decoding: { text: '[ DECODING... ]', color: '#22d3ee' },
  decoded: { text: '[ DECRYPTED ]', color: '#22c55e' },
  locking: { text: '[ ENCRYPTING... ]', color: '#f59e0b' },
};

interface StrengthInfo {
  pct: number;
  color: string;
  label: string;
}

const getStrength = (v: string): StrengthInfo => {
  if (!v.length) return { pct: 0, color: '#ef4444', label: '' };
  if (v.length < 4) return { pct: 18, color: '#ef4444', label: 'WEAK' };
  if (v.length < 8) return { pct: 55, color: '#f59e0b', label: 'MEDIUM' };
  return { pct: 100, color: '#22c55e', label: 'STRONG' };
};

let _key = 0;
const nextKey = () => ++_key;

interface CharState {
  ch: string;
  mode: 'clear' | 'glitch' | 'dot';
  key: number;
}

interface EyePasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string; // Standard prop for integration
  id?: string;
  name?: string;
  label?: string; // New added prop
}

/**
 * Enhanced GlitchDualEyeInput (Exported as EyePasswordInput for compatibility)
 * Fixes: TypeScript errors, missing className support, ref typing.
 */
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
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<keyof typeof STATUS>('locked');
  const [chars, setChars] = useState<CharState[]>([]);
  const [eyeOpen, setEyeOpen] = useState(false);
  const [eyePeek, setEyePeek] = useState(false);
  const [eyeShake, setEyeShake] = useState(false);
  const [focused, setFocused] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [pupilOff, setPupilOff] = useState({ x: 0, y: 0 });

  const [laser, setLaser] = useState({
    visible: false, color: '#22d3ee', fromX: 0, toX: 0, dur: 300,
  });

  const timers = useRef<NodeJS.Timeout[]>([]);
  const blinkTmr = useRef<NodeJS.Timeout | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const clr = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const T = (fn: () => void, d: number) => { const t = setTimeout(fn, d); timers.current.push(t); };
  useEffect(() => () => clr(), []);

  /* ── Blinking ─────────────────────────────────────────────────────── */
  const schedBlink = useCallback(() => {
    if (blinkTmr.current) clearTimeout(blinkTmr.current);
    blinkTmr.current = setTimeout(() => {
      if (!eyeOpen) return;
      setIsBlinking(true);
      setTimeout(() => { setIsBlinking(false); schedBlink(); }, 130);
    }, 2500 + Math.random() * 2500);
  }, [eyeOpen]);

  useEffect(() => {
    if (eyeOpen) schedBlink();
    else { if (blinkTmr.current) clearTimeout(blinkTmr.current); setPupilOff({ x: 0, y: 0 }); }
    return () => { if (blinkTmr.current) clearTimeout(blinkTmr.current); };
  }, [eyeOpen, schedBlink]);

  /* ── Pupil tracking ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!eyeOpen) return;
    const onMove = (e: MouseEvent) => {
      if (!svgRef.current || isBlinking) return;
      const rect = svgRef.current.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxM = 1.6;
      const s = dist > 0 ? Math.min(maxM / dist, 1) * maxM : 0;
      setPupilOff({ x: (dx * s) / maxM, y: (dy * s) / maxM });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [eyeOpen, isBlinking]);

  /* ── Char display sync ────────────────────────────────────────────── */
  useEffect(() => {
    if (shown && !busy)
      setChars(value.split('').map(c => ({ ch: c, mode: 'clear', key: nextKey() })));
    else if (!shown && !busy)
      setChars(value.split('').map(() => ({ ch: '●', mode: 'dot', key: nextKey() })));
  }, [value, shown, busy]);

  /* ── Decode (reveal) ──────────────────────────────────────────────── */
  const decode = useCallback((v: string) => {
    if (busy) return;
    setBusy(true); setShown(true); setEyeOpen(true);
    const arr = v.split('');
    if (!arr.length) { setStatus('decoded'); setBusy(false); return; }

    setStatus('decoding');
    setChars(arr.map(() => ({ ch: rnd(), mode: 'glitch', key: nextKey() })));

    const dur = 100 + arr.length * 70;
    setLaser({ visible: true, color: '#22d3ee', fromX: 16, toX: 16 + arr.length * 13 + 10, dur });
    T(() => setLaser(l => ({ ...l, visible: false })), dur + 80);

    arr.forEach((c, i) => {
      const revAt = 40 + (i / arr.length) * dur * 0.9;
      for (let s = 0; s < 6; s++)
        T(() => setChars(prev => {
          const n = [...prev]; if (n[i]) n[i] = { ...n[i], ch: rnd(), mode: 'glitch' }; return n;
        }), revAt - 80 + s * 12);
      T(() => {
        setChars(prev => { const n = [...prev]; if (n[i]) n[i] = { ch: c, mode: 'clear', key: n[i].key }; return n; });
        if (i === arr.length - 1) T(() => { setStatus('decoded'); setBusy(false); }, 80);
      }, revAt);
    });
  }, [busy]);

  /* ── Encode (hide) ────────────────────────────────────────────────── */
  const encode = useCallback((v: string) => {
    if (busy) return;
    setBusy(true); setShown(false);
    const arr = v.split('');
    if (!arr.length) { setEyeOpen(false); setStatus('locked'); setBusy(false); return; }

    setStatus('locking');
    setChars(arr.map(c => ({ ch: c, mode: 'clear', key: nextKey() })));

    const dur = 80 + arr.length * 55;
    const endX = 16 + arr.length * 13 + 10;
    setLaser({ visible: true, color: '#ef4444', fromX: endX, toX: 16, dur });
    T(() => setLaser(l => ({ ...l, visible: false })), dur + 80);

    for (let i = arr.length - 1; i >= 0; i--) {
      const d = ((arr.length - 1 - i) / arr.length) * dur * 0.8;
      for (let s = 0; s < 5; s++)
        T(() => setChars(prev => {
          const n = [...prev]; if (n[i]) n[i] = { ...n[i], ch: rnd(), mode: 'glitch' }; return n;
        }), d + s * 10);
      T(() => {
        setChars(prev => { const n = [...prev]; if (n[i]) n[i] = { ...n[i], ch: '●', mode: 'dot' }; return n; });
        if (i === 0) T(() => {
          setEyeOpen(false);
          setEyeShake(true);
          setTimeout(() => setEyeShake(false), 350);
          setStatus('locked'); setBusy(false);
        }, 60);
      }, d + 60);
    }
  }, [busy]);

  const toggle = () => (shown ? encode(value) : decode(value));

  /* ── Derived ──────────────────────────────────────────────────────── */
  const str = getStrength(value);
  const st = STATUS[status];
  const px = pupilOff.x;
  const py = pupilOff.y;

  const lidState =
    isBlinking ? 'blink' :
      eyeOpen ? 'open' :
        (eyePeek || focused) ? 'peek' : 'closed';

  const lTopD = {
    open: 'M2 11 Q8 4 14 11',
    peek: 'M2 11 Q8 7 14 11',
    blink: 'M2 11 Q8 11 14 11',
    closed: 'M2 11 Q8 11 14 11',
  }[lidState];
  const rTopD = {
    open: 'M18 11 Q24 4 30 11',
    peek: 'M18 11 Q24 7 30 11',
    blink: 'M18 11 Q24 11 30 11',
    closed: 'M18 11 Q24 11 30 11',
  }[lidState];

  const botOpacity = lidState === 'closed' ? 1 : lidState === 'peek' ? 0.5 : lidState === 'blink' ? 1 : 0;
  const pupilOpacity = eyeOpen && !isBlinking ? 1 : 0;
  const slashOpacity = eyeOpen ? 0 : 1;
  const eyeStroke = eyeOpen ? '#22d3ee' : focused ? '#1e4a5a' : '#1e3a5f';
  const eyeFill = eyeOpen ? '#0a1a2e' : '#0a1525';

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className={`sukoon-eye-pass-container ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Optional label */}
      {(label || id) && (
        <label htmlFor={id} style={{
          fontFamily: "'Courier New',monospace", fontSize: 10, letterSpacing: '.15em',
          textTransform: 'uppercase', color: focused ? '#22d3ee' : '#1e3a4a', transition: 'color .3s',
        }}>
          {label || name || "Security Key"}
        </label>
      )}

      {/* Input shell */}
      <div style={{
        border: `1px solid ${eyeOpen ? '#22d3ee' : focused ? '#1e3a4a' : '#0f2035'}`,
        borderRadius: 11, background: '#060d18', overflow: 'hidden',
        boxShadow: eyeOpen ? '0 0 18px rgba(34,211,238,.12)' : 'none',
        transition: 'border-color .3s, box-shadow .3s',
      }}>
        <div style={{ position: 'relative', height: 52, display: 'flex', alignItems: 'center' }}>

          {/* Native input (invisible text / caret only) */}
          <input
            id={id} name={name} type="password"
            value={value} onChange={onChange}
            required={required} placeholder={placeholder}
            autoComplete="off"
            onFocus={() => { setFocused(true); if (!shown) setEyePeek(true); }}
            onBlur={() => { setFocused(false); setEyePeek(false); }}
            style={{
              position: 'absolute', inset: 0, width: '100%', zIndex: 3,
              background: 'transparent', border: 'none', outline: 'none',
              color: 'transparent', caretColor: '#22d3ee',
              fontFamily: "'Courier New',monospace", fontSize: 14,
              padding: '0 64px 0 16px', letterSpacing: '.18em',
            }}
          />

          {/* Glitch character display */}
          <div style={{
            position: 'absolute', left: 16, right: 64, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', gap: 1,
            pointerEvents: 'none', zIndex: 2, overflow: 'hidden',
          }}>
            {chars.length === 0
              ? <span style={{
                fontFamily: "'Courier New',monospace", fontSize: 13,
                color: '#0f2035', letterSpacing: '.04em',
              }}>{placeholder}</span>
              : chars.map((c, i) => (
                <span key={c.key} style={{
                  fontFamily: "'Courier New',monospace",
                  fontSize: c.mode === 'dot' ? 16 : 13,
                  width: 12, textAlign: 'center', display: 'inline-block',
                  lineHeight: 1, flexShrink: 0,
                  color:
                    c.mode === 'glitch' ? '#22d3ee' :
                      c.mode === 'dot' ? '#1e3a4a' : '#e2e8f0',
                  animation:
                    c.mode === 'dot' ? `dotPulse 2s ease-in-out ${i * .1}s infinite` :
                      c.mode === 'clear' ? 'clearIn .12s ease forwards' : 'none',
                }}>{c.ch}</span>
              ))
            }
          </div>

          {/* Laser beam */}
          {laser.visible && (
            <div style={{
              position: 'absolute', top: 0, bottom: 0, width: 3, borderRadius: 1,
              background: laser.color, zIndex: 4, pointerEvents: 'none',
              boxShadow: `0 0 6px 3px ${laser.color}, 0 0 20px 7px ${laser.color}70, 0 0 45px 12px ${laser.color}30`,
              left: laser.fromX,
              transition: `left ${laser.dur}ms linear`,
            }} />
          )}

          {/* ── Dual-Eye toggle button ──────────────────────────────── */}
          <button
            type="button" onClick={toggle} tabIndex={-1}
            aria-label={shown ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              width: 52, height: 40, border: 'none', background: 'transparent',
              cursor: 'pointer', zIndex: 5, display: 'flex', alignItems: 'center',
              justifyContent: 'center', borderRadius: 10,
              animation: eyeShake ? 'eyeShake .35s ease' : 'none',
            }}
          >
            <svg
              ref={svgRef}
              width="46" height="22" viewBox="0 0 32 22"
              fill="none" xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <clipPath id="lEyeClip"><ellipse cx="8" cy="11" rx="6" ry="4.5" /></clipPath>
                <clipPath id="rEyeClip"><ellipse cx="24" cy="11" rx="6" ry="4.5" /></clipPath>
                <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#7ef9ff" />
                  <stop offset="55%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#0891b2" />
                </radialGradient>
              </defs>

              {/* Sclerae */}
              <ellipse cx="8" cy="11" rx="6" ry="4.5" fill={eyeFill} stroke={eyeStroke} strokeWidth="1.1" style={{ transition: 'fill .3s,stroke .3s' }} />
              <ellipse cx="24" cy="11" rx="6" ry="4.5" fill={eyeFill} stroke={eyeStroke} strokeWidth="1.1" style={{ transition: 'fill .3s,stroke .3s' }} />

              {/* Left iris + pupil + highlight */}
              <circle cx={8 + px} cy={11 + py} r="2.8" fill="url(#irisGrad)" opacity={pupilOpacity} clipPath="url(#lEyeClip)" style={{ transition: 'opacity .25s' }} />
              <circle cx={8 + px} cy={11 + py} r="1.3" fill="#060d18" opacity={pupilOpacity} clipPath="url(#lEyeClip)" style={{ transition: 'opacity .25s' }} />
              <circle cx={8.8 + px} cy={9.8 + py} r="0.7" fill="white" opacity={pupilOpacity * .92} clipPath="url(#lEyeClip)" style={{ transition: 'opacity .25s' }} />
              <circle cx={6.8 + px} cy={12.2 + py} r="0.35" fill="rgba(255,255,255,.45)" opacity={pupilOpacity} clipPath="url(#lEyeClip)" style={{ transition: 'opacity .25s' }} />

              {/* Right iris + pupil + highlight */}
              <circle cx={24 + px} cy={11 + py} r="2.8" fill="url(#irisGrad)" opacity={pupilOpacity} clipPath="url(#rEyeClip)" style={{ transition: 'opacity .25s' }} />
              <circle cx={24 + px} cy={11 + py} r="1.3" fill="#060d18" opacity={pupilOpacity} clipPath="url(#rEyeClip)" style={{ transition: 'opacity .25s' }} />
              <circle cx={24.8 + px} cy={9.8 + py} r="0.7" fill="white" opacity={pupilOpacity * .92} clipPath="url(#rEyeClip)" style={{ transition: 'opacity .25s' }} />
              <circle cx={22.8 + px} cy={12.2 + py} r="0.35" fill="rgba(255,255,255,.45)" opacity={pupilOpacity} clipPath="url(#rEyeClip)" style={{ transition: 'opacity .25s' }} />

              {/* Left eyelids */}
              <path d={lTopD} fill={eyeFill} stroke={eyeStroke} strokeWidth="1.1" strokeLinecap="round" style={{ transition: 'd .15s ease,fill .3s,stroke .3s' }} />
              <path d="M2 11 Q8 18 14 11" fill={eyeFill} stroke={eyeStroke} strokeWidth="1.1" strokeLinecap="round" opacity={botOpacity} style={{ transition: 'opacity .12s,fill .3s,stroke .3s' }} />

              {/* Right eyelids */}
              <path d={rTopD} fill={eyeFill} stroke={eyeStroke} strokeWidth="1.1" strokeLinecap="round" style={{ transition: 'd .15s ease,fill .3s,stroke .3s' }} />
              <path d="M18 11 Q24 18 30 11" fill={eyeFill} stroke={eyeStroke} strokeWidth="1.1" strokeLinecap="round" opacity={botOpacity} style={{ transition: 'opacity .12s,fill .3s,stroke .3s' }} />

              {/* Slash (when locked) */}
              <line x1="3" y1="20" x2="29" y2="2" stroke={eyeStroke} strokeWidth="1.4" strokeLinecap="round" opacity={slashOpacity} style={{ transition: 'opacity .2s,stroke .3s' }} />
            </svg>
          </button>

        </div>

        {/* Strength bar */}
        <div style={{ height: 2 }}>
          <div style={{
            height: '100%', width: str.pct + '%', background: str.color,
            transition: 'width .55s cubic-bezier(.34,1.56,.64,1), background .4s',
          }} />
        </div>
      </div>

      {/* Status row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 3px 0' }}>
        <span style={{
          fontFamily: "'Courier New',monospace", fontSize: 10,
          letterSpacing: '.1em', color: st.color, transition: 'color .3s',
        }}>{st.text}</span>
        {str.label && (
          <span style={{
            fontFamily: "'Courier New',monospace", fontSize: 10,
            letterSpacing: '.1em', color: str.color,
          }}>{`// ${str.label}`}</span>
        )}
      </div>

      <style>{`
        @keyframes dotPulse {
          0%,100% { opacity:.4; transform:scale(.88) }
          50%     { opacity:1;  transform:scale(1.1) }
        }
        @keyframes clearIn {
          0%   { opacity:.3; transform:scaleX(.6) }
          100% { opacity:1;  transform:scaleX(1)  }
        }
        @keyframes eyeShake {
          0%,100% { transform:translateY(-50%) }
          20%     { transform:translateY(-50%) translateX(-2px) rotate(-4deg) }
          55%     { transform:translateY(-50%) translateX( 2px) rotate( 4deg) }
          80%     { transform:translateY(-50%) translateX(-1px) }
        }
      `}</style>
    </div>
  );
}