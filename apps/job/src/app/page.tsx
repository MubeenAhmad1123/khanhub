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
            <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                    <div className="text-center max-w-3xl mx-auto">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            Find Your Dream Career in Pakistan
                        </h1>
                        <p className="text-xl mb-8 text-blue-100">
                            Thousands of jobs from leading companies across Pakistan. Start your journey today.
                        </p>

                        {/* Search Bar */}
                        <div className="bg-white rounded-lg shadow-xl p-2 flex flex-col md:flex-row gap-2">
                            <div className="flex-1 flex items-center gap-2 px-4 py-2">
                                <Search className="h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Job title, keywords..."
                                    className="flex-1 outline-none text-gray-900"
                                />
                            </div>
                            <div className="flex-1 flex items-center gap-2 px-4 py-2 border-t md:border-t-0 md:border-l">
                                <MapPin className="h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="City or location..."
                                    className="flex-1 outline-none text-gray-900"
                                />
                            </div>
                            <Link
                                href="/search"
                                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
                            >
                                Search Jobs
                            </Link>
                        </div>

                        {/* Quick Links */}
                        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
                            <span className="text-blue-200">Popular:</span>
                            <Link href="/search?q=nurse" className="text-white hover:underline">Nurse</Link>
                            <Link href="/search?q=developer" className="text-white hover:underline">Developer</Link>
                            <Link href="/search?q=engineer" className="text-white hover:underline">Engineer</Link>
                            <Link href="/search?q=accountant" className="text-white hover:underline">Accountant</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-12 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {stats.map((stat) => (
                            <div key={stat.label} className="bg-white rounded-lg p-6 text-center">
                                <stat.icon className="h-8 w-8 mx-auto mb-3 text-blue-600" />
                                <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                                <p className="text-gray-600 text-sm">{stat.label}</p>
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
                                className="bg-white border rounded-lg p-6 text-center hover:shadow-lg hover:border-blue-600 transition-all group"
                            >
                                <div className="text-4xl mb-3">{category.icon}</div>
                                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                                    {category.name}
                                </h3>
                                <p className="text-sm text-gray-600">{category.count} jobs</p>
                            </Link>
                        ))}
                    </div>

                    <div className="text-center mt-8">
                        <Link
                            href="/search"
                            className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700"
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
                            className="text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-2"
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
                            className="text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-2"
                        >
                            View All
                            <span>→</span>
                        </Link>
                    </div>

                    <JobGrid jobs={recentJobs} />
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-blue-600 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Award className="h-16 w-16 mx-auto mb-6" />
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Ready to Take the Next Step?
                    </h2>
                    <p className="text-xl mb-8 text-blue-100">
                        Join thousands of professionals who found their dream job through Khanhub
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/search"
                            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                        >
                            Browse Jobs
                        </Link>
                        <Link
                            href="/post-job"
                            className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Post a Job
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}