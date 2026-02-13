'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { MapPin, Search, ArrowRight, Sparkles, Briefcase, TrendingUp } from 'lucide-react';

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
            <section className="relative min-h-[600px] flex items-center justify-center bg-gray-900 overflow-hidden">
                <div className="animate-pulse flex flex-col items-center w-full max-w-4xl px-4">
                    <div className="h-16 w-3/4 bg-white/10 rounded-2xl mb-8"></div>
                    <div className="h-6 w-1/2 bg-white/5 rounded-lg mb-12"></div>
                    <div className="h-24 w-full bg-white/5 rounded-3xl"></div>
                </div>
            </section>
        );
    }

    return (
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-[#0f172a]">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-teal-500/20 rounded-[100%] blur-[100px] opacity-50 animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-600/10 rounded-[100%] blur-[80px]"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                {/* Welcome Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-teal-400 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <Sparkles className="w-4 h-4" />
                    <span>#1 Job Platform in Pakistan</span>
                </div>

                {/* Main Heading */}
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    Find your <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">dream job</span>
                    <br />without the hassle.
                </h1>

                <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    Join thousands of professionals finding opportunities at top companies. verified jobs only.
                </p>

                {/* Search Box */}
                <div className="max-w-4xl mx-auto mb-16 animate-in fade-in scale-95 duration-700 delay-300">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-2 rounded-3xl shadow-2xl shadow-teal-900/20 flex flex-col md:flex-row gap-2">
                        <div className="flex-1 flex items-center px-6 h-16 bg-white/5 rounded-2xl border border-white/5 focus-within:bg-white/10 focus-within:border-teal-500/50 transition-all group">
                            <Search className="w-6 h-6 text-gray-400 group-focus-within:text-teal-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Job title, keywords..."
                                className="w-full bg-transparent border-none outline-none text-white placeholder:text-gray-500 ml-4 font-medium text-lg"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>

                        <div className="flex-1 flex items-center px-6 h-16 bg-white/5 rounded-2xl border border-white/5 focus-within:bg-white/10 focus-within:border-teal-500/50 transition-all group">
                            <MapPin className="w-6 h-6 text-gray-400 group-focus-within:text-teal-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="City or location..."
                                className="w-full bg-transparent border-none outline-none text-white placeholder:text-gray-500 ml-4 font-medium text-lg"
                                value={searchLocation}
                                onChange={(e) => setSearchLocation(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>

                        <button
                            onClick={handleSearch}
                            className="h-16 px-10 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            Search
                        </button>
                    </div>
                </div>

                {/* Quick Stats / Tags */}
                <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm font-medium text-gray-400 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>1,200+ New Jobs Today</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span>500+ Top Companies</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span>10k+ Daily Users</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
