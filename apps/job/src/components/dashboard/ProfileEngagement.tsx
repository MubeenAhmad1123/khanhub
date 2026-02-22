'use client';

import React from 'react';
import {
    Trophy,
    CheckCircle2,
    Circle,
    ArrowRight,
    Video,
    User,
    Smartphone,
    MapPin,
    Briefcase,
    Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { User as UserType } from '@/types/user';

interface ProfileEngagementProps {
    user: UserType | null;
}

export default function ProfileEngagement({ user }: ProfileEngagementProps) {
    if (!user) return null;

    const requiredFields = [
        { key: 'name', label: 'Full Name', value: user.displayName, icon: <User className="w-4 h-4" />, href: '/dashboard/profile/edit' },
        { key: 'phone', label: 'Phone Number', value: (user as any).phone || user.profile?.phone, icon: <Smartphone className="w-4 h-4" />, href: '/dashboard/profile/edit' },
        { key: 'location', label: 'Location', value: (user as any).location || user.profile?.location, icon: <MapPin className="w-4 h-4" />, href: '/dashboard/profile/edit' },
        { key: 'industry', label: 'Industry', value: user.industry || (user.profile as any)?.industry, icon: <Briefcase className="w-4 h-4" />, href: '/dashboard/profile/edit' },
        { key: 'subcategory', label: 'Profession', value: user.subcategory || user.profile?.preferredJobTitle, icon: <Briefcase className="w-4 h-4" />, href: '/dashboard/profile/edit' },
        { key: 'video', label: 'Video Introduction', value: user.profile?.videoResume || (user as any).videoResume, icon: <Video className="w-4 h-4" />, href: '/dashboard/upload-video' },
    ];

    const completedCount = requiredFields.filter(f => !!f.value).length;
    const totalCount = requiredFields.length;
    const progressPercentage = Math.round((completedCount / totalCount) * 100);

    const tips = [
        {
            title: "Professional Look",
            description: "Profiles with a professional summary get 3x more views.",
            icon: "✨"
        },
        {
            title: "Video Magic",
            description: "Videos under 60 seconds have the highest engagement rate.",
            icon: "📹"
        },
        {
            title: "Skill Tags",
            description: "Adding at least 5 skills helps our AI match you better.",
            icon: "🎯"
        }
    ];

    return (
        <div className="space-y-6">
            {/* Main Engagement Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-blue-500/5 p-8 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-50 rounded-full opacity-50 blur-3xl" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="w-4 h-4 text-blue-600" />
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Profile Strength</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 italic uppercase italic tracking-tighter">
                                {progressPercentage === 100 ? 'Master Profile' : 'Power Up Your Profile'}
                            </h3>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-3xl font-black text-blue-600">{progressPercentage}%</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complete</span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-3 bg-slate-100 rounded-full mb-8 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-1000 ease-out rounded-full shadow-lg shadow-blue-500/20"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>

                    {/* Checklist */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {requiredFields.map((field) => (
                            <Link
                                key={field.key}
                                href={field.href}
                                className={cn(
                                    "flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-95",
                                    field.value
                                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-700"
                                        : "bg-slate-50 border-slate-100 text-slate-500 hover:border-blue-200"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                    field.value ? "bg-emerald-100" : "bg-white border border-slate-200"
                                )}>
                                    {field.value ? <CheckCircle2 className="w-4 h-4" /> : field.icon}
                                </div>
                                <span className="text-sm font-bold truncate flex-1">{field.label}</span>
                                {field.value ? (
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Done</span>
                                ) : (
                                    <ArrowRight className="w-4 h-4 text-blue-400" />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Quick Tips Horizontal Scroll */}
                    <div className="pt-6 border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pro Tips for Engagement</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {tips.map((tip, i) => (
                                <div key={i} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 group hover:border-blue-200 transition-colors">
                                    <span className="text-xl mb-2 block">{tip.icon}</span>
                                    <h4 className="text-xs font-black text-slate-900 uppercase mb-1">{tip.title}</h4>
                                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{tip.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Achievement Badge (Show if 100%) */}
            {progressPercentage === 100 && (
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2rem] p-6 text-white flex items-center gap-6 shadow-xl shadow-orange-500/20 animate-in zoom-in duration-500">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/30">
                        <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h4 className="text-lg font-black uppercase tracking-tighter italic">Elite Candidate Profile</h4>
                        <p className="text-white/80 text-xs font-bold">Your profile is now in the top 5% of all candidates. It is currently being featured to top employers.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
