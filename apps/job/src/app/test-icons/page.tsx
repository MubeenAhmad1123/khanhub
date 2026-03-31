'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function TestIconsPage() {
  const [muted, setMuted] = useState(true);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Lucide Volume Icon Test</h1>

      <button
        onClick={() => setMuted(m => !m)}
        style={{
          width: 60,
          height: 60,
          borderRadius: '999px',
          border: 'none',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {muted ? <VolumeX size={28} /> : <Volume2 size={28} />}
      </button>

      <p style={{ fontSize: 14, opacity: 0.7 }}>
        Click the button to toggle volume icon
      </p>
    </div>
  );
}