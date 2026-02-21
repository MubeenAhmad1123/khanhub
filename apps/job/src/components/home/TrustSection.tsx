'use client';

import { ShieldCheck, Zap, Users, Trophy } from 'lucide-react';

export default function TrustSection() {
    const pillars = [
        {
            title: "Verified Only",
            desc: "Every video is pre-screened to ensure quality and authenticity.",
            icon: ShieldCheck,
            color: "text-blue-600",
            bgColor: "bg-blue-50"
        },
        {
            title: "Fast Results",
            desc: "Skip the 2-week application wait. Connect in 60 seconds.",
            icon: Zap,
            color: "text-orange-600",
            bgColor: "bg-orange-50"
        },
        {
            title: "Smart Matching",
            desc: "AI helps surface the most relevant talent for your needs.",
            icon: Users,
            color: "text-teal-600",
            bgColor: "bg-teal-50"
        },
        {
            title: "Top 1% Talent",
            desc: "Showcase yourself and stand out from thousands of dry CVs.",
            icon: Trophy,
            color: "text-purple-600",
            bgColor: "bg-purple-50"
        }
    ];

    return (
        <section className="py-12 lg:py-24 bg-white border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                    {pillars.map((pillar, idx) => (
                        <div key={idx} className="flex flex-col items-center text-center group">
                            <div className={`w-12 h-12 lg:w-16 lg:h-16 ${pillar.bgColor} rounded-2xl flex items-center justify-center mb-4 lg:mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                                <pillar.icon className={`w-6 h-6 lg:w-8 lg:h-8 ${pillar.color}`} />
                            </div>
                            <h4 className="text-base lg:text-xl font-black text-slate-900 mb-2 lg:mb-3 uppercase tracking-tight italic">
                                {pillar.title}
                            </h4>
                            <p className="text-[11px] lg:text-sm text-slate-500 font-bold leading-relaxed max-w-[160px] lg:max-w-none">
                                {pillar.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
