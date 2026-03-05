'use client';

import React from 'react';
import { MapPin, ShieldCheck, Zap } from 'lucide-react';

interface VideoOverlayProps {
    data: {
        title: string;
        badge: string;
        field1?: string;
        field2?: string;
        location: string;
    };
}

export function VideoOverlay({ data }: VideoOverlayProps) {
    return (
        <div className="absolute bottom-[80px] left-0 right-[60px] p-6 pointer-events-none z-20">
            <div className="max-w-[75%] space-y-3">
                {/* Category Badge */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[--accent] text-black w-fit">
                    <Zap className="w-3 h-3 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{data.badge}</span>
                </div>

                {/* Title / Name */}
                <h3 className="text-2xl font-bold font-syne leading-tight text-white drop-shadow-md">
                    {data.title}
                </h3>

                {/* Dynamic Fields */}
                <div className="space-y-1">
                    {data.field1 && (
                        <p className="text-sm font-medium text-white/90 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[--accent]" />
                            {data.field1}
                        </p>
                    )}
                    {data.field2 && (
                        <p className="text-sm font-medium text-white/80 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                            {data.field2}
                        </p>
                    )}
                </div>

                {/* Location & Verification */}
                <div className="flex items-center gap-4 pt-1">
                    <div className="flex items-center gap-1.5 text-[--text-muted]">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold uppercase tracking-widest">{data.location}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[--accent]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Verified</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
