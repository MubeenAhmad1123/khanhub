'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Plus, Building2, ArrowLeft, Save, 
  User, Mail, Phone, Globe, Briefcase
} from 'lucide-react';
import { Spinner } from '@/components/ui';

export default function NewITClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    if (loading) return;

    try {
      setLoading(true);
      await addDoc(collection(db, 'it_clients'), {
        ...formData,
        status: 'active',
        activeProjects: 0,
        createdAt: serverTimestamp(),
      });
      router.push('/departments/it/dashboard/admin/clients');
    } catch (err: any) {
      console.error('Add client error:', err?.message);
      alert('Failed to add client. Please try again.');
    } finally {
      setLoading(false);
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
              disabled={loading}
              type="submit"
              className="flex items-center gap-3 px-12 py-5 bg-black text-white rounded-[2.5rem] font-black text-lg hover:bg-indigo-600 transition-all active:scale-95 shadow-2xl shadow-black/20 disabled:opacity-50"
            >
              {loading ? <Spinner size="sm" showText={false} /> : <><Save size={20} /> Onboard Client</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
