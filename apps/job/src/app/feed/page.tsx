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
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-black">
                <div className="relative">
                    <div className="absolute inset-0 bg-[#FF0069] blur-2xl opacity-20 animate-pulse" />
                    <Loader2 className="w-12 h-12 text-[#FF0069] animate-spin relative" />
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            background: '#000',           // black sides on desktop
            minHeight: '100dvh',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '430px',           // phone-width feed centered on desktop
                position: 'relative',
            }}>
                <VideoFeed />
            </div>
        </div>
    );
}
