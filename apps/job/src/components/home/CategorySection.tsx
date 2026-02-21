'use client';

import { INDUSTRY_CATEGORIES } from '@/lib/data/categories';
import { LayoutGrid, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CategorySection() {
    return (
        <section className="py-12 lg:py-24 bg-[#F8FAFF]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 lg:mb-16 gap-6">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">
                            <LayoutGrid className="w-4 h-4" />
                            Industries
                        </div>
                        <h2 className="text-3xl lg:text-5xl font-black text-slate-900 mb-4 tracking-tighter italic uppercase">
                            Browse by <span className="text-blue-600">Category</span>
                        </h2>
                        <p className="text-slate-500 font-bold text-sm lg:text-lg">
                            Find your niche and start browsing videos from thousands of verified profiles.
                        </p>
                    </div>

                    <Link
                        href="/browse"
                        className="group inline-flex items-center gap-2 text-blue-600 font-black text-sm uppercase tracking-widest hover:gap-3 transition-all"
                    >
                        View All Categories
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-6">
                    {INDUSTRY_CATEGORIES.map((cat) => (
                        <Link
                            key={cat.id}
                            href={`/browse?industry=${encodeURIComponent(cat.label)}`}
                            className="bg-white p-4 lg:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 group flex flex-col items-center text-center"
                        >
                            <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 lg:mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                <span className="text-2xl lg:text-3xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                            </div>
                            <h3 className="text-[10px] lg:text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-tight">
                                {cat.label}
                            </h3>
                            <p className="hidden lg:block text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                                {cat.subcategories.length} niches
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
