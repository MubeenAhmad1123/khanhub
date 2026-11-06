// apps/web/src/components/media/MediaPageContent.tsx
import React from 'react';
import Link from 'next/link';
import { PageHero } from '@/components/ui';
import { PublicMediaListResult } from '@/lib/media/types';
import MediaClientView from './MediaClientView';

interface MediaPageContentProps {
  initialResult: PublicMediaListResult;
  currentDeptSlug?: string;
  departmentName?: string;
  totalPhotosOverall: number;
  totalVideosOverall?: number;
}

export default function MediaPageContent({
  initialResult,
  currentDeptSlug = 'all',
  departmentName,
  totalPhotosOverall,
  totalVideosOverall = 0
}: MediaPageContentProps) {
  const isSpecificDept = currentDeptSlug !== 'all';
  const heroBadge = isSpecificDept ? `${departmentName || currentDeptSlug} Gallery` : 'Media Gallery';
  const heroTitle = isSpecificDept ? `${departmentName} in Action` : 'Our Stories in Action';
  const heroSubtitle = isSpecificDept
    ? `Explore official photographs, events, and activities from the ${departmentName} at Khan Hub.`
    : 'Watch and explore real moments from our clinics, institutes, and welfare centers — told through the people we serve.';

  return (
    <article itemScope itemType="https://schema.org/MediaGallery" className="overflow-x-hidden">
      {/* Hero Section */}
      <PageHero
        type="split"
        badge={heroBadge}
        title={heroTitle}
        subtitle={heroSubtitle}
        image="/images/media-hero.webp"
        cta={
          <Link href="#gallery-view" className="btn-success">
            📸 Browse Gallery
          </Link>
        }
      >
        <Link href="/donate" className="btn-secondary">
          💝 Support Our Work
        </Link>
      </PageHero>

      {/* Main Content Section */}
      <section id="gallery-view" className="section bg-gradient-light py-10 sm:py-16">
        <MediaClientView
          initialResult={initialResult}
          currentDeptSlug={currentDeptSlug}
          departmentName={departmentName}
          totalPhotosOverall={totalPhotosOverall}
          totalVideosOverall={totalVideosOverall}
        />
      </section>

      {/* Success Stories CTA Section (Preserved brand section) */}
      <section className="py-16 sm:py-24 bg-primary-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-success-600/5 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2" />

        <div className="container-custom relative z-10">
          <div className="bg-white rounded-[2rem] p-8 sm:p-12 md:p-16 shadow-xl shadow-primary-500/5 border border-primary-100 flex flex-col md:grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="badge-primary mb-6">Patient Impact</span>
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-neutral-900 mb-6 leading-tight">
                Beyond Images: <br />
                <span className="text-primary-600">Stories of Hope</span>
              </h2>
              <p className="text-neutral-600 text-base sm:text-lg mb-8 leading-relaxed">
                Behind every photograph is a journey of healing and triumph. Read in-depth stories of people whose lives
                were transformed through Khan Hub's medical, educational, and welfare programs.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/success-stories" className="btn-primary">
                  Read Impact Stories
                </Link>
                <Link href="/donate" className="btn-secondary">
                  Join the Mission
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl relative">
                <img
                  src="/images/success-stories/story-hero.webp"
                  alt="Stories of Hope"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}

