'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface SearchSuggestionsProps {
    value: string;
    onChange: (value: string) => void;
    onSelect?: (suggestion: string) => void;
    placeholder?: string;
}

interface Suggestion {
    id: string;
    name: string;
    category: string;
}

export default function SearchSuggestions({ value, onChange, onSelect, placeholder = 'Search products...' }: SearchSuggestionsProps) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (value.length < 2) {
            setSuggestions([]);
            return;
        }

        // Fetch suggestions from API
        fetch(`/api/products/search?q=${encodeURIComponent(value)}&limit=5`)
            .then(res => res.json())
            .then(data => setSuggestions(data.products || []))
            .catch(() => setSuggestions([]));
    }, [value]);

    const handleSelect = (suggestion: Suggestion) => {
        onChange(suggestion.name);
        onSelect?.(suggestion.name);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => value.length >= 2 && setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
            </div>

            {/* Suggestions Dropdown */}
            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-96 overflow-y-auto">
                    <div className="p-2">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion.id}
                                onClick={() => handleSelect(suggestion)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 group-hover:text-blue-600">
                                            {suggestion.name}
                                        </p>
                                        <p className="text-sm text-gray-500">{suggestion.category}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
