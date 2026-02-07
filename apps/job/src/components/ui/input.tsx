import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export function Input({
    label,
    error,
    icon,
    className = '',
    ...props
}: InputProps) {
    return (
        <div className="w-full space-y-1.5">
            {label && (
                <label className="text-sm font-black text-jobs-dark/70 ml-1 uppercase tracking-tight">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    className={`
                        w-full px-4 py-3 bg-jobs-neutral border border-gray-100 rounded-xl 
                        focus:ring-2 focus:ring-jobs-primary focus:bg-white transition-all 
                        font-bold text-jobs-dark placeholder:text-gray-400
                        ${icon ? 'pl-11' : ''}
                        ${error ? 'border-red-500 focus:ring-red-500' : ''}
                        ${className}
                    `}
                    {...props}
                />
            </div>
            {error && (
                <p className="text-xs font-bold text-red-500 ml-1">{error}</p>
            )}
        </div>
    );
}
