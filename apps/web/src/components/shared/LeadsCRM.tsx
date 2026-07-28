'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  Timestamp,
  deleteDoc,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Search, 
  Plus, 
  Phone, 
  MessageSquare, 
  Edit2, 
  Trash2, 
  Loader2, 
  Check,
  X,
  Calendar,
  Filter,
  Download,
  ArrowUpDown,
  PhoneCall,
  User,
  MapPin,
  Activity,
  Save,
  Printer,
  FileText,
  Clock,
  UserCheck,
  FileSpreadsheet,
  Sparkles,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn, formatDateDMY, toDate } from '@/lib/utils';

export type LeadStatus = 'NEW' | 'No Response' | 'Scheduled Callback' | 'Busy' | 'DC' | 'Nill' | 'No' | 'Completed';

export interface Lead {
  id: string;
  name: string;
  guardianName?: string;
  age?: string;
  contact: string;
  address: string;
  procedure?: string;
  time?: string;
  status: string;
  notes: string;
  callNotes?: string;
  department: string;
  // Legacy / Dynamic Fields
  studentName?: string;
  parentName?: string;
  patientName?: string;
  addiction?: string;
  responseReview?: string;
  diagnosis?: string;
  createdAt: any;
  updatedAt: any;
}

interface CustomResponse {
  id: string;
  name: string;
  color: string;
}

interface CustomProcedure {
  id: string;
  name: string;
}

