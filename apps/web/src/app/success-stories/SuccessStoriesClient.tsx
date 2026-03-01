'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SectionHeader } from '@/components/ui';
import { SuccessStoryCard } from '@/components/ui/SuccessStoryCard';
import { SuccessStory } from '@/data/success-stories';
import { X } from 'lucide-react';

interface SuccessStoriesClientProps {
    stories: SuccessStory[];
    activeDeptName?: string;
}

export const SuccessStoriesClient: React.FC<SuccessStoriesClientProps> = ({ stories, activeDeptName }) => {
    const transformationStories = stories.filter(s => s.imageBefore);

    return (
        <>
            {/* Section: Transformation Gallery (Before & After Highlight) */}
            {transformationStories.length > 0 && (
                <div className="mb-24">
                    <SectionHeader
                        badge="Visual Results"
                        title={activeDeptName ? `${activeDeptName} Results` : "Transformations that Matter"}
                        subtitle={activeDeptName
                            ? `Seeing the real-world results of our work in the ${activeDeptName} department.`
                            : "A glimpse into the life-changing results achieved through our specialized surgical and rehabilitation services."}
                        align="left"
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {transformationStories.map((story) => (
                            <div key={story.id} className="group bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500">
                                <div className="grid grid-cols-2 gap-px bg-neutral-200">
                                    <div className="relative aspect-[4/5] overflow-hidden">
                                        <Image
                                            src={story.imageBefore || ''}
                                            alt="Before transformation"
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 1024px) 50vw, 400px"
                                        />
                                        <div className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-black/60 text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">Before</div>
                                    </div>
                                    <div className="relative aspect-[4/5] overflow-hidden">
                                        <Image
                                            src={story.imageAfter || ''}
                                            alt="After transformation"
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 1024px) 50vw, 400px"
                                        />
                                        <div className="absolute top-4 right-4 px-3 py-1 rounded-lg bg-primary-600 text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">After</div>
                                    </div>
                                </div>
                                <div className="p-6 sm:p-8">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="w-2 h-2 rounded-full bg-primary-500" />
                                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{story.department}</span>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-display font-bold text-neutral-900 mb-4">{story.title}</h3>
                                    <p className="text-neutral-700 leading-relaxed italic">"{story.content}"</p>
                                    <div className="mt-6 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-neutral-100 overflow-hidden relative border border-neutral-100">
                                            <Image
                                                src={story.avatar || '/placeholder-avatar.webp'}
                                                alt={story.name}
                                                fill
                                                className="object-cover"
                                                sizes="40px"
                                            />
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
            )}

            {activeDeptName && transformationStories.length > 0 && <hr className="border-neutral-200 mb-24" />}

            {/* Section: All Reviews */}
            <div id="all-reviews">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <SectionHeader
                        badge={activeDeptName ? activeDeptName : "Patient Reviews"}
                        title={activeDeptName ? `Testimonials: ${activeDeptName}` : "Voices of Gratitude"}
                        subtitle={activeDeptName
                            ? `Hear directly from the people served by our ${activeDeptName} department.`
                            : "Our commitment to excellence reflected in the words of those we've had the privilege to serve."}
                        align="left"
                        className="mb-0"
                    />
                    {activeDeptName && (
                        <Link
                            href="/success-stories"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-sm font-bold transition-all"
                        >
                            <X className="w-4 h-4" />
                            Clear Filter
                        </Link>
                    )}
                </div>

                {stories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {stories.map((story) => (
                            <SuccessStoryCard key={story.id} story={story} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-neutral-200">
                        <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Image src="/images/no-results.webp" alt="No results" width={48} height={48} className="opacity-20 grayscale" />
                        </div>
                        <h3 className="text-2xl font-bold text-neutral-900 mb-2">No stories found yet</h3>
                        <p className="text-neutral-500 mb-8 max-w-sm mx-auto">
                            We haven't added any success stories for this department yet. Please check back soon!
                        </p>
                        <Link href="/success-stories" className="btn-primary px-8">
                            View All Departments
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
};
