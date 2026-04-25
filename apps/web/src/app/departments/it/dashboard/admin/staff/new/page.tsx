'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { 
  Users, ArrowLeft, UserPlus, 
  User, Mail, Phone, Shield, 
  Briefcase, Lock, Loader2, Plus
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function NewITStaffPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    role: 'staff',
    password: '',
    employeeId: `ENG-${Math.floor(1000 + Math.random() * 9000)}`
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await addDoc(collection(db, 'it_staff'), {
        ...formData,
        status: 'active',
        createdAt: Timestamp.now()
      });
      toast.success('Engineer onboarded successfully');
      router.push('/departments/it/dashboard/admin/staff');
    } catch (err: any) {
      toast.error('Onboarding failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 w-full">
      <div className="max-w-4xl mx-auto space-y-10">
        
        <div className="flex items-center gap-6 border-b border-black/5 pb-10">
          <button 
            onClick={() => router.back()}
            className="w-12 h-12 rounded-2xl bg-white border border-black/5 flex items-center justify-center text-gray-400 hover:text-black transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-black tracking-tighter">
              Onboard <span className="text-indigo-600">Engineer</span> 🛠️
            </h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">New IT Team Member Registration</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <UserPlus size={24} />
            </div>
            <h2 className="text-xl font-black text-black uppercase tracking-tight">Identity & Credentials</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
              <input 
                type="text" required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                placeholder="e.g. Mubeen Ahmad"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Engineering ID</label>
              <input 
                type="text" readOnly
                value={formData.employeeId}
                className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 text-sm font-black text-indigo-600 outline-none"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Designation</label>
              <input 
                type="text" required
                value={formData.designation}
                onChange={e => setFormData({...formData, designation: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                placeholder="e.g. Lead Software Engineer"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Role</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all appearance-none"
              >
                <option value="staff">Engineering Staff</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                type="email" required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                placeholder="name@khanhub.com"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Phone</label>
              <input 
                type="tel" required
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                placeholder="+92 XXX XXXXXXX"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Access Password</label>
              <input 
                type="password" required
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-10 flex items-center justify-end gap-6 border-t border-black/5">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
            >
              Discard
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-12 py-5 bg-black text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-3 shadow-2xl shadow-black/10 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Initialize Engineer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
