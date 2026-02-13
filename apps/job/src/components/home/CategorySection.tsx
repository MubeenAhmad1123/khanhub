import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CategorySection() {
    const categories = [
        { name: 'Healthcare', icon: '🏥', count: 150, href: '/search?category=Healthcare' },
        { name: 'IT & Software', icon: '💻', count: 320, href: '/search?category=IT & Software' },
        { name: 'Engineering', icon: '⚙️', count: 180, href: '/search?category=Engineering' },
        { name: 'Sales', icon: '📈', count: 95, href: '/search?category=Marketing & Sales' },
        { name: 'Marketing', icon: '📱', count: 75, href: '/search?category=Marketing & Sales' },
        { name: 'Finance', icon: '💰', count: 120, href: '/search?category=Finance & Accounting' },
    ];

    return (
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
    );
}
