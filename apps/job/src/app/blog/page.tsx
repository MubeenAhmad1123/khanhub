import Link from 'next/link';
import { blogPosts } from '@/lib/data/blogData';
import { ArrowRight, Clock, User, Tag } from 'lucide-react';

export const metadata = {
    title: 'Career Advice & Industry Insights',
    description: 'Expert tips on job searching, hiring, and career growth in Pakistan.',
};

export default function BlogPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
                        KhanHub <span className="text-teal-600">Blog</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
                        Your daily dose of professional wisdom, hiring trends, and success stories.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {blogPosts.map((post) => (
                        <Link
                            key={post.slug}
                            href={`/blog/${post.slug}`}
                            className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 flex flex-col h-full"
                        >
                            <div className="aspect-video bg-teal-100 relative">
                                {/* Placeholder for real images */}
                                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                                    {post.category === 'Seeker' ? '🎯' : '🏢'}
                                </div>
                                <div className="absolute top-4 left-4">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${post.category === 'Seeker' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                        }`}>
                                        {post.category}
                                    </span>
                                </div>
                            </div>
                            <div className="p-8 flex-1 flex flex-col">
                                <div className="flex items-center gap-4 text-gray-400 text-sm mb-4 font-semibold uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {post.date}</span>
                                    <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> By {post.author}</span>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-teal-600 transition-colors leading-tight">
                                    {post.title}
                                </h2>
                                <p className="text-gray-600 mb-8 line-clamp-3 font-medium flex-1">
                                    {post.description}
                                </p>
                                <div className="flex items-center gap-2 text-teal-600 font-bold group-hover:gap-4 transition-all">
                                    Read Article <ArrowRight className="h-5 w-5" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
