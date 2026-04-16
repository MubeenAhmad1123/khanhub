'use client';

import React from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';

const FloatingAffiliateButton: React.FC = () => {
    return (
        <div className="fixed bottom-[160px] left-4 z-[9999] pointer-events-none lg:bottom-[104px] lg:left-6 scale-[0.96] lg:scale-100">
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                className="pointer-events-auto"
            >
                <Link
                    href="/affiliate"
                    className="group flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-500 bg-[length:200%_auto] hover:bg-[100%_center] transition-all duration-500 text-white w-16 lg:w-auto lg:px-6 lg:py-4 h-14 rounded-full shadow-[0_5px_15px_rgba(16,185,129,0.4)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.6)] border-2 border-white/20"
                >
                    <div className="relative">
                        <Users className="w-6 h-6 group-hover:scale-125 transition-transform duration-300 animate-pulse" />
                        <div className="absolute -inset-2 bg-white/30 rounded-full blur-sm animate-ping opacity-0 group-hover:opacity-100" />
                    </div>
                    <span className="font-display font-black text-sm uppercase tracking-widest hidden lg:inline">Affiliate</span>
                </Link>
            </motion.div>
        </div>
    );
};

export default FloatingAffiliateButton;
