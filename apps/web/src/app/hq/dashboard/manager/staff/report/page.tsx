// src/app/hq/dashboard/manager/staff/report/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import {
  Printer, ArrowLeft, CheckSquare, Square, Filter, Search,
  Users, RotateCcw, FileText, Layers, Loader2, Sparkles, Check,
  Clock, Shield, Building2, Phone, DollarSign, Award, Shirt
} from 'lucide-react';
import { listStaffCards, type StaffCardRow, type StaffDept } from '@/lib/hq/superadmin/staff';
import { toast } from 'react-hot-toast';

type ColumnKey =
  | 'employeeId'
  | 'name'
  | 'designation'
  | 'dept'
  | 'seniority'
  | 'dutyTime'
  | 'duties'
  | 'uniform'
  | 'phone'
  | 'status'
  | 'salary';

interface ColumnOption {
  key: ColumnKey;
  label: string;
  description: string;
  icon: any;
}

const AVAILABLE_COLUMNS: ColumnOption[] = [
  { key: 'employeeId', label: 'Staff ID', description: 'Employee / Staff Identification Number', icon: Shield },
  { key: 'name', label: 'Staff Name', description: 'Full Official Name', icon: Users },
  { key: 'designation', label: 'Designation', description: 'Job Title & Role', icon: Award },
  { key: 'dept', label: 'Department', description: 'Assigned Department / Node', icon: Building2 },
  { key: 'seniority', label: 'Seniority', description: 'Rank / Level (Senior, Mid, Junior)', icon: Layers },
  { key: 'dutyTime', label: 'Duty Timings', description: 'Shift Start & End Hours', icon: Clock },
  { key: 'duties', label: 'Assigned Duties', description: 'Specific Responsibilities & Shift Tasks', icon: FileText },
  { key: 'uniform', label: 'Uniform / Dress Code', description: 'Required Dress Code & Compliance', icon: Shirt },
  { key: 'phone', label: 'Emergency Contact', description: 'Contact Name & Phone Number', icon: Phone },
  { key: 'status', label: 'Current Status', description: 'Active & Today Attendance Status', icon: Check },
  { key: 'salary', label: 'Monthly Salary', description: 'Base Pay Amount (Manager Access)', icon: DollarSign },
];

