// apps/web/src/app/media/page.tsx
import { Metadata } from 'next';
import { getPublicMediaPaginated, getTotalPublicPhotoCount, getTotalPublicVideoCount } from '@/lib/media/mediaQueries';
import MediaPageContent from '@/components/media/MediaPageContent';

export const metadata: Metadata = {
  title: 'Media Gallery — Khan Hub',
  description: 'Explore official photos, events, and activities across all healthcare, education, and welfare departments of Khan Hub.',
  openGraph: {
    title: 'Media Gallery — Khan Hub',
    description: 'Explore official photos, events, and activities across all healthcare, education, and welfare departments of Khan Hub.',
    images: [{ url: '/images/media-hero.webp', width: 1200, height: 630, alt: 'Khan Hub Media Gallery' }]
  }
};

export const revalidate = 3600; // 1 hour ISR

export default async function MediaPage() {
  const [initialResult, totalPhotosOverall, totalVideosOverall] = await Promise.all([
    getPublicMediaPaginated({ limit: 48 }),
    getTotalPublicPhotoCount(),
    getTotalPublicVideoCount()
  ]);

  return (
    <MediaPageContent
      initialResult={initialResult}
      currentDeptSlug="all"
      totalPhotosOverall={totalPhotosOverall}
      totalVideosOverall={totalVideosOverall}
    />
  );
}
