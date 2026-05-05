'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Plus, GraduationCap, ArrowLeft, Save, 
  User, Mail, Phone, BookOpen, Calendar,
  Loader2, Shield, X
} from 'lucide-react';

export default function NewITStudentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [session, setSession] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    course: '',
    batch: '',
    totalFee: '',
    joiningDate: new Date().toISOString().split('T')[0]
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
      
      await addDoc(collection(db, 'it_students'), {
        ...formData,
        status: 'active',
        feePaid: 0,
        totalFee: Number(formData.totalFee) || 0,
        joiningDate: new Date(formData.joiningDate),
        createdAt: serverTimestamp(),
      });

      setSubmitStatus('success');
      setTimeout(() => {
        router.push('/departments/it/dashboard/admin/students');
      }, 1500);
    } catch (err: any) {
      console.error('Add student error:', err?.message);
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
              <ArrowLeft size={12} /> Back to Registry
            </button>
            <h1 className="text-4xl md:text-5xl font-black text-black tracking-tighter flex items-center gap-4">
              <GraduationCap className="w-10 h-10 text-indigo-600" />
              Enrol Student
            </h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Create a new IT intern profile</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Personal Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><User size={16} /></div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest">Personal Details</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Full Name</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Abdullah Khan"
                      className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="abdullah@example.com"
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
                      placeholder="03xx-xxxxxxx"
                      className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Course Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><BookOpen size={16} /></div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest">Training Program</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Selected Course</label>
                    <select
                      required
                      value={formData.course}
                      onChange={e => setFormData({...formData, course: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all appearance-none"
                    >
                      <option value="">Select Course</option>
                      <option value="Web Development">Web Development</option>
                      <option value="App Development">App Development</option>
                      <option value="Graphic Design">Graphic Design</option>
                      <option value="Digital Marketing">Digital Marketing</option>
                      <option value="Cloud Computing">Cloud Computing</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Total Course Fee (Rs.)</label>
                    <input
                      required
                      type="number"
                      value={formData.totalFee}
                      onChange={e => setFormData({...formData, totalFee: e.target.value})}
                      placeholder="e.g. 25000"
                      className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Joining Date</label>
                    <input
                      required
                      type="date"
                      value={formData.joiningDate}
                      onChange={e => setFormData({...formData, joiningDate: e.target.value})}
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
                  <span>Enrolling...</span>
                </>
              ) : submitStatus === 'success' ? (
                <>
                  <Shield size={20} className="text-emerald-200" />
                  <span>Enrolled</span>
                </>
              ) : submitStatus === 'error' ? (
                <>
                  <X size={20} className="text-rose-200" />
                  <span>Retry Sync</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Register Student</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
