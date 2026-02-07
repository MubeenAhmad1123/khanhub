'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = (message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    };

    const remove = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[200] space-y-2 max-w-sm w-full">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`
                            flex items-center gap-3 p-4 rounded-2xl shadow-xl border animate-in slide-in-from-right-10 duration-300
                            ${t.type === 'success' ? 'bg-green-50 border-green-100 text-green-800' : ''}
                            ${t.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : ''}
                            ${t.type === 'info' ? 'bg-blue-50 border-blue-100 text-blue-800' : ''}
                            ${t.type === 'warning' ? 'bg-yellow-50 border-yellow-100 text-yellow-800' : ''}
                        `}
                    >
                        <div className="shrink-0">
                            {t.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
                            {t.type === 'error' && <AlertCircle className="h-5 w-5" />}
                            {t.type === 'info' && <Info className="h-5 w-5" />}
                            {t.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
                        </div>
                        <p className="text-sm font-bold flex-1">{t.message}</p>
                        <button onClick={() => remove(t.id)} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}
