'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { CategorySelection } from '@/components/CategorySelection';
import { INDUSTRIES } from '@/lib/constants/categories';

export default function CategoriesPage() {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleCategory = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const handleNext = () => {
        // In a real app, we'd save these to the user's profile
        // For now, let's just navigate to the feed
        router.push('/feed');
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-12 px-4 font-sans">
            <div className="max-w-6xl w-full">

                {/* Header Section */}
                <div className="text-center mb-12 animate-in fade-in slide-in-from-top-10 duration-700">
                    <div className="inline-flex items-center gap-2 mb-4 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Personalize Experience</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic mb-4">
                        Choose your <span className="text-blue-600">interests</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Select categories to customize your feed</p>
                </div>

                {/* Category Grid */}
                <div className="animate-in fade-in zoom-in-95 duration-700 delay-200">
                    <CategorySelection
                        categories={INDUSTRIES}
                        selectedIds={selectedIds}
                        onToggle={toggleCategory}
                    />
                </div>

                {/* Footer / Action Section */}
                <div className="mt-12 flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
                    <button
                        onClick={handleNext}
                        disabled={selectedIds.length === 0}
                        className="group relative flex items-center justify-center gap-4 bg-white hover:bg-slate-50 border-2 border-slate-900 px-12 py-5 rounded-full shadow-2xl transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                        <span className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
                            Next
                        </span>
                        <ArrowRight className="w-6 h-6 text-slate-900 transition-transform group-hover:translate-x-2" />
                    </button>

                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold uppercase text-[10px] tracking-widest"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Go Back
                    </button>
                </div>

            </div>
        </div>
    );
}
