// src/app/success-stories/page.tsx
// ─────────────────────────────────────────────────────────────────
// SUCCESS STORIES PAGE - Full gallery of patient reviews & results
// ─────────────────────────────────────────────────────────────────

import React from 'react';
import Link from 'next/link';
import { PageHero, SectionHeader } from '@/components/ui';
import { SuccessStoryCard } from '@/components/ui/SuccessStoryCard';
import { SUCCESS_STORIES } from '@/data/success-stories';

export default function SuccessStoriesPage() {
    return (
        <article className="overflow-x-hidden">
            {/* Hero Section */}
            <PageHero
                backgroundImage="/success-stories.webp"
                badge="Success Stories"
                title="Impact We Create Together"
                subtitle="Read real-life transformations from our patients and students who have benefited from Khan Hub's diverse services."
            />

            {/* Main Content */}
            <section className="section bg-gradient-light">
                <div className="section-inner">

                    {/* Section: Transformation Gallery (Before & After Highlight) */}
                    <div className="mb-24">
                        <SectionHeader
                            badge="Visual Results"
                            title="Transformations that Matter"
                            subtitle="A glimpse into the life-changing results achieved through our specialized surgical and rehabilitation services."
                            align="left"
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {SUCCESS_STORIES.filter(s => s.imageBefore).map((story, index) => (
                                <div key={story.id} className="group bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500">
                                    <div className="grid grid-cols-2 gap-px bg-neutral-200">
                                        <div className="relative aspect-[4/5] overflow-hidden">
                                            <img src={story.imageBefore} alt="Before" className="w-full h-full object-cover" />
                                            <div className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-black/60 text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">Before</div>
                                        </div>
                                        <div className="relative aspect-[4/5] overflow-hidden">
                                            <img src={story.imageAfter} alt="After" className="w-full h-full object-cover" />
                                            <div className="absolute top-4 right-4 px-3 py-1 rounded-lg bg-primary-600 text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">After</div>
                                        </div>
                                    </div>
                                    <div className="p-6 sm:p-8">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="w-2 h-2 rounded-full bg-primary-500" />
                                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{story.department}</span>
                                        </div>
                                        <h3 className="text-xl sm:text-2xl font-display font-bold text-neutral-900 mb-4">{story.title}</h3>
                                        <p className="text-neutral-600 leading-relaxed italic">"{story.content}"</p>
                                        <div className="mt-6 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-neutral-100 overflow-hidden">
                                                <img src={story.avatar} alt={story.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-neutral-900">{story.name}</p>
                                                <p className="text-[11px] text-neutral-500">{story.location}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <hr className="border-neutral-200 mb-24" />

                    {/* Section: All Reviews */}
                    <div id="all-reviews">
                        <SectionHeader
                            badge="Patient Reviews"
                            title="Voices of Gratitude"
                            subtitle="Our commitment to excellence reflected in the words of those we've had the privilege to serve."
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {SUCCESS_STORIES.map((story) => (
                                <SuccessStoryCard key={story.id} story={story} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-neutral-900 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-success-500/10 blur-[120px] rounded-full" />

                <div className="container-custom relative z-10 text-center">
                    <h2 className="font-display font-bold text-3xl md:text-5xl mb-6">Want to be our next success story?</h2>
                    <p className="text-neutral-400 text-lg mb-10 max-w-2xl mx-auto">
                        Whether you need medical care, education support, or vocational training, we are here to help you achieve your goals.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link href="/contact" className="btn-primary px-10 py-4 text-lg">
                            Contact Us Today
                        </Link>
                        <Link href="/donate" className="btn-secondary bg-white/10 hover:bg-white/20 border-white/20 px-10 py-4 text-lg">
                            Support Our Mission
                        </Link>
                    </div>
                </div>
            </section>
        </article>
    );
}
