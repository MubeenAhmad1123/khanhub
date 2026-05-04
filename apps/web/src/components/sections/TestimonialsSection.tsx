'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Star, CheckCircle2 } from 'lucide-react';
import { TESTIMONIALS, Testimonial } from '@/data/testimonials';
import { cn } from '@/lib/utils';

export function TestimonialsSection() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            setItemsPerPage(window.innerWidth < 768 ? 1 : 3);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const maxIndex = Math.max(0, TESTIMONIALS.length - itemsPerPage);

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, [maxIndex]);

    const prevSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
    }, [maxIndex]);

    useEffect(() => {
        if (!isPaused) {
            const interval = setInterval(nextSlide, 5000);
            return () => clearInterval(interval);
        }
    }, [isPaused, nextSlide]);

    return (
        <section className="py-16 md:py-24 bg-gradient-to-b from-neutral-50 to-[#F9F9FB] overflow-hidden relative" id="testimonials">
            <div className="container-custom px-4 md:px-6 relative z-10">
                {/* Section Header */}
                <div className="text-center mb-12 md:mb-16">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B] animate-pulse" />
                        <span className="text-[#F59E0B] font-extrabold text-xs tracking-widest uppercase font-display">
                            Testimonials
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-neutral-900 font-display tracking-tight leading-tight">
                        What Our Community Says
                    </h2>
                    <p className="text-sm md:text-base text-neutral-500 mt-2 max-w-xl mx-auto">
                        Real stories from real people in our community who have experienced our premium support and training.
                    </p>
                </div>

                {/* Slider Container */}
                <div className="relative group max-w-5xl mx-auto">
                    <div className="overflow-hidden rounded-3xl p-1">
                        <div
                            className="flex transition-transform duration-700 ease-in-out gap-4 md:gap-6"
                            style={{ transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)` }}
                            onMouseEnter={() => setIsPaused(true)}
                            onMouseLeave={() => setIsPaused(false)}
                        >
                            {TESTIMONIALS.map((review) => (
                                <div
                                    key={review.id}
                                    className={cn(
                                        "flex-shrink-0 bg-white rounded-3xl p-6 md:p-8 border border-neutral-100 hover:border-neutral-200/60 transition-all duration-300 flex flex-col justify-between h-auto min-h-[300px] md:min-h-[340px] shadow-[0_4px_16px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5",
                                        itemsPerPage === 1 ? "w-full" : "w-[calc(33.333%-11px)]"
                                    )}
                                >
                                    <div>
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between mb-4 md:mb-6">
                                            <div className="flex items-center gap-3">
                                                {review.avatarUrl ? (
                                                    <div className="relative w-11 h-11 rounded-full overflow-hidden border border-neutral-100/80 shadow-sm flex-shrink-0">
                                                        <Image
                                                            src={review.avatarUrl}
                                                            alt={review.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm flex-shrink-0"
                                                        style={{ backgroundColor: review.avatarColor || '#4285F4' }}
                                                    >
                                                        {review.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <h4 className="font-extrabold text-neutral-900 leading-tight truncate text-sm md:text-base">{review.name}</h4>
                                                    <p className="text-xs text-neutral-500 mt-0.5">{review.timeAgo}</p>
                                                </div>
                                            </div>
                                            {/* Google Logo */}
                                            <svg className="w-5 h-5 flex-shrink-0 select-none" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                        </div>

                                        {/* Rating */}
                                        <div className="flex items-center gap-0.5 mb-3">
                                            {[...Array(review.stars)].map((_, i) => (
                                                <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                                            ))}
                                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10 ml-1.5" />
                                        </div>

                                        {/* Review Text */}
                                        <div className={cn(
                                            "text-neutral-600 text-xs md:text-sm leading-relaxed mb-2 select-text",
                                            review.isRtl && "text-right font-medium"
                                        )} dir={review.isRtl ? 'rtl' : 'ltr'}>
                                            {review.text.length > 150 ? (
                                                <>
                                                    {review.text.substring(0, 150)}...
                                                    <button className="text-neutral-400 text-xs ml-2 hover:text-neutral-600 font-semibold">Read more</button>
                                                </>
                                            ) : (
                                                review.text
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Controls */}
                    <button
                        onClick={prevSlide}
                        className="absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-neutral-200 shadow-lg flex items-center justify-center text-neutral-600 hover:bg-neutral-50 transition-all z-20 md:opacity-0 md:group-hover:opacity-100 hover:scale-105 active:scale-95"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-neutral-200 shadow-lg flex items-center justify-center text-neutral-600 hover:bg-neutral-50 transition-all z-20 md:opacity-0 md:group-hover:opacity-100 hover:scale-105 active:scale-95"
                    >
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                {/* Section Footer */}
                <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-6">
                    <a
                        href="https://g.page/r/CRlw4v0AEnHaEBM/review"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#F59E0B] hover:bg-[#D97706] text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-[#F59E0B]/20 hover:scale-[1.03] active:scale-95 transition-all duration-300 text-sm md:text-base text-center"
                    >
                        Post Your Review
                    </a>
                </div>
            </div>
        </section>
    );
}
