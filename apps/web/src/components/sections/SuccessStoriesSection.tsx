// src/components/sections/SuccessStoriesSection.tsx
// ─────────────────────────────────────────────────────────────────
// Section for Home Page showcasing top success stories/reviews
// ─────────────────────────────────────────────────────────────────

import React from 'react';
import Link from 'next/link';
import { SectionHeader } from '@/components/ui';
import { SuccessStoryCard } from '@/components/ui/SuccessStoryCard';
import { SUCCESS_STORIES } from '@/data/success-stories';

export const SuccessStoriesSection: React.FC = () => {
    // We only show the first 3 stories on the home page as requested
    const featuredStories = SUCCESS_STORIES.slice(0, 3);

    return (
        <section className="section bg-white overflow-hidden" id="success-stories">
            <div className="section-inner relative">
                {/* Decorative elements */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-100/30 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-success-100/20 blur-3xl rounded-full pointer-events-none" />

                <div className="relative z-10">
                    <SectionHeader
                        badge="Success Stories"
                        title="Real Stories, Real Impact"
                        titleGradient
                        subtitle="Explore how Khan Hub is changing lives through dedicated healthcare, education, and welfare initiatives."
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {featuredStories.map((story, index) => (
                            <div
                                key={story.id}
                                className="animate-fade-up"
                                style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'forwards' }}
                            >
                                <SuccessStoryCard story={story} />
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 text-center animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
                        <Link
                            href="/success-stories"
                            className="group inline-flex items-center gap-2 bg-neutral-900 text-white px-8 py-4 rounded-xl font-bold transition-all duration-300 hover:bg-primary-600 hover:shadow-xl hover:shadow-primary-500/20 active:scale-95"
                        >
                            <span>Read More Success Stories</span>
                            <svg
                                className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};
