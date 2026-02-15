import { Briefcase, Building2, Users, TrendingUp } from 'lucide-react';

export default function StatsSection() {
    const stats = [
        { label: 'Active Jobs', value: '1,234', icon: Briefcase },
        { label: 'Companies', value: '500+', icon: Building2 },
        { label: 'Job Seekers', value: '10K+', icon: Users },
        { label: 'Success Rate', value: '85%', icon: TrendingUp },
    ];

    return (
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
    );
}
