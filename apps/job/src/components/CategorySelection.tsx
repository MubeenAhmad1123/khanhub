'use client';

import React from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Industry } from '@/lib/constants/categories';

interface CategorySelectionProps {
    categories: Industry[];
    selectedIds: string[];
    onToggle: (id: string) => void;
}

export function CategorySelection({ categories, selectedIds, onToggle }: CategorySelectionProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 py-8 px-4 max-w-6xl mx-auto">
            {categories.map((category) => {
                const isSelected = selectedIds.includes(category.id);

                return (
                    <div
                        key={category.id}
                        className="flex flex-col items-center group cursor-pointer"
                        onClick={() => onToggle(category.id)}
                    >
                        <div className="relative w-32 h-32 md:w-40 md:h-40 mb-4 transition-transform duration-300 group-hover:scale-105 active:scale-95">
                            {/* Outer Circle Container */}
                            <div className={cn(
                                "w-full h-full rounded-full overflow-hidden border-4 transition-all duration-300 shadow-xl",
                                isSelected
                                    ? "border-blue-500 ring-4 ring-blue-500/20"
                                    : "border-white border-opacity-50 group-hover:border-white shadow-slate-200"
                            )}>
                                {category.imageUrl ? (
                                    <Image
                                        src={category.imageUrl}
                                        alt={category.label}
                                        fill
                                        className={cn(
                                            "object-cover transition-all duration-500",
                                            isSelected ? "scale-110 brightness-50" : "group-hover:scale-110"
                                        )}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-4xl">
                                        {category.icon}
                                    </div>
                                )}

                                {/* Checkmark Overlay */}
                                <div className={cn(
                                    "absolute inset-0 flex items-center justify-center transition-all duration-300 scale-0 opacity-0",
                                    isSelected && "scale-100 opacity-100"
                                )}>
                                    <div className="bg-white rounded-full p-2 shadow-lg">
                                        <Check className="w-8 h-8 text-blue-600 stroke-[3]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Label */}
                        <span className={cn(
                            "text-xs md:text-sm font-black uppercase tracking-widest text-center transition-colors duration-300",
                            isSelected ? "text-blue-600" : "text-slate-600 group-hover:text-slate-900"
                        )}>
                            {category.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