export default function StaffReportGeneratorPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [staff, setStaff] = useState<StaffCardRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Controls
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortBy, setSortBy] = useState<'dept' | 'seniority' | 'name' | 'id'>('dept');
  const [groupByDept, setGroupByDept] = useState<boolean>(true);
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Checkbox field selection
  const [columns, setColumns] = useState<Record<ColumnKey, boolean>>({
    employeeId: true,
    name: true,
    designation: true,
    dept: true,
    seniority: true,
    dutyTime: true,
    duties: true,
    uniform: true,
    phone: false,
    status: true,
    salary: false,
  });

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'manager' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session) return;

    const fetchAllStaff = async () => {
      try {
        setLoading(true);
        const queryStatus = statusFilter === 'active' ? 'active' : statusFilter === 'inactive' ? 'inactive' : 'all';
        const data = await listStaffCards({
          dept: 'all',
          status: queryStatus as any,
          role: 'personnel',
          fullEnrichment: true,
        });
        setStaff(data);
      } catch (err) {
        console.error('Failed to load staff list for report:', err);
        toast.error('Failed to fetch staff matrix for report generation');
      } finally {
        setLoading(false);
      }
    };

    fetchAllStaff();
  }, [session, statusFilter]);

  const toggleColumn = (key: ColumnKey) => {
    setColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setPreset = (preset: 'all' | 'essential' | 'contact' | 'duty_uniform') => {
    if (preset === 'all') {
      setColumns({
        employeeId: true,
        name: true,
        designation: true,
        dept: true,
        seniority: true,
        dutyTime: true,
        duties: true,
        uniform: true,
        phone: true,
        status: true,
        salary: true,
      });
    } else if (preset === 'essential') {
      setColumns({
        employeeId: true,
        name: true,
        designation: true,
        dept: true,
        seniority: true,
        dutyTime: true,
        duties: false,
        uniform: false,
        phone: false,
        status: true,
        salary: false,
      });
    } else if (preset === 'contact') {
      setColumns({
        employeeId: true,
        name: true,
        designation: true,
        dept: true,
        seniority: true,
        dutyTime: false,
        duties: false,
        uniform: false,
        phone: true,
        status: true,
        salary: false,
      });
    } else if (preset === 'duty_uniform') {
      setColumns({
        employeeId: true,
        name: true,
        designation: true,
        dept: true,
        seniority: false,
        dutyTime: true,
        duties: true,
        uniform: true,
        phone: false,
        status: true,
        salary: false,
      });
    }
  };

  const getSeniorityRank = (seniority?: string, desig?: string): number => {
    const s = String(seniority || '').toLowerCase();
    const d = String(desig || '').toLowerCase();
    if (s.includes('senior') || d.includes('senior') || d.includes('executive') || d.includes('director') || d.includes('head') || d.includes('admin') || d.includes('administrator')) return 10;
    if (d.includes('manager') || s.includes('managerial') || s.includes('lead') || d.includes('lead')) return 9;
    if (d.includes('supervisor') || s.includes('mid') || s.includes('supervisor')) return 8;
    if (d.includes('doctor') || d.includes('clinical') || d.includes('physiotherapist')) return 7;
    if (d.includes('nurse') || d.includes('teacher') || d.includes('lecturer') || d.includes('counselor') || d.includes('personnel')) return 6;
    if (d.includes('worker') || d.includes('junior') || s.includes('junior')) return 5;
    if (d.includes('contract')) return 4;
    if (d.includes('trial')) return 3;
    if (d.includes('internee') || d.includes('intern') || s.includes('internee') || s.includes('fresher')) return 2;
    if (d.includes('volunteer') || s.includes('volunteer')) return 1;
    return 5;
  };

  const getDeptLabel = (dept?: string) => {
    if (!dept) return 'N/A';
    switch (dept.toLowerCase()) {
      case 'hq': return 'HQ Command';
      case 'rehab': return 'Rehab Node';
      case 'spims': return 'SPIMS Node';
      case 'hospital': return 'Medical Node';
      case 'sukoon': return 'Sukoon Node';
      case 'welfare': return 'Welfare Node';
      case 'job-center': return 'Workforce Node';
      case 'social-media': return 'Broadcast Node';
      case 'it': return 'Digital Node';
      default: return dept.toUpperCase();
    }
  };

  const filteredStaff = useMemo(() => {
    let result = staff.filter(s => {
      const matchesSearch =
        search === '' ||
        (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.designation || '').toLowerCase().includes(search.toLowerCase());

      const matchesDept = deptFilter === 'all' || s.dept === deptFilter;
      return matchesSearch && matchesDept;
    });

    if (sortBy === 'dept') {
      result.sort((a, b) => {
        const deptComp = (a.dept || '').localeCompare(b.dept || '');
        if (deptComp !== 0) return deptComp;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (sortBy === 'seniority') {
      result.sort((a, b) => {
        const rankA = getSeniorityRank(a.seniority, a.designation);
        const rankB = getSeniorityRank(b.seniority, b.designation);
        if (rankA !== rankB) return rankB - rankA;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (sortBy === 'id') {
      const extractNum = (str?: string) => {
        const m = (str || '').match(/\d+/);
        return m ? parseInt(m[0], 10) : Infinity;
      };
      result.sort((a, b) => {
        const idA = extractNum(a.employeeId);
        const idB = extractNum(b.employeeId);
        if (idA !== idB) return idA - idB;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return result;
  }, [staff, search, deptFilter, sortBy]);

  const groupedStaff = useMemo(() => {
    if (!groupByDept) return { 'All Staff': filteredStaff };
    const groups: Record<string, StaffCardRow[]> = {};
    filteredStaff.forEach(s => {
      const dLabel = getDeptLabel(s.dept);
      if (!groups[dLabel]) groups[dLabel] = [];
      groups[dLabel].push(s);
    });
    return groups;
  }, [filteredStaff, groupByDept]);

  const handlePrint = () => {
    window.print();
  };

  const formatDutyString = (row: StaffCardRow) => {
    if (row.dutyConfig && row.dutyConfig.length > 0) {
      return row.dutyConfig.map(d => d.label || d.key).join(', ');
    }
    if (row.lastDutyLabel) return row.lastDutyLabel;
    return 'Standard Departmental Shift Duties';
  };

  const formatUniformString = (row: StaffCardRow) => {
    if (row.dressCodeConfig && row.dressCodeConfig.length > 0) {
      return row.dressCodeConfig.map(d => d.label || d.key).join(', ');
    }
    return 'Standard Staff Uniform & Badge';
  };

  const formatDutyTime = (row: StaffCardRow) => {
    if (row.dutyStartTime && row.dutyEndTime) {
      return `${row.dutyStartTime} - ${row.dutyEndTime}`;
    }
    if (row.dutyStartTime) return `From ${row.dutyStartTime}`;
    return '09:00 AM - 05:00 PM';
  };

  const formatSalary = (amount?: number) => {
    if (!amount) return 'PKR 0';
    return `PKR ${amount.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 print:bg-white print:pb-0 print:text-black">
      {/* Dynamic CSS for Print Orientation */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 ${printOrientation};
            margin: 8mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            font-size: 10pt;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 10px !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #222 !important;
            padding: 6px 8px !important;
            font-size: 9pt !important;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            color: #000 !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
          }
          .print-row {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Screen Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Link
              href="/hq/dashboard/manager/staff"
              className="p-2.5 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
              title="Back to Staff List"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-extrabold text-[10px] uppercase tracking-wider">
                  Manager Tools
                </span>
                <span className="text-xs font-semibold text-slate-400">A4 Printable Roster</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Staff Roster & Report Generator
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              disabled={loading || filteredStaff.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Printer size={18} />
              <span>Print A4 Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8">
        {/* Controls & Configuration Panel (Hidden on Print) */}
        <section className="no-print space-y-6 mb-8">
          {/* Column Checkbox Selection Cards */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <CheckSquare className="text-blue-600" size={20} />
                  <span>Select Fields to Include in Printed Report</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Check or uncheck fields to customize the generated table columns for A4 printing.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Presets:</span>
                <button
                  onClick={() => setPreset('duty_uniform')}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-all"
                >
                  Duties & Uniform
                </button>
                <button
                  onClick={() => setPreset('essential')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  Essential Roster
                </button>
                <button
                  onClick={() => setPreset('contact')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  Contact List
                </button>
                <button
                  onClick={() => setPreset('all')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-all"
                >
                  Select All
                </button>
              </div>
            </div>

            {/* Grid of Checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {AVAILABLE_COLUMNS.map(col => {
                const isSelected = columns[col.key];
                const IconComponent = col.icon;
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggleColumn(col.key)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-300 text-blue-900 shadow-sm'
                        : 'bg-slate-50/50 border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 p-1 rounded-md ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {isSelected ? <Check size={14} strokeWidth={3} /> : <Square size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <IconComponent size={14} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                        <span className={`text-xs font-black truncate ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                          {col.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                        {col.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtering, Sorting & Layout Controls */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="text-slate-700" size={18} />
                <span>Filters, Sorting & Paper Layout</span>
              </h3>
              <span className="text-xs font-bold text-slate-400">
                Found {filteredStaff.length} matching personnel
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Search Staff
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search name, ID, title..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Department Filter */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Department
                </label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer"
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                >
                  <option value="all">All Departments</option>
                  <option value="hq">HQ Command</option>
                  <option value="rehab">Rehab Node</option>
                  <option value="spims">SPIMS Node</option>
                  <option value="hospital">Medical Node</option>
                  <option value="sukoon">Sukoon Node</option>
                  <option value="welfare">Welfare Node</option>
                  <option value="job-center">Workforce Node</option>
                  <option value="social-media">Broadcast Node</option>
                  <option value="it">Digital Node</option>
                </select>
              </div>

              {/* Sorting */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Sort Order
                </label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                >
                  <option value="dept">Sort by Department</option>
                  <option value="seniority">Sort by Staff Seniority</option>
                  <option value="name">Sort by Name (A-Z)</option>
                  <option value="id">Sort by Staff ID</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Personnel Status
                </label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="active">Active Personnel Only</option>
                  <option value="inactive">Inactive Personnel</option>
                  <option value="all">All Records</option>
                </select>
              </div>
            </div>

            {/* Display / Print Options Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-6">
                {/* Grouping Toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupByDept}
                    onChange={e => setGroupByDept(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Group Tables by Department
                  </span>
                </label>

                {/* Print Orientation */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">A4 Orientation:</span>
                  <div className="inline-flex rounded-xl bg-slate-100 p-1">
                    <button
                      onClick={() => setPrintOrientation('landscape')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        printOrientation === 'landscape' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Landscape
                    </button>
                    <button
                      onClick={() => setPrintOrientation('portrait')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        printOrientation === 'portrait' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Portrait
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-400">
                Active Columns: {Object.values(columns).filter(Boolean).length} / {AVAILABLE_COLUMNS.length}
              </div>
            </div>
          </div>
        </section>

        {/* Printable Document Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-2xl shadow-slate-200/60 print:p-0 print:border-none print:shadow-none print:bg-transparent">
          {/* Print Header (Visible on print & screen preview) */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-base flex items-center justify-center print:bg-black print:text-white">
                  KH
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight leading-none">
                    KhanHub Personnel Roster
                  </h1>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1 print:text-slate-700">
                    Official Staff Record & Shift Duty Master Matrix
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-extrabold text-slate-900 uppercase">
                Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                Total Personnel: <span className="text-slate-900 font-black">{filteredStaff.length}</span>
              </p>
              <p className="text-[9px] font-semibold text-slate-400 mt-0.5 print:block hidden">
                Filtered: {deptFilter !== 'all' ? getDeptLabel(deptFilter) : 'All Departments'}
              </p>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-xs font-extrabold uppercase tracking-wider">Compiling Staff Matrix...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Users size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No staff members match the selected criteria.</p>
              <p className="text-xs">Try clearing your search query or selecting a different department filter.</p>
            </div>
          ) : (
            /* Render Grouped or Single Tables */
            <div className="space-y-8">
              {Object.entries(groupedStaff).map(([deptGroupTitle, staffGroup]) => (
                <div key={deptGroupTitle} className="space-y-3 print-row">
                  {groupByDept && (
                    <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2 rounded-xl print:bg-slate-800 print:text-white print:rounded-none">
                      <h3 className="text-xs font-black uppercase tracking-wider">
                        {deptGroupTitle}
                      </h3>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-white/20">
                        {staffGroup.length} Staff
                      </span>
                    </div>
                  )}

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse print-table">
                      <thead>
                        <tr className="bg-slate-100 text-slate-900 border-y border-slate-300 text-[10px] font-black uppercase tracking-wider">
                          <th className="py-3 px-3 w-10 text-center">#</th>
                          {columns.employeeId && <th className="py-3 px-3 whitespace-nowrap">Staff ID</th>}
                          {columns.name && <th className="py-3 px-3">Staff Name</th>}
                          {columns.designation && <th className="py-3 px-3">Designation</th>}
                          {columns.dept && !groupByDept && <th className="py-3 px-3">Department</th>}
                          {columns.seniority && <th className="py-3 px-3">Seniority</th>}
                          {columns.dutyTime && <th className="py-3 px-3 whitespace-nowrap">Duty Hours</th>}
                          {columns.duties && <th className="py-3 px-3">Assigned Duties</th>}
                          {columns.uniform && <th className="py-3 px-3">Dress Code / Uniform</th>}
                          {columns.phone && <th className="py-3 px-3">Phone / Contact</th>}
                          {columns.salary && <th className="py-3 px-3 text-right">Monthly Salary</th>}
                          {columns.status && <th className="py-3 px-3 text-center">Status</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {staffGroup.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition-colors print-row">
                            <td className="py-2.5 px-3 font-extrabold text-slate-400 text-center text-[10px]">
                              {idx + 1}
                            </td>

                            {columns.employeeId && (
                              <td className="py-2.5 px-3 font-mono font-black text-slate-800 whitespace-nowrap">
                                {row.employeeId || row.staffId || 'N/A'}
                              </td>
                            )}

                            {columns.name && (
                              <td className="py-2.5 px-3 font-black text-slate-900 whitespace-nowrap">
                                {row.name}
                              </td>
                            )}

                            {columns.designation && (
                              <td className="py-2.5 px-3 font-bold text-slate-700 whitespace-nowrap">
                                {row.designation || 'Specialist'}
                              </td>
                            )}

                            {columns.dept && !groupByDept && (
                              <td className="py-2.5 px-3 font-bold text-slate-600 whitespace-nowrap">
                                {getDeptLabel(row.dept)}
                              </td>
                            )}

                            {columns.seniority && (
                              <td className="py-2.5 px-3 font-bold text-slate-700 capitalize whitespace-nowrap">
                                {row.seniority || 'Standard'}
                              </td>
                            )}

                            {columns.dutyTime && (
                              <td className="py-2.5 px-3 font-bold text-slate-700 whitespace-nowrap">
                                {formatDutyTime(row)}
                              </td>
                            )}

                            {columns.duties && (
                              <td className="py-2.5 px-3 font-medium text-slate-700 min-w-[160px]">
                                {formatDutyString(row)}
                              </td>
                            )}

                            {columns.uniform && (
                              <td className="py-2.5 px-3 font-medium text-slate-700 min-w-[140px]">
                                {formatUniformString(row)}
                              </td>
                            )}

                            {columns.phone && (
                              <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                                {row.emergencyPhone || row.emergencyContactName ? (
                                  <div>
                                    <div className="font-bold">{row.emergencyPhone || 'N/A'}</div>
                                    {row.emergencyContactName && (
                                      <div className="text-[10px] text-slate-400">({row.emergencyContactName})</div>
                                    )}
                                  </div>
                                ) : (
                                  'N/A'
                                )}
                              </td>
                            )}

                            {columns.salary && (
                              <td className="py-2.5 px-3 font-extrabold text-slate-900 text-right whitespace-nowrap">
                                {formatSalary(row.monthlySalary)}
                              </td>
                            )}

                            {columns.status && (
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                    row.status === 'active' || row.isActive !== false
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                                  }`}
                                >
                                  {row.status || 'Active'}
                                </span>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Print Footer */}
          <div className="mt-10 pt-4 border-t border-slate-300 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest print:flex">
            <div>KhanHub Management Systems — Confidential Roster</div>
            <div>Generated by: {session?.name || 'Manager'}</div>
            <div>Printed on A4</div>
          </div>
        </div>
      </main>
    </div>
  );
}
