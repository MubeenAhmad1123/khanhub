import React from 'react';
import { cn } from '../utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'medical' | 'enterprise';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
        const variants = {
            primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25',
            secondary: 'bg-gray-900 text-white hover:bg-gray-800',
            outline: 'border-2 border-gray-200 bg-transparent hover:bg-gray-50',
            ghost: 'bg-transparent hover:bg-gray-100',
            medical: 'bg-medical-600 text-white hover:bg-medical-700 shadow-lg shadow-medical-500/25',
            enterprise: 'bg-enterprise-900 text-white hover:bg-enterprise-800 shadow-lg shadow-enterprise-900/25',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-6 py-3 text-base',
            lg: 'px-8 py-4 text-lg',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-xl font-bold transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading && (
                    <div className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
