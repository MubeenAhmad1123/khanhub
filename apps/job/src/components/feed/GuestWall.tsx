'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, UserPlus, LogIn, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface GuestWallProps {
    isVisible: boolean;
    onContinue: () => void;
}

export function GuestWall({ isVisible, onContinue }: GuestWallProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center px-8 text-center"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[--accent] rounded-full blur-[100px] opacity-20 pointer-events-none" />

                    <div className="w-20 h-20 rounded-3xl bg-[--bg-card] border border-[--border] flex items-center justify-center mb-8 relative">
                        <Lock className="w-10 h-10 text-[--accent]" />
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[--accent] blur-[4px]"
                        />
                    </div>

                    <h2 className="text-3xl font-bold font-syne mb-3">You've seen 3 reels</h2>
                    <p className="text-[--text-muted] mb-10 max-w-xs leading-relaxed">
                        Create a free account to keep watching and connect with experts in your industry.
                    </p>

                    <div className="w-full max-w-xs space-y-4">
                        <Link
                            href="/auth/register"
                            className="w-full py-4 bg-[--accent] text-black font-black font-syne uppercase tracking-widest text-sm rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_32px_var(--accent-glow)] transition-transform active:scale-95"
                        >
                            <UserPlus size={18} />
                            Register Free <ChevronRight size={18} />
                        </Link>

                        <Link
                            href="/auth/login"
                            className="w-full py-4 bg-[--bg-card] border border-[--border] text-white font-black font-syne uppercase tracking-widest text-sm rounded-2xl flex items-center justify-center gap-2 hover:border-white/20 transition-all active:scale-95"
                        >
                            <LogIn size={18} />
                            Sign In
                        </Link>
                    </div>

                    <button
                        onClick={onContinue}
                        className="mt-12 text-[--text-muted] hover:text-white text-xs font-bold uppercase tracking-[0.2em] transition-colors"
                    >
                        Continue watching ×
                    </button>

                    <div className="absolute bottom-12 text-[10px] text-[--text-muted] uppercase tracking-[0.3em] font-black italic">
                        <span className="text-[--accent]">JOB</span>REEL
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
