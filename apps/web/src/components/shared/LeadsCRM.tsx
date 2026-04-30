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

type LeadStatus = 'NEW' | 'No Response' | 'Scheduled Callback' | 'Busy' | 'DC';

interface Lead {
  id: string;
  name: string;
  contact: string;
  address: string;
  addiction: string;
  status: LeadStatus;
  notes: string;
  department: string;
  createdAt: any;
  updatedAt: any;
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
};

const ADDICTION_TYPES = ['Ice', 'Heroin', 'Charas', 'Alcohol', 'Other'];

export default function LeadsCRM({ department }: LeadsCRMProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'createdAt' | 'name'; direction: 'asc' | 'desc' }>({ 
    key: 'createdAt', 
    direction: 'desc' 
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    address: '',
    addiction: 'Ice',
    status: 'NEW' as LeadStatus,
    notes: ''
  });

  useEffect(() => {
    const q = query(
      collection(db, 'leads'), 
      where('department', '==', department),
      orderBy(sortConfig.key, sortConfig.direction)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      setLeads(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [department, sortConfig]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const name = l.name || '';
      const contact = l.contact || '';
      const address = l.address || '';
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          contact.includes(searchQuery) ||
                          address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const s = {
      total: leads.length,
      'NEW': 0,
      'No Response': 0,
      'Scheduled Callback': 0,
      'Busy': 0,
      'DC': 0
    };
    leads.forEach(l => {
      if (l.status in s) {
        s[l.status as keyof typeof s]++;
      }
    });
    return s;
  }, [leads]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact) {
      toast.error('Name and Contact are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'leads'), {
        ...formData,
        department,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      toast.success('Lead added successfully');
      setIsAddModalOpen(false);
      setFormData({ name: '', contact: '', address: '', addiction: 'Ice', status: 'NEW', notes: '' });
    } catch (err) {
      toast.error('Failed to add lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: LeadStatus) => {
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
    window.location.href = `tel:${number}`;
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
      primary: 'bg-rose-900',
      hover: 'hover:bg-rose-950',
      text: 'text-rose-900',
      border: 'border-rose-100',
      bg: 'bg-rose-50',
      accent: 'text-rose-400'
    }
  }[department];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Leads</p>
          <p className={cn("text-2xl font-black mt-1", themeClasses.text)}>{stats.total}</p>
        </div>
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <div key={status} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{status}</p>
            <p className={cn("text-2xl font-black mt-1", config.text)}>{stats[status as keyof typeof stats]}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search leads by name, phone or city..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            className="bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Status</option>
            {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className={cn("flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg", themeClasses.primary, themeClasses.hover)}
          >
            <Plus size={18} />
            Add New Lead
          </button>
        </div>
      </div>

      {/* Spreadsheet UI */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
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
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Addiction</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Address</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
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
                <td colSpan={6} className="py-20 text-center">
                  <Loader2 className={cn("mx-auto animate-spin", themeClasses.text)} size={32} />
                  <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Syncing leads...</p>
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <Activity className="mx-auto text-gray-200" size={48} />
                  <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest">No matching leads found</p>
                </td>
              </tr>
            ) : filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-white", themeClasses.primary)}>
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
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black uppercase text-gray-600">
                    {lead.addiction}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs text-gray-500 font-medium truncate max-w-[150px]">{lead.address}</p>
                </td>
                <td className="px-6 py-4">
                  <select 
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer border-none font-sans",
                      STATUS_CONFIG[lead.status].bg,
                      STATUS_CONFIG[lead.status].text
                    )}
                    value={lead.status}
                    onChange={(e) => handleStatusUpdate(lead.id, e.target.value as LeadStatus)}
                  >
                    {Object.keys(STATUS_CONFIG).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {activeCallId === lead.id ? (
                      <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-xl border border-amber-200 animate-in slide-in-from-right-2">
                        <select 
                          autoFocus
                          className="text-[9px] font-black uppercase bg-white border border-amber-200 rounded-lg px-2 py-1.5 outline-none"
                          onChange={(e) => handleStatusUpdate(lead.id, e.target.value as LeadStatus)}
                        >
                          <option value="">Log Outcome...</option>
                          {Object.keys(STATUS_CONFIG).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button onClick={() => setActiveCallId(null)} className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-600">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
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
            
            <form onSubmit={handleAddLead} className="p-8 space-y-6">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Addiction Type</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none cursor-pointer"
                    value={formData.addiction}
                    onChange={(e) => setFormData({...formData, addiction: e.target.value})}
                  >
                    {ADDICTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={cn("text-[10px] font-black uppercase tracking-widest px-1", themeClasses.accent)}>Initial Status</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none cursor-pointer"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as LeadStatus})}
                  >
                    {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
    </div>
  );
}
