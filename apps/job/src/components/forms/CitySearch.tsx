'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, Search, Check } from 'lucide-react';
import { PAKISTAN_CITIES } from '@/lib/data/cities';

interface CitySearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function CitySearch({
    value,
    onChange,
    placeholder = "Select or type city...",
    className = ""
}: CitySearchProps) {
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync input value with parent value (important for resets)
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        setIsOpen(true);

        if (val.trim()) {
            const filtered = PAKISTAN_CITIES.filter(city =>
                city.toLowerCase().includes(val.toLowerCase())
            ).slice(0, 8);
            setSuggestions(filtered);
        } else {
            setSuggestions(PAKISTAN_CITIES.slice(0, 8));
        }

        // Update parent as well so it's always in sync if they just type
        onChange(val);
    };

    const handleSelect = (city: string) => {
        setInputValue(city);
        onChange(city);
        setIsOpen(false);
    };

    const isExistingCity = PAKISTAN_CITIES.some(c => c.toLowerCase() === inputValue.toLowerCase());
    const showAddOption = inputValue.trim() !== '' && !isExistingCity;

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <MapPin className="h-5 w-5" />
                </div>
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        setIsOpen(true);
                        if (!inputValue) setSuggestions(PAKISTAN_CITIES.slice(0, 8));
                    }}
                    placeholder={placeholder}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:ring-4 focus:ring-teal-50 outline-none transition-all font-medium text-gray-900 shadow-sm"
                />
            </div>

            {isOpen && (suggestions.length > 0 || showAddOption) && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-64 overflow-y-auto p-2">
                        {suggestions.map((city) => (
                            <button
                                key={city}
                                type="button"
                                onClick={() => handleSelect(city)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-teal-50 text-left transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
                                        <MapPin className="h-4 w-4" />
                                    </div>
                                    <span className="font-bold text-gray-700 group-hover:text-teal-900">{city}</span>
                                </div>
                                {value === city && <Check className="h-4 w-4 text-teal-500" />}
                            </button>
                        ))}

                        {showAddOption && (
                            <button
                                type="button"
                                onClick={() => handleSelect(inputValue)}
                                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl hover:bg-blue-50 text-left transition-colors group border-t border-gray-50 mt-1"
                            >
                                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 transition-colors">
                                    <Plus className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-black text-blue-700 leading-none">Add "{inputValue}"</p>
                                    <p className="text-[10px] text-blue-400 uppercase tracking-widest font-bold mt-1">New Location</p>
                                </div>
                            </button>
                        )}

                        {suggestions.length === 0 && !showAddOption && (
                            <div className="px-4 py-8 text-center">
                                <Search className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                                <p className="text-gray-400 font-bold">No cities found</p>
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-50 px-4 py-2 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Pakistan City Directory</p>
                    </div>
                </div>
            )}
        </div>
    );
}
