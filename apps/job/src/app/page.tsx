import HeroSection from '@/components/home/HeroSection';
import StatsSection from '@/components/home/StatsSection';
import CategorySection from '@/components/home/CategorySection';
import FeaturesSection from '@/components/home/FeaturesSection';
import { blogPosts } from '@/lib/data/blogData';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';

export default function HomePage() {
    const featuredPosts = blogPosts.slice(0, 3);

    return (
        <div className="min-h-screen bg-white">
            <HeroSection />
            <StatsSection />
            <CategorySection />
            <FeaturesSection />

            {/* Blog Preview Section */}
            <section className="py-24 bg-white border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Career Advice & Tips</h2>
                            <p className="text-gray-600 text-lg font-medium">Expert insights for your professional journey</p>
                        </div>
                        <Link href="/blog" className="group flex items-center gap-2 text-teal-600 font-bold hover:gap-4 transition-all" id="view-all-posts">
                            View All Articles <ArrowRight className="h-5 w-5" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {featuredPosts.map((post) => (
                            <Link
                                key={post.slug}
                                href={`/blog/${post.slug}`}
                                className="group bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-xl hover:border-teal-100 transition-all h-full flex flex-col"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${post.category === 'Seeker' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                        }`}>
                                        {post.category}
                                    </span>
                                    <span className="text-gray-400 text-xs font-bold flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> {post.date}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-teal-600 transition-colors line-clamp-2">
                                    {post.title}
                                </h3>
                                <p className="text-gray-600 font-medium line-clamp-3 mb-6 flex-1">
                                    {post.description}
                                </p>
                                <div className="p-2 bg-white rounded-full inline-flex items-center justify-center w-10 h-10 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-sm">
                                    <ArrowRight className="h-5 w-5" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
