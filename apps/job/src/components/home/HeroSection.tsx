'use client';

import Link from 'next/link';
import { ArrowRight, Video } from 'lucide-react';
import VideoMosaic from './VideoMosaic';
import { cn } from '@/lib/utils';

export default function HeroSection() {
    const industries = [
        "Healthcare", "Technology", "Finance", "Education", "Engineering", "Retail",
        "Healthcare", "Technology", "Finance", "Education", "Engineering", "Retail"
    ];

    return (
        <header className="relative min-h-[90vh] lg:min-h-screen flex items-center pt-24 lg:pt-20 pb-16 overflow-hidden bg-[#0A0F1E]">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] -z-0 translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[100px] -z-0 -translate-x-1/2 translate-y-1/2" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                    {/* Left Side: Text & CTA */}
                    <div className="text-center lg:text-left animate-in slide-in-from-left duration-1000">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6 lg:mb-8">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            🎬 THE FUTURE OF RECRUITMENT
                        </div>

                        <h1 className="text-4xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-[1.1] lg:leading-[0.95] tracking-tighter italic">
                            Get Hired or<br />
                            Hire Someone<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-blue-400 to-teal-400">
                                With Just a Video
                            </span>
                        </h1>

                        <p className="max-w-lg mx-auto lg:mx-0 text-base md:text-xl text-slate-400 mb-8 lg:mb-10 leading-relaxed font-medium">
                            No CV. No Cold Emails. Just a 60-second video.<br />
                            <span className="text-slate-500 font-bold block mt-2">Register free. Upload your video for PKR 1,000. Pay to connect when you find the right match.</span>
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-3 lg:gap-4 mb-6">
                            <Link
                                href="/auth/register"
                                className="group w-full md:w-auto px-10 py-5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-500/20 active:scale-95 min-h-[56px]"
                            >
                                <ArrowRight className="w-5 h-5 text-white animate-pulse" />
                                Register Free — It's Quick
                            </Link>

                            <Link
                                href="/browse"
                                className="w-full md:w-auto px-10 py-5 bg-transparent border-2 border-slate-700 hover:border-slate-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center hover:bg-white/5 active:scale-95 min-h-[56px]"
                            >
                                Browse Videos
                            </Link>
                        </div>

                        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 lg:gap-4 items-center lg:items-start mb-10 text-[10px] lg:text-[11px] font-bold">
                            <div className="flex items-center gap-1.5 text-slate-500">
                                <span className="text-orange-500 text-base">✓</span> Registration is free
                            </div>
                            <div className="hidden lg:block text-slate-700 opacity-30">|</div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                                <span className="text-orange-500 text-base">✓</span> Video upload for PKR 1,000
                            </div>
                            <div className="hidden lg:block text-slate-700 opacity-30">|</div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                                <span className="text-orange-500 text-base">✓</span> PKR 1,000 to connect
                            </div>
                        </div>

                        {/* Trust Pill */}
                        <div className="inline-flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0A0F1E] bg-slate-800" />
                                ))}
                            </div>
                            <span className="text-[10px] lg:text-xs font-bold text-slate-300">Trusted by 500+ active users this week</span>
                        </div>
                    </div>

                    {/* Right Side: Video Mosaic (Hidden on very small screens) */}
                    <div className="hidden xs:block lg:block relative">
                        <VideoMosaic />
                    </div>
                </div>
            </div>

            {/* Bottom: Animated Scrolling Ticker */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#0F172A] border-t border-white/5 py-3 lg:py-4 overflow-hidden select-none whitespace-nowrap">
                <div className="inline-block animate-scroll">
                    {industries.map((industry, idx) => (
                        <span key={idx} className="inline-flex items-center mx-6 lg:mx-10 text-[9px] lg:text-[11px] font-black text-[#CBD5E1] uppercase tracking-[0.3em]">
                            {industry} <span className="ml-6 lg:ml-10 text-[#F97316] opacity-100">·</span>
                        </span>
                    ))}
                </div>
                {/* Duplicate for seamless loop */}
                <div className="inline-block animate-scroll" aria-hidden="true">
                    {industries.map((industry, idx) => (
                        <span key={`dup-${idx}`} className="inline-flex items-center mx-6 lg:mx-10 text-[9px] lg:text-[11px] font-black text-[#CBD5E1] uppercase tracking-[0.3em]">
                            {industry} <span className="ml-6 lg:ml-10 text-[#F97316] opacity-100">·</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Global Animation Styles */}
            <style jsx global>{`
                @keyframes scroll {
                    from { transform: translateX(0); }
                    to { transform: translateX(-100%); }
                }
                .animate-scroll {
                    animation: scroll 30s linear infinite;
                }
            `}</style>
        </header>
    );
}
