'use client';

import { Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';
import CategoryRoleFlow from './CategoryRoleFlow';

export default function OnboardingPage() {
    return (
        <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-4 py-12 font-sans">
            <div className="max-w-xl w-full">

                {/* Logo Section */}
                <div className="text-center mb-8 text-blue-600">
                    <div className="inline-flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <ShieldCheck className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                            JobReel<span className="text-blue-600">Setup</span>
                        </h1>
                    </div>
                    <p className="mt-2 text-blue-600 font-black italic text-lg" dir="rtl">اپنا پروفائل مکمل کریں</p>
                    <p className="mt-1 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Completing your profile...</p>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-500/5 border border-slate-100 overflow-hidden p-8 md:p-12">
                    <Suspense fallback={<div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Setup...</div>}>
                        <CategoryRoleFlow />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
