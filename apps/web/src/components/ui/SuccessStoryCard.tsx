// src/components/ui/SuccessStoryCard.tsx
// ─────────────────────────────────────────────────────────────────
// UI component for displaying a single success story/review
// ─────────────────────────────────────────────────────────────────

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { SuccessStory } from '@/data/success-stories';

interface SuccessStoryCardProps {
    story: SuccessStory;
    className?: string;
}

export const SuccessStoryCard: React.FC<SuccessStoryCardProps> = ({ story, className }) => {
    return (
        <div className={cn(
            "group relative flex flex-col h-full bg-white rounded-2xl border border-neutral-200/60 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden",
            className
        )}>
            {/* Department Badge */}
            <div className="absolute top-4 left-4 z-10">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary-50 text-primary-700 border border-primary-100 uppercase tracking-widest backdrop-blur-sm">
                    {story.department}
                </span>
            </div>

            {/* Image Section (Optional Before/After or After) */}
            <div className="relative aspect-video overflow-hidden bg-neutral-100">
                <Image
                    src={story.imageAfter}
                    alt={story.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {story.imageBefore && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 text-[10px] text-white font-medium backdrop-blur-sm">
                        Before & After
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="flex flex-col flex-grow p-5 sm:p-6 text-left">
                {/* Rating */}
                <div className="flex gap-0.5 mb-3 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                        <svg
                            key={i}
                            className={cn("w-4 h-4", i < story.rating ? "fill-current" : "text-neutral-200")}
                            viewBox="0 0 20 20"
                        >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    ))}
                </div>

                <h3 className="font-display font-bold text-lg text-neutral-900 mb-2 leading-tight group-hover:text-primary-600 transition-colors">
                    {story.title}
                </h3>

                <p className="text-sm text-neutral-700 line-clamp-3 mb-6 leading-relaxed italic">
                    "{story.content}"
                </p>

                {/* Footer - Patient Info */}
                <div className="mt-auto flex items-center gap-3 pt-4 border-t border-neutral-100">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0">
                        {story.avatar ? (
                            <Image
                                src={story.avatar}
                                alt={story.name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-neutral-900 truncate">{story.name}</p>
                        <p className="text-[11px] text-neutral-500 uppercase tracking-widest">{story.date}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
