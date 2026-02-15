import HeroSection from '@/components/home/HeroSection';
import TrustedCompanies from '@/components/home/TrustedCompanies';
import CategorySection from '@/components/home/CategorySection';
import FeaturesSection from '@/components/home/FeaturesSection';
import { blogPosts } from '@/lib/data/blogData';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';

export default function HomePage() {
    const featuredPosts = blogPosts.slice(0, 3);

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-teal-100 selection:text-teal-900">
            <HeroSection />
            <TrustedCompanies />
            <CategorySection />

            <div className="py-12">
                <FeaturesSection />
            </div>

            {/* Blog Preview Section */}
            <section className="py-24 bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-50 rounded-full blur-[100px] opacity-50 -z-10"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
                        <div>
                            <span className="text-teal-600 font-bold tracking-wider uppercase text-sm mb-2 block">
                                Latest Insights
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">Career Advice & Tips</h2>
                            <p className="text-gray-600 text-xl font-medium max-w-2xl">Expert insights to help you navigate your professional journey.</p>
                        </div>
                        <Link href="/blog" className="group flex items-center gap-2 text-teal-600 font-bold text-lg hover:gap-4 transition-all" id="view-all-posts">
                            View All Articles <ArrowRight className="h-5 w-5" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {featuredPosts.map((post) => (
                            <Link
                                key={post.slug}
                                href={`/blog/${post.slug}`}
                                className="group bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:border-teal-100 transition-all duration-300 h-full flex flex-col relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                                    <Clock className="w-32 h-32" />
                                </div>

                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${post.category === 'Seeker'
                                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                                        : 'bg-purple-50 text-purple-700 border-purple-100'
                                        }`}>
                                        {post.category}
                                    </span>
                                    <span className="text-gray-400 text-xs font-bold flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> {post.date}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-teal-600 transition-colors line-clamp-2 leading-tight relative z-10">
                                    {post.title}
                                </h3>
                                <p className="text-gray-500 font-medium line-clamp-3 mb-8 flex-1 leading-relaxed relative z-10">
                                    {post.description}
                                </p>
                                <div className="flex items-center gap-2 text-teal-600 font-bold group-hover:gap-3 transition-all relative z-10">
                                    Read Article <ArrowRight className="h-4 w-4" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
