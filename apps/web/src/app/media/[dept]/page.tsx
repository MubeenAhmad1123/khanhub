// apps/web/src/app/media/[dept]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEPARTMENTS } from '@/data/departments';
import { getPublicMediaPaginated, getTotalPublicPhotoCount } from '@/lib/media/mediaQueries';
import MediaPageContent from '@/components/media/MediaPageContent';

export const dynamicParams = false; // Strictly return 404 for unknown department slugs
export const revalidate = 3600;      // 1 hour ISR

export async function generateStaticParams() {
  const params = [
    { dept: 'general' },
    ...DEPARTMENTS.map((dept) => ({ dept: dept.slug }))
  ];
  return params;
}

export async function generateMetadata({
  params
}: {
  params: { dept: string };
}): Promise<Metadata> {
  const slug = params.dept;

  if (slug === 'general') {
    return {
      title: 'Media | Khan Hub (General)',
      description: 'Official photo gallery and media updates from Khan Hub central operations.'
    };
  }

  const dept = DEPARTMENTS.find((d) => d.slug === slug);
  if (!dept) {
    return {
      title: 'Media Gallery — Khan Hub'
    };
  }

  return {
    title: `Media | ${dept.name} — Khan Hub`,
    description: `Official photo gallery, events, and media highlights from ${dept.name} at Khan Hub.`,
    openGraph: {
      title: `Media | ${dept.name} — Khan Hub`,
      description: `Official photo gallery, events, and media highlights from ${dept.name} at Khan Hub.`,
      images: [{ url: '/images/media-hero.webp', width: 1200, height: 630, alt: `${dept.name} Media Gallery` }]
    }
  };
}

export default async function DepartmentMediaPage({
  params
}: {
  params: { dept: string };
}) {
  const slug = params.dept;
  const isGeneral = slug === 'general';
  const foundDept = DEPARTMENTS.find((d) => d.slug === slug);

  if (!isGeneral && !foundDept) {
    notFound();
  }

  const departmentName = isGeneral ? 'Khan Hub (General)' : foundDept!.name;

  const [initialResult, totalPhotosOverall] = await Promise.all([
    getPublicMediaPaginated({ departmentSlug: slug, limit: 24 }),
    getTotalPublicPhotoCount()
  ]);

  return (
    <MediaPageContent
      initialResult={initialResult}
      currentDeptSlug={slug}
      departmentName={departmentName}
      totalPhotosOverall={totalPhotosOverall}
    />
  );
}
