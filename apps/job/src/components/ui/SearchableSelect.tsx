'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface Option {
    id: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    className?: string;
    disabled?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Search...",
    label,
    error,
    className = "",
    disabled = false,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.id === value || opt.label === value);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (option: Option) => {
        onChange(option.id);
        setIsOpen(false);
        setSearchTerm("");
    };

    return (
        <div className={`w-full space-y-1.5 relative ${className}`} ref={containerRef}>
            {label && (
                <label className="text-sm font-black text-jobs-dark/70 ml-1 uppercase tracking-tight">
                    {label}
                </label>
            )}

            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`
                    w-full px-4 py-3 border border-gray-100 rounded-xl 
                    flex items-center justify-between transition-all
                    ${disabled
                        ? 'bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'bg-jobs-neutral cursor-pointer hover:border-jobs-primary/30'
                    }
                    ${isOpen && !disabled ? 'ring-2 ring-jobs-primary border-jobs-primary bg-white' : ''}
                    ${error ? 'border-red-500' : ''}
                `}
            >
                <span className={`font-bold ${selectedOption ? 'text-jobs-dark' : 'text-gray-400'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="bg-transparent border-none outline-none w-full font-bold text-sm text-jobs-dark placeholder:text-gray-400"
                            placeholder="Type to filter..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                        {searchTerm && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setSearchTerm(""); }}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-3 h-3 text-gray-400" />
                            </button>
                        )}
                    </div>

                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(option);
                                    }}
                                    className={`
                                        px-4 py-3 cursor-pointer flex items-center justify-between transition-all
                                        ${value === option.id ? 'bg-jobs-primary/5 text-jobs-primary' : 'hover:bg-gray-50 text-jobs-dark'}
                                    `}
                                >
                                    <span className="font-bold text-sm">{option.label}</span>
                                    {value === option.id && <Check className="w-4 h-4" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-gray-400 font-bold text-sm italic">
                                No matches found
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <p className="text-xs font-bold text-red-500 ml-1">{error}</p>
            )}
        </div>
    );
}
