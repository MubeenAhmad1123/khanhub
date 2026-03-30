'use client';

import React from 'react';

export default function SetupError({ error }: { error: Error }) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h2 style={{ color: 'red' }}>Setup Error (debug)</h2>
      <pre style={{ background: '#f5f5f5', padding: '1rem', 
                    whiteSpace: 'pre-wrap', fontSize: '13px' }}>
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
    </div>
  );
}

