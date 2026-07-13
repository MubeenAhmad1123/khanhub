'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight, CornerDownLeft, Sparkles, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HqRole } from '@/types/hq';

// Define the searchable page type
interface SearchablePage {
  title: string;
  category: 'Pages' | 'Departments' | 'Actions';
  href: string;
  description: string;
  roles?: HqRole[];
}

const SEARCHABLE_PAGES: SearchablePage[] = [
  // Superadmin Pages
  { title: 'Superadmin Overview', category: 'Pages', href: '/hq/dashboard/superadmin', description: 'Central statistics and system health dashboard', roles: ['superadmin'] },
  { title: 'Superadmin Analytics', category: 'Pages', href: '/hq/dashboard/superadmin/analytics', description: 'Detailed financial and operations growth analytics', roles: ['superadmin'] },
  { title: 'Superadmin Approvals', category: 'Pages', href: '/hq/dashboard/superadmin/approvals', description: 'Approve or reject pending cashier submissions', roles: ['superadmin'] },
  { title: 'Superadmin Finance Control', category: 'Pages', href: '/hq/dashboard/superadmin/finance', description: 'HQ cash ledger, inflows, and outflows', roles: ['superadmin'] },
  { title: 'All HQ Users', category: 'Pages', href: '/hq/dashboard/superadmin/users', description: 'Manage HQ system users, roles, and status', roles: ['superadmin'] },
  { title: 'Departments Management', category: 'Pages', href: '/hq/dashboard/superadmin/departments', description: 'Manage branch departments and sync details', roles: ['superadmin'] },
  { title: 'SPIMS Central Portal', category: 'Pages', href: '/hq/dashboard/superadmin/spims', description: 'Central SPIMS administration and status', roles: ['superadmin'] },
  { title: 'HQ Staff List', category: 'Pages', href: '/hq/dashboard/superadmin/staff', description: 'List of all system staff and management', roles: ['superadmin'] },
  { title: 'Growth Ideas & Feedback', category: 'Pages', href: '/hq/dashboard/superadmin/growth-ideas', description: 'View suggestions, ideas, and feedback logs', roles: ['superadmin'] },
  { title: 'Security Audit Log', category: 'Pages', href: '/hq/dashboard/superadmin/audit', description: 'Real-time security auditing and event logs', roles: ['superadmin'] },
  { title: 'EOD Reconciliation Control', category: 'Pages', href: '/hq/dashboard/superadmin/reconciliation', description: 'Review cashier daily settlements and variance notes', roles: ['superadmin'] },
  { title: 'Passwords & Credentials', category: 'Pages', href: '/hq/dashboard/superadmin/passwords', description: 'View and manage critical department account credentials', roles: ['superadmin'] },
  { title: 'Superadmin Settings', category: 'Pages', href: '/hq/dashboard/superadmin/settings', description: 'HQ global settings and configurations', roles: ['superadmin'] },
  
  // Manager Pages
  { title: 'Manager Overview', category: 'Pages', href: '/hq/dashboard/manager', description: 'HQ manager central statistics and actions overview', roles: ['manager'] },
  { title: 'Staff List Control', category: 'Pages', href: '/hq/dashboard/manager/staff', description: 'Manage branch staff profiles and details', roles: ['manager'] },
  { title: 'Mark Attendance Log', category: 'Pages', href: '/hq/dashboard/manager/staff/attendance', description: 'Mark and view daily staff attendance', roles: ['manager'] },
  { title: 'Manager Contributions & Approvals', category: 'Pages', href: '/hq/dashboard/manager/approvals', description: 'Verify and process staff contributions', roles: ['manager'] },
  { title: 'Suggest Growth Ideas', category: 'Pages', href: '/hq/dashboard/manager/growth-ideas', description: 'Submit ideas, proposals, and feedback to Superadmin', roles: ['manager'] },
  { title: 'HQ Salary Slips', category: 'Pages', href: '/hq/dashboard/manager/salary', description: 'Generate and review monthly salary slips', roles: ['manager'] },
  { title: 'Payroll & Fines Control', category: 'Pages', href: '/hq/dashboard/manager/payroll', description: 'Manage EOD payroll, bonuses, and penalties', roles: ['manager'] },
  { title: 'Manager Reports Centre', category: 'Pages', href: '/hq/dashboard/manager/reports', description: 'Generate daily audit, cashier, and department reports', roles: ['manager'] },
  { title: 'Manager Profile Settings', category: 'Pages', href: '/hq/dashboard/manager/profile', description: 'Manage manager profile information and custom ID', roles: ['manager'] },
  { title: 'Create Accounts', category: 'Pages', href: '/hq/dashboard/manager/users', description: 'Provision new staff and cashier accounts', roles: ['manager'] },
  { title: 'Manager Credentials Vault', category: 'Pages', href: '/hq/dashboard/manager/passwords', description: 'Access branch credentials and security keys', roles: ['manager'] },

  // Cashier Pages
  { title: 'Cashier Terminal', category: 'Pages', href: '/hq/dashboard/cashier', description: 'HQ cashier main reception and transaction console', roles: ['cashier'] },
  { title: 'Daily Report Audit', category: 'Pages', href: '/hq/dashboard/cashier/daily-report', description: 'Generate daily financial reports and download PNG/Print', roles: ['superadmin', 'cashier'] },
  { title: 'Reconciliation Close', category: 'Pages', href: '/hq/dashboard/cashier/reconciliation', description: 'End-of-day settlement and cash reconciliation submission', roles: ['cashier'] },
  { title: 'All Cashier Transactions', category: 'Pages', href: '/hq/dashboard/cashier/history', description: 'View full transaction history ledger', roles: ['cashier'] },
  { title: 'Cashier Profile Settings', category: 'Pages', href: '/hq/dashboard/cashier/profile', description: 'Manage cashier account profile settings', roles: ['cashier'] },

  // Departmental Shortcuts (Superadmins)
  { title: 'Rehab Admin Portal', category: 'Departments', href: '/departments/rehab/dashboard/admin', description: 'Inpatients, finance, and settings for Rehab Center', roles: ['superadmin'] },
  { title: 'SPIMS College Portal', category: 'Departments', href: '/departments/spims/dashboard/admin', description: 'Student management, tests, attendance, and finance', roles: ['superadmin'] },
  { title: 'IT Systems Control', category: 'Departments', href: '/departments/it/dashboard/admin', description: 'HQ IT security keys and configurations', roles: ['superadmin'] },
  { title: 'Media Management Portal', category: 'Departments', href: '/departments/social-media/dashboard/admin', description: 'Social media traffic and campaign analytics', roles: ['superadmin'] },
  { title: 'Sukoon Shelter Portal', category: 'Departments', href: '/departments/sukoon/dashboard/admin', description: 'Sukoon shelter clients, finance, and EOD logs', roles: ['superadmin'] },
  { title: 'Welfare Central Portal', category: 'Departments', href: '/departments/welfare/dashboard/admin', description: 'Welfare orphans, donors, and donation ledger', roles: ['superadmin'] },
  { title: 'Hospital Admin Console', category: 'Departments', href: '/departments/hospital/dashboard/admin', description: 'Hospital patients, billing, USG, and OPD records', roles: ['superadmin'] },
  { title: 'Job Center Admin Console', category: 'Departments', href: '/departments/job-center/dashboard/admin', description: 'Jobseeker database, employer requests, and placements', roles: ['superadmin'] },
];

