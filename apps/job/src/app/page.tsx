'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Briefcase, Building2, TrendingUp, Users, Award, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import JobGrid from '@/components/jobs/JobGrid';
import { getActiveJobs, getJobsByCategory } from '@/lib/firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Job } from '@/types/job';



export default function JobHomePage() {
    const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
    const [recentJobs, setRecentJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLocation, setSearchLocation] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = async () => {
        try {
            setLoading(true);

            // Get featured and recent jobs from Firestore
            const jobs = await getActiveJobs(20) as Job[];

            // Separate featured vs recent
            const featured = jobs.filter((job) => job.isFeatured).slice(0, 6);
            const recent = jobs.filter((job) => !job.isFeatured).slice(0, 4);

            setFeaturedJobs(featured);
            setRecentJobs(recent);
        } catch (error) {
            console.error('Error loading jobs:', error);
            // Fallback to empty arrays if error
            setFeaturedJobs([]);
            setRecentJobs([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (searchLocation) params.set('location', searchLocation);
        window.location.href = `/search?${params.toString()}`;
    };

    const categories = [
        { name: 'Healthcare', icon: '🏥', count: 150, href: '/search?category=Healthcare' },
        { name: 'IT & Software', icon: '💻', count: 320, href: '/search?category=IT & Software' },
        { name: 'Engineering', icon: '⚙️', count: 180, href: '/search?category=Engineering' },
        { name: 'Sales', icon: '📈', count: 95, href: '/search?category=Marketing & Sales' },
        { name: 'Marketing', icon: '📱', count: 75, href: '/search?category=Marketing & Sales' },
        { name: 'Finance', icon: '💰', count: 120, href: '/search?category=Finance & Accounting' },
    ];

    const stats = [
        { label: 'Active Jobs', value: '1,234', icon: Briefcase },
        { label: 'Companies', value: '500+', icon: Building2 },
        { label: 'Job Seekers', value: '10K+', icon: Users },
        { label: 'Success Rate', value: '85%', icon: TrendingUp },
    ];

    return (
        <div>
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-jobs-primary via-jobs-primary/90 to-jobs-secondary relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,111,97,0.15),transparent)]"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-jobs-accent/10 rounded-full blur-3xl"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Welcome Message for Logged In Users */}
                        {user && user.displayName && (
                            <div className="mb-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white/90 text-sm font-medium border border-white/20">
                                <Sparkles className="h-4 w-4" />
                                Welcome back, {user.displayName}!
                            </div>
                        )}

                        <h1 className="text-4xl md:text-6xl font-black mb-6 text-white tracking-tight leading-tight">
                            Find Your Dream Career<br />in Pakistan
                        </h1>
                        <p className="text-xl md:text-2xl mb-10 text-white/90 font-medium max-w-2xl mx-auto">
                            Thousands of jobs from leading companies. Start your journey today.
                        </p>

                        {/* Search Bar */}
                        <div className="bg-white rounded-2xl shadow-2xl p-2 flex flex-col md:flex-row gap-2 border border-white/10 backdrop-blur-md max-w-4xl mx-auto">
                            <div className="flex-1 flex items-center gap-3 px-4 py-4">
                                <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Job title, keywords, or company..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    className="flex-1 outline-none text-jobs-dark font-medium placeholder:text-gray-400"
                                />
                            </div>
                            <div className="flex-1 flex items-center gap-3 px-4 py-4 border-t md:border-t-0 md:border-l border-gray-100">
                                <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder="City or location..."
                                    value={searchLocation}
                                    onChange={(e) => setSearchLocation(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    className="flex-1 outline-none text-jobs-dark font-medium placeholder:text-gray-400"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                className="bg-jobs-accent text-white px-8 py-4 rounded-xl font-black hover:bg-jobs-accent/90 transition-all text-center shadow-lg shadow-jobs-accent/30 active:scale-95 flex items-center justify-center gap-2"
                            >
                                Search Jobs
                                <ArrowRight className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Quick Links */}
                        <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-medium">
                            <span className="text-white/60">Popular:</span>
                            <Link href="/search?q=nurse" className="text-white hover:text-jobs-accent transition-colors px-3 py-1 bg-white/10 rounded-full hover:bg-white/20">
                                Nurse
                            </Link>
                            <Link href="/search?q=developer" className="text-white hover:text-jobs-accent transition-colors px-3 py-1 bg-white/10 rounded-full hover:bg-white/20">
                                Developer
                            </Link>
                            <Link href="/search?q=engineer" className="text-white hover:text-jobs-accent transition-colors px-3 py-1 bg-white/10 rounded-full hover:bg-white/20">
                                Engineer
                            </Link>
                            <Link href="/search?q=accountant" className="text-white hover:text-jobs-accent transition-colors px-3 py-1 bg-white/10 rounded-full hover:bg-white/20">
                                Accountant
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-12 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {stats.map((stat) => (
                            <div key={stat.label} className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm hover:shadow-lg transition-all group">
                                <stat.icon className="h-8 w-8 mx-auto mb-3 text-jobs-primary group-hover:scale-110 transition-transform" />
                                <p className="text-3xl font-black text-jobs-primary mb-1">{stat.value}</p>
                                <p className="text-jobs-dark/60 text-sm font-bold uppercase tracking-wider">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Browse by Category */}
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-black text-jobs-dark mb-4">
                            Browse Jobs by Category
                        </h2>
                        <p className="text-gray-600 text-lg">Find opportunities in your field</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {categories.map((category) => (
                            <Link
                                key={category.name}
                                href={category.href}
                                className="bg-white border-2 border-gray-100 rounded-2xl p-6 text-center hover:shadow-xl hover:border-jobs-primary transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-16 h-16 bg-jobs-primary/5 rounded-bl-[4rem] group-hover:bg-jobs-primary/10 transition-colors"></div>
                                <div className="text-4xl mb-3 relative z-10 group-hover:scale-110 transition-transform">
                                    {category.icon}
                                </div>
                                <h3 className="font-bold text-jobs-dark mb-2 group-hover:text-jobs-primary relative z-10 transition-colors">
                                    {category.name}
                                </h3>
                                <p className="text-sm text-jobs-dark/50 font-medium relative z-10">
                                    {category.count} jobs
                                </p>
                            </Link>
                        ))}
                    </div>

                    <div className="text-center mt-10">
                        <Link
                            href="/search"
                            className="inline-flex items-center gap-2 text-jobs-primary font-bold hover:gap-3 transition-all text-lg group"
                        >
                            View All Categories
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Featured Jobs */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black text-jobs-dark mb-2">
                                Featured Jobs
                            </h2>
                            <p className="text-gray-600 text-lg">Hand-picked opportunities for you</p>
                        </div>
                        <Link
                            href="/search?featured=true"
                            className="hidden md:flex items-center gap-2 text-jobs-primary font-bold hover:gap-3 transition-all group"
                        >
                            View All
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                                    <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
                                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            ))}
                        </div>
                    ) : featuredJobs.length > 0 ? (
                        <JobGrid jobs={featuredJobs} />
                    ) : (
                        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                            <Briefcase className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-500 text-lg font-medium">No featured jobs at the moment</p>
                            <Link href="/search" className="inline-block mt-4 text-jobs-primary font-bold hover:underline">
                                Browse all jobs
                            </Link>
                        </div>
                    )}

                    <div className="text-center mt-8 md:hidden">
                        <Link
                            href="/search?featured=true"
                            className="inline-flex items-center gap-2 text-jobs-primary font-bold hover:gap-3 transition-all"
                        >
                            View All Featured Jobs
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Recent Jobs */}
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black text-jobs-dark mb-2">
                                Latest Jobs
                            </h2>
                            <p className="text-gray-600 text-lg">Recently posted opportunities</p>
                        </div>
                        <Link
                            href="/search?sort=newest"
                            className="hidden md:flex items-center gap-2 text-jobs-primary font-bold hover:gap-3 transition-all group"
                        >
                            View All
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                                    <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
                                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                                </div>
                            ))}
                        </div>
                    ) : recentJobs.length > 0 ? (
                        <JobGrid jobs={recentJobs} />
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
                            <Briefcase className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-500 text-lg font-medium">No recent jobs available</p>
                            <Link href="/search" className="inline-block mt-4 text-jobs-primary font-bold hover:underline">
                                Browse all jobs
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-br from-jobs-primary via-jobs-primary/95 to-jobs-secondary text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,111,97,0.15),transparent)]"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <Award className="h-16 w-16 mx-auto mb-6 text-jobs-accent animate-bounce" />
                    <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                        Ready to Take the Next Step?
                    </h2>
                    <p className="text-xl md:text-2xl mb-10 text-white/90 font-medium max-w-2xl mx-auto">
                        Join thousands of professionals who found their dream job through Khanhub
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        {!user ? (
                            <>
                                <Link
                                    href="/auth/register"
                                    className="bg-white text-jobs-primary px-10 py-4 rounded-xl font-black hover:bg-jobs-neutral transition-all shadow-xl active:scale-95 inline-flex items-center justify-center gap-2"
                                >
                                    Get Started Free
                                    <ArrowRight className="h-5 w-5" />
                                </Link>
                                <Link
                                    href="/search"
                                    className="bg-jobs-accent text-white px-10 py-4 rounded-xl font-black hover:opacity-90 transition-all shadow-xl shadow-jobs-accent/20 active:scale-95"
                                >
                                    Browse Jobs
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/search"
                                    className="bg-white text-jobs-primary px-10 py-4 rounded-xl font-black hover:bg-jobs-neutral transition-all shadow-xl active:scale-95 inline-flex items-center justify-center gap-2"
                                >
                                    Find Your Next Job
                                    <ArrowRight className="h-5 w-5" />
                                </Link>
                                {user && (
                                    <Link
                                        href="/employer/post-job"
                                        className="bg-jobs-accent text-white px-10 py-4 rounded-xl font-black hover:opacity-90 transition-all shadow-xl shadow-jobs-accent/20 active:scale-95"
                                    >
                                        Post a Job
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}