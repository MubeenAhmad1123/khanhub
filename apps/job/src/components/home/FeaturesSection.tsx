'use client';

import { UserPlus, Video, Zap, CheckCircle2 } from 'lucide-react';

export default function FeaturesSection() {
    const steps = [
        {
            title: "Create Video Profile",
            desc: "Register for free in minutes. Then upload or record a 60-second introduction video for a one-time PKR 1,000 fee. No CV required.",
            icon: UserPlus,
            color: "bg-blue-500",
            lightColor: "bg-blue-50",
            textColor: "text-blue-600"
        },
        {
            title: "Get Discovered",
            desc: "Your video is pre-screened by AI and approved by humans. Companies or individuals browse and find the right opportunity.",
            icon: Video,
            color: "bg-orange-500",
            lightColor: "bg-orange-50",
            textColor: "text-orange-600"
        },
        {
            title: "Unlock Contact",
            desc: "When a match is found, pay PKR 1,000 to unlock direct contact numbers. Hire fast or get hired instantly.",
            icon: Zap,
            color: "bg-teal-500",
            lightColor: "bg-teal-50",
            textColor: "text-teal-600"
        }
    ];

    return (
        <section id="how-it-works" className="py-12 lg:py-24 bg-[#F8FAFF] relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-20">
                    <h2 className="text-3xl lg:text-5xl font-black text-slate-900 mb-4 lg:mb-6 tracking-tight italic uppercase">
                        How It <span className="text-blue-600">Works</span>
                    </h2>
                    <p className="text-slate-500 font-bold text-sm lg:text-lg">
                        Simple steps to get discovered or find the right person.
                    </p>
                </div>

                <div className="relative">
                    {/* Desktop Horizontal Line */}
                    <div className="hidden lg:block absolute top-[45px] left-[10%] right-[10%] h-[2px] bg-slate-200 -z-0" />

                    {/* Mobile Vertical Line */}
                    <div className="lg:hidden absolute top-10 bottom-10 left-[41px] w-[2px] bg-slate-200 -z-0" />

                    <div className="grid lg:grid-cols-3 gap-10 lg:gap-16">
                        {steps.map((step, idx) => (
                            <div key={idx} className="relative flex lg:flex-col items-start lg:items-center text-left lg:text-center group">
                                {/* Step Number Circle */}
                                <div className="flex-shrink-0 w-[84px] h-[84px] lg:w-[90px] lg:h-[90px] rounded-3xl bg-white shadow-xl shadow-blue-500/5 border border-slate-100 flex items-center justify-center mb-0 lg:mb-8 relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 mr-6 lg:mr-0">
                                    <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full ${step.color} text-white text-xs font-black flex items-center justify-center shadow-lg border-4 border-white`}>
                                        {idx + 1}
                                    </div>
                                    <step.icon className={`w-8 h-8 lg:w-10 lg:h-10 ${step.textColor}`} />
                                </div>

                                <div className="flex-1 pt-2 lg:pt-0">
                                    <h3 className="text-xl lg:text-2xl font-black text-slate-900 mb-2 lg:mb-4 tracking-tight uppercase italic decoration-blue-500 decoration-2">
                                        {step.title}
                                    </h3>
                                    <p className="text-sm lg:text-base text-slate-500 leading-relaxed font-bold">
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Trust Line */}
                <div className="mt-16 lg:mt-24 pt-8 lg:pt-12 border-t border-slate-200 text-center">
                    <div className="inline-flex flex-col lg:flex-row items-center gap-4 lg:gap-8 px-8 py-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="text-[10px] lg:text-xs font-black text-slate-900 uppercase tracking-widest leading-none">AI Verified Profiles</span>
                        </div>
                        <div className="hidden lg:block w-px h-4 bg-slate-200" />
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="text-[10px] lg:text-xs font-black text-slate-900 uppercase tracking-widest leading-none">Secure Connections</span>
                        </div>
                        <div className="hidden lg:block w-px h-4 bg-slate-200" />
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="text-[10px] lg:text-xs font-black text-slate-900 uppercase tracking-widest leading-none">Direct Contact Reveal</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