interface Props {
  userRole: HqRole;
  isOpen: boolean;
  onClose: () => void;
}

export default function HqGlobalSearch({ userRole, isOpen, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchablePage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Filter pages based on search query and user role
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    
    // Filter by role first
    const accessible = SEARCHABLE_PAGES.filter(p => !p.roles || p.roles.includes(userRole));

    if (!trimmed) {
      // Show default pages when query is empty
      setResults(accessible.slice(0, 5));
      return;
    }

    const filtered = accessible.filter(p => 
      p.title.toLowerCase().includes(trimmed) || 
      p.category.toLowerCase().includes(trimmed) || 
      p.description.toLowerCase().includes(trimmed)
    );

    setResults(filtered);
    setActiveIndex(0);
  }, [query, userRole]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIndex]) {
        handleNavigate(results[activeIndex].href);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleNavigate = (href: string) => {
    router.push(href);
    onClose();
  };

  // Close palette on backdrop click
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[10vh] px-4 md:px-0">
      <div 
        className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md animate-in fade-in duration-200" 
        onClick={onClose}
      />
      
      <div 
        className="w-full max-w-2xl bg-white border border-zinc-100 rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-200"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Area */}
        <div className="relative border-b border-zinc-100 p-5 flex items-center gap-3">
          <Search className="w-6 h-6 text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search pages, portals or EOD consoles..."
            className="flex-1 bg-transparent text-base font-bold text-zinc-900 outline-none placeholder:text-zinc-300"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2.5 py-1 bg-zinc-50 border border-zinc-150 rounded-lg text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">
            ESC
          </kbd>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-50 rounded-xl text-zinc-400 hover:text-zinc-950 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Scroll Area */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin"
        >
          {results.length > 0 ? (
            results.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  type="button"
                  key={item.href + index}
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    "w-full p-4 rounded-2xl flex items-center justify-between text-left transition-all border border-transparent",
                    isActive 
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-lg -translate-y-0.5" 
                      : "hover:bg-zinc-50 text-zinc-700"
                  )}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border",
                      isActive 
                        ? "bg-white/10 border-white/10 text-white" 
                        : "bg-zinc-50 border-zinc-100 text-zinc-400"
                    )}>
                      <Navigation size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black tracking-tight leading-none truncate block">
                          {item.title}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border",
                          isActive 
                            ? "bg-white/20 border-white/20 text-white" 
                            : "bg-zinc-100 border-zinc-150 text-zinc-500"
                        )}>
                          {item.category}
                        </span>
                      </div>
                      <p className={cn(
                        "text-[10px] font-bold mt-1 truncate block",
                        isActive ? "text-zinc-300" : "text-zinc-400"
                      )}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {isActive && (
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-400">
                        Go <CornerDownLeft size={10} />
                      </span>
                    )}
                    <ArrowRight className={cn(
                      "w-5 h-5 transition-transform",
                      isActive ? "text-white translate-x-1" : "text-zinc-300"
                    )} />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-12 text-center">
              <Sparkles className="w-8 h-8 text-zinc-300 mx-auto mb-3 animate-pulse" />
              <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">No matching results found</p>
              <p className="text-xs text-zinc-300 mt-1">Try searching for other terms like 'analytics', 'approvals' or 'cashier'</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-4 flex items-center justify-between text-[9px] font-black text-zinc-400 uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded">Enter</kbd> Select
            </span>
          </div>
          <span>Khan Hub Global Search Console</span>
        </div>
      </div>
    </div>
  );
}
