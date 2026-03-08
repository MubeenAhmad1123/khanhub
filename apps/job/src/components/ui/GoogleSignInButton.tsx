'use client';
import { useState } from 'react';

interface GoogleSignInButtonProps {
    onClick: () => void;
    loading: boolean;
}

export function GoogleSignInButton({ onClick, loading }: GoogleSignInButtonProps) {
    const [googleHover, setGoogleHover] = useState(false)

    return (
        <button
            onClick={onClick}
            disabled={loading}
            onMouseEnter={() => setGoogleHover(true)}
            onMouseLeave={() => setGoogleHover(false)}
            style={{
                width: '100%',
                padding: '14px 20px',
                background: googleHover ? '#F8F8F8' : '#FFFFFF',
                border: '1.5px solid #E5E5E5',
                borderRadius: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                transition: 'all 0.2s ease',
                transform: googleHover && !loading ? 'translateY(-1px)' : 'none',
                boxShadow: googleHover
                    ? '0 8px 24px rgba(0,0,0,0.12)'
                    : '0 2px 8px rgba(0,0,0,0.06)',
                opacity: loading ? 0.7 : 1,
            }}
        >
            {loading ? (
                // Spinner
                <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: '2px solid #E5E5E5',
                    borderTopColor: '#FF0069',
                    animation: 'spin 0.7s linear infinite',
                    flexShrink: 0,
                }} />
            ) : (
                // Google G logo SVG
                <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
            )}
            <span style={{
                fontFamily: 'DM Sans',
                fontWeight: 600,
                fontSize: 15,
                color: '#0A0A0A',
                letterSpacing: '0.01em',
            }}>
                {loading ? 'Connecting...' : 'Continue with Google'}
            </span>
        </button>
    )
}
