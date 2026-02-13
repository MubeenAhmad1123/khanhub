'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { MapPin, Search, ArrowRight, Sparkles } from 'lucide-react';

export default function HeroSection() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLocation, setSearchLocation] = useState('');

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (searchLocation) params.set('location', searchLocation);
        router.push(`/search?${params.toString()}`);
    };

    if (authLoading) {
        return (
            <section className="bg-gradient-to-br from-teal-600 via-teal-700 to-blue-800 py-20 md:py-32">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="h-12 w-3/4 bg-white/20 rounded-lg mb-6"></div>
                        <div className="h-6 w-1/2 bg-white/10 rounded-lg mb-12"></div>
                        <div className="h-20 w-full max-w-4xl bg-white/5 rounded-3xl"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="bg-gradient-to-br from-teal-600 via-teal-700 to-blue-800 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative z-10">
                <div className="text-center max-w-4xl mx-auto">
                    {user && (
                        <div className="mb-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white/90 text-sm font-medium border border-white/20">
                            <Sparkles className="h-4 w-4" />
                            Welcome back, {user.displayName || user.email}!
                        </div>
                    )}

                    <h1 className="text-5xl md:text-7xl font-black mb-6 text-white tracking-tight leading-tight">
                        Find Your Dream Career<br />in Pakistan 🇵🇰
                    </h1>
                    <p className="text-xl md:text-2xl mb-12 text-white/90 font-medium max-w-2xl mx-auto leading-relaxed">
                        Connect with top companies and find verified jobs that match your skills perfectly.
                    </p>

                    {/* Persona-Selection Buttons for New Users */}
                    {!user && (
                        <div className="flex flex-col md:flex-row gap-4 justify-center mb-12">
                            <Link
                                href="/auth/register?role=job_seeker"
                                className="px-10 py-5 bg-white text-teal-700 font-bold rounded-2xl hover:bg-gray-100 transition-all shadow-xl text-lg flex items-center justify-center gap-3 active:scale-95"
                            >
                                🎯 Join as Job Seeker
                            </Link>
                            <Link
                                href="/auth/register?role=employer"
                                className="px-10 py-5 bg-teal-900/40 backdrop-blur-sm text-white border-2 border-white/30 font-bold rounded-2xl hover:bg-teal-900/60 transition-all shadow-xl text-lg flex items-center justify-center gap-3 active:scale-95"
                            >
                                🏢 Join as Hiring Person
                            </Link>
                        </div>
                    )}

                    {user && (
                        <div className="flex justify-center mb-12">
                            <Link
                                href={user.role === 'admin' ? '/admin' : user.role === 'employer' ? '/employer/dashboard' : '/dashboard'}
                                className="px-12 py-5 bg-white text-teal-700 font-bold rounded-2xl hover:bg-gray-100 transition-all shadow-2xl text-xl flex items-center justify-center gap-3 active:scale-95"
                            >
                                🚀 Go to My Workspace
                            </Link>
                        </div>
                    )}

                    {/* Search Bar */}
                    <div className="bg-white rounded-3xl shadow-2xl p-3 flex flex-col md:flex-row gap-2 border border-white/20 backdrop-blur-md max-w-4xl mx-auto">
                        <div className="flex-1 flex items-center gap-3 px-6 py-4">
                            <Search className="h-6 w-6 text-gray-400 flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="Job title, keywords, or company..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="flex-1 outline-none text-gray-800 text-lg font-medium placeholder:text-gray-400"
                            />
                        </div>
                        <div className="flex-1 flex items-center gap-3 px-6 py-4 border-t md:border-t-0 md:border-l border-gray-100">
                            <MapPin className="h-6 w-6 text-gray-400 flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="City or location..."
                                value={searchLocation}
                                onChange={(e) => setSearchLocation(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="flex-1 outline-none text-gray-800 text-lg font-medium placeholder:text-gray-400"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="bg-orange-500 text-white px-10 py-5 rounded-2xl font-black hover:bg-orange-600 transition-all text-center shadow-lg active:scale-95 flex items-center justify-center gap-2 text-lg"
                        >
                            Search Jobs
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
