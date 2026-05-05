'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Building, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { DEPARTMENTS } from '@/data/departments';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'department' | 'program' | 'course';
  href: string;
  icon?: string;
  category?: string;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten departments and programs for searching
  const searchableData = useMemo(() => {
    const data: SearchResult[] = [];

    DEPARTMENTS.forEach((dept) => {
      // Add Department
      data.push({
        id: `dept-${dept.slug}`,
        title: dept.name,
        description: dept.tagline || dept.description,
        type: 'department',
        href: `/departments/${dept.slug}`,
        icon: dept.icon,
        category: typeof dept.category === 'string' ? dept.category : dept.category[0]
      });

      // Add Programs
      if (dept.programs) {
        dept.programs.forEach((prog) => {
          if (typeof prog === 'string') {
            data.push({
              id: `prog-${dept.slug}-${prog.toLowerCase().replace(/\s+/g, '-')}`,
              title: prog,
              type: 'program',
              href: `/departments/${dept.slug}`,
              icon: '📋'
            });
          } else {
            data.push({
              id: `prog-${dept.slug}-${prog.slug}`,
              title: prog.name,
              description: prog.description,
              type: 'program',
              href: `/departments/${dept.slug}/${prog.slug}`,
              icon: '📋'
            });
          }
        });
      }

      // Add Courses from Sub-departments
      if (dept.subDepartments) {
        dept.subDepartments.forEach((sub) => {
          if (sub.courses) {
            sub.courses.forEach((course) => {
              data.push({
                id: `course-${dept.slug}-${course.slug}`,
                title: course.name,
                description: course.description,
                type: 'course',
                href: `/departments/${dept.slug}/${course.slug}`,
                icon: '🎓'
              });
            });
          }
        });
      }
    });

    return data;
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return searchableData.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) || 
      item.description?.toLowerCase().includes(lowerQuery) ||
      item.category?.toLowerCase().includes(lowerQuery)
    ).slice(0, 8); // Limit results
  }, [query, searchableData]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 sm:pt-32 px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Search Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 slide-in-from-top-10 duration-300">
        <div className="p-4 sm:p-6">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-6 h-6 text-neutral-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search departments, courses, programs..."
              className="w-full pl-14 pr-12 py-4 bg-neutral-100 border-none rounded-2xl text-lg font-bold text-neutral-900 focus:ring-4 focus:ring-primary-500/10 placeholder:text-neutral-400 transition-all"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsSearching(true);
                setTimeout(() => setIsSearching(false), 300);
              }}
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute right-4 p-1 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            )}
          </div>

          {/* Results Area */}
          <div className="mt-6 min-h-[100px] max-h-[60vh] overflow-y-auto custom-scrollbar">
            {!query && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-neutral-300" />
                </div>
                <p className="text-neutral-500 font-bold">Start typing to search across Khan Hub</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {['Medical', 'Education', 'Job Placement', 'Rehab'].map(tag => (
                    <button 
                      key={tag}
                      onClick={() => setQuery(tag)}
                      className="px-4 py-2 bg-neutral-50 hover:bg-primary-50 border border-neutral-200 hover:border-primary-200 rounded-xl text-xs font-black text-neutral-600 hover:text-primary-600 uppercase tracking-widest transition-all"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {query && results.length === 0 && !isSearching && (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-red-200" />
                </div>
                <p className="text-neutral-900 font-black text-xl mb-1">No results found</p>
                <p className="text-neutral-500">We couldn't find anything matching "{query}"</p>
              </div>
            )}

            {query && results.length > 0 && (
              <div className="space-y-2 pb-4">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] px-4 mb-4">
                  {results.length} Search Results
                </p>
                {results.map((result) => (
                  <Link
                    key={result.id}
                    href={result.href}
                    onClick={onClose}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-primary-50 group transition-all border border-transparent hover:border-primary-100"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white border-2 border-neutral-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">
                      {result.icon || (result.type === 'department' ? '🏢' : '📄')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-black text-neutral-900 line-clamp-1 group-hover:text-primary-700 transition-colors">
                          {result.title}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                          result.type === 'department' ? "bg-blue-100 text-blue-600" : 
                          result.type === 'program' ? "bg-purple-100 text-purple-600" :
                          "bg-emerald-100 text-emerald-600"
                        )}>
                          {result.type}
                        </span>
                      </div>
                      {result.description && (
                        <p className="text-xs text-neutral-500 line-clamp-1">
                          {result.description}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-primary-500 transition-all group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 border-t border-neutral-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold">
              <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded shadow-sm text-neutral-600 font-sans">ESC</kbd>
              to close
            </div>
          </div>
          <LogoIcon />
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}

function LogoIcon() {
  return (
    <div className="flex items-center gap-2 opacity-30">
      <div className="w-5 h-5 bg-primary-600 rounded-md" />
      <span className="text-xs font-black tracking-tighter">KHANHUB</span>
    </div>
  );
}
