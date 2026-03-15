'use client';

import { VideoFeed } from '@/components/video/VideoFeed';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function FeedPage() {
    const { user, loading, firebaseUser, error, logout } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Don't render anything until mounted to avoid hydration mismatch
    if (!mounted) {
        return (
            <div style={{
                height: '100dvh', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: '#000'
            }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: '3px solid #333', borderTop: '3px solid #FF0069',
                    animation: 'spin 0.75s linear infinite'
                }} />
                <style>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{
                height: '100dvh', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: '#000'
            }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: '3px solid #333', borderTop: '3px solid #FF0069',
                    animation: 'spin 0.75s linear infinite'
                }} />
                <style>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }


    // NEW: profile failed to load but user IS authenticated
    if (error === 'profile_load_failed' && firebaseUser) {
        return (
            <div style={{
                height: '100dvh', display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '16px', padding: '20px', textAlign: 'center',
                background: '#fff'
            }}>
                <p style={{ fontSize: '16px', color: '#0A0A0A', fontWeight: 600 }}>
                    Having trouble loading your profile
                </p>
                <p style={{ fontSize: '13px', color: '#888' }}>
                    You're signed in but we couldn't fetch your data.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '12px 24px',
                        background: '#FF0069', color: '#fff',
                        border: 'none', borderRadius: '20px',
                        fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    Try Again
                </button>
                <button
                    onClick={logout}
                    style={{
                        background: 'none', border: 'none',
                        color: '#888', fontSize: '13px', cursor: 'pointer',
                    }}
                >
                    Sign out and try again
                </button>
            </div>
        );
    }

    return (
        <div className="feed-wrapper">
            <div className="feed-inner">
                <VideoFeed />
            </div>
        </div>
    );
}
