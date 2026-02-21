'use client';

import { Play, User, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VideoMosaic() {
    const placeholders = [
        { role: 'Job Seeker', industry: 'Tech', rotate: 'rotate-2', delay: '0ms' },
        { role: 'Employer', industry: 'Healthcare', rotate: '-rotate-2', delay: '200ms' },
        { role: 'Job Seeker', industry: 'Finance', rotate: '-rotate-1', delay: '400ms' },
        { role: 'Employer', industry: 'Education', rotate: 'rotate-3', delay: '600ms' },
        { role: 'Job Seeker', industry: 'Retail', rotate: 'rotate-1', delay: '800ms' },
        { role: 'Employer', industry: 'Engineering', rotate: '-rotate-3', delay: '1000ms' },
    ];

    return (
        <div className="relative h-[500px] w-full max-w-2xl mx-auto flex items-center justify-center">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[80px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-orange-500/10 rounded-full blur-[60px]" />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 relative z-10">
                {placeholders.map((item, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "relative aspect-[3/4] w-32 md:w-36 rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-700 animate-in fade-in zoom-in group",
                            item.rotate
                        )}
                        style={{ animationDelay: item.delay }}
                    >
                        {/* Blurred Placeholder Image */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-white/5 backdrop-blur-[20px]" />

                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                    {item.role === 'Job Seeker' ? (
                                        <User className="w-5 h-5 text-blue-400/50" />
                                    ) : (
                                        <Building2 className="w-5 h-5 text-orange-400/50" />
                                    )}
                                </div>
                            </div>

                            {/* Play Button Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-sm">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30 scale-90 group-hover:scale-100 transition-transform duration-500">
                                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                </div>
                            </div>

                            {/* Animated Pulse on one card */}
                            {idx === 0 && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
                                </div>
                            )}
                        </div>

                        {/* Badges */}
                        <div className="absolute top-2 left-2 right-2 flex flex-col gap-1 z-20">
                            <span className={cn(
                                "self-start px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10",
                                item.role === 'Job Seeker' ? "bg-blue-600/80 text-white" : "bg-orange-600/80 text-white"
                            )}>
                                {item.role}
                            </span>
                            <span className="self-start px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest bg-white/10 text-slate-300 backdrop-blur-md border border-white/5">
                                {item.industry}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Decorative Floating Elements */}
            <div className="absolute -top-10 -right-4 w-12 h-12 bg-blue-500/20 rounded-full blur-xl animate-bounce duration-1000" />
            <div className="absolute -bottom-6 -left-8 w-16 h-16 bg-orange-500/20 rounded-full blur-xl animate-pulse" />
        </div>
    );
}
