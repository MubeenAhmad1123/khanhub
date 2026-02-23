'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

declare global {
    interface Window {
        googleTranslateElementInit: () => void;
        google: any;
    }
}

export default function GoogleTranslateWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState('en');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Only run on the client side
        if (typeof window === 'undefined') return;

        // Initialize script if it doesn't exist
        if (!document.querySelector('script[src*="translate.google.com"]')) {
            const script = document.createElement('script');
            script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.body.appendChild(script);
        }

        window.googleTranslateElementInit = () => {
            if (window.google && window.google.translate) {
                new window.google.translate.TranslateElement(
                    { pageLanguage: 'en', autoDisplay: false },
                    'google_translate_element'
                );
            }
        };

        // Check language from cookie (googtrans=/en/ur)
        const match = document.cookie.match(/(^|;) ?googtrans=([^;]*)(;|$)/);
        const lang = match ? match[2].split('/').pop() : 'en';

        if (lang === 'ur') {
            setCurrentLang('ur');
            document.documentElement.dir = 'rtl';
            document.documentElement.lang = 'ur';
        }

        // Close dropdown when clicking outside
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const changeLanguage = (langCode: string) => {
        setIsOpen(false);
        if (langCode === currentLang) return;

        // Google translate uses cookies /pageLang/targetLang
        const combo = `/en/${langCode}`;

        // Delete all possible googtrans cookies first cleanly
        const domains = [window.location.hostname, '.' + window.location.hostname];
        domains.forEach(domain => {
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });

        if (langCode !== 'en') {
            // Set new translation cookie
            document.cookie = `googtrans=${combo}; path=/; domain=.${window.location.hostname}`;
            document.cookie = `googtrans=${combo}; path=/;`;
        }

        window.location.reload();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Hidden native Google element */}
            <div id="google_translate_element" className="hidden" />

            {/* CSS to hide Google's automatic top banner and tooltips */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .VIpgJd-ZVi9od-ORHb-OEVmcd { display: none !important; }
                .VIpgJd-ZVi9od-aZ2wEe-wOHMyf { display: none !important; }
                .goog-te-banner-frame { display: none !important; }
                body { top: 0 !important; }
                font { background: transparent !important; box-shadow: none !important; }
            `}} />

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity text-sm font-bold text-blue-600 active:scale-95"
            >
                {/* Fallback globe if image not added yet by user */}
                <img
                    src="/translation.webp"
                    alt="Translate"
                    className="w-7 h-7 object-contain mix-blend-multiply"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                />
                <span className="hidden">🌐</span>
                <span className="mb-0.5">{currentLang === 'ur' ? 'اردو' : 'English'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-blue-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-2xl border border-slate-100 py-1 z-[200] animate-in fade-in zoom-in duration-200">
                    <button
                        onClick={() => changeLanguage('en')}
                        className={`w-full text-left px-4 py-2 text-sm font-bold hover:bg-slate-50 transition-colors ${currentLang === 'en' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'}`}
                        dir="ltr"
                    >
                        English
                    </button>
                    <button
                        onClick={() => changeLanguage('ur')}
                        className={`w-full text-left px-4 py-2 text-sm font-bold hover:bg-slate-50 transition-colors ${currentLang === 'ur' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'}`}
                        dir="rtl"
                    >
                        اردو (Urdu)
                    </button>
                </div>
            )}
        </div>
    );
}
