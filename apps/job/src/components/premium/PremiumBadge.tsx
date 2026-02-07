import { Crown } from 'lucide-react';

interface PremiumBadgeProps {
    className?: string;
}

export default function PremiumBadge({ className = '' }: PremiumBadgeProps) {
    return (
        <div className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-jobs-accent to-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg ${className}`}>
            <Crown className="h-3 w-3" />
            Premium
        </div>
    );
}
