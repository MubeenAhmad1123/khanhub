// src/app/departments/[slug]/[programSlug]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getDepartmentBySlug, getDepartmentTheme, DEPARTMENTS } from '@/data/departments';
import { ArrowLeft, Check, Calendar, Phone, Mail } from 'lucide-react';

type Params = Promise<{ slug: string; programSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { slug, programSlug } = await params;
    const department = getDepartmentBySlug(slug);
    const program = typeof department?.programs !== 'string' && Array.isArray(department?.programs)
        ? department.programs.find(p => typeof p !== 'string' && p.slug === programSlug)
        : null;

    if (!department || !program || typeof program === 'string') {
        return { title: 'Program Not Found' };
    }

    return {
        title: `${program.name} - ${department.name} | Khan Hub`,
        description: program.description,
    };
}

export default async function ProgramDetailPage({ params }: { params: Params }) {
    const { slug, programSlug } = await params;
    const department = getDepartmentBySlug(slug);

    const program = department && Array.isArray(department.programs)
        ? department.programs.find(p => typeof p !== 'string' && p.slug === programSlug)
        : null;

    if (!department || !program || typeof program === 'string') {
        notFound();
    }

    const theme = getDepartmentTheme(department.slug);

    return (
        <main className="min-h-screen bg-neutral-50">
            {/* ── HERO SECTION ── */}
            <section
                className="relative overflow-hidden"
                style={{
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
                }}
            >
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
                    <Link
                        href={`/departments/${slug}`}
                        className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium mb-8 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to {department.name}
                    </Link>

                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="text-white">
                            <h1 className="font-display font-bold text-4xl lg:text-5xl mb-6 leading-tight">
                                {program.name}
                            </h1>
                            <p className="text-xl text-white/90 mb-8 leading-relaxed">
                                {program.description}
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <a
                                    href="#enrollment"
                                    className="px-8 py-4 bg-white text-neutral-900 rounded-xl font-bold hover:bg-neutral-100 transition-all shadow-lg"
                                >
                                    Enroll Now
                                </a>
                                <Link
                                    href="/contact"
                                    className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-bold hover:bg-white/20 transition-all"
                                >
                                    Ask a Question
                                </Link>
                            </div>
                        </div>

                        {program.image && (
                            <div className="relative h-64 lg:h-96 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                                <Image
                                    src={program.image}
                                    alt={program.name}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── CONTENT SECTION ── */}
            <section className="py-16 lg:py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-12">
                            {/* Features */}
                            {program.features && (
                                <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm">
                                    <h2 className="text-2xl font-bold text-neutral-900 mb-8 font-display">
                                        Key Features of {program.name}
                                    </h2>
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        {program.features.map((feature, idx) => (
                                            <div key={idx} className="flex items-start gap-4">
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                    style={{ backgroundColor: theme.light }}
                                                >
                                                    <Check className="w-5 h-5 text-white" style={{ color: theme.primary }} />
                                                </div>
                                                <span className="text-lg text-neutral-700 font-medium">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Details / FAQs or additional info */}
                            <div className="prose prose-lg max-w-none text-neutral-700">
                                <h2 className="text-3xl font-bold text-neutral-900 font-display">Program Overview</h2>
                                <p>
                                    The {program.name} program at {department.name} is designed to provide comprehensive
                                    knowledge and practical skills essential for success in this field. Our curriculum
                                    is regularly updated to align with the latest industry standards and educational
                                    requirements in Pakistan.
                                </p>
                                <p>
                                    Students enrolled in this program benefit from experienced faculty, modern facilities,
                                    and a supportive learning environment focused on individual growth and excellence.
                                </p>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-8">
                            {program.details && (
                                <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm">
                                    <h3 className="text-xl font-bold text-neutral-900 mb-6 font-display">
                                        Quick Details
                                    </h3>
                                    <div className="space-y-4">
                                        {program.details.map((detail, idx) => (
                                            <div key={idx} className="flex justify-between items-center py-3 border-b border-neutral-100 last:border-0">
                                                <span className="text-neutral-500 font-medium">{detail.label}</span>
                                                <span className="text-neutral-900 font-bold">{detail.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div
                                className="rounded-3xl p-8 text-white"
                                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                            >
                                <h3 className="text-xl font-bold mb-6 font-display outline-none">
                                    Need More Info?
                                </h3>
                                <div className="space-y-4">
                                    <a href={`tel:${department.contactPhone}`} className="flex items-center gap-3 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all">
                                        <Phone className="w-5 h-5" />
                                        <span className="font-bold">{department.contactPhone}</span>
                                    </a>
                                    <a href={`mailto:${department.contactEmail}`} className="flex items-center gap-3 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all">
                                        <Mail className="w-5 h-5" />
                                        <span className="font-bold">Email Us</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
