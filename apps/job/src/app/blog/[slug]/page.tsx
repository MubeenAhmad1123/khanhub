import { blogPosts } from '@/lib/data/blogData';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';

interface PageProps {
    params: { slug: string };
}

export async function generateMetadata({ params }: PageProps) {
    const post = blogPosts.find((p) => p.slug === params.slug);
    if (!post) return {};

    return {
        title: post.title,
        description: post.description,
        openGraph: {
            title: post.title,
            description: post.description,
            type: 'article',
            publishedTime: post.date,
            authors: [post.author],
        },
    };
}

export default function BlogPostPage({ params }: PageProps) {
    const post = blogPosts.find((p) => p.slug === params.slug);

    if (!post) {
        notFound();
    }

    return (
        <article className="min-h-screen bg-white">
            <header className="bg-gray-50 border-b border-gray-100 py-20">
                <div className="max-w-4xl mx-auto px-4">
                    <Link href="/blog" className="inline-flex items-center gap-2 text-teal-600 font-bold mb-8 hover:gap-3 transition-all">
                        <ArrowLeft className="h-5 w-5" /> Back to Blog
                    </Link>
                    <div className="flex items-center gap-3 mb-6">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${post.category === 'Seeker' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                            {post.category}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-8 leading-tight tracking-tight">
                        {post.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-6 text-gray-500 font-semibold uppercase tracking-widest text-sm">
                        <div className="flex items-center gap-2"><User className="h-5 w-5 text-teal-600" /> {post.author}</div>
                        <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-teal-600" /> {post.date}</div>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-20">
                <div className="prose prose-lg prose-teal max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-gray-600 prose-p:leading-relaxed prose-p:font-medium">
                    {/* Simplified content rendering - in real app would use a MDX or MarkDown parser */}
                    {post.content.split('\n\n').map((para, i) => {
                        if (para.startsWith('###')) {
                            return <h3 key={i} className="text-2xl font-bold mt-12 mb-6">{para.replace('### ', '')}</h3>
                        }
                        return <p key={i} className="mb-6">{para}</p>
                    })}
                </div>

                <div className="mt-20 pt-10 border-t border-gray-100">
                    <div className="bg-teal-50 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to apply these tips?</h3>
                            <p className="text-gray-600 font-medium">Browse thousands of jobs across Pakistan today.</p>
                        </div>
                        <Link href="/search" className="bg-teal-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-teal-700 transition-all shadow-lg active:scale-95 whitespace-nowrap">
                            Browse Jobs Now
                        </Link>
                    </div>
                </div>
            </div>
        </article>
    );
}