interface LeadsCRMProps {
  department: 'rehab' | 'spims' | 'hospital' | string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; text: string }> = {
  'NEW': { color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
  'Completed': { color: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'No Response': { color: 'gray', bg: 'bg-gray-100', text: 'text-gray-700' },
  'Scheduled Callback': { color: 'amber', bg: 'bg-amber-100', text: 'text-amber-700' },
  'Busy': { color: 'purple', bg: 'bg-purple-100', text: 'text-purple-700' },
  'DC': { color: 'red', bg: 'bg-red-100', text: 'text-red-700' },
  'Nill': { color: 'gray', bg: 'bg-gray-100', text: 'text-gray-700' },
  'No': { color: 'gray', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const DEFAULT_PROCEDURES = [
  'Check Up',
  'USG',
  'Meeting With Sir',
  'Info Rehab Patient Meeting'
];

const ADDICTION_TYPES = ['', 'Nill', 'No', 'Ice', 'Heroin', 'Charas', 'Alcohol', 'Other'];

export default function LeadsCRM({ department }: LeadsCRMProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
  const [procedureFilter, setProcedureFilter] = useState<string | 'all'>('all');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  // Daily Report States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDate, setReportDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Custom Options State
  const [customResponses, setCustomResponses] = useState<CustomResponse[]>([]);
  const [customProcedures, setCustomProcedures] = useState<CustomProcedure[]>([]);
  const [showCustomResponseInput, setShowCustomResponseInput] = useState(false);
  const [newCustomResponse, setNewCustomResponse] = useState('');

  const [sortConfig, setSortConfig] = useState<{ key: 'createdAt' | 'name' | 'time'; direction: 'asc' | 'desc' }>({ 
    key: 'createdAt', 
    direction: 'desc' 
  });

  // Helper for current time format e.g. 10:30 AM
  const getFormattedCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    guardianName: '',
    age: '',
    contact: '',
    address: '',
    procedure: 'Check Up',
    customProcedure: '',
    time: getFormattedCurrentTime(),
    status: 'NEW',
    customStatus: '',
    notes: '',
    callNotes: '',
    department: department || 'hospital',
    studentName: '',
    parentName: '',
    patientName: '',
    addiction: (department === 'rehab' || department === 'hospital') ? 'Ice' : '',
    responseReview: '',
    diagnosis: ''
  });

  useEffect(() => {
    // Reset form on department change
    setFormData({
      name: '',
      guardianName: '',
      age: '',
      contact: '',
      address: '',
      procedure: 'Check Up',
      customProcedure: '',
      time: getFormattedCurrentTime(),
      status: 'NEW',
      customStatus: '',
      notes: '',
      callNotes: '',
      department: department || 'hospital',
      studentName: '',
      parentName: '',
      patientName: '',
      addiction: (department === 'rehab' || department === 'hospital') ? 'Ice' : '',
      responseReview: '',
      diagnosis: ''
    });

    // Sync Leads
    const q = query(
      collection(db, 'leads'), 
      where('department', '==', department)
    );

    const unsubscribeLeads = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      setLeads(docs);
      setLoading(false);
    }, (err) => {
      console.error('Leads onSnapshot error:', err);
      setLoading(false);
    });

    // Sync Custom Responses
    const qr = query(collection(db, 'hq_lead_responses'), orderBy('name', 'asc'));
    const unsubscribeResponses = onSnapshot(qr, (snap) => {
      const resps = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomResponse));
      setCustomResponses(resps);
    }, (err) => {
      console.error('CustomResponses onSnapshot error:', err);
    });

    // Sync Custom Procedures
    const qp = query(collection(db, 'hq_lead_procedures'), orderBy('name', 'asc'));
    const unsubscribeProcedures = onSnapshot(qp, (snap) => {
      const procs = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomProcedure));
      setCustomProcedures(procs);
    }, (err) => {
      console.error('CustomProcedures onSnapshot error:', err);
    });

    return () => {
      unsubscribeLeads();
      unsubscribeResponses();
      unsubscribeProcedures();
    };
  }, [department]);

  // Combined list of procedures
  const allProcedures = useMemo(() => {
    const list = [...DEFAULT_PROCEDURES];
    customProcedures.forEach(p => {
      if (!list.includes(p.name)) list.push(p.name);
    });
    // Add any unique procedures present in leads data
    leads.forEach(l => {
      if (l.procedure && !list.includes(l.procedure)) {
        list.push(l.procedure);
      }
    });
    return list;
  }, [customProcedures, leads]);

  const filteredLeads = useMemo(() => {
    const matched = leads.filter(l => {
      const name = l.name || l.patientName || '';
      const guardian = l.guardianName || l.parentName || '';
      const contact = l.contact || '';
      const address = l.address || '';
      const procedure = l.procedure || l.diagnosis || '';
      
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        name.toLowerCase().includes(q) || 
        guardian.toLowerCase().includes(q) ||
        contact.includes(q) ||
        address.toLowerCase().includes(q) ||
        procedure.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchesProcedure = procedureFilter === 'all' || l.procedure === procedureFilter;
      return matchesSearch && matchesStatus && matchesProcedure;
    });

    return matched.sort((a, b) => {
      if (sortConfig.key === 'createdAt') {
        const aTime = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
        return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
      } else {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        return sortConfig.direction === 'asc' 
          ? aName.localeCompare(bName) 
          : bName.localeCompare(aName);
      }
    });
  }, [leads, searchQuery, statusFilter, procedureFilter, sortConfig]);

  const allResponses = useMemo(() => {
    const base = Object.keys(STATUS_CONFIG).map(id => ({
      id,
      name: id,
      color: STATUS_CONFIG[id]?.color || 'gray'
    }));
    return [...base, ...customResponses];
  }, [customResponses]);

  const stats = useMemo(() => {
    const s: Record<string, number> = { total: leads.length };
    allResponses.forEach(r => { s[r.id] = 0; });
    leads.forEach(l => {
      if (l.status in s) s[l.status]++;
      else s['NEW']++;
    });
    return s;
  }, [leads, allResponses]);

  // Compute Daily Report Data
  const dailyReportData = useMemo(() => {
    const dayLeads = leads.filter(l => {
      if (!l.createdAt) return false;
      try {
        const dObj = toDate(l.createdAt);
        if (!dObj) return false;
        const yyyymmdd = dObj.toISOString().slice(0, 10);
        return yyyymmdd === reportDate;
      } catch (e) {
        return false;
      }
    });

    const procedureCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    dayLeads.forEach(l => {
      const proc = l.procedure || 'Check Up';
      procedureCounts[proc] = (procedureCounts[proc] || 0) + 1;

      const st = l.status || 'NEW';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    return {
      dayLeads,
      total: dayLeads.length,
      procedureCounts,
      statusCounts
    };
  }, [leads, reportDate]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact) {
      toast.error('Name and Contact are required');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalStatus = formData.status;
      if (formData.status === 'ADD_NEW' && formData.customStatus.trim()) {
        const id = formData.customStatus.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (!STATUS_CONFIG[id] && !customResponses.find(r => r.id === id)) {
          await addDoc(collection(db, 'hq_lead_responses'), {
            id,
            name: formData.customStatus.trim(),
            color: 'gray',
            createdAt: Timestamp.now()
          });
        }
        finalStatus = formData.customStatus.trim();
      }

      let finalProcedure = formData.procedure;
      if (formData.procedure === 'ADD_CUSTOM' && formData.customProcedure.trim()) {
        finalProcedure = formData.customProcedure.trim();
        const id = finalProcedure.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (!customProcedures.find(p => p.name === finalProcedure)) {
          await addDoc(collection(db, 'hq_lead_procedures'), {
            id,
            name: finalProcedure,
            createdAt: Timestamp.now()
          });
        }
      }

      await addDoc(collection(db, 'leads'), {
        name: formData.name.trim(),
        guardianName: formData.guardianName.trim(),
        age: formData.age.trim(),
        contact: formData.contact.trim(),
        address: formData.address.trim(),
        procedure: finalProcedure,
        time: formData.time || getFormattedCurrentTime(),
        status: finalStatus,
        notes: formData.notes.trim(),
        callNotes: formData.callNotes.trim(),
        department: department || 'hospital',
        // Preserve dual keys for backwards compatibility
        patientName: formData.name.trim(),
        parentName: formData.guardianName.trim(),
        diagnosis: finalProcedure,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      toast.success('Lead registered successfully ✓');
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        guardianName: '',
        age: '',
        contact: '',
        address: '',
        procedure: 'Check Up',
        customProcedure: '',
        time: getFormattedCurrentTime(),
        status: 'NEW',
        customStatus: '',
        notes: '',
        callNotes: '',
        department: department || 'hospital',
        studentName: '',
        parentName: '',
        patientName: '',
        addiction: (department === 'rehab' || department === 'hospital') ? 'Ice' : '',
        responseReview: '',
        diagnosis: ''
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to register lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    if (!editingLead.name || !editingLead.contact) {
      toast.error('Name and Contact are required');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalStatus = editingLead.status;
      if (editingLead.status === 'ADD_NEW' && formData.customStatus.trim()) {
        finalStatus = formData.customStatus.trim();
        const id = finalStatus.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (!STATUS_CONFIG[id] && !customResponses.find(r => r.id === id)) {
          await addDoc(collection(db, 'hq_lead_responses'), {
            id,
            name: finalStatus,
            color: 'gray',
            createdAt: Timestamp.now()
          });
        }
      }

      let finalProcedure = editingLead.procedure || 'Check Up';
      if (editingLead.procedure === 'ADD_CUSTOM' && formData.customProcedure.trim()) {
        finalProcedure = formData.customProcedure.trim();
        const id = finalProcedure.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (!customProcedures.find(p => p.name === finalProcedure)) {
          await addDoc(collection(db, 'hq_lead_procedures'), {
            id,
            name: finalProcedure,
            createdAt: Timestamp.now()
          });
        }
      }

      await updateDoc(doc(db, 'leads', editingLead.id), {
        name: editingLead.name,
        guardianName: editingLead.guardianName || editingLead.parentName || '',
        age: editingLead.age || '',
        contact: editingLead.contact,
        address: editingLead.address || '',
        procedure: finalProcedure,
        time: editingLead.time || getFormattedCurrentTime(),
        status: finalStatus,
        notes: editingLead.notes || '',
        callNotes: editingLead.callNotes || '',
        department: editingLead.department || department,
        patientName: editingLead.name,
        parentName: editingLead.guardianName || editingLead.parentName || '',
        diagnosis: finalProcedure,
        updatedAt: Timestamp.now()
      });

      toast.success('Lead updated successfully ✓');
      setIsEditModalOpen(false);
      setEditingLead(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateResponse = async () => {
    if (!newCustomResponse.trim()) return;
    const id = newCustomResponse.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    
    if (STATUS_CONFIG[id] || customResponses.find(r => r.id === id)) {
      toast.error('Response status already exists');
      return;
    }

    try {
      await addDoc(collection(db, 'hq_lead_responses'), {
        id,
        name: newCustomResponse.trim(),
        color: 'gray',
        createdAt: Timestamp.now()
      });
      toast.success('Custom response added');
      setNewCustomResponse('');
      setShowCustomResponseInput(false);
      return id;
    } catch (err) {
      toast.error('Failed to create response');
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'leads', id), {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      toast.success(`Status updated to ${newStatus}`);
      if (activeCallId === id) setActiveCallId(null);
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleCallNotesUpdate = async (id: string, notes: string) => {
    try {
      await updateDoc(doc(db, 'leads', id), {
        callNotes: notes,
        updatedAt: Timestamp.now()
      });
      toast.success('Call notes saved ✓');
    } catch (err) {
      toast.error('Failed to save notes');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteDoc(doc(db, 'leads', id));
      toast.success('Lead deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleCall = (id: string, number: string) => {
    const cleaned = number.replace(/[^\d+]/g, '');
    window.location.href = `tel:${cleaned}`;
    setActiveCallId(id);
  };

  const handleWhatsApp = (number: string, name: string) => {
    const msg = encodeURIComponent(`Hello ${name}, this is regarding your inquiry at ${department === 'rehab' ? 'Khan Rehab' : department === 'spims' ? 'SPIMS' : 'Khan Hospital'}.`);
    window.open(`https://wa.me/${number.replace(/\D/g, '')}?text=${msg}`, '_blank');
  };

  // Export CSV of filtered or daily report leads
  const exportToCSV = (leadsToExport: Lead[], filenameSuffix: string = 'leads') => {
    if (!leadsToExport.length) {
      toast.error('No leads available to export');
      return;
    }

    const headers = ['S.#', 'Date', 'Time', 'Name', 'Guardian Name', 'Age', 'Contact', 'Address', 'Procedure', 'Status', 'Remarks', 'Call Notes'];
    const rows = leadsToExport.map((l, index) => [
      index + 1,
      l.createdAt ? formatDateDMY(l.createdAt) : '',
      l.time || '',
      `"${(l.name || l.patientName || '').replace(/"/g, '""')}"`,
      `"${(l.guardianName || l.parentName || '').replace(/"/g, '""')}"`,
      `"${(l.age || '').replace(/"/g, '""')}"`,
      `"${(l.contact || '').replace(/"/g, '""')}"`,
      `"${(l.address || '').replace(/"/g, '""')}"`,
      `"${(l.procedure || l.diagnosis || '').replace(/"/g, '""')}"`,
      `"${(l.status || '').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      `"${(l.callNotes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${department}_${filenameSuffix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report downloaded ✓');
  };

  // Theme-based class names
  const themeClasses = {
    rehab: {
      primary: 'bg-teal-600',
      hover: 'hover:bg-teal-700',
      text: 'text-teal-600',
      border: 'border-teal-100',
      bg: 'bg-teal-50',
      accent: 'text-teal-500'
    },
    spims: {
      primary: 'bg-[#1D9E75]',
      hover: 'hover:bg-[#15805d]',
      text: 'text-[#1D9E75]',
      border: 'border-emerald-100',
      bg: 'bg-emerald-50',
      accent: 'text-emerald-500'
    },
    hospital: {
      primary: 'bg-rose-600',
      hover: 'hover:bg-rose-700',
      text: 'text-rose-600',
      border: 'border-rose-200/60',
      bg: 'bg-rose-50/50',
      accent: 'text-rose-500'
    }
  }[(department === 'rehab' || department === 'spims') ? department : 'hospital'];

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3 w-full max-w-full">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm min-w-0">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">Total Leads</p>
          <p className={cn("text-2xl font-black mt-1", themeClasses.text)}>{stats.total}</p>
        </div>
        {allResponses.map((config) => (
          <div key={config.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm min-w-0">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{config.name}</p>
            <p className={cn("text-2xl font-black mt-1", 
              config.id === 'NEW' ? 'text-blue-700' : 
              config.id === 'Completed' ? 'text-emerald-700' : 
              config.id === 'DC' ? 'text-red-700' : 
              'text-gray-700'
            )}>{stats[config.id] || 0}</p>
          </div>
        ))}
      </div>

      {/* Toolbar & Action Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between w-full max-w-full overflow-hidden">
        <div className="relative w-full md:w-80 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name, guardian, phone, procedure, city..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
          {/* Procedure Filter */}
          <select 
            className="flex-1 sm:flex-none bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none cursor-pointer"
            value={procedureFilter}
            onChange={(e) => setProcedureFilter(e.target.value)}
          >
            <option value="all">All Procedures</option>
            {allProcedures.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Status Filter */}
          <select 
            className="flex-1 sm:flex-none bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            {allResponses.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          {/* End of Day Daily Report Button */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md"
            title="Generate End of Day Report"
          >
            <Printer size={16} />
            <span className="truncate">Daily Report</span>
          </button>

          {/* Add New Lead Button */}
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className={cn("flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg", themeClasses.primary, themeClasses.hover)}
          >
            <Plus size={18} />
            <span className="truncate">Add Lead</span>
          </button>
        </div>
      </div>

      {/* Desktop Spreadsheet UI */}
      <div className="hidden md:block bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th 
                className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setSortConfig({ 
                  key: 'name', 
                  direction: sortConfig.key === 'name' && sortConfig.direction === 'desc' ? 'asc' : 'desc' 
                })}
              >
                <div className="flex items-center gap-2">
                  Lead / Patient Name
                  <ArrowUpDown size={12} className={cn(sortConfig.key === 'name' ? "text-rose-600" : "text-gray-300")} />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Guardian Name</th>
              <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Age</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Address</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Procedure</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[180px]">Time & Remarks</th>
              <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-20 text-center">
                  <Loader2 className={cn("mx-auto animate-spin", themeClasses.text)} size={32} />
                  <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Syncing leads...</p>
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-20 text-center">
                  <Activity className="mx-auto text-gray-200" size={48} />
                  <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest">No matching leads found</p>
                </td>
              </tr>
            ) : filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-white flex-shrink-0", themeClasses.primary)}>
                      {(lead.name || lead.patientName || 'L')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{lead.name || lead.patientName}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{lead.createdAt ? formatDateDMY(lead.createdAt) : 'Just now'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-gray-700">{lead.guardianName || lead.parentName || '—'}</p>
                </td>
                <td className="px-4 py-4">
                  <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-600">
                    {lead.age ? `${lead.age} yrs` : '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-gray-800 select-all">{lead.contact}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs text-gray-500 font-medium truncate max-w-[140px]">{lead.address || '—'}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-rose-50 border border-rose-100 text-rose-700 rounded-full text-[10px] font-black uppercase tracking-wide inline-block">
                    {lead.procedure || lead.diagnosis || 'Check Up'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select 
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer border-none font-sans",
                      STATUS_CONFIG[lead.status]?.bg || 'bg-gray-100',
                      STATUS_CONFIG[lead.status]?.text || 'text-gray-700'
                    )}
                    value={lead.status}
                    onChange={async (e) => {
                      if (e.target.value === 'ADD_NEW') {
                        const val = window.prompt('Enter new custom status:');
                        if (val && val.trim()) {
                          const id = val.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                          if (!STATUS_CONFIG[id] && !customResponses.find(r => r.id === id)) {
                            await addDoc(collection(db, 'hq_lead_responses'), {
                              id,
                              name: val.trim(),
                              color: 'gray',
                              createdAt: Timestamp.now()
                            });
                          }
                          handleStatusUpdate(lead.id, val.trim());
                        }
                      } else {
                        handleStatusUpdate(lead.id, e.target.value);
                      }
                    }}
                  >
                    {allResponses.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    <option value="ADD_NEW" className="text-indigo-600 font-black">+ CUSTOM STATUS</option>
                  </select>
                </td>
                <td className="px-6 py-4 space-y-1">
                  {lead.time && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                      <Clock size={11} />
                      <span>{lead.time}</span>
                    </div>
                  )}
                  <textarea 
                    defaultValue={lead.notes || lead.callNotes}
                    onBlur={(e) => handleCallNotesUpdate(lead.id, e.target.value)}
                    placeholder="Enter remarks/notes..."
                    className="w-full bg-gray-50 border-none rounded-lg p-2 text-[10px] font-bold outline-none focus:ring-1 focus:ring-rose-300 transition-all resize-none h-10 no-scrollbar"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {activeCallId === lead.id ? (
                      <div className="flex flex-col gap-2 bg-amber-50 p-2 rounded-xl border border-amber-200 animate-in slide-in-from-right-2 min-w-[150px]">
                        <select 
                          autoFocus
                          className="text-[9px] font-black uppercase bg-white border border-amber-200 rounded-lg px-2 py-1.5 outline-none"
                          onChange={(e) => {
                            if (e.target.value === 'ADD_NEW') {
                              setShowCustomResponseInput(true);
                            } else {
                              handleStatusUpdate(lead.id, e.target.value);
                            }
                          }}
                        >
                          <option value="">Outcome...</option>
                          {allResponses.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                          <option value="ADD_NEW" className="text-indigo-600 font-black">+ CUSTOM</option>
                        </select>

                        {showCustomResponseInput && (
                          <div className="flex gap-1 animate-in zoom-in-95">
                            <input 
                              value={newCustomResponse}
                              onChange={(e) => setNewCustomResponse(e.target.value)}
                              placeholder="New type..."
                              className="flex-1 text-[9px] font-bold bg-white border border-indigo-200 rounded-lg px-2 py-1 outline-none"
                            />
                            <button 
                              onClick={async () => {
                                const newId = await handleCreateResponse();
                                if (newId) handleStatusUpdate(lead.id, newId);
                              }}
                              className="p-1 bg-indigo-600 text-white rounded-lg"
                            >
                              <Check size={12} />
                            </button>
                            <button onClick={() => setShowCustomResponseInput(false)} className="p-1 bg-gray-200 text-gray-600 rounded-lg">
                              <X size={12} />
                            </button>
                          </div>
                        )}

                        <button onClick={() => setActiveCallId(null)} className="text-[9px] font-black uppercase text-amber-600 hover:underline">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => {
                            setEditingLead(lead);
                            setIsEditModalOpen(true);
                          }}
                          className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-600 hover:text-white transition-all shadow-sm group/btn"
                          title="Edit Lead"
                        >
                          <Edit2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button 
                          onClick={() => handleCall(lead.id, lead.contact)}
                          className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm group/btn"
                          title="Call Lead"
                        >
                          <PhoneCall size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button 
                          onClick={() => handleWhatsApp(lead.contact, lead.name)}
                          className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm group/btn"
                          title="WhatsApp"
                        >
                          <MessageSquare size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button 
                          onClick={() => handleDeleteLead(lead.id)}
                          className="w-7 h-7 rounded-lg text-gray-300 flex items-center justify-center hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100 ml-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card-Based CRM UI */}
      <div className="block md:hidden space-y-4 w-full max-w-full overflow-hidden">
        {loading ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Loader2 className={cn("mx-auto animate-spin", themeClasses.text)} size={32} />
            <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Syncing leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Activity className="mx-auto text-gray-200" size={48} />
            <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest">No matching leads found</p>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4 relative group w-full max-w-full overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white flex-shrink-0", themeClasses.primary)}>
                    {(lead.name || lead.patientName || 'L')[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{lead.name || lead.patientName}</h4>
                    <p className="text-[10px] text-gray-400 font-bold">{lead.createdAt ? formatDateDMY(lead.createdAt) : 'Just now'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setEditingLead(lead);
                      setIsEditModalOpen(true);
                    }}
                    className="w-8 h-8 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:text-teal-600 hover:bg-teal-50 transition-all flex-shrink-0"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteLead(lead.id)}
                    className="w-8 h-8 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:text-rose-600 hover:bg-rose-50 transition-all flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-3 rounded-2xl border border-gray-50 w-full max-w-full overflow-hidden">
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Guardian Name</p>
                  <p className="text-xs font-bold text-gray-700 mt-0.5 truncate">{lead.guardianName || lead.parentName || '—'}</p>
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Age</p>
                  <p className="text-xs font-bold text-gray-700 mt-0.5 truncate">{lead.age ? `${lead.age} yrs` : '—'}</p>
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact</p>
                  <p className="text-xs font-black text-gray-700 mt-0.5 select-all break-all">{lead.contact}</p>
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Procedure</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-rose-50 text-rose-700 rounded-lg text-[9px] font-black uppercase truncate max-w-full">
                    {lead.procedure || lead.diagnosis || 'Check Up'}
                  </span>
                </div>

                <div className="col-span-2 min-w-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Address / City</p>
                  <p className="text-xs font-bold text-gray-600 mt-0.5 break-words">{lead.address || '—'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status Update</label>
                  <select 
                    className={cn(
                      "w-full sm:w-auto px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer border-none font-sans",
                      STATUS_CONFIG[lead.status]?.bg || 'bg-gray-100',
                      STATUS_CONFIG[lead.status]?.text || 'text-gray-700'
                    )}
                    value={lead.status}
                    onChange={async (e) => {
                      if (e.target.value === 'ADD_NEW') {
                        const val = window.prompt('Enter new custom status:');
                        if (val && val.trim()) {
                          const id = val.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                          if (!STATUS_CONFIG[id] && !customResponses.find(r => r.id === id)) {
                            await addDoc(collection(db, 'hq_lead_responses'), {
                              id,
                              name: val.trim(),
                              color: 'gray',
                              createdAt: Timestamp.now()
                            });
                          }
                          handleStatusUpdate(lead.id, val.trim());
                        }
                      } else {
                        handleStatusUpdate(lead.id, e.target.value);
                      }
                    }}
                  >
                    {allResponses.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    <option value="ADD_NEW" className="text-indigo-600 font-black">+ CUSTOM STATUS</option>
                  </select>
                </div>

                <textarea 
                  defaultValue={lead.notes || lead.callNotes}
                  onBlur={(e) => handleCallNotesUpdate(lead.id, e.target.value)}
                  placeholder="Enter remarks/notes..."
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-rose-300 transition-all resize-none h-16 no-scrollbar"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100/60">
                <button 
                  onClick={() => handleCall(lead.id, lead.contact)}
                  className="flex-1 py-3 bg-blue-50 text-blue-600 flex items-center justify-center gap-2 rounded-2xl hover:bg-blue-600 hover:text-white transition-all text-xs font-black uppercase tracking-wider"
                >
                  <PhoneCall size={16} />
                  Call
                </button>
                <button 
                  onClick={() => handleWhatsApp(lead.contact, lead.name)}
                  className="flex-1 py-3 bg-emerald-50 text-emerald-600 flex items-center justify-center gap-2 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all text-xs font-black uppercase tracking-wider"
                >
                  <MessageSquare size={16} />
                  WhatsApp
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 scale-in-center">
            <div className={cn("p-6 text-white flex justify-between items-center", themeClasses.primary)}>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Register New Lead</h3>
                <p className="text-xs font-bold text-white/80 mt-0.5">Enter patient & procedure details</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddLead} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      required
                      placeholder="e.g. Fatima Ali"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Guardian Name</label>
                  <div className="relative">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      placeholder="Father / Husband / Guardian"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none"
                      value={formData.guardianName}
                      onChange={(e) => setFormData({...formData, guardianName: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Contact Info *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      required
                      placeholder="03XXXXXXXXX"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none"
                      value={formData.contact}
                      onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Age</label>
                  <input 
                    placeholder="e.g. 28"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Address / City</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input 
                    placeholder="e.g. Peshawar, KP"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>

              {/* Procedure Selection with Custom Option */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Procedure</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none cursor-pointer"
                  value={formData.procedure}
                  onChange={(e) => setFormData({...formData, procedure: e.target.value})}
                >
                  {allProcedures.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="ADD_CUSTOM" className="text-rose-600 font-black">+ Create Custom Procedure</option>
                </select>
                {formData.procedure === 'ADD_CUSTOM' && (
                  <input
                    placeholder="Enter custom procedure name..."
                    className="w-full mt-2 px-4 py-2.5 bg-gray-50 border border-rose-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400"
                    value={formData.customProcedure}
                    onChange={(e) => setFormData({...formData, customProcedure: e.target.value})}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      placeholder="e.g. 10:30 AM"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none"
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Initial Status</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none cursor-pointer"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    {allResponses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="ADD_NEW">+ Create Custom Status</option>
                  </select>
                  {formData.status === 'ADD_NEW' && (
                    <input
                      placeholder="Custom status name..."
                      className="w-full mt-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400"
                      value={formData.customStatus}
                      onChange={(e) => setFormData({...formData, customStatus: e.target.value})}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Time & Remarks / Notes</label>
                <textarea 
                  rows={2}
                  placeholder="Enter remarks or notes..."
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none resize-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className={cn("w-full py-4 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 mt-4", themeClasses.primary, themeClasses.hover)}
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {isSubmitting ? 'SAVING...' : 'REGISTER LEAD'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {isEditModalOpen && editingLead && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 scale-in-center">
            <div className={cn("p-6 text-white flex justify-between items-center", themeClasses.primary)}>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Edit Lead Information</h3>
                <p className="text-xs font-bold text-white/80 mt-0.5">Modify record & procedure details</p>
              </div>
              <button onClick={() => { setIsEditModalOpen(false); setEditingLead(null); }} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditLead} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      required
                      placeholder="Full Name"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none"
                      value={editingLead.name || editingLead.patientName || ''}
                      onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Guardian Name</label>
                  <div className="relative">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      placeholder="Father / Husband / Guardian"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none"
                      value={editingLead.guardianName || editingLead.parentName || ''}
                      onChange={(e) => setEditingLead({...editingLead, guardianName: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Contact Info *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      required
                      placeholder="03XXXXXXXXX"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none"
                      value={editingLead.contact || ''}
                      onChange={(e) => setEditingLead({...editingLead, contact: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Age</label>
                  <input 
                    placeholder="e.g. 28"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none"
                    value={editingLead.age || ''}
                    onChange={(e) => setEditingLead({...editingLead, age: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Address / City</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input 
                    placeholder="e.g. Peshawar, KP"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none"
                    value={editingLead.address || ''}
                    onChange={(e) => setEditingLead({...editingLead, address: e.target.value})}
                  />
                </div>
              </div>

              {/* Procedure Selection with Custom Option */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Procedure</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none cursor-pointer"
                  value={editingLead.procedure || editingLead.diagnosis || 'Check Up'}
                  onChange={(e) => setEditingLead({...editingLead, procedure: e.target.value})}
                >
                  {allProcedures.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="ADD_CUSTOM" className="text-rose-600 font-black">+ Create Custom Procedure</option>
                </select>
                {editingLead.procedure === 'ADD_CUSTOM' && (
                  <input
                    placeholder="Enter custom procedure name..."
                    className="w-full mt-2 px-4 py-2.5 bg-gray-50 border border-rose-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400"
                    value={formData.customProcedure}
                    onChange={(e) => setFormData({...formData, customProcedure: e.target.value})}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      placeholder="e.g. 10:30 AM"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none"
                      value={editingLead.time || ''}
                      onChange={(e) => setEditingLead({...editingLead, time: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Status</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none cursor-pointer"
                    value={editingLead.status || ''}
                    onChange={(e) => setEditingLead({...editingLead, status: e.target.value})}
                  >
                    {allResponses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="ADD_NEW">+ Create Custom Status</option>
                  </select>
                  {editingLead.status === 'ADD_NEW' && (
                    <input
                      placeholder="Custom status name..."
                      className="w-full mt-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400"
                      value={formData.customStatus}
                      onChange={(e) => setFormData({...formData, customStatus: e.target.value})}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Remarks / Notes</label>
                <textarea 
                  rows={2}
                  placeholder="Notes & call remarks..."
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none resize-none"
                  value={editingLead.notes || editingLead.callNotes || ''}
                  onChange={(e) => setEditingLead({...editingLead, notes: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className={cn("w-full py-4 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 mt-4", themeClasses.primary, themeClasses.hover)}
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {isSubmitting ? 'SAVING...' : 'UPDATE LEAD'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* End of Day Daily Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 bg-gray-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="text-rose-400" size={22} />
                  <h3 className="text-xl font-black uppercase tracking-tight">End-of-Day Leads & Procedure Report</h3>
                </div>
                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">
                  Official daily summary for {department.toUpperCase()} department
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Date Picker for Report */}
                <input 
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="bg-gray-800 text-white text-xs font-bold border border-gray-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
                />
                
                <button 
                  onClick={() => setIsReportModalOpen(false)} 
                  className="bg-white/10 p-2 rounded-xl hover:bg-white/20 text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body - Printable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/50">
              
              {/* Daily Statistics Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Leads Today</span>
                  <p className="text-3xl font-black text-gray-900 mt-1">{dailyReportData.total}</p>
                </div>
                
                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm col-span-1 sm:col-span-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Procedure Breakdown</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(dailyReportData.procedureCounts).length === 0 ? (
                      <span className="text-xs font-bold text-gray-400 italic">No procedures recorded for this day</span>
                    ) : (
                      Object.entries(dailyReportData.procedureCounts).map(([proc, count]) => (
                        <span key={proc} className="px-3 py-1 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-black">
                          {proc}: {count}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Breakdown:</span>
                {Object.entries(dailyReportData.statusCounts).map(([st, count]) => (
                  <span key={st} className="px-3 py-1 bg-gray-100 rounded-xl text-xs font-bold text-gray-700">
                    {st}: <strong className="font-black">{count}</strong>
                  </span>
                ))}
              </div>

              {/* Printable Table of Leads */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                    Detailed Leads Log ({reportDate})
                  </h4>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    {dailyReportData.total} Record(s)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-gray-100/70 border-b border-gray-200 text-[10px] font-black text-gray-600 uppercase tracking-wider">
                        <th className="p-3">#</th>
                        <th className="p-3">Time</th>
                        <th className="p-3">Lead / Patient</th>
                        <th className="p-3">Guardian Name</th>
                        <th className="p-3">Age</th>
                        <th className="p-3">Contact</th>
                        <th className="p-3">Address</th>
                        <th className="p-3">Procedure</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Remarks / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-800">
                      {dailyReportData.dayLeads.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-gray-400 font-bold uppercase tracking-wider text-xs">
                            No leads registered for {reportDate}
                          </td>
                        </tr>
                      ) : (
                        dailyReportData.dayLeads.map((l, i) => (
                          <tr key={l.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="p-3 font-mono text-gray-400">{i + 1}</td>
                            <td className="p-3 whitespace-nowrap text-gray-500">{l.time || '—'}</td>
                            <td className="p-3 font-black text-gray-900">{l.name || l.patientName}</td>
                            <td className="p-3 text-gray-700">{l.guardianName || l.parentName || '—'}</td>
                            <td className="p-3">{l.age ? `${l.age} y` : '—'}</td>
                            <td className="p-3 select-all">{l.contact}</td>
                            <td className="p-3 text-gray-600 truncate max-w-[120px]">{l.address || '—'}</td>
                            <td className="p-3">
                              <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-md text-[10px] font-black">
                                {l.procedure || l.diagnosis || 'Check Up'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 rounded-md text-[10px] font-black">
                                {l.status}
                              </span>
                            </td>
                            <td className="p-3 text-gray-600 break-words max-w-[160px] text-[11px]">
                              {l.notes || l.callNotes || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-gray-400">
                End-of-Day Report • {dailyReportData.total} entries
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => exportToCSV(dailyReportData.dayLeads, `daily_report_${reportDate}`)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  <FileSpreadsheet size={16} />
                  Export CSV
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md"
                >
                  <Printer size={16} />
                  Print Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
