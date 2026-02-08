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
    const colorClasses = {
        teal: 'bg-teal-50 border-teal-500 text-teal-700',
        blue: 'bg-blue-50 border-blue-500 text-blue-700',
        green: 'bg-green-50 border-green-500 text-green-700',
        yellow: 'bg-yellow-50 border-yellow-500 text-yellow-700',
        red: 'bg-red-50 border-red-500 text-red-700',
        purple: 'bg-purple-50 border-purple-500 text-purple-700',
    };

    return (
        <div className={`${colorClasses[color]} rounded-lg shadow p-6 border-l-4`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium opacity-80">{title}</p>
                    <p className="text-3xl font-bold mt-2">{value}</p>
                    {trend && (
                        <p className="text-sm mt-2 flex items-center gap-1">
                            <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
                                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            <span className="opacity-60">vs last month</span>
                        </p>
                    )}
                </div>
                <div className="text-4xl opacity-80">{icon}</div>
            </div>
        </div>
    );
}