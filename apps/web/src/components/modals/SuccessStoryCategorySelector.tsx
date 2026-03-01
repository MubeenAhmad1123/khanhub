'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X, Heart } from 'lucide-react';
import { DEPARTMENTS } from '@/data/departments';
import { cn } from '@/lib/utils';

interface SuccessStoryCategorySelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SuccessStoryCategorySelector: React.FC<SuccessStoryCategorySelectorProps> = ({ isOpen, onClose }) => {
    const router = useRouter();

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCategoryClick = (slug: string) => {
        router.push(`/success-stories?dept=${slug}`);
        onClose();
    };

    // Split departments into two groups of 8 (or as many as available)
    const midPoint = Math.ceil(DEPARTMENTS.length / 2);
    const leftDepts = DEPARTMENTS.slice(0, midPoint);
    const rightDepts = DEPARTMENTS.slice(midPoint);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-white/95 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="relative w-full h-full max-w-7xl mx-auto flex flex-col overflow-hidden bg-white sm:rounded-[2.5rem] shadow-2xl border border-neutral-100 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 sm:px-12 sm:py-8 border-b border-neutral-100">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 font-display">Success Stories</h2>
                        <p className="text-sm sm:text-base text-neutral-500 mt-1">Select a department to read their impact stories</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-neutral-100 hover:bg-neutral-200 rounded-2xl transition-all hover:rotate-90 group"
                        aria-label="Close selector"
                    >
                        <X className="w-6 h-6 text-neutral-600 group-hover:text-neutral-900" />
                    </button>
                </div>

                {/* Content - Scrollable Grid */}
                <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12 sm:pb-32">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3">
                        {/* Left Column */}
                        <div className="space-y-3">
                            {leftDepts.map((dept) => (
                                <button
                                    key={dept.slug}
                                    onClick={() => handleCategoryClick(dept.slug)}
                                    className="w-full flex items-center gap-4 p-3 rounded-2xl bg-neutral-50 border border-neutral-100 hover:border-primary-300 hover:bg-white hover:shadow-lg hover:shadow-primary-500/5 transition-all group group/item"
                                >
                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white shadow-sm border border-neutral-100 group-hover/item:scale-110 transition-transform">
                                        <Image
                                            src={dept.image || '/placeholder-dept.webp'}
                                            alt={dept.name}
                                            fill
                                            className="object-cover"
                                            sizes="48px"
                                        />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className="font-bold text-neutral-800 group-hover/item:text-primary-600 transition-colors">{dept.name}</h3>
                                        <p className="text-xs text-neutral-500 line-clamp-1">{dept.tagline}</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-neutral-100 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                        <span className="text-primary-600">→</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Right Column */}
                        <div className="space-y-3">
                            {rightDepts.map((dept) => (
                                <button
                                    key={dept.slug}
                                    onClick={() => handleCategoryClick(dept.slug)}
                                    className="w-full flex items-center gap-4 p-3 rounded-2xl bg-neutral-50 border border-neutral-100 hover:border-primary-300 hover:bg-white hover:shadow-lg hover:shadow-primary-500/5 transition-all group/item"
                                >
                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white shadow-sm border border-neutral-100 group-hover/item:scale-110 transition-transform">
                                        <Image
                                            src={dept.image || '/placeholder-dept.webp'}
                                            alt={dept.name}
                                            fill
                                            className="object-cover"
                                            sizes="48px"
                                        />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className="font-bold text-neutral-800 group-hover/item:text-primary-600 transition-colors">{dept.name}</h3>
                                        <p className="text-xs text-neutral-500 line-clamp-1">{dept.tagline}</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-neutral-100 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                        <span className="text-primary-600">→</span>
                                    </div>
                                </button>
                            ))}

                            {/* Donate CTA as the last item on the right */}
                            <button
                                onClick={() => router.push('/donate')}
                                className="w-full flex items-center gap-4 p-4 rounded-3xl bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xl shadow-rose-500/20 hover:scale-[1.02] transition-all group mt-6"
                            >
                                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center animate-pulse">
                                    <Heart className="w-6 h-6 fill-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-bold text-lg">DONATE NOW</h3>
                                    <p className="text-xs text-white/80">Support our mission of compassion</p>
                                </div>
                                <span className="text-2xl mr-2">❤️</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer / Mobile Shortcut */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/90 to-transparent sm:hidden">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold shadow-lg"
                    >
                        Keep Browsing Home
                    </button>
                </div>
            </div>

            <style jsx>{`
                .animate-in {
                    animation-duration: 0.3s;
                    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
                    animation-fill-mode: forwards;
                }
                .fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .zoom-in-95 {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
