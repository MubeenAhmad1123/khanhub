'use client';

import React, { useState } from 'react';
import { Heart, Bookmark, MessageSquare, MoreVertical, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActionButtonsProps {
    onConnect: () => void;
    connectLabel: string;
}

export function ActionButtons({ onConnect, connectLabel }: ActionButtonsProps) {
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);

    return (
        <div className="absolute right-3 bottom-[100px] flex flex-col items-center gap-5 z-30">
            {/* Profile / Connect Button */}
            <button
                onClick={onConnect}
                className="w-14 h-14 rounded-full bg-[--accent] flex items-center justify-center shadow-[0_0_20px_var(--accent-glow)] mb-2 p-1 active:scale-95 transition-transform"
            >
                <div className="w-full h-full rounded-full border-2 border-black/20 flex items-center justify-center text-black font-bold text-[10px] leading-tight text-center px-1">
                    {connectLabel}
                </div>
            </button>

            {/* Like */}
            <div className="flex flex-col items-center gap-1">
                <button
                    onClick={() => setLiked(!liked)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center glass-card border-[--border] transition-all ${liked ? 'bg-red-500/20 border-red-500 text-red-500' : 'text-white'}`}
                >
                    <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
                </button>
                <span className="text-[10px] font-bold">2.4K</span>
            </div>

            {/* Save */}
            <div className="flex flex-col items-center gap-1">
                <button
                    onClick={() => setSaved(!saved)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center glass-card border-[--border] transition-all ${saved ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'text-white'}`}
                >
                    <Bookmark className={`w-6 h-6 ${saved ? 'fill-current' : ''}`} />
                </button>
                <span className="text-[10px] font-bold">842</span>
            </div>

            {/* Share */}
            <div className="flex flex-col items-center gap-1">
                <button className="w-12 h-12 rounded-full flex items-center justify-center glass-card border-[--border] text-white">
                    <Send className="w-6 h-6" />
                </button>
                <span className="text-[10px] font-bold">Share</span>
            </div>

            {/* More */}
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-[--text-muted] hover:text-white transition-colors">
                <MoreVertical className="w-6 h-6" />
            </button>
        </div>
    );
}
