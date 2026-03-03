'use client';

import { Search, SlidersHorizontal, Bell } from 'lucide-react';
import Link from 'next/link';

export function TopBar() {
    return (
        <header className="fixed top-0 left-0 right-0 bg-black/60 backdrop-blur-md border-b border-[#1F1F1F] z-50 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <Link href="/feed" className="text-2xl font-black font-syne italic tracking-tighter flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF0069] to-[#7638FA] flex items-center justify-center">
                        <span className="text-white text-xs font-black not-italic">JR</span>
                    </div>
                    <span className="hidden sm:inline text-transparent bg-clip-text bg-gradient-to-r from-[#FF0069] to-[#7638FA]">
                        JOBREEL
                    </span>
                </Link>

                <div className="flex-1 max-w-md hidden sm:block">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888] group-focus-within:text-[#FF0069] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search video roles..."
                            className="w-full bg-[#111111] border border-[#1F1F1F] rounded-2xl pl-12 pr-4 py-2.5 text-sm focus:border-[#FF0069] outline-none transition-all placeholder:text-[#444444]"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="w-10 h-10 rounded-xl bg-[#111111] border border-[#1F1F1F] flex items-center justify-center text-[#888888] hover:text-white transition-colors sm:hidden">
                        <Search className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 rounded-xl bg-[#111111] border border-[#1F1F1F] flex items-center justify-center text-[#888888] hover:text-white transition-colors relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#FFD600] rounded-full border-2 border-black" />
                    </button>
                    <button className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#FF0069] to-[#7638FA] p-[1px] group transition-all hover:shadow-[0_0_15px_rgba(255,0,105,0.3)]">
                        <div className="w-full h-full bg-[#111111] rounded-[11px] flex items-center justify-center text-[#888888] group-hover:text-white">
                            <SlidersHorizontal className="w-4 h-4" />
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
}
