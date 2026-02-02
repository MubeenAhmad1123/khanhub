// src/components/ui/SectionHeader.tsx

interface SectionHeaderProps {
    badge?: string;
    title: string;
    titleGradient?: boolean;
    subtitle?: string;
    align?: 'left' | 'center' | 'right';
    className?: string;
}

export default function SectionHeader({
    badge,
    title,
    titleGradient = false,
    subtitle,
    align = 'center',
    className = ''
}: SectionHeaderProps) {
    const alignmentClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right'
    };

    return (
        <div className={`max-w-3xl ${align === 'center' ? 'mx-auto' : ''} ${className}`}>
            {badge && (
                <div className={`mb-4 ${align === 'center' ? 'flex justify-center' : align === 'right' ? 'flex justify-end' : ''}`}>
                    <span className="badge-primary">
                        {badge}
                    </span>
                </div>
            )}

            <h2
                className={`text-4xl md:text-5xl font-bold mb-4 ${alignmentClasses[align]} ${titleGradient ? 'text-gradient' : 'text-neutral-900'
                    }`}
            >
                {title}
            </h2>

            {subtitle && (
                <p className={`text-lg text-neutral-600 leading-relaxed ${alignmentClasses[align]}`}>
                    {subtitle}
                </p>
            )}
        </div>
    );
}