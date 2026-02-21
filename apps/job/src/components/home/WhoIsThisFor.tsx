'use client';

import Link from 'next/link';
import { UserCheck, Building, CheckCircle, ArrowRight } from 'lucide-react';

export default function WhoIsThisFor() {
    return (
        <section className="py-12 lg:py-24 bg-white relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">

                    {/* Job Seeker Side */}
                    <div className="bg-blue-600 rounded-[40px] p-8 lg:p-12 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-700" />

                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md">
                                <UserCheck className="w-8 h-8 text-white" />
                            </div>

                            <h3 className="text-3xl lg:text-4xl font-black mb-4 tracking-tighter italic uppercase underline decoration-white/20 underline-offset-8">
                                For Job Seekers
                            </h3>
                            <p className="text-blue-100 text-base lg:text-lg font-bold mb-8 lg:mb-10 max-w-md italic opacity-90 leading-tight lg:leading-normal">
                                Ditch the paper CV. Tell your story in 60 seconds and let employers find you.
                            </p>

                            <ul className="space-y-3 lg:space-y-4 mb-10 lg:mb-12">
                                {[
                                    "No more boring PDF applications",
                                    "Showcase your real personality",
                                    "Get direct responses faster",
                                    "One-time PKR 1,000 upload fee"
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-blue-300 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm lg:text-base font-bold text-blue-50">{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link href="/auth/register" className="inline-flex items-center justify-center gap-3 w-full lg:w-auto px-10 py-4 lg:py-5 bg-white text-blue-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all shadow-xl shadow-blue-900/20 active:scale-95 min-h-[48px]">
                                Start Recording
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>

                    {/* Employer Side */}
                    <div className="bg-[#0A0F1E] rounded-[40px] p-8 lg:p-12 text-white relative overflow-hidden group border border-white/5">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-700" />

                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md border border-white/10">
                                <Building className="w-8 h-8 text-blue-400" />
                            </div>

                            <h3 className="text-3xl lg:text-4xl font-black mb-4 tracking-tighter italic uppercase underline decoration-blue-500/20 underline-offset-8">
                                For Employers
                            </h3>
                            <p className="text-slate-400 text-base lg:text-lg font-bold mb-8 lg:mb-10 max-w-md italic leading-tight lg:leading-normal">
                                Stop reading; start watching. Screen candidates in seconds, not hours.
                            </p>

                            <ul className="space-y-3 lg:space-y-4 mb-10 lg:mb-12">
                                {[
                                    "Browse verified video intros",
                                    "Hire 10x faster with video screening",
                                    "Reduce wasted interview time",
                                    "Direct numbers available"
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm lg:text-base font-bold text-slate-300">{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link href="/auth/register" className="inline-flex items-center justify-center gap-3 w-full lg:w-auto px-10 py-4 lg:py-5 bg-[#1B4FD8] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 min-h-[48px]">
                                Find Candidates
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
