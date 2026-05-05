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
  MoreVertical, 
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
  ChevronDown,
  Save
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn, formatDateDMY } from '@/lib/utils';

type LeadStatus = 'NEW' | 'No Response' | 'Scheduled Callback' | 'Busy' | 'DC' | 'Nill' | 'No';

interface Lead {
  id: string;
  name: string;
  contact: string;
  address: string;
  addiction: string;
  status: string; // Changed from LeadStatus to string to support custom responses
  notes: string;
  callNotes?: string;
  department: string;
  // Dynamic Fields
  studentName?: string;
  parentName?: string;
  patientName?: string;
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

interface LeadsCRMProps {
  department: 'rehab' | 'spims' | 'hospital';
}

const STATUS_CONFIG: Record<LeadStatus, { color: string; bg: string; text: string }> = {
  'NEW': { color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
  'No Response': { color: 'gray', bg: 'bg-gray-100', text: 'text-gray-700' },
  'Scheduled Callback': { color: 'amber', bg: 'bg-amber-100', text: 'text-amber-700' },
  'Busy': { color: 'purple', bg: 'bg-purple-100', text: 'text-purple-700' },
  'DC': { color: 'red', bg: 'bg-red-100', text: 'text-red-700' },
  'Nill': { color: 'gray', bg: 'bg-gray-100', text: 'text-gray-700' },
  'No': { color: 'gray', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const ADDICTION_TYPES = ['', 'Nill', 'No', 'Ice', 'Heroin', 'Charas', 'Alcohol', 'Other'];

export default function LeadsCRM({ department }: LeadsCRMProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [customResponses, setCustomResponses] = useState<CustomResponse[]>([]);
  const [showCustomResponseInput, setShowCustomResponseInput] = useState(false);
  const [newCustomResponse, setNewCustomResponse] = useState('');
  const [customStatusValue, setCustomStatusValue] = useState('');
  const [customAddictionValue, setCustomAddictionValue] = useState('');
  
  const [sortConfig, setSortConfig] = useState<{ key: 'createdAt' | 'name'; direction: 'asc' | 'desc' }>({ 
    key: 'createdAt', 
    direction: 'desc' 
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    address: '',
    addiction: (department === 'rehab' || department === 'hospital') ? 'Ice' : '',
    status: 'NEW',
    notes: '',
    callNotes: '',
    department: department, // Initialize with current department
    studentName: '',
    parentName: '',
    patientName: '',
    responseReview: '',
    diagnosis: ''
  });

  useEffect(() => {
    // Reset form on department change
    setFormData({
      name: '',
      contact: '',
      address: '',
      addiction: (department === 'rehab' || department === 'hospital') ? 'Ice' : '',
      status: 'NEW',
      notes: '',
      callNotes: '',
      department: department,
      studentName: '',
      parentName: '',
      patientName: '',
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
    });

    return () => {
      unsubscribeLeads();
      unsubscribeResponses();
    };
  }, [department]);

  const filteredLeads = useMemo(() => {
    const matched = leads.filter(l => {
      const name = l.name || '';
      const contact = l.contact || '';
      const address = l.address || '';
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          contact.includes(searchQuery) ||
                          address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchesSearch && matchesStatus;
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
  }, [leads, searchQuery, statusFilter, sortConfig]);

  const allResponses = useMemo(() => {
    const base = Object.keys(STATUS_CONFIG).map(id => ({
      id,
      name: id,
      color: STATUS_CONFIG[id as LeadStatus].color
    }));
    return [...base, ...customResponses];
  }, [customResponses]);

  const stats = useMemo(() => {
    const s: Record<string, number> = { total: leads.length };
    allResponses.forEach(r => { s[r.id] = 0; });
    leads.forEach(l => {
      if (l.status in s) s[l.status]++;
      else s['NEW']++; // Fallback
    });
    return s;
  }, [leads, allResponses]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact) {
      toast.error('Name and Contact are required');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalStatus = formData.status;
      if (formData.status === 'ADD_NEW' && customStatusValue.trim()) {
        const id = customStatusValue.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (!STATUS_CONFIG[id as LeadStatus] && !customResponses.find(r => r.id === id)) {
          await addDoc(collection(db, 'hq_lead_responses'), {
            id,
            name: customStatusValue.trim(),
            color: 'gray',
            createdAt: Timestamp.now()
          });
          finalStatus = id;
        } else {
          finalStatus = id;
        }
      }

      let finalAddiction = formData.addiction;
      if ((department === 'rehab' || department === 'hospital') && (formData.addiction === 'CUSTOM' || formData.addiction === 'Other') && customAddictionValue.trim()) {
        finalAddiction = customAddictionValue.trim();
      }

      await addDoc(collection(db, 'leads'), {
        ...formData,
        status: finalStatus,
        addiction: finalAddiction,
        department,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      toast.success('Lead added successfully');
      setIsAddModalOpen(false);
      setFormData({ 
        name: '', 
        contact: '', 
        address: '', 
        addiction: (department === 'rehab' || department === 'hospital') ? 'Ice' : '', 
        status: 'NEW', 
        notes: '', 
        callNotes: '',
        department: department,
        studentName: '',
        parentName: '',
        patientName: '',
        responseReview: '',
        diagnosis: ''
      });
      setCustomStatusValue('');
      setCustomAddictionValue('');
    } catch (err) {
      toast.error('Failed to add lead');
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
      if (editingLead.status === 'ADD_NEW' && customStatusValue.trim()) {
        const id = customStatusValue.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (!STATUS_CONFIG[id as LeadStatus] && !customResponses.find(r => r.id === id)) {
          await addDoc(collection(db, 'hq_lead_responses'), {
            id,
            name: customStatusValue.trim(),
            color: 'gray',
            createdAt: Timestamp.now()
          });
          finalStatus = id;
        } else {
          finalStatus = id;
        }
      }

      let finalAddiction = editingLead.addiction;
      if ((department === 'rehab' || department === 'hospital') && (editingLead.addiction === 'CUSTOM' || editingLead.addiction === 'Other') && customAddictionValue.trim()) {
        finalAddiction = customAddictionValue.trim();
      }

      await updateDoc(doc(db, 'leads', editingLead.id), {
        name: editingLead.name,
        contact: editingLead.contact,
        address: editingLead.address,
        addiction: finalAddiction,
        status: finalStatus,
        notes: editingLead.notes || '',
        callNotes: editingLead.callNotes || '',
        department: editingLead.department,
        studentName: editingLead.studentName || '',
        parentName: editingLead.parentName || '',
        patientName: editingLead.patientName || '',
        responseReview: editingLead.responseReview || '',
        diagnosis: editingLead.diagnosis || '',
        updatedAt: Timestamp.now()
      });
      toast.success('Lead updated successfully');
      setIsEditModalOpen(false);
      setEditingLead(null);
      setCustomStatusValue('');
      setCustomAddictionValue('');
    } catch (err) {
      toast.error('Failed to update lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateResponse = async () => {
    if (!newCustomResponse.trim()) return;
    const id = newCustomResponse.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    
    // Check if already exists in base or custom
    if (STATUS_CONFIG[id as LeadStatus] || customResponses.find(r => r.id === id)) {
      toast.error('Response type already exists');
      return;
    }

    try {
      await addDoc(collection(db, 'hq_lead_responses'), {
        id,
        name: newCustomResponse.trim(),
        color: 'gray', // Default
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
      toast.success('Call notes saved');
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

  // Theme-based class names
  const themeClasses = {
    rehab: {
      primary: 'bg-teal-600',
      hover: 'hover:bg-teal-700',
      text: 'text-teal-600',
      border: 'border-teal-100',
      bg: 'bg-teal-50',
      accent: 'text-teal-400'
    },
    spims: {
      primary: 'bg-[#1D9E75]',
      hover: 'hover:bg-[#15805d]',
      text: 'text-[#1D9E75]',
      border: 'border-emerald-100',
      bg: 'bg-emerald-50',
      accent: 'text-emerald-400'
    },
    hospital: {
      primary: 'bg-rose-600',
      hover: 'hover:bg-rose-700',
      text: 'text-rose-600',
      border: 'border-rose-200/60',
      bg: 'bg-rose-50/50',
      accent: 'text-rose-500'
    }
  }[department];

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
              config.id === 'DC' ? 'text-red-700' : 
              'text-gray-700'
            )}>{stats[config.id] || 0}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3 md:p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between w-full max-w-full overflow-hidden">
        <div className="relative w-full md:w-96 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search leads by name, phone or city..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <select 
            className="w-full sm:w-auto bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            {allResponses.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className={cn("flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg", themeClasses.primary, themeClasses.hover)}
          >
            <Plus size={18} />
            <span className="truncate">Add New Lead</span>
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
                  Lead Name
                  <ArrowUpDown size={12} className={cn(sortConfig.key === 'name' ? "text-indigo-600" : "text-gray-300")} />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
              {department === 'rehab' && (
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Addiction</th>
              )}
              {department === 'spims' && (
                <>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Parent</th>
                </>
              )}
              {department === 'hospital' && (
                <>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Diagnosis</th>
                </>
              )}
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Address</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[200px]">Call Notes</th>
              <th 
                className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setSortConfig({ 
                  key: 'createdAt', 
                  direction: sortConfig.key === 'createdAt' && sortConfig.direction === 'desc' ? 'asc' : 'desc' 
                })}
              >
                <div className="flex items-center justify-center gap-2">
                  Execution
                  <ArrowUpDown size={12} className={cn(sortConfig.key === 'createdAt' ? "text-indigo-600" : "text-gray-300")} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={(department === 'rehab' || department === 'hospital') ? 7 : 6} className="py-20 text-center">
                  <Loader2 className={cn("mx-auto animate-spin", themeClasses.text)} size={32} />
                  <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Syncing leads...</p>
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={(department === 'rehab' || department === 'hospital') ? 7 : 6} className="py-20 text-center">
                  <Activity className="mx-auto text-gray-200" size={48} />
                  <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest">No matching leads found</p>
                </td>
              </tr>
            ) : filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-white flex-shrink-0", themeClasses.primary)}>
                      {lead.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{lead.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{lead.createdAt ? formatDateDMY(lead.createdAt) : 'Just now'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-gray-700">{lead.contact}</p>
                </td>
                {department === 'rehab' && (
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black uppercase text-gray-600">
                      {lead.addiction}
                    </span>
                  </td>
                )}
                {department === 'spims' && (
                  <>
                    <td className="px-6 py-4 text-xs font-bold text-gray-600">{lead.studentName || '—'}</td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-600">{lead.parentName || '—'}</td>
                  </>
                )}
                {department === 'hospital' && (
                  <>
                    <td className="px-6 py-4 text-xs font-bold text-gray-600">{lead.patientName || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black uppercase text-gray-600">
                        {lead.diagnosis || '—'}
                      </span>
                    </td>
                  </>
                )}
                <td className="px-6 py-4">
                  <p className="text-xs text-gray-500 font-medium truncate max-w-[150px]">{lead.address}</p>
                </td>
                <td className="px-6 py-4">
                  <select 
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer border-none font-sans",
                      STATUS_CONFIG[lead.status as LeadStatus]?.bg || 'bg-gray-100',
                      STATUS_CONFIG[lead.status as LeadStatus]?.text || 'text-gray-700'
                    )}
                    value={lead.status}
                    onChange={async (e) => {
                      if (e.target.value === 'ADD_NEW') {
                        const val = window.prompt('Enter new custom status:');
                        if (val && val.trim()) {
                          const id = val.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                          if (!STATUS_CONFIG[id as LeadStatus] && !customResponses.find(r => r.id === id)) {
                            await addDoc(collection(db, 'hq_lead_responses'), {
                              id,
                              name: val.trim(),
                              color: 'gray',
                              createdAt: Timestamp.now()
                            });
                          }
                          handleStatusUpdate(lead.id, id);
                        }
                      } else {
                        handleStatusUpdate(lead.id, e.target.value);
                      }
                    }}
                  >
                    {allResponses.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    <option value="ADD_NEW" className="text-indigo-600 font-black">+ CUSTOM</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <textarea 
                    defaultValue={lead.callNotes}
                    onBlur={(e) => handleCallNotesUpdate(lead.id, e.target.value)}
                    placeholder="Enter call notes..."
                    className="w-full bg-gray-50 border-none rounded-lg p-2 text-[10px] font-bold outline-none focus:ring-1 focus:ring-indigo-300 transition-all resize-none h-10 no-scrollbar"
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
                          className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-600 hover:text-white transition-all shadow-sm group/btn"
                          title="Edit Lead"
                        >
                          <Edit2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button 
                          onClick={() => handleCall(lead.id, lead.contact)}
                          className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm group/btn"
                          title="Call Lead"
                        >
                          <PhoneCall size={18} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button 
                          onClick={() => handleWhatsApp(lead.contact, lead.name)}
                          className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm group/btn"
                          title="WhatsApp"
                        >
                          <MessageSquare size={18} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button 
                          onClick={() => handleDeleteLead(lead.id)}
                          className="w-8 h-8 rounded-lg text-gray-300 flex items-center justify-center hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100 ml-2"
                        >
                          <Trash2 size={16} />
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
                    {lead.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{lead.name}</h4>
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
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact</p>
                  <p className="text-xs font-black text-gray-700 mt-0.5 select-all break-all">{lead.contact}</p>
                </div>

                {department === 'rehab' && (
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Addiction</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-gray-100 rounded-lg text-[9px] font-black uppercase text-gray-600 truncate max-w-full">
                      {lead.addiction}
                    </span>
                  </div>
                )}

                {department === 'spims' && (
                  <>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Student</p>
                      <p className="text-xs font-bold text-gray-600 mt-0.5 truncate">{lead.studentName || '—'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Parent</p>
                      <p className="text-xs font-bold text-gray-600 mt-0.5 truncate">{lead.parentName || '—'}</p>
                    </div>
                  </>
                )}

                {department === 'hospital' && (
                  <>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Patient</p>
                      <p className="text-xs font-bold text-gray-600 mt-0.5 truncate">{lead.patientName || '—'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Diagnosis</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-gray-100 rounded-lg text-[9px] font-black uppercase text-gray-600 truncate max-w-full">
                        {lead.diagnosis || '—'}
                      </span>
                    </div>
                  </>
                )}

                <div className="col-span-2 min-w-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Address / City</p>
                  <p className="text-xs font-bold text-gray-600 mt-0.5 break-words line-clamp-2">{lead.address || '—'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status Update</label>
                  <select 
                    className={cn(
                      "w-full sm:w-auto px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer border-none font-sans",
                      STATUS_CONFIG[lead.status as LeadStatus]?.bg || 'bg-gray-100',
                      STATUS_CONFIG[lead.status as LeadStatus]?.text || 'text-gray-700'
                    )}
                    value={lead.status}
                    onChange={async (e) => {
                      if (e.target.value === 'ADD_NEW') {
                        const val = window.prompt('Enter new custom status:');
                        if (val && val.trim()) {
                          const id = val.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                          if (!STATUS_CONFIG[id as LeadStatus] && !customResponses.find(r => r.id === id)) {
                            await addDoc(collection(db, 'hq_lead_responses'), {
                              id,
                              name: val.trim(),
                              color: 'gray',
                              createdAt: Timestamp.now()
                            });
                          }
                          handleStatusUpdate(lead.id, id);
                        }
                      } else {
                        handleStatusUpdate(lead.id, e.target.value);
                      }
                    }}
                  >
                    {allResponses.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    <option value="ADD_NEW" className="text-indigo-600 font-black">+ CUSTOM</option>
                  </select>
                </div>

                <textarea 
                  defaultValue={lead.callNotes}
                  onBlur={(e) => handleCallNotesUpdate(lead.id, e.target.value)}
                  placeholder="Enter call notes..."
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-300 transition-all resize-none h-16 no-scrollbar"
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
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 scale-in-center">
            <div className={cn("p-8 text-white flex justify-between items-center", themeClasses.primary)}>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">New Lead Entry</h3>
                <p className="text-xs font-bold text-white/70 mt-1">Populate lead details for follow-up</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddLead} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="space-y-2">
                <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Target Department</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none cursor-pointer"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value as any})}
                >
                  <option value="rehab">Rehab Department</option>
                  <option value="spims">SPIMS Department</option>
                  <option value="hospital">Hospital Department</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      required
                      placeholder="e.g. Amir Khan"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      required
                      placeholder="03XXXXXXXXX"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                      value={formData.contact}
                      onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Address / City</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input 
                    placeholder="e.g. Peshawar, KP"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.department === 'spims' && (
                  <>
                    <div className="space-y-2">
                      <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Student Name</label>
                      <input 
                        placeholder="Name of student"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={formData.studentName}
                        onChange={(e) => setFormData({...formData, studentName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Parent Name</label>
                      <input 
                        placeholder="Father/Guardian name"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={formData.parentName}
                        onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                      />
                    </div>
                  </>
                )}

                {formData.department === 'hospital' && (
                  <>
                    <div className="space-y-2">
                      <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Patient Name</label>
                      <input 
                        placeholder="Name of patient"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={formData.patientName}
                        onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Diagnosis</label>
                      <input 
                        placeholder="e.g. Fever, Hypertension"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={formData.diagnosis}
                        onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Initial Response Review</label>
                      <input 
                        placeholder="Initial review/feedback"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={formData.responseReview}
                        onChange={(e) => setFormData({...formData, responseReview: e.target.value})}
                      />
                    </div>
                  </>
                )}

                {formData.department === 'rehab' && (
                  <div className="space-y-2">
                    <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Addiction Type</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none cursor-pointer"
                      value={formData.addiction}
                      onChange={(e) => setFormData({...formData, addiction: e.target.value})}
                    >
                      {ADDICTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      <option value="CUSTOM">+ Add Custom Addiction</option>
                    </select>
                    {(formData.addiction === 'CUSTOM' || formData.addiction === 'Other') && (
                      <input
                        placeholder="Custom addiction type..."
                        className="w-full mt-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400"
                        value={customAddictionValue}
                        onChange={(e) => setCustomAddictionValue(e.target.value)}
                      />
                    )}
                  </div>
                )}
                <div className={cn("space-y-2", (formData.department === 'spims') && "col-span-1 md:col-span-2")}>
                  <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Initial Status</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none cursor-pointer"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    {allResponses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="ADD_NEW">+ Add Custom Status</option>
                  </select>
                  {formData.status === 'ADD_NEW' && (
                    <input
                      placeholder="Custom status name..."
                      className="w-full mt-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400"
                      value={customStatusValue}
                      onChange={(e) => setCustomStatusValue(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Remarks</label>
                <textarea 
                  rows={2}
                  placeholder="Notes from initial contact..."
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none resize-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Call Notes</label>
                <textarea 
                  rows={2}
                  placeholder="Important call notes..."
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none resize-none"
                  value={formData.callNotes}
                  onChange={(e) => setFormData({...formData, callNotes: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className={cn("w-full py-4 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3", themeClasses.primary, themeClasses.hover)}
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
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 scale-in-center">
            <div className={cn("p-8 text-white flex justify-between items-center", themeClasses.primary)}>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Edit Lead</h3>
                <p className="text-xs font-bold text-white/70 mt-1">Modify lead information</p>
              </div>
              <button onClick={() => { setIsEditModalOpen(false); setEditingLead(null); }} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleEditLead} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="space-y-2">
                <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Target Department</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none cursor-pointer"
                  value={editingLead.department}
                  onChange={(e) => setEditingLead({...editingLead, department: e.target.value as any})}
                >
                  <option value="rehab">Rehab Department</option>
                  <option value="spims">SPIMS Department</option>
                  <option value="hospital">Hospital Department</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      required
                      placeholder="e.g. Amir Khan"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                      value={editingLead.name || ''}
                      onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      required
                      placeholder="03XXXXXXXXX"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                      value={editingLead.contact || ''}
                      onChange={(e) => setEditingLead({...editingLead, contact: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Address / City</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input 
                    placeholder="e.g. Peshawar, KP"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                    value={editingLead.address || ''}
                    onChange={(e) => setEditingLead({...editingLead, address: e.target.value})}
                  />
                </div>
              </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editingLead.department === 'spims' && (
                  <>
                    <div className="space-y-2">
                      <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Student Name</label>
                      <input 
                        placeholder="Name of student"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={editingLead.studentName || ''}
                        onChange={(e) => setEditingLead({...editingLead, studentName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Parent Name</label>
                      <input 
                        placeholder="Father/Guardian name"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={editingLead.parentName || ''}
                        onChange={(e) => setEditingLead({...editingLead, parentName: e.target.value})}
                      />
                    </div>
                  </>
                )}

                {editingLead.department === 'hospital' && (
                  <>
                    <div className="space-y-2">
                      <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Patient Name</label>
                      <input 
                        placeholder="Name of patient"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={editingLead.patientName || ''}
                        onChange={(e) => setEditingLead({...editingLead, patientName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Diagnosis</label>
                      <input 
                        placeholder="e.g. Fever, Hypertension"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={editingLead.diagnosis || ''}
                        onChange={(e) => setEditingLead({...editingLead, diagnosis: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Response Review</label>
                      <input 
                        placeholder="Initial review/feedback"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={editingLead.responseReview || ''}
                        onChange={(e) => setEditingLead({...editingLead, responseReview: e.target.value})}
                      />
                    </div>
                  </>
                )}

                {editingLead.department === 'rehab' && (
                  <div className="space-y-2">
                    <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Addiction Type</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none cursor-pointer"
                      value={editingLead.addiction || ''}
                      onChange={(e) => setEditingLead({...editingLead, addiction: e.target.value})}
                    >
                      {ADDICTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      <option value="CUSTOM">+ Add Custom Addiction</option>
                    </select>
                    {(editingLead.addiction === 'CUSTOM' || editingLead.addiction === 'Other') && (
                      <input
                        placeholder="Custom addiction type..."
                        className="w-full mt-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400"
                        value={customAddictionValue}
                        onChange={(e) => setCustomAddictionValue(e.target.value)}
                      />
                    )}
                  </div>
                )}
                <div className={cn("space-y-2", (editingLead.department === 'spims') && "col-span-1 md:col-span-2")}>
                  <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Initial Status</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none cursor-pointer"
                    value={editingLead.status || ''}
                    onChange={(e) => setEditingLead({...editingLead, status: e.target.value})}
                  >
                    {allResponses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="ADD_NEW">+ Add Custom Status</option>
                  </select>
                  {editingLead.status === 'ADD_NEW' && (
                    <input
                      placeholder="Custom status name..."
                      className="w-full mt-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400"
                      value={customStatusValue}
                      onChange={(e) => setCustomStatusValue(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Remarks</label>
                <textarea 
                  rows={2}
                  placeholder="Notes from initial contact..."
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none resize-none"
                  value={editingLead.notes || ''}
                  onChange={(e) => setEditingLead({...editingLead, notes: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Call Notes</label>
                <textarea 
                  rows={2}
                  placeholder="Important call notes..."
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none resize-none"
                  value={editingLead.callNotes || ''}
                  onChange={(e) => setEditingLead({...editingLead, callNotes: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className={cn("w-full py-4 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3", themeClasses.primary, themeClasses.hover)}
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {isSubmitting ? 'SAVING...' : 'UPDATE LEAD'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
