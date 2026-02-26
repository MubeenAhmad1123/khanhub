'use client';

import { INDUSTRIES } from '@/lib/constants/categories';
import { cn } from '@/lib/utils';
import { LayoutGrid, Users, Building2 } from 'lucide-react';

interface MobileFilterBarProps {
    selectedRole: 'all' | 'jobseeker' | 'employer';
    setSelectedRole: (role: 'all' | 'jobseeker' | 'employer') => void;
    selectedIndustry: string | null;
    setSelectedIndustry: (industry: string | null) => void;
    selectedSubcategory: string | null;
    setSelectedSubcategory: (subcategory: string | null) => void;
}

export default function MobileFilterBar({
    selectedRole,
    setSelectedRole,
    selectedIndustry,
    setSelectedIndustry,
    selectedSubcategory,
    setSelectedSubcategory
}: MobileFilterBarProps) {
    const roles = [
        { id: 'all', label: 'All Profiles', icon: <LayoutGrid className="w-4 h-4" /> },
        { id: 'jobseeker', label: 'Candidates', icon: <Users className="w-4 h-4" /> },
        { id: 'employer', label: 'Companies', icon: <Building2 className="w-4 h-4" /> },
    ] as const;

    return (
        <div className="lg:hidden bg-white border-b border-slate-100 flex flex-col sticky top-[56px] z-30">
            {/* Roles Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-3 px-4 border-b border-slate-50">
                {roles.map(role => (
                    <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 italic",
                            selectedRole === role.id
                                ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20"
                                : "bg-slate-50 border-slate-100 text-slate-500"
                        )}
                    >
                        {role.icon}
                        {role.label}
                    </button>
                ))}
            </div>

            {/* Industries Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-3 px-4">
                <button
                    onClick={() => setSelectedIndustry(null)}
                    className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                        !selectedIndustry
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-slate-200 text-slate-500"
                    )}
                >
                    All
                </button>
                {INDUSTRIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => {
                            setSelectedIndustry(cat.id);
                            setSelectedSubcategory(null);
                        }}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                            selectedIndustry === cat.id
                                ? "bg-slate-900 border-slate-900 text-white"
                                : "bg-white border-slate-200 text-slate-500"
                        )}
                    >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Subcategories Scroll */}
            {selectedIndustry && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-3 px-4 bg-slate-50/50">
                    <button
                        onClick={() => setSelectedSubcategory(null)}
                        className={cn(
                            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2",
                            !selectedSubcategory
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white border-slate-200 text-slate-400"
                        )}
                    >
                        All
                    </button>
                    {INDUSTRIES.find(i => i.id === selectedIndustry)?.subcategories.map(sub => (
                        <button
                            key={sub.id}
                            onClick={() => setSelectedSubcategory(sub.label)}
                            className={cn(
                                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2",
                                selectedSubcategory === sub.label
                                    ? "bg-blue-600 border-blue-600 text-white"
                                    : "bg-white border-slate-200 text-slate-400"
                            )}
                        >
                            {sub.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
