'use client';

import { VideoFeed } from '@/components/video/VideoFeed';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function FeedPage() {
    const { user, loading } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || loading) {
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

    return (
        <div className="feed-wrapper">
            <div className="feed-inner">
                <VideoFeed />
            </div>
        </div>
    );
}
