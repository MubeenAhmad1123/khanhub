'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    ArrowLeft, Phone, Mail, MapPin, Check,
    Calendar, Users, Award, X, ZoomIn
} from 'lucide-react';
import { Department, DepartmentTheme } from '@/types/department';
import InquiryForm from '@/components/forms/InquiryForm';
import { cn } from '@/lib/utils';

interface Props {
    department: Department;
    theme: DepartmentTheme;
    heroImage: string;
}

export default function DepartmentPageContent({ department, theme, heroImage }: Props) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Helper to open lightbox
    const openLightbox = (e: React.MouseEvent, url: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedImage(url);
    };

    return (
        <main className="min-h-screen bg-neutral-50">
            {/* ── HERO SECTION ── */}
            <section
                className="relative overflow-hidden"
                style={{
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
                }}
            >
                <div className="absolute inset-0 opacity-10">
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        }}
                    />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
                    <Link
                        href="/departments"
                        className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium mb-8 transition-colors group focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg px-3 py-2 -ml-3 bg-black/10 backdrop-blur-sm"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to All Departments
                    </Link>

                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                        <div className="text-white max-w-2xl">
                            <span className="text-4xl sm:text-5xl mb-4 block animate-bounce-slow">{department.icon}</span>
                            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 font-display leading-tight drop-shadow-lg">
                                {department.name}
                            </h1>
                            <p className="text-lg sm:text-xl opacity-95 leading-relaxed drop-shadow-md mb-8">
                                {department.tagline}
                            </p>

                            {department.stats && department.stats.length > 0 && (
                                <div className="flex flex-wrap gap-4 mb-8">
                                    {department.stats.map((stat, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 hover:bg-white/15 transition-colors"
                                        >
                                            <div className="text-2xl font-bold font-display leading-none">{stat.value}</div>
                                            <div className="text-[10px] mt-1 opacity-80 uppercase tracking-widest font-bold">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-4">
                                <a
                                    href={`tel:${department.contactPhone}`}
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-neutral-900 rounded-2xl font-bold hover:bg-neutral-50 transition-all shadow-xl hover:shadow-2xl active:scale-95 group"
                                >
                                    <Phone className="w-5 h-5 transition-transform group-hover:rotate-12" />
                                    Contact Now
                                </a>
                                <a
                                    href="#inquiry-form"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-2xl font-bold hover:bg-white/20 transition-all active:scale-95"
                                >
                                    <Mail className="w-5 h-5" />
                                    Send Inquiry
                                </a>
                            </div>
                        </div>

                        <div
                            className="relative aspect-square w-full max-w-[450px] lg:max-w-none mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 group"
                        >
                            <Image
                                src={heroImage}
                                alt={`${department.name} — Khan Hub`}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                priority
                                sizes="(max-width: 1024px) 100vw, 600px"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── MAIN CONTENT ── */}
            <section className="py-12 sm:py-16 lg:py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
                        <div className="lg:col-span-2 space-y-12">
                            {/* About Section */}
                            <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 sm:p-8 shadow-sm">
                                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-4 font-display flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md"
                                        style={{ backgroundColor: theme.light }}
                                    >
                                        <span style={{ color: theme.primary }}>{department.icon}</span>
                                    </div>
                                    About {department.shortName}
                                </h2>
                                <p className="text-neutral-700 leading-relaxed text-base sm:text-lg">
                                    {department.description}
                                </p>
                                {department.features && (
                                    <div className="mt-8 grid sm:grid-cols-2 gap-4">
                                        {department.features.map((feature, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                                                <span className="font-medium text-neutral-800">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Programs / Courses Section */}
                            {department.subDepartments ? (
                                <div className="space-y-8">
                                    <h2 className="text-3xl font-bold text-neutral-900 font-display border-l-4 pl-4" style={{ borderColor: theme.primary }}>
                                        Our Departments & Courses
                                    </h2>

                                    {department.subDepartments.map((subDept, idx) => (
                                        <div key={idx} className="bg-white rounded-2xl border-2 border-neutral-100 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                                            <div
                                                className="p-4 sm:p-6 text-white"
                                                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                                            >
                                                <h3 className="text-xl sm:text-2xl font-bold font-display">{subDept.title}</h3>
                                                {subDept.description && <p className="text-white/80 mt-1">{subDept.description}</p>}
                                            </div>

                                            <div className="p-4 sm:p-6 grid gap-4">
                                                {subDept.courses.map((course, cIdx) => (
                                                    <div key={cIdx} className="flex flex-col md:flex-row gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-200 hover:border-neutral-300 hover:bg-white hover:shadow-md transition-all group relative">
                                                        {course.image && (
                                                            <Link
                                                                href={course.slug ? `/departments/${department.slug}/${course.slug}` : '#'}
                                                                className="relative w-full md:w-48 aspect-square rounded-xl overflow-hidden shadow-md flex-shrink-0 shimmer border border-neutral-100 group/img block"
                                                            >
                                                                <Image
                                                                    src={course.image}
                                                                    alt={course.name}
                                                                    fill
                                                                    className="object-cover transition-transform duration-500 group-hover/img:scale-110"
                                                                    sizes="(max-width: 768px) 100vw, 192px"
                                                                />
                                                            </Link>
                                                        )}
                                                        <div className="flex-1 flex flex-col justify-between">
                                                            <div>
                                                                <Link
                                                                    href={course.slug ? `/departments/${department.slug}/${course.slug}` : '#'}
                                                                    className="group/course-link"
                                                                >
                                                                    <h4 className="font-bold text-lg text-neutral-900 group-hover/course-link:text-primary-600 transition-colors">
                                                                        {course.name}
                                                                    </h4>
                                                                </Link>
                                                                <div className="flex items-center gap-4 mt-2 text-sm text-neutral-600">
                                                                    <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-neutral-100">
                                                                        <Calendar className="w-4 h-4 text-primary-500" /> {course.duration}
                                                                    </span>
                                                                    {course.degree && (
                                                                        <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-neutral-100 font-medium">
                                                                            <Award className="w-4 h-4 text-amber-500" /> {course.degree}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="mt-4 pt-4 border-t border-dashed border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                                <div>
                                                                    <div className="text-[10px] font-bold uppercase text-neutral-400 mb-1.5 tracking-widest">Eligibility Criteria</div>
                                                                    <div className="inline-flex px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary-50 text-primary-700 border border-primary-100">
                                                                        {course.eligibility}
                                                                    </div>
                                                                </div>
                                                                {course.slug && (
                                                                    <Link
                                                                        href={`/departments/${department.slug}/${course.slug}`}
                                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 text-sm font-bold transition-all hover:shadow-md active:scale-95 hover:bg-neutral-50"
                                                                        style={{ borderColor: theme.primary, color: theme.primary }}
                                                                    >
                                                                        View Program
                                                                        <ArrowLeft className="w-4 h-4 rotate-180" />
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                department.programs && department.programs.length > 0 && (
                                    <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 sm:p-8 shadow-sm">
                                        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-6 font-display flex items-center gap-3">
                                            <div
                                                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                                                style={{ backgroundColor: theme.light }}
                                            >
                                                <Calendar className="w-6 h-6" style={{ color: theme.primary }} />
                                            </div>
                                            Programs & Services
                                        </h2>
                                        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                                            {department.programs.map((program, idx) => {
                                                const isObject = typeof program !== 'string';
                                                const programName = isObject ? program.name : program;
                                                const programDesc = isObject ? program.description : null;
                                                const programImg = isObject ? program.image : null;
                                                const programSlug = isObject ? program.slug : null;

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            "group relative flex flex-col h-full bg-white rounded-2xl border-2 border-neutral-100 overflow-hidden transition-all",
                                                            isObject && "hover:border-neutral-300 hover:shadow-xl"
                                                        )}
                                                    >
                                                        {programImg && (
                                                            <Link
                                                                href={isObject && programSlug ? `/departments/${department.slug}/${programSlug}` : '#'}
                                                                className="relative aspect-square w-full shimmer overflow-hidden group/img block"
                                                            >
                                                                <Image
                                                                    src={programImg}
                                                                    alt={programName}
                                                                    fill
                                                                    className="object-cover transition-transform duration-500 group-hover/img:scale-110"
                                                                    sizes="(max-width: 640px) 100vw, 400px"
                                                                />
                                                            </Link>
                                                        )}
                                                        <div className="p-5 flex-1 flex flex-col">
                                                            <Link
                                                                href={isObject && programSlug ? `/departments/${department.slug}/${programSlug}` : '#'}
                                                                className="flex items-start gap-3 mb-3 group/link"
                                                            >
                                                                <div
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover/link:scale-110"
                                                                    style={{ backgroundColor: theme.light }}
                                                                >
                                                                    <Check className="w-4 h-4" style={{ color: theme.primary }} />
                                                                </div>
                                                                <h3 className="font-bold text-neutral-900 leading-tight group-hover/link:text-primary-600 transition-colors">
                                                                    {programName}
                                                                </h3>
                                                            </Link>
                                                            {programDesc && (
                                                                <p className="text-sm text-neutral-600 line-clamp-2 mb-4">
                                                                    {programDesc}
                                                                </p>
                                                            )}
                                                            {isObject && (
                                                                <Link
                                                                    href={`/departments/${department.slug}/${programSlug}`}
                                                                    className="mt-auto flex items-center gap-2 text-sm font-bold group/btn"
                                                                    style={{ color: theme.primary }}
                                                                >
                                                                    Learn More
                                                                    <span className="transition-transform group-hover/btn:translate-x-1">→</span>
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            )}

                            {/* Campus Gallery */}
                            {department.gallery && department.gallery.length > 0 && (
                                <div className="space-y-6">
                                    <h2 className="text-3xl font-bold text-neutral-900 font-display border-l-4 pl-4" style={{ borderColor: theme.primary }}>
                                        Campus Gallery
                                    </h2>
                                    {department.gallery.map((section, idx) => (
                                        <div key={idx} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {section.images.map((img, iIdx) => (
                                                <div
                                                    key={iIdx}
                                                    className="relative aspect-square rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all group shimmer cursor-zoom-in border border-neutral-100"
                                                    onClick={(e) => openLightbox(e, img.url)}
                                                >
                                                    <Image
                                                        src={img.url}
                                                        alt={img.alt}
                                                        fill
                                                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <ZoomIn className="w-8 h-8 text-white" />
                                                    </div>
                                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                                        <p className="text-white text-[10px] text-center truncate font-medium">{img.alt}</p>
                                                    </div>
                                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                                                        <ZoomIn className="w-3 h-3 text-neutral-800" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Facilities */}
                            {department.facilities && department.facilities.length > 0 && (
                                <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 sm:p-8 shadow-sm">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-6 font-display flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                                            style={{ backgroundColor: theme.light }}
                                        >
                                            <MapPin className="w-6 h-6" style={{ color: theme.primary }} />
                                        </div>
                                        Our Facilities
                                    </h2>
                                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                                        {department.facilities.map((facility, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-start gap-3 p-4 rounded-xl border-2 border-neutral-100 hover:shadow-md transition-all"
                                            >
                                                <Award className="w-5 h-5 mt-0.5" style={{ color: theme.primary }} />
                                                <span className="text-neutral-800 font-medium">{facility}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <div className="lg:sticky lg:top-24 space-y-6">
                                <div
                                    className="rounded-2xl p-6 shadow-lg text-white"
                                    style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                                >
                                    <h3 className="text-xl sm:text-2xl font-bold mb-6 font-display">
                                        Contact Information
                                    </h3>
                                    <div className="space-y-4">
                                        <a
                                            href={`tel:${department.contactPhone}`}
                                            className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all group min-h-[56px]"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                                                <Phone className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-white/80 mb-0.5">Phone</div>
                                                <div className="font-semibold text-sm sm:text-base break-all">
                                                    {department.contactPhone}
                                                </div>
                                            </div>
                                        </a>

                                        <a
                                            href={`mailto:${department.contactEmail}`}
                                            className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all group min-h-[56px]"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-white/80 mb-0.5">Email</div>
                                                <div className="font-semibold text-sm break-all">
                                                    {department.contactEmail}
                                                </div>
                                            </div>
                                        </a>

                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-xs text-white/80 mb-0.5">Status</div>
                                                <div className="font-semibold flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                                    Admissions Open
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-neutral-900 mb-4 font-display">
                                        Quick Actions
                                    </h3>
                                    <div className="space-y-3">
                                        <a
                                            href="#inquiry-form"
                                            className="block w-full px-4 py-3 rounded-xl border-2 text-center font-semibold transition-all hover:shadow-md min-h-[48px] flex items-center justify-center"
                                            style={{ borderColor: theme.primary, color: theme.primary, background: theme.light }}
                                        >
                                            Apply Now
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── INQUIRY FORM ── */}
            <section id="inquiry-form" className="py-12 sm:py-16 bg-neutral-50 border-t border-neutral-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 sm:p-8 shadow-lg">
                        <div className="text-center mb-8">
                            <div
                                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-md"
                                style={{ backgroundColor: theme.light }}
                            >
                                <Mail className="w-8 h-8" style={{ color: theme.primary }} />
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-3 font-display">
                                Online Admission Inquiry
                            </h2>
                            <p className="text-neutral-600 text-base sm:text-lg">
                                Submit your details below for admission information in {department.name}.
                            </p>
                        </div>
                        <InquiryForm department={department.slug} />
                    </div>
                </div>
            </section>

            {/* ── LIGHTBOX MODAL ── */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300"
                    onClick={() => setSelectedImage(null)}
                >
                    {/* Close Button */}
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="fixed top-6 right-6 z-[110] w-12 h-12 flex items-center justify-center bg-white hover:bg-neutral-100 rounded-full shadow-2xl transition-all hover:scale-110 group"
                        aria-label="Close image"
                    >
                        <X className="w-6 h-6 text-neutral-800" />
                    </button>

                    {/* Image Container with Scroll */}
                    <div
                        className="relative max-w-6xl w-full max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-2 sm:p-4">
                            <Image
                                src={selectedImage}
                                alt="Fullscreen View"
                                width={1200}
                                height={1200}
                                className="w-full h-auto object-contain rounded-xl"
                                quality={100}
                                priority
                                unoptimized
                            />
                        </div>
                    </div>

                    {/* Hint Text */}
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-6 py-2 rounded-full shadow-lg border border-white/20">
                        <p className="text-xs text-neutral-700 font-semibold">Click outside or press X to close</p>
                    </div>
                </div>
            )}
        </main>
    );
}
