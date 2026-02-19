import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDepartmentBySlug, getDepartmentTheme, DEPARTMENTS, getDepartmentHeroImage } from '@/data/departments';
import DepartmentPageContent from './DepartmentPageContent';

// ── TYPE DEFINITIONS ──
type Params = Promise<{ slug: string }>;

// ── METADATA GENERATION FOR SEO ──
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const department = getDepartmentBySlug(slug);

  if (!department) {
    return {
      title: 'Department Not Found - Khan Hub',
      description: 'The requested department could not be found.'
    };
  }

  return {
    title: `${department.name} - Khan Hub | ${department.tagline}`,
    description: department.description,
    keywords: [
      department.name,
      department.shortName,
      department.category,
      ...(department.programs?.map(p => typeof p === 'string' ? p : p.name) || []),
      'Pakistan',
      'Khan Hub',
      'Government Services'
    ].join(', '),
    openGraph: {
      title: department.name,
      description: department.tagline,
      images: department.image ? [{ url: department.image, width: 1200, height: 630, alt: department.name }] : [],
      type: 'website',
      siteName: 'Khan Hub'
    }
  };
}

// ── STATIC PARAMS FOR ISR ──
export async function generateStaticParams() {
  return DEPARTMENTS.map((dept) => ({
    slug: dept.slug
  }));
}

// ── REVALIDATION (ISR) ──
export const revalidate = 3600;

// ── MAIN PAGE COMPONENT ──
export default async function DepartmentPage({ params }: { params: Params }) {
  const { slug } = await params;
  const department = getDepartmentBySlug(slug);

  if (!department) {
    notFound();
  }

  const theme = getDepartmentTheme(department.slug);
  const heroImage = getDepartmentHeroImage(department.image || '');

  return (
    <DepartmentPageContent
      department={department}
      theme={theme}
      heroImage={heroImage}
    />
  );
}
