// src/app/success-stories/page.tsx
// ─────────────────────────────────────────────────────────────────
// SUCCESS STORIES PAGE - Full gallery of patient reviews & results
// ─────────────────────────────────────────────────────────────────

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PageHero, SectionHeader } from '@/components/ui';
import { SuccessStoryCard } from '@/components/ui/SuccessStoryCard';
import { SUCCESS_STORIES } from '@/data/success-stories';
import { getDepartmentBySlug } from '@/data/departments';
import { SuccessStoriesClient } from './SuccessStoriesClient';

export default async function SuccessStoriesPage({
    searchParams
}: {
    searchParams: Promise<{ dept?: string }>
}) {
    const { dept: deptSlug } = await searchParams;
    const activeDept = deptSlug ? getDepartmentBySlug(deptSlug) : null;

    // Filter stories based on department if slug is provided
    const filteredStories = activeDept
        ? SUCCESS_STORIES.filter(s => s.departmentSlug === deptSlug)
        : SUCCESS_STORIES;

    return (
        <article className="overflow-x-hidden">
            {/* Hero Section */}
            <PageHero
                type="split"
                badge={activeDept ? `Success Stories: ${activeDept.name}` : "Success Stories"}
                title={activeDept ? `Impact in ${activeDept.name}` : "Impact We Create Together"}
                subtitle={activeDept
                    ? `Read about the lives transformed through our ${activeDept.name} services and programs.`
                    : "Read real-life transformations from our patients and students who have benefited from Khan Hub's diverse services."}
                image={activeDept?.image || "/success-stories.webp"}
                cta={
                    <Link href="#all-reviews" className="btn-primary">
                        📖 Read Stories
                    </Link>
                }
            >
                {activeDept ? (
                    <Link href="/success-stories" className="btn-secondary">
                        ✨ View All Categories
                    </Link>
                ) : (
                    <Link href="/contact" className="btn-secondary">
                        🤝 Share Your Story
                    </Link>
                )}
            </PageHero>

            {/* Main Content */}
            <section className="section bg-gradient-light">
                <div className="section-inner">
                    <SuccessStoriesClient
                        stories={filteredStories}
                        activeDeptName={activeDept?.name}
                    />
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
