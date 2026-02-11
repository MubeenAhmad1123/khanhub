'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface RegisteredBadgeProps {
    className?: string;
    size?: number;
    showText?: boolean;
}

export default function RegisteredBadge({ className, size = 20, showText = false }: RegisteredBadgeProps) {
    return (
        <div className={cn("inline-flex items-center gap-1.5", className)}>
            <div
                className="relative flex-shrink-0"
                style={{ width: size, height: size }}
            >
                <Image
                    src="/blue-tick.png"
                    alt="Registered User"
                    width={size}
                    height={size}
                    className="object-contain"
                />
            </div>
            {showText && (
                <span className="text-xs font-semibold text-blue-600 tracking-wide">
                    Registered
                </span>
            )}
        </div>
    );
}
