'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, arrayUnion, Timestamp, serverTimestamp } from 'firebase/firestore';
import { listStaffCards, getDeptPrefix, getDeptCollection, type StaffCardRow, type StaffDept } from '@/lib/hq/superadmin/staff';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { toast } from 'react-hot-toast';
import { 
  Loader2, Download, Search, CheckCircle2, AlertCircle, 
  UserMinus, FileText, ArrowRight, ShieldAlert, Sparkles, Building2, Calendar
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import Link from 'next/link';

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

// Common Presets for Termination Reasons
const TERMINATION_PRESETS = [
  {
    label: 'Violation of Code of Conduct',
    subject: 'Termination of Employment Contract - Code of Conduct Violation',
    reason: 'Serious and direct violation of the organizational code of conduct and standard disciplinary policies.',
    body: 'This letter serves as formal notification that your employment with Khan Hub is being terminated with immediate effect. This action has been taken due to documented violations of company policies and ethical standards. You are required to surrender all company assets, keys, identity cards, and equipment to the Administration immediately. Your final financial settlement will be cleared upon successful completion of the clearance process.'
  },
  {
    label: 'Negligence of Duty & Absenteeism',
    subject: 'Termination Notice - Continued Negligence of Duty and Unauthorized Absence',
    reason: 'Repeated unapproved absences, failure to adhere to duty schedule, and ongoing negligence in assigned responsibilities.',
    body: 'Following previous verbal and written notices regarding your attendance and duty performance, management has observed no satisfactory improvement. Consequently, your employment contract is terminated effective immediately. Please return all official belongings, documentation, and access cards to the administration office. Final dues will be released following departmental clearance.'
  },
  {
    label: 'Probation / Performance Evaluation',
    subject: 'Termination of Employment - Unsatisfactory Probationary Performance',
    reason: 'Inability to meet minimum required performance benchmarks during the probationary evaluation period.',
    body: 'During your evaluation period, your overall work performance and adherence to departmental standards were found to be below the required expectations. Management has therefore decided not to confirm your appointment and to terminate your employment. We thank you for your time with us and request you to complete the handover procedure with your supervisor.'
  },
  {
    label: 'Breach of Confidentiality & Trust',
    subject: 'Immediate Termination Notice - Breach of Trust and Disciplinary Misconduct',
    reason: 'Breach of company confidentiality agreements and engagement in actions detrimental to organizational integrity.',
    body: 'Due to severe disciplinary infractions and breach of trust concerning organizational integrity, your services are terminated with immediate effect. You are strictly advised to refrain from accessing any company systems or retaining proprietary materials. Official handover must be completed immediately.'
  },
  {
    label: 'Mutual Separation / Restructuring',
    subject: 'Official Notice of Contractual Termination and Relief of Duties',
    reason: 'Administrative restructuring and operational reorganization within the department.',
    body: 'As part of our organizational restructuring, this letter serves as formal notice of the conclusion of your employment contract with Khan Hub. We deeply appreciate your service and contributions. All final settlements, provident/service dues, and clearance documents will be prepared and handed over in accordance with company policy.'
  }
];

// Date Formatter Helper (YYYY-MM-DD -> DD/MM/YYYY)
const formatToDMY = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function TerminationLetterGenerator() {
  const { session } = useHqSession();
  const [staffList, setStaffList] = useState<StaffCardRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [terminatedSuccess, setTerminatedSuccess] = useState(false);
  const [attachedDocUrl, setAttachedDocUrl] = useState<string | null>(null);

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
    effectiveDate: new Date().toISOString().split('T')[0],
    lastWorkingDay: new Date().toISOString().split('T')[0],
    administration: '',
    letterTitle: 'EMPLOYMENT TERMINATION LETTER',
    subject: 'Notice of Termination of Employment Contract',
    reason: 'Violations of Company Code of Conduct & Disciplinary Policies',
    body: 'This letter serves as formal notification that your employment with Khan Hub is being terminated with immediate effect due to documented violations of company conduct policies. You are instructed to immediately surrender all company property, equipment, access cards, and keys to the Administration Department. Your final financial settlement will be disbursed upon receipt of the complete clearance certificate.',
    handoverRequired: true,
    severanceDetails: 'Final dues and clearance to be disbursed following standard admin audit.'
  });

  // Fetch all staff members on mount
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoadingStaff(true);
        const unified = await listStaffCards({
          dept: 'all',
          status: 'all',
          role: 'all',
          fullEnrichment: false
        });
        unified.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setStaffList(unified);

        // Check if there is a staffId query param in the URL
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const targetId = urlParams.get('staffId');
          if (targetId) {
            const found = unified.find(s => 
              s.id === targetId || 
              s.staffId === targetId || 
              s.employeeId === targetId ||
              s.id.endsWith(`_${targetId}`)
            );
            if (found) {
              handleSelectStaff(found);
            }
          }
        }
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
    if (!query) return staffList.slice(0, 15);
    return staffList.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.employeeId && s.employeeId.toLowerCase().includes(query)) ||
      (s.designation && s.designation.toLowerCase().includes(query)) ||
      (s.dept && s.dept.toLowerCase().includes(query))
    );
  }, [searchQuery, staffList]);

  // Handle staff selection
  const handleSelectStaff = (s: StaffCardRow) => {
    setSelectedStaff(s);
    setSearchQuery(s.name);
    setIsDropdownOpen(false);
    setTerminatedSuccess(s.status === 'terminated');
    setAttachedDocUrl(null);

    const deptName = DEPT_DISPLAY_NAME[s.dept] || s.dept || '';
    const ref = s.employeeId || s.staffId || `KH-${s.dept.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    setForm(prev => ({
      ...prev,
      employeeName: s.name,
      designation: s.designation || 'Staff',
      department: deptName,
      referenceNumber: ref,
      administration: deptName,
      body: `This letter serves as formal notification that your employment with Khan Hub (${deptName}) as ${s.designation || 'Staff'} is terminated, effective from ${formatToDMY(prev.effectiveDate)}. This decision has been finalized following thorough administrative review. You are required to immediately surrender all organizational assets, identification cards, and credentials to the Administration. Your final financial clearance will be processed upon completion of the handover procedure.`
    }));
  };

  // Apply Reason Preset
  const handleApplyPreset = (preset: typeof TERMINATION_PRESETS[0]) => {
    setForm(prev => ({
      ...prev,
      subject: preset.subject,
      reason: preset.reason,
      body: preset.body
    }));
    toast.success(`Applied template: ${preset.label}`);
  };

  // Validation
  const isValid = useMemo(() => {
    if (!selectedStaff) return false;
    if (!form.referenceNumber.trim()) return false;
    if (!form.date) return false;
    if (!form.effectiveDate) return false;
    if (!form.subject.trim()) return false;
    if (!form.reason.trim()) return false;
    if (!form.body.trim()) return false;
    return true;
  }, [selectedStaff, form]);

  // Execute Termination & Attach Letter to Profile
  const handleTerminateAndAttach = async () => {
    if (!isValid || !selectedStaff) return;

    const confirmMsg = `WARNING: Are you sure you want to terminate ${selectedStaff.name}?\n\nThis will:\n1. Change status from "${selectedStaff.status || 'active'}" to "TERMINATED" in the database.\n2. Attach the generated termination letter to ${selectedStaff.name}'s profile.\n3. Log the official termination record.`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      setTerminating(true);

      // 1. Generate image blob using html2canvas
      const element = document.getElementById('termination-letter-preview');
      let uploadedLetterUrl = '';

      if (element) {
        try {
          const canvas = await html2canvas(element, {
            scale: 2.2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
          });

          const blob = await new Promise<Blob | null>((resolve) => 
            canvas.toBlob((b) => resolve(b), 'image/png', 0.95)
          );

          if (blob) {
            const fileName = `termination_${form.referenceNumber}_${form.date}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            try {
              uploadedLetterUrl = await uploadToCloudinary(
                file, 
                `khanhub/staff/${selectedStaff.dept}/documents`,
                undefined,
                'image'
              );
            } catch (cloudErr) {
              console.warn('Cloudinary upload fallback to dataURL:', cloudErr);
              uploadedLetterUrl = canvas.toDataURL('image/png');
            }
          }
        } catch (canvasErr) {
          console.error('Canvas capture warning:', canvasErr);
        }
      }

      // 2. Identify correct Firestore document & prefix
      const prefix = getDeptPrefix(selectedStaff.dept as StaffDept);
      const userCol = getDeptCollection(selectedStaff.dept as StaffDept);

      let cleanUid = selectedStaff.staffId || selectedStaff.id;
      if (cleanUid.includes('_')) {
        cleanUid = cleanUid.split('_').pop() || cleanUid;
      }

      const userDocRef = doc(db, userCol, cleanUid);

      // 3. Update staff user document status to 'terminated' and add document to array
      const docPayload: any = {
        status: 'terminated',
        isActive: false,
        terminationDate: form.date,
        effectiveTerminationDate: form.effectiveDate,
        terminationReason: form.reason,
        terminationRef: form.referenceNumber,
        terminatedBy: session?.name || session?.customId || session?.email || 'Manager',
        updatedAt: serverTimestamp()
      };

      if (uploadedLetterUrl) {
        docPayload.documents = arrayUnion({
          title: `Termination Letter - Ref #${form.referenceNumber}`,
          url: uploadedLetterUrl,
          type: 'termination',
          date: form.date,
          createdAt: new Date().toISOString()
        });
      }

      await updateDoc(userDocRef, docPayload);

      // 4. Log in terminations audit collection
      const terminationLogRef = collection(db, `${prefix}_terminations`);
      await addDoc(terminationLogRef, {
        staffId: cleanUid,
        staffName: selectedStaff.name,
        dept: selectedStaff.dept,
        designation: form.designation,
        referenceNumber: form.referenceNumber,
        letterDate: form.date,
        effectiveDate: form.effectiveDate,
        lastWorkingDay: form.lastWorkingDay,
        subject: form.subject,
        reason: form.reason,
        body: form.body,
        letterUrl: uploadedLetterUrl || null,
        terminatedBy: session?.name || session?.customId || 'Manager',
        createdAt: Timestamp.now()
      });

      setTerminatedSuccess(true);
      setAttachedDocUrl(uploadedLetterUrl || null);
      toast.success(`${selectedStaff.name}'s status updated to Terminated and letter attached to profile!`);
    } catch (err: any) {
      console.error('Error during staff termination:', err);
      toast.error('Termination process failed: ' + (err.message || 'Unknown error'));
    } finally {
      setTerminating(false);
    }
  };

  // Download High-Resolution Letter PNG
  const downloadImage = async () => {
    if (!isValid || !selectedStaff) return;
    const element = document.getElementById('termination-letter-preview');
    if (!element) return;

    try {
      setDownloading(true);
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
      link.download = `termination-letter-${form.referenceNumber}-${form.date}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Termination letter downloaded successfully!');
    } catch (err) {
      console.error('Error downloading letter image:', err);
      toast.error('Failed to generate downloadable image');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* LEFT SIDE: CONFIGURATION FORM */}
      <div className="xl:col-span-5 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-rose-600" />
              <span>Termination Letter</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Configure parameters & relieve personnel</p>
          </div>
          <Link
            href="/hq/dashboard/manager/reports/fine-letter"
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
          >
            <span>Fine Letter</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
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
              placeholder={loadingStaff ? "Loading personnel list..." : "Type employee name or ID..."}
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
              className="w-full bg-slate-50 border border-slate-100 focus:border-rose-500 focus:bg-white rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400"
            />
            {loadingStaff && (
              <div className="absolute right-3.5 top-3.5">
                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
              </div>
            )}
          </div>

          {isDropdownOpen && filteredStaff.length > 0 && (
            <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-100 shadow-2xl rounded-2xl max-h-64 overflow-y-auto overflow-x-hidden">
              {filteredStaff.map((s) => {
                const isTerm = s.status === 'terminated';
                return (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectStaff(s)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">{s.name}</p>
                        {isTerm && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded">
                            Terminated
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                        {s.designation || 'Staff'} • {DEPT_DISPLAY_NAME[s.dept] || s.dept}
                      </p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono">
                      {s.employeeId || 'ID: ' + s.id.slice(0, 6)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Staff Info Summary Cards */}
        {selectedStaff && (
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
              <p className={`text-xs font-black mt-0.5 uppercase ${selectedStaff.status === 'terminated' ? 'text-rose-600' : 'text-emerald-600'}`}>
                {selectedStaff.status || 'Active'}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Designation</p>
              <p className="text-xs font-black text-slate-800 mt-0.5 truncate">{form.designation}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Department</p>
              <p className="text-xs font-black text-slate-800 mt-0.5 truncate">{form.department}</p>
            </div>
          </div>
        )}

        {/* Reason Presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Reason Presets / Quick Templates</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TERMINATION_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="text-[10px] font-bold bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 transition-all active:scale-95"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dates & Reference Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Ref Number *</label>
            <input
              type="text"
              value={form.referenceNumber}
              placeholder="e.g. KH-REHAB-TRM-001"
              onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 focus:border-rose-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Letter Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 focus:border-rose-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Effective Termination Date *</label>
            <input
              type="date"
              value={form.effectiveDate}
              onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 focus:border-rose-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Last Working Day *</label>
            <input
              type="date"
              value={form.lastWorkingDay}
              onChange={(e) => setForm({ ...form, lastWorkingDay: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 focus:border-rose-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all"
            />
          </div>
        </div>

        {/* Administration Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Administration *</label>
          <input
            type="text"
            value={form.administration}
            placeholder="e.g. Khan Hub Head Office / Rehab Center"
            onChange={(e) => setForm({ ...form, administration: e.target.value })}
            className="w-full bg-slate-50 border border-slate-100 focus:border-rose-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all"
          />
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Subject *</label>
          <input
            type="text"
            value={form.subject}
            placeholder="e.g. Notice of Termination of Employment Contract"
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full bg-slate-50 border border-slate-100 focus:border-rose-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all"
          />
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Termination Grounds / Reason *</label>
          <input
            type="text"
            value={form.reason}
            placeholder="Enter reason for termination..."
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="w-full bg-slate-50 border border-slate-100 focus:border-rose-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all"
          />
        </div>

        {/* Body Paragraph */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Letter Body Content *</label>
          <textarea
            rows={5}
            value={form.body}
            placeholder="Type termination instructions and details..."
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="w-full bg-slate-50 border border-slate-100 focus:border-rose-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all leading-relaxed"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {!selectedStaff && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-100 p-3 rounded-2xl text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Please search and select a staff member to proceed.</span>
            </div>
          )}

          {/* Terminate Staff in Database & Attach Letter Button */}
          {terminatedSuccess ? (
            <div className="w-full bg-rose-50 border border-rose-200 text-rose-800 font-bold py-3.5 px-4 rounded-2xl text-xs flex flex-col items-center justify-center gap-2 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-600" />
                <span>{selectedStaff?.name} is marked as TERMINATED in database!</span>
              </div>
              {selectedStaff && (
                <Link
                  href={`/hq/dashboard/manager/staff/${selectedStaff.id}`}
                  className="text-xs underline font-bold text-rose-700 hover:text-rose-900"
                >
                  View {selectedStaff.name}&apos;s Profile & Documents →
                </Link>
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={!isValid || terminating}
              onClick={handleTerminateAndAttach}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              {terminating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating Status & Attaching to Profile...
                </>
              ) : (
                <>
                  <UserMinus className="w-4 h-4" />
                  Confirm Termination & Update Staff Profile
                </>
              )}
            </button>
          )}

          {/* Download as High-Res PNG Button */}
          <button
            type="button"
            disabled={!isValid || downloading}
            onClick={downloadImage}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Letter Image...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Letter as Image (PNG)
              </>
            )}
          </button>
        </div>
      </div>

      {/* RIGHT SIDE: LIVE LETTER PREVIEW */}
      <div className="xl:col-span-7 space-y-4">
        <div className="bg-slate-100 border border-slate-200 rounded-3xl p-4 md:p-8 max-w-full overflow-auto">
          {/* Printable Letter container */}
          <div
            id="termination-letter-preview"
            className="w-[760px] mx-auto select-none relative font-sans leading-relaxed"
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              padding: '48px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)'
            }}
          >
            {/* Header section with Khan Hub Letterhead */}
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
                  KHAN HUB (PVT.) LTD.
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mt-1 leading-none" style={{ color: '#64748b' }}>
                  Group of Companies.
                </p>
              </div>
            </div>

            {/* Reference & Date Row */}
            <div className="flex justify-between items-center mt-6 text-xs" style={{ color: '#334155' }}>
              <div>
                <span className="font-bold">Reference Number: </span>
                <span className="font-semibold font-mono">{form.referenceNumber || '—'}</span>
              </div>
              <div>
                <span className="font-bold">Date: </span>
                <span className="font-semibold">{formatToDMY(form.date) || '—'}</span>
              </div>
            </div>

            {/* Letter Title */}
            <div className="text-center mt-8">
              <h2 className="text-sm font-extrabold underline tracking-wider uppercase" style={{ color: '#991b1b' }}>
                {form.letterTitle || 'EMPLOYMENT TERMINATION LETTER'}
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
              {form.body || 'Please select staff member and enter the termination notice text...'}
            </div>

            {/* Structured Termination Details Table */}
            <div className="mt-6">
              <table className="w-full text-left text-xs border-collapse" style={{ border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr className="text-[10px] uppercase font-bold tracking-wider" style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
                    <th className="px-4 py-2" style={{ border: '1px solid #cbd5e1', width: '35%' }}>Administrative Parameter</th>
                    <th className="px-4 py-2" style={{ border: '1px solid #cbd5e1' }}>Official Record Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ color: '#1e293b' }}>
                    <td className="px-4 py-2 font-bold" style={{ border: '1px solid #cbd5e1' }}>Termination Grounds</td>
                    <td className="px-4 py-2 font-semibold" style={{ border: '1px solid #cbd5e1', color: '#991b1b' }}>{form.reason || '—'}</td>
                  </tr>
                  <tr style={{ color: '#1e293b' }}>
                    <td className="px-4 py-2 font-bold" style={{ border: '1px solid #cbd5e1' }}>Effective Termination Date</td>
                    <td className="px-4 py-2 font-semibold" style={{ border: '1px solid #cbd5e1' }}>{formatToDMY(form.effectiveDate) || '—'}</td>
                  </tr>
                  <tr style={{ color: '#1e293b' }}>
                    <td className="px-4 py-2 font-bold" style={{ border: '1px solid #cbd5e1' }}>Last Working Day</td>
                    <td className="px-4 py-2 font-semibold" style={{ border: '1px solid #cbd5e1' }}>{formatToDMY(form.lastWorkingDay) || '—'}</td>
                  </tr>
                  <tr style={{ color: '#1e293b' }}>
                    <td className="px-4 py-2 font-bold" style={{ border: '1px solid #cbd5e1' }}>Company Assets Handover</td>
                    <td className="px-4 py-2 font-semibold" style={{ border: '1px solid #cbd5e1' }}>Mandatory Immediate Handover</td>
                  </tr>
                  <tr style={{ color: '#1e293b' }}>
                    <td className="px-4 py-2 font-bold" style={{ border: '1px solid #cbd5e1' }}>Final Settlement &amp; Clearance</td>
                    <td className="px-4 py-2 font-semibold" style={{ border: '1px solid #cbd5e1' }}>Subject to Departmental Audit &amp; Handover Clearance</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer Signatures */}
            <div className="mt-14 pt-6" style={{ borderTop: '1px solid #cbd5e1' }}>
              <div className="flex justify-between items-end">
                {/* Left: Admin */}
                <div className="space-y-1.5 w-1/3 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest leading-none" style={{ color: '#94a3b8' }}>Administration</p>
                  <p className="text-xs font-black leading-tight" style={{ color: '#1e293b' }}>{form.administration || '—'}</p>
                </div>

                {/* Middle: Stamp centered */}
                <div className="w-1/3 flex justify-center items-end pb-1">
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

                {/* Right: Signature */}
                <div className="w-1/3 flex justify-end">
                  <div className="text-center relative w-52">
                    {/* Signature graphic placement */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-36 h-12 pointer-events-none flex items-center justify-center">
                      <img
                        src="/signature.png"
                        alt="Authorized Signature"
                        className="w-32 h-auto object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="pt-1.5" style={{ borderTop: '1px solid #94a3b8' }}>
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
    </div>
  );
}
