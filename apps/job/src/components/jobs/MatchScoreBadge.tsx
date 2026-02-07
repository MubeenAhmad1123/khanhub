interface MatchScoreBadgeProps {
    score: number;
    className?: string;
}

export default function MatchScoreBadge({ score, className = '' }: MatchScoreBadgeProps) {
    const getColorClass = () => {
        if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
        if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-200';
        if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getLabel = () => {
        if (score >= 80) return 'Excellent Match';
        if (score >= 60) return 'Good Match';
        if (score >= 40) return 'Fair Match';
        return 'Low Match';
    };

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border  text-xs font-bold ${getColorClass()} ${className}`}>
            <div className="text-base font-black">{score}%</div>
            <div className="text-[10px] uppercase tracking-wide">{getLabel()}</div>
        </div>
    );
}
