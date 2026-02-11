'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Job } from '@/types/job';
import { getActiveJobs } from '@/lib/firebase/firestore';
import {
    MapPin,
    Search,
    ArrowRight,
    Sparkles,
    Briefcase,
    Building2,
    Users,
    TrendingUp,
    CheckCircle2
} from 'lucide-react';

export default function HomePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [showFeatures, setShowFeatures] = useState(false);
    const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLocation, setSearchLocation] = useState('');

    useEffect(() => {
        loadJobs();

        // Auto-redirect admins to their dashboard if they land here
        if (!authLoading && user?.role === 'admin') {
            console.log('Home: Redirecting detected Admin to /admin');
            router.push('/admin');
        }
    }, [user, authLoading, router]);

    const loadJobs = async () => {
        try {
            setLoading(true);
            const jobs = await getActiveJobs(20) as Job[];
            const featured = jobs.filter((job) => job.isFeatured).slice(0, 6);
            setFeaturedJobs(featured);
        } catch (error) {
            console.error('Error loading jobs:', error);
            setFeaturedJobs([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (searchLocation) params.set('location', searchLocation);
        router.push(`/search?${params.toString()}`);
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

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
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

            {/* Stats Bar */}
            <section className="py-16 bg-gray-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat) => (
                            <div key={stat.label} className="text-center group">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                    <stat.icon className="h-6 w-6 text-teal-600" />
                                </div>
                                <p className="text-3xl font-black text-gray-900 mb-1">{stat.value}</p>
                                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                            Browse by Category
                        </h2>
                        <p className="text-gray-600 text-xl font-medium">Find your next opportunity in these hot fields</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((cat) => (
                            <Link
                                key={cat.name}
                                href={cat.href}
                                className="group bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-teal-100 transition-all flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-4xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{cat.name}</h3>
                                        <p className="text-teal-600 text-sm font-semibold">{cat.count}+ positions</p>
                                    </div>
                                </div>
                                <div className="p-2 bg-gray-50 rounded-full group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                                    <ArrowRight className="h-5 w-5" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features/Value Proposition */}
            <section className="py-24 bg-teal-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-teal-100">
                            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-3xl mb-6">🎯</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Matching</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                Our platform uses advanced AI to match your unique skill set with the most relevant job openings in Pakistan.
                            </p>
                        </div>
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-teal-100">
                            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-3xl mb-6">⚡</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Fast Apply</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                Upload your CV once and apply to multiple verified positions with a single click. No more filling redundant forms.
                            </p>
                        </div>
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-teal-100">
                            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-3xl mb-6">🛡️</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Verified Roles</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                Every job post is vetted for authenticity. Apply with complete peace of mind to trusted Pakistani employers.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="md:col-span-1">
                            <h2 className="text-3xl font-black mb-6 text-teal-400">KhanHub</h2>
                            <p className="text-slate-400 leading-relaxed font-medium">
                                Empowering Pakistan's workforce by connecting high-quality talent with verified opportunities.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-6 uppercase tracking-widest text-slate-500">For Seekers</h4>
                            <ul className="space-y-4 font-medium">
                                <li><Link href="/search" className="text-slate-300 hover:text-teal-400 transition-colors">Find Jobs</Link></li>
                                <li><Link href="/auth/register" className="text-slate-300 hover:text-teal-400 transition-colors">Create Profile</Link></li>
                                <li><Link href="/dashboard/applications" className="text-slate-300 hover:text-teal-400 transition-colors">My Applications</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-6 uppercase tracking-widest text-slate-500">For Employers</h4>
                            <ul className="space-y-4 font-medium">
                                <li><Link href="/auth/register?role=employer" className="text-slate-300 hover:text-teal-400 transition-colors">Post a Job</Link></li>
                                <li><Link href="/employer/dashboard" className="text-slate-300 hover:text-teal-400 transition-colors">Recruiter Dashboard</Link></li>
                                <li><Link href="/search?q=talant" className="text-slate-300 hover:text-teal-400 transition-colors">Search Talent</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-6 uppercase tracking-widest text-slate-500">Contact</h4>
                            <ul className="space-y-4 font-medium text-slate-300">
                                <li className="flex items-center gap-3">📧 support@khanhub.pk</li>
                                <li className="flex items-center gap-3">📍 Islamabad, Pakistan</li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-800 text-center text-slate-500">
                        <p className="font-bold">&copy; 2026 KhanHub. Pakistan's Dedicated Job Portal.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}