import Link from 'next/link';
import { ArrowRight, Code2, Stethoscope, Landmark, Calculator, Megaphone, Wrench } from 'lucide-react';

export default function CategorySection() {
    const categories = [
        {
            name: 'Healthcare',
            icon: <Stethoscope className="w-8 h-8" />,
            count: 150,
            href: '/search?category=Healthcare',
            color: 'bg-emerald-50 text-emerald-600 border-emerald-100'
        },
        {
            name: 'IT & Software',
            icon: <Code2 className="w-8 h-8" />,
            count: 320,
            href: '/search?category=IT & Software',
            color: 'bg-blue-50 text-blue-600 border-blue-100'
        },
        {
            name: 'Engineering',
            icon: <Wrench className="w-8 h-8" />,
            count: 180,
            href: '/search?category=Engineering',
            color: 'bg-orange-50 text-orange-600 border-orange-100'
        },
        {
            name: 'Marketing',
            icon: <Megaphone className="w-8 h-8" />,
            count: 95,
            href: '/search?category=Marketing & Sales',
            color: 'bg-purple-50 text-purple-600 border-purple-100'
        },
        {
            name: 'Sales',
            icon: <Landmark className="w-8 h-8" />,
            count: 75,
            href: '/search?category=Marketing & Sales',
            color: 'bg-indigo-50 text-indigo-600 border-indigo-100'
        },
        {
            name: 'Finance',
            icon: <Calculator className="w-8 h-8" />,
            count: 120,
            href: '/search?category=Finance & Accounting',
            color: 'bg-rose-50 text-rose-600 border-rose-100'
        },
    ];

    return (
        <section className="py-24 bg-gray-50/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <span className="text-teal-600 font-bold tracking-wider uppercase text-sm mb-2 block">
                            Discover Opportunities
                        </span>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight">
                            Browse by Category
                        </h2>
                    </div>
                    <Link
                        href="/search"
                        className="group flex items-center gap-2 font-bold text-gray-900 hover:text-teal-600 transition-colors"
                    >
                        View All Categories
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((cat, idx) => (
                        <Link
                            key={cat.name}
                            href={cat.href}
                            className="group relative bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-4 rounded-2xl ${cat.color} group-hover:scale-110 transition-transform duration-300`}>
                                    {cat.icon}
                                </div>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${cat.color} bg-white`}>
                                    <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{cat.name}</h3>
                                <p className="text-gray-500 font-medium text-sm flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                                    {cat.count}+ open positions
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
