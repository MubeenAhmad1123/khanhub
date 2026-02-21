'use client';

import Link from 'next/link';
import { ArrowRight, Video, CheckCircle2 } from 'lucide-react';

export default function FinalCTA() {
    return (
        <section className="py-12 lg:py-24 bg-[#0A0F1E] relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -z-0 translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[100px] -z-0 -translate-x-1/2 translate-y-1/2" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                        🚀 READY TO START?
                    </div>

                    <h2 className="text-3xl lg:text-6xl font-black text-white mb-6 lg:mb-8 tracking-tighter italic uppercase leading-none">
                        Your Future Is <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400 underline decoration-white/10 underline-offset-[12px]">
                            Just 60 Seconds Away
                        </span>
                    </h2>

                    <p className="text-slate-400 font-bold text-sm lg:text-xl mb-10 lg:mb-12 max-w-2xl mx-auto leading-relaxed">
                        Join hundreds of professionals who are getting hired 10x faster using our video-first platform.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 lg:gap-4 mb-10 lg:mb-12">
                        <Link
                            href="/auth/register"
                            className="w-full sm:w-auto px-10 py-5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-500/20 active:scale-95 min-h-[56px]"
                        >
                            Create Free Account
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            href="/browse"
                            className="w-full sm:w-auto px-10 py-5 bg-white/5 border-2 border-slate-700 hover:border-slate-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 hover:bg-white/10 active:scale-95 min-h-[56px]"
                        >
                            <Video className="w-5 h-5" />
                            Watch Videos
                        </Link>
                    </div>

                    {/* Pricing Breakdown Box */}
                    <div className="inline-flex flex-col lg:flex-row items-center gap-3 lg:gap-6 px-6 lg:px-10 py-4 lg:py-6 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-blue-500" />
                            <span className="text-[10px] lg:text-sm font-black text-white uppercase tracking-widest">
                                PKR 1,000 to upload
                            </span>
                        </div>
                        <div className="hidden lg:block w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-blue-500" />
                            <span className="text-[10px] lg:text-sm font-black text-white uppercase tracking-widest">
                                PKR 1,000 to connect
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
