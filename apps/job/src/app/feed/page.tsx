'use client';

import { VideoFeed } from '@/components/video/VideoFeed';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, Suspense } from 'react';

function FeedLoader() {
    return (
        <div style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            gap: 20,
        }}>
            {/* Logo with spinning ring */}
            <div style={{ position: 'relative', width: 72, height: 72 }}>
                {/* Spinning ring */}
                <div style={{
                    position: 'absolute',
                    inset: -4,
                    borderRadius: '50%',
                    border: '3px solid transparent',
                    borderTop: '3px solid #FF0069',
                    borderRight: '3px solid rgba(255,0,105,0.3)',
                    animation: 'spin 0.9s linear infinite',
                }} />
                {/* Logo image */}
                <img
                    src="/logo-circle.webp"
                    alt="Khan Hub"
                    width={72}
                    height={72}
                    style={{
                        borderRadius: '50%',
                        objectFit: 'cover',
                        display: 'block',
                    }}
                />
            </div>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default function FeedPage() {
    const { user, loading, firebaseUser, error, logout } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        console.log('[FeedPage] Auth state changed:', { hasUser: !!user, hasFirebaseUser: !!firebaseUser, loading, error });
        setMounted(true);
    }, [user, firebaseUser, loading, error]);

    // Don't render anything until mounted to avoid hydration mismatch
    if (!mounted) return <FeedLoader />;

    if (loading) return <FeedLoader />;

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
                <Suspense fallback={null}>
                    <VideoFeed />
                </Suspense>
            </div>
        </div>
    );
}
