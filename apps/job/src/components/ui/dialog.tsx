'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function Dialog({
    isOpen,
    onClose,
    title,
    children,
    className = '',
}: DialogProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-jobs-dark/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />
            <div className={`
                relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 
                overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300
                ${className}
            `}>
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-jobs-neutral/30">
                    {title && <h3 className="text-xl font-black text-jobs-dark tracking-tight">{title}</h3>}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-jobs-dark"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
