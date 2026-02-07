import Link from 'next/link';
import { Search, Briefcase, Building2, TrendingUp, Users, Award, MapPin } from 'lucide-react';
import JobGrid from '@/components/jobs/JobGrid';
import { getFeaturedJobs, getRecentJobs } from '@/lib/data/job';

export default function JobHomePage() {
    const featuredJobs = getFeaturedJobs(6);
    const recentJobs = getRecentJobs(4);

    const categories = [
        { name: 'Healthcare', icon: '🏥', count: 150, href: '/search?category=healthcare' },
        { name: 'IT & Software', icon: '💻', count: 320, href: '/search?category=it' },
        { name: 'Engineering', icon: '⚙️', count: 180, href: '/search?category=engineering' },
        { name: 'Sales', icon: '📈', count: 95, href: '/search?category=sales' },
        { name: 'Marketing', icon: '📱', count: 75, href: '/search?category=marketing' },
        { name: 'Finance', icon: '💰', count: 120, href: '/search?category=finance' },
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
            <section className="bg-jobs-primary relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,111,97,0.1),transparent)]"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                    <div className="text-center max-w-3xl mx-auto">
                        <h1 className="text-4xl md:text-5xl font-black mb-6 text-white tracking-tight">
                            Find Your Dream Career in Pakistan
                        </h1>
                        <p className="text-xl mb-8 text-white/80 font-medium">
                            Thousands of jobs from leading companies across Pakistan. Start your journey today.
                        </p>

                        {/* Search Bar */}
                        <div className="bg-white rounded-2xl shadow-2xl p-2 flex flex-col md:flex-row gap-2 border border-white/10 backdrop-blur-md">
                            <div className="flex-1 flex items-center gap-2 px-4 py-3">
                                <Search className="h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Job title, keywords..."
                                    className="flex-1 outline-none text-jobs-dark font-medium"
                                />
                            </div>
                            <div className="flex-1 flex items-center gap-2 px-4 py-3 border-t md:border-t-0 md:border-l border-gray-100">
                                <MapPin className="h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="City or location..."
                                    className="flex-1 outline-none text-jobs-dark font-medium"
                                />
                            </div>
                            <Link
                                href="/search"
                                className="bg-jobs-accent text-white px-8 py-4 rounded-xl font-black hover:opacity-90 transition-all text-center shadow-lg shadow-jobs-accent/30 active:scale-95"
                            >
                                Search Jobs
                            </Link>
                        </div>

                        {/* Quick Links */}
                        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm font-medium">
                            <span className="text-white/50">Popular:</span>
                            <Link href="/search?q=nurse" className="text-white hover:text-jobs-accent transition-colors">Nurse</Link>
                            <Link href="/search?q=developer" className="text-white hover:text-jobs-accent transition-colors">Developer</Link>
                            <Link href="/search?q=engineer" className="text-white hover:text-jobs-accent transition-colors">Engineer</Link>
                            <Link href="/search?q=accountant" className="text-white hover:text-jobs-accent transition-colors">Accountant</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-12 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {stats.map((stat) => (
                            <div key={stat.label} className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <stat.icon className="h-8 w-8 mx-auto mb-3 text-jobs-primary" />
                                <p className="text-3xl font-black text-jobs-primary mb-1">{stat.value}</p>
                                <p className="text-jobs-dark/60 text-sm font-bold uppercase tracking-wider">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Browse by Category */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Browse Jobs by Category</h2>
                        <p className="text-gray-600">Find opportunities in your field</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {categories.map((category) => (
                            <Link
                                key={category.name}
                                href={category.href}
                                className="bg-white border border-gray-100 rounded-2xl p-6 text-center hover:shadow-xl hover:border-jobs-primary transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-16 h-16 bg-jobs-primary/5 rounded-bl-[4rem] group-hover:bg-jobs-primary/10 transition-colors"></div>
                                <div className="text-4xl mb-3 relative z-10">{category.icon}</div>
                                <h3 className="font-bold text-jobs-dark mb-2 group-hover:text-jobs-primary relative z-10">
                                    {category.name}
                                </h3>
                                <p className="text-sm text-jobs-dark/50 font-medium relative z-10">{category.count} jobs</p>
                            </Link>
                        ))}
                    </div>

                    <div className="text-center mt-8">
                        <Link
                            href="/search"
                            className="inline-flex items-center gap-2 text-jobs-primary font-bold hover:gap-3 transition-all"
                        >
                            View All Categories
                            <span>→</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Featured Jobs */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Jobs</h2>
                            <p className="text-gray-600">Hand-picked opportunities for you</p>
                        </div>
                        <Link
                            href="/search"
                            className="text-jobs-primary font-bold hover:opacity-80 flex items-center gap-2 transition-all"
                        >
                            View All
                            <span>→</span>
                        </Link>
                    </div>

                    <JobGrid jobs={featuredJobs} />
                </div>
            </section>

            {/* Recent Jobs */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Latest Jobs</h2>
                            <p className="text-gray-600">Recently posted opportunities</p>
                        </div>
                        <Link
                            href="/search?sort=newest"
                            className="text-jobs-primary font-bold hover:opacity-80 flex items-center gap-2 transition-all"
                        >
                            View All
                            <span>→</span>
                        </Link>
                    </div>

                    <JobGrid jobs={recentJobs} />
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-jobs-primary text-white relative overflow-hidden rounded-t-[4rem]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,111,97,0.1),transparent)]"></div>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <Award className="h-16 w-16 mx-auto mb-6 text-jobs-accent" />
                    <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">
                        Ready to Take the Next Step?
                    </h2>
                    <p className="text-xl mb-10 text-white/80 font-medium font-medium">
                        Join thousands of professionals who found their dream job through Khanhub
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/search"
                            className="bg-white text-jobs-primary px-10 py-4 rounded-xl font-black hover:bg-jobs-neutral transition-all shadow-xl active:scale-95"
                        >
                            Browse Jobs
                        </Link>
                        <Link
                            href="/post-job"
                            className="bg-jobs-accent text-white px-10 py-4 rounded-xl font-black hover:opacity-90 transition-all shadow-xl shadow-jobs-accent/20 active:scale-95"
                        >
                            Post a Job
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}