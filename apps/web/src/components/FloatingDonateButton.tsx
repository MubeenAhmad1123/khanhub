'use client';

import React from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingDonateButton: React.FC = () => {
    return (
        <div className="fixed bottom-24 right-6 z-[9999] pointer-events-none md:bottom-8">
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                className="pointer-events-auto"
            >
                <Link
                    href="/donate"
                    className="group flex items-center gap-3 bg-gradient-to-r from-red-500 via-pink-600 to-red-500 bg-[length:200%_auto] hover:bg-[100%_center] transition-all duration-500 text-white px-6 py-4 rounded-full shadow-[0_5px_15px_rgba(239,68,68,0.4)] hover:shadow-[0_8px_25px_rgba(239,68,68,0.6)] border-2 border-white/20"
                >
                    <div className="relative">
                        <Heart className="w-6 h-6 fill-white group-hover:scale-125 transition-transform duration-300 animate-pulse" />
                        <div className="absolute -inset-2 bg-white/30 rounded-full blur-sm animate-ping opacity-0 group-hover:opacity-100" />
                    </div>
                    <span className="font-display font-black text-sm uppercase tracking-widest hidden sm:inline">Donate Now</span>
                </Link>
            </motion.div>
        </div>
    );
};

export default FloatingDonateButton;
