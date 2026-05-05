'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Plus, Building2, ArrowLeft, Save, 
  User, Mail, Phone, Globe, Briefcase,
  Loader2, Shield, X
} from 'lucide-react';

export default function NewITClientPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [session, setSession] = useState<any>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    industry: ''
  });

  useEffect(() => {
    const sessionData = localStorage.getItem('it_session');
    if (!sessionData) { router.push('/departments/it/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/it/login'); return;
    }
    setSession(parsed);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setSubmitStatus('processing');
      
      await addDoc(collection(db, 'it_clients'), {
        ...formData,
        status: 'active',
        activeProjects: 0,
        createdAt: serverTimestamp(),
      });

      setSubmitStatus('success');
      setTimeout(() => {
        router.push('/departments/it/dashboard/admin/clients');
      }, 1500);
    } catch (err: any) {
      console.error('Add client error:', err?.message);
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 w-full">
      <div className="max-w-4xl mx-auto space-y-10">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-black/5 pb-10">
          <div>
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 hover:text-black transition-colors"
            >
              <ArrowLeft size={12} /> Back to Directory
            </button>
            <h1 className="text-4xl md:text-5xl font-black text-black tracking-tighter flex items-center gap-4">
              <Building2 className="w-10 h-10 text-indigo-600" />
              Onboard Client
            </h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Add a new partner or project owner</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Company Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Building2 size={16} /></div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest">Company Info</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Company Name</label>
                    <input
                      required
                      type="text"
                      value={formData.companyName}
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                      placeholder="e.g. Acme Tech Solutions"
                      className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Industry</label>
                    <input
                      required
                      type="text"
                      value={formData.industry}
                      onChange={e => setFormData({...formData, industry: e.target.value})}
                      placeholder="e.g. Healthcare, Finance"
                      className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Website (Optional)</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={e => setFormData({...formData, website: e.target.value})}
                      placeholder="https://example.com"
                      className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Person */}
            <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><User size={16} /></div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest">Contact Person</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Contact Name</label>
                    <input
                      required
                      type="text"
                      value={formData.contactPerson}
                      onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                      placeholder="e.g. John Doe"
                      className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Email Address</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="john@example.com"
                      className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Phone Number</label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="+92 3xx xxxxxxx"
                      className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button
              disabled={submitting}
              type="submit"
              className={`flex items-center gap-3 px-12 py-5 rounded-[2.5rem] font-black text-lg transition-all active:scale-95 shadow-2xl disabled:opacity-50 ${
                submitStatus === 'success' ? 'bg-emerald-600 text-white shadow-emerald-500/20' :
                submitStatus === 'error' ? 'bg-rose-600 text-white shadow-rose-500/20' :
                'bg-black text-white hover:bg-indigo-600 shadow-black/20'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Onboarding...</span>
                </>
              ) : submitStatus === 'success' ? (
                <>
                  <Shield size={20} className="text-emerald-200" />
                  <span>Onboarded</span>
                </>
              ) : submitStatus === 'error' ? (
                <>
                  <X size={20} className="text-rose-200" />
                  <span>Retry Sync</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Onboard Client</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
