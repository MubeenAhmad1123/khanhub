'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { listStaffCards, type StaffCardRow, type StaffDept } from '@/lib/hq/superadmin/staff';
import { toast } from 'react-hot-toast';
import { Loader2, Plus, Trash2, Download, Search, CheckCircle, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';

// Department Display Name Mapping
const DEPT_DISPLAY_NAME: Record<string, string> = {
  hq: 'Khan Hub Head Office',
  rehab: 'Khan Hub Rehab Center',
  hospital: 'Khan Hub Medical Center',
  spims: 'SPIMS',
  sukoon: 'Khan Hub Sukoon Center',
  welfare: 'Khan Hub Welfare',
  'job-center': 'Khan Hub Job Center',
  'social-media': 'Khan Hub Marketing Agency',
  it: 'Khan Hub IT Department',
};

// Date Formatter Helper (YYYY-MM-DD -> DD/MM/YYYY)
const formatToDMY = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function FineLetterGenerator() {
  const [staffList, setStaffList] = useState<StaffCardRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Staff Dropdown States
  const [selectedStaff, setSelectedStaff] = useState<StaffCardRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Form State
  const [form, setForm] = useState({
    employeeName: '',
    designation: '',
    department: '',
    referenceNumber: '',
    date: new Date().toISOString().split('T')[0], // Default to today YYYY-MM-DD
    administration: '',
    subject: 'Fine Notice and Warning for Not Wearing Uniform',
    body: '',
  });

  const [violations, setViolations] = useState<{ description: string; amount: number }[]>([
    { description: 'Failure to wear designated uniform on duty', amount: 500 }
  ]);

  // Fetch all staff members on mount
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoadingStaff(true);
        const unified = await listStaffCards({
          dept: 'all',
          status: 'active',
          role: 'personnel',
          fullEnrichment: false
        });
        unified.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setStaffList(unified);
      } catch (err) {
        console.error('Error fetching staff cards:', err);
        toast.error('Failed to load staff list');
      } finally {
        setLoadingStaff(false);
      }
    };
    fetchStaff();
  }, []);

  // Filter staff list based on search query
  const filteredStaff = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return staffList.slice(0, 10);
    return staffList.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.employeeId && s.employeeId.toLowerCase().includes(query))
    );
  }, [searchQuery, staffList]);

  // Handle staff selection
  const handleSelectStaff = (s: StaffCardRow) => {
    setSelectedStaff(s);
    setSearchQuery(s.name);
    setIsDropdownOpen(false);

    const deptName = DEPT_DISPLAY_NAME[s.dept] || s.dept || '';
    setForm(prev => ({
      ...prev,
      employeeName: s.name,
      designation: s.designation || 'Staff',
      department: deptName,
      referenceNumber: s.employeeId || s.staffId || '',
      administration: deptName,
      body: `It has been observed that ${s.name} was found in direct violation of the professional conduct guidelines. This letter serves as a formal warning regarding the infraction. Please ensure strict adherence to all organizational rules and standard operating procedures moving forward. Failure to comply may lead to further disciplinary actions.`
    }));
  };

  // Add violation row
  const addViolationRow = () => {
    setViolations([...violations, { description: '', amount: 0 }]);
  };

  // Remove violation row
  const removeViolationRow = (index: number) => {
    if (violations.length > 1) {
      setViolations(violations.filter((_, i) => i !== index));
    }
  };

  // Update violation row field
  const updateViolationRow = (index: number, field: 'description' | 'amount', value: string | number) => {
    const updated = [...violations];
    if (field === 'amount') {
      const num = parseInt(value as string, 10);
      updated[index].amount = isNaN(num) ? 0 : num;
    } else {
      updated[index].description = value as string;
    }
    setViolations(updated);
  };

  // Calculate total fine payable
  const totalFinePayable = useMemo(() => {
    return violations.reduce((sum, v) => sum + v.amount, 0);
  }, [violations]);

  // Validation
  const isValid = useMemo(() => {
    if (!selectedStaff) return false;
    if (!form.referenceNumber.trim()) return false;
    if (!form.date) return false;
    if (!form.subject.trim()) return false;
    if (violations.length === 0) return false;
    const hasInvalidViolation = violations.some(v => !v.description.trim() || v.amount <= 0);
    if (hasInvalidViolation) return false;
    return true;
  }, [selectedStaff, form, violations]);

  // Download image functionality
  const downloadImage = async () => {
    if (!isValid || !selectedStaff) return;
    const element = document.getElementById('fine-letter-preview');
    if (!element) return;

    try {
      setDownloading(true);
      // Wait a moment to ensure images load
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `fine-letter-${form.referenceNumber}-${form.date}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Fine letter downloaded successfully!');
    } catch (err) {
      console.error('Error generating image:', err);
      toast.error('Failed to generate image');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* LEFT SIDE: FORM */}
      <div className="xl:col-span-5 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-3xl p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Letter Details</h2>
          <p className="text-xs text-slate-400 mt-1">Fill out the disciplinary fine letter parameters</p>
        </div>

        {/* Employee Selector Dropdown */}
        <div className="space-y-2 relative">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select Staff Member *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder={loadingStaff ? "Loading staff list..." : "Type staff name or ID..."}
              value={searchQuery}
              disabled={loadingStaff}
              onFocus={() => setIsDropdownOpen(true)}
              onBlur={() => setTimeout(() => {
                if (selectedStaff) {
                  setSearchQuery(selectedStaff.name);
                }
                setIsDropdownOpen(false);
              }, 200)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400"
            />
            {loadingStaff && (
              <div className="absolute right-3.5 top-3.5">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              </div>
            )}
          </div>

          {isDropdownOpen && filteredStaff.length > 0 && (
            <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-100 shadow-xl rounded-2xl max-h-60 overflow-y-auto overflow-x-hidden">
              {filteredStaff.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectStaff(s)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{s.name}</p>
                    <p className="text-[10px] font-semibold text-slate-400 truncate">
                      {s.designation || 'Staff'} • {DEPT_DISPLAY_NAME[s.dept] || s.dept}
                    </p>
                  </div>
                  <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-mono">
                    {s.employeeId || 'No ID'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Staff Info Summary Cards */}
        {selectedStaff && (
          <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Designation</p>
              <p className="text-xs font-black text-slate-800 mt-0.5">{form.designation}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</p>
              <p className="text-xs font-black text-slate-800 mt-0.5">{form.department}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Reference Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Ref Number *</label>
            <input
              type="text"
              value={form.referenceNumber}
              placeholder="e.g. WELFARE-ST-002"
              onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Letter Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all"
            />
          </div>
        </div>

        {/* Administration Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Administration *</label>
          <input
            type="text"
            value={form.administration}
            placeholder="e.g. Khan Hub Rehab Center"
            onChange={(e) => setForm({ ...form, administration: e.target.value })}
            className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all"
          />
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Subject *</label>
          <input
            type="text"
            value={form.subject}
            placeholder="Letter subject..."
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all"
          />
        </div>

        {/* Violation Rows */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Violations *</label>
            <button
              type="button"
              onClick={addViolationRow}
              className="text-xs font-black uppercase text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Violation
            </button>
          </div>

          <div className="space-y-3">
            {violations.map((v, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder="Violation description..."
                    value={v.description}
                    onChange={(e) => updateViolationRow(idx, 'description', e.target.value)}
                    className="w-full bg-white border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold">Fine Amount (Rs.):</span>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={v.amount || ''}
                      onChange={(e) => updateViolationRow(idx, 'amount', e.target.value)}
                      className="w-28 bg-white border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                {violations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeViolationRow(idx)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body Paragraph */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Body Paragraph *</label>
          <textarea
            rows={5}
            value={form.body}
            placeholder="Type warning text..."
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all leading-relaxed"
          />
        </div>

        {/* Total Fine live display */}
        <div className="flex justify-between items-center bg-slate-900 text-white px-5 py-4 rounded-2xl">
          <span className="text-xs font-bold uppercase tracking-wider opacity-85">Total Fine Calculated</span>
          <span className="text-lg font-black font-mono">Rs. {totalFinePayable}/-</span>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {!selectedStaff && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-100 p-3 rounded-2xl text-xs font-semibold mb-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Please select a staff member to enable download.</span>
            </div>
          )}
          <button
            type="button"
            disabled={!isValid || downloading}
            onClick={downloadImage}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Image...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download as Image (PNG)
              </>
            )}
          </button>
        </div>
      </div>

      {/* RIGHT SIDE: LIVE PREVIEW */}
      <div className="xl:col-span-7 space-y-4">
        <div className="bg-slate-100 border border-slate-200 rounded-3xl p-4 md:p-8 max-w-full overflow-auto">
          {/* Printable Letter container */}
          <div
            id="fine-letter-preview"
            className="w-[760px] mx-auto select-none relative font-sans leading-relaxed"
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              padding: '48px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)'
            }}
          >
            {/* Header section matching medical letterhead */}
            <div className="flex items-center gap-4 pb-4" style={{ borderBottom: '2px solid #0f172a' }}>
              <img
                src="/logo_for_fine_letter.webp"
                alt="Khan Hub Logo"
                className="w-16 h-16 object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-xl font-black tracking-tight leading-none uppercase" style={{ color: '#0f172a' }}>
                  KHAN HUB MEDICAL CENTER
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mt-1 leading-none" style={{ color: '#64748b' }}>
                  Group of Companies.
                </p>
              </div>
            </div>

            {/* Reference & Date Row */}
            <div className="flex justify-between items-center mt-6 text-xs" style={{ color: '#334155' }}>
              <div>
                <span className="font-bold">Reference number (Employee ID): </span>
                <span className="font-semibold">{form.referenceNumber || '—'}</span>
              </div>
              <div>
                <span className="font-bold">Date: </span>
                <span className="font-semibold">{formatToDMY(form.date) || '—'}</span>
              </div>
            </div>

            {/* Letter Title */}
            <div className="text-center mt-8">
              <h2 className="text-sm font-extrabold underline tracking-wider uppercase text-slate-950" style={{ color: '#0f172a' }}>
                FINE NOTICE & WARNING LETTER
              </h2>
            </div>

            {/* Recipient Details */}
            <div className="mt-8 space-y-1 text-xs">
              <p className="font-bold uppercase tracking-widest text-[9px]" style={{ color: '#475569' }}>To,</p>
              <p className="text-base font-black leading-tight" style={{ color: '#0f172a' }}>{form.employeeName || '—'}</p>
              <p className="text-xs font-semibold" style={{ color: '#64748b' }}>({form.designation || '—'})</p>
              <p className="text-xs font-bold uppercase tracking-wide pt-0.5" style={{ color: '#334155' }}>
                Department: {form.department || '—'}
              </p>
            </div>

            {/* Subject */}
            <div className="mt-6 py-3 text-xs leading-normal" style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
              <span className="font-bold uppercase tracking-wider text-[10px] mr-1.5" style={{ color: '#64748b' }}>Subject:</span>
              <span className="font-black text-xs" style={{ color: '#1e293b' }}>{form.subject || '—'}</span>
            </div>

            {/* Body text */}
            <div className="mt-6 text-xs leading-relaxed text-justify whitespace-pre-wrap" style={{ color: '#1e293b' }}>
              {form.body || 'Please select staff member and enter the text...'}
            </div>

            {/* Violations Table */}
            <div className="mt-8">
              <table className="w-full text-left text-xs border-collapse" style={{ border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr className="text-[10px] uppercase font-bold tracking-wider" style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
                    <th className="px-4 py-2.5" style={{ border: '1px solid #cbd5e1' }}>Violation</th>
                    <th className="px-4 py-2.5 text-right w-44" style={{ border: '1px solid #cbd5e1' }}>Fine Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v, i) => (
                    <tr key={i} className="font-semibold" style={{ color: '#1e293b' }}>
                      <td className="px-4 py-2.5" style={{ border: '1px solid #cbd5e1' }}>{v.description || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono" style={{ border: '1px solid #cbd5e1' }}>Rs. {v.amount}/-</td>
                    </tr>
                  ))}
                  <tr className="font-black" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
                    <td className="px-4 py-2.5 text-right" style={{ border: '1px solid #cbd5e1' }}>Total Fine Payable</td>
                    <td className="px-4 py-2.5 text-right font-mono" style={{ border: '1px solid #cbd5e1' }}>Rs. {totalFinePayable}/-</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Callout section */}
            <div className="mt-6 p-4 text-center rounded-xl" style={{ border: '2px solid #0f172a', backgroundColor: 'rgba(248, 250, 252, 0.4)' }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>Total Fine Payable</p>
              <p className="text-xl font-black tracking-wide mt-1" style={{ color: '#0f172a' }}>Rs. {totalFinePayable}/-</p>
            </div>

            {/* Footer Signatures */}
            <div className="mt-14 pt-6" style={{ borderTop: '1px solid #cbd5e1' }}>
              <div className="flex justify-between items-start">
                {/* Left: Admin */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest leading-none" style={{ color: '#94a3b8' }}>Administration</p>
                  <p className="text-xs font-black leading-tight" style={{ color: '#1e293b' }}>{form.administration || '—'}</p>
                </div>

                {/* Right: Signature stamp */}
                <div className="text-center relative">
                  {/* Stamp graphic placement */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 pointer-events-none flex items-center justify-center">
                    <img
                      src="/stamp.webp"
                      alt="Authorized Stamp"
                      className="w-20 h-20 object-contain rotate-12"
                      style={{ opacity: 0.85 }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="w-52 pt-1.5" style={{ borderTop: '1px solid #94a3b8' }}>
                    <p className="text-xs font-black" style={{ color: '#1e293b' }}>Authorized Signature</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: '#94a3b8' }}>&amp; Official Stamp</p>
                    <p className="text-[9px] font-semibold mt-1 font-mono" style={{ color: '#64748b' }}>
                      Date: {formatToDMY(form.date) || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
