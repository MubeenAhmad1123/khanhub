interface StatsCardProps {
    title: string;
    value: string | number;
    icon: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'teal' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export default function StatsCard({ title, value, icon, trend, color = 'teal' }: StatsCardProps) {
    const colorSchemes = {
        teal: 'from-teal-600 to-emerald-600 shadow-teal-200/40 text-teal-600',
        blue: 'from-blue-600 to-indigo-600 shadow-blue-200/40 text-blue-600',
        green: 'from-emerald-600 to-green-600 shadow-green-200/40 text-emerald-600',
        yellow: 'from-yellow-500 to-orange-500 shadow-yellow-100/40 text-yellow-600',
        red: 'from-red-600 to-rose-600 shadow-red-200/40 text-red-600',
        purple: 'from-purple-600 to-fuchsia-600 shadow-purple-200/40 text-purple-600',
    };

    const scheme = colorSchemes[color];
    const [fromColor, toColor, shadowColor] = scheme.split(' ');

    return (
        <div className="group relative bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl overflow-hidden">
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${fromColor} ${toColor} opacity-0 group-hover:opacity-[0.03] rounded-bl-[5rem] transition-opacity duration-700`} />

            <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">{value}</p>
                    </div>

                    {trend && (
                        <div className="mt-3 flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${trend.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">vs last month</span>
                        </div>
                    )}
                </div>

                <div className={`w-14 h-14 bg-gradient-to-br ${fromColor} ${toColor} rounded-2xl flex items-center justify-center text-white text-2xl shadow-2xl ${shadowColor} group-hover:scale-110 transition-transform duration-500`}>
                    {icon}
                </div>
            </div>

            {/* Bottom Decoration */}
            <div className="mt-6 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${fromColor} ${toColor} w-2/3 opacity-30`} />
            </div>
        </div>
    );
}