import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDepartmentBySlug, getDepartmentTheme } from '@/data/departments';
import JobCenterPublicDirectory from '@/components/departments/JobCenterPublicDirectory';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const department = getDepartmentBySlug(slug);

  if (!department) {
    return { title: 'Not Found' };
  }

  return {
    title: `Directory - ${department.name}`,
    description: `Browse public directory for ${department.name}`,
  };
}

export default async function DirectoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const department = getDepartmentBySlug(slug);

  // Currently we only have directory for job-placement, but we could extend to others.
  if (!department || department.slug !== 'job-placement') {
    notFound();
  }

  const theme = getDepartmentTheme(department.slug);

  return (
    <main className="min-h-screen bg-neutral-50 pb-20">
      {/* HEADER */}
      <section
        className="relative py-12 sm:py-16 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
        }}
      >
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <Link
            href={`/departments/${department.slug}`}
            className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium mb-6 transition-colors group bg-black/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 hover:bg-black/20"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to {department.shortName}
          </Link>

          <h1 className="text-3xl sm:text-5xl font-bold mb-4 font-display leading-tight drop-shadow-md">
            Full Directory
          </h1>
          <p className="text-lg sm:text-xl opacity-90 max-w-2xl mx-auto">
            Browse our complete database of verified job seekers and partner employers.
          </p>
        </div>
      </section>

      {/* DIRECTORY CONTENT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 bg-white rounded-t-3xl sm:rounded-3xl shadow-xl min-h-[500px]">
        <JobCenterPublicDirectory theme={theme} previewMode={false} />
      </section>
    </main>
  );
}
