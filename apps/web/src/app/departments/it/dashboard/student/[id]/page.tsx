'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  GraduationCap, BookOpen, Clock, 
  Award, FileText, CheckCircle, 
  AlertCircle, DollarSign, Laptop, 
  Calendar, ArrowRight, User
} from 'lucide-react';
import { Spinner } from '@/components/ui';
import { formatDateDMY } from '@/lib/utils';

export default function ITStudentPortalDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('it_session');
    if (!sessionData) { router.push('/departments/it/login'); return; }
    fetchStudent();
  }, [id]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'it_students', id as string);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setStudent({
          id: snap.id,
          ...data,
          joiningDate: data.joiningDate?.toDate?.() || data.joiningDate || new Date()
        });
      } else {
        router.push('/departments/it/dashboard/student');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <Spinner size="lg" />
      </div>
    );
  }

  const feeStatus = (student.feePaid / student.totalFee) * 100;

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 w-full">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/5 pb-10">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-black tracking-tighter leading-tight">
              Hello, <span className="text-indigo-600">{student.name.split(' ')[0]}</span>! 👋
            </h1>
            <p className="text-xs text-gray-400 font-black uppercase tracking-[0.3em] mt-4 flex items-center gap-2">
              <GraduationCap size={14} className="text-indigo-500" />
              IT Learning Portal • {student.course || 'Technology Intern'}
            </p>
          </div>
          <div className="bg-white border border-black/5 rounded-2xl px-6 py-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
              {student.id.slice(-2)}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Intern ID</p>
              <p className="text-xs font-black text-black">{student.id}</p>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-[3rem] p-8 border border-black/5 shadow-sm group hover:border-indigo-500/20 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><BookOpen size={20} /></div>
              <h3 className="text-sm font-black uppercase tracking-tight">Curriculum</h3>
            </div>
            <p className="text-2xl font-black text-black">{student.course}</p>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Active Track</p>
          </div>

          <div className="bg-white rounded-[3rem] p-8 border border-black/5 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600"><Clock size={20} /></div>
              <h3 className="text-sm font-black uppercase tracking-tight">Tenure</h3>
            </div>
            <p className="text-2xl font-black text-black">{formatDateDMY(student.joiningDate)}</p>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Joining Date</p>
          </div>

          <div className="bg-white rounded-[3rem] p-8 border border-black/5 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><Award size={20} /></div>
              <h3 className="text-sm font-black uppercase tracking-tight">Status</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <p className="text-2xl font-black text-black uppercase tracking-tighter">{student.status}</p>
            </div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Profile Integrity</p>
          </div>
        </div>

        {/* Content Tabs Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           {/* Progress & Payments */}
           <div className="lg:col-span-2 space-y-10">
              <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm space-y-8">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <DollarSign size={24} />
                      </div>
                      <h2 className="text-xl font-black text-black uppercase tracking-tight">Financial Summary</h2>
                    </div>
                    <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${feeStatus >= 100 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {feeStatus >= 100 ? 'Fully Paid' : 'Installments Pending'}
                    </span>
                 </div>

                 <div className="space-y-6">
                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                       <span>Fee Progress</span>
                       <span>PKR {student.feePaid?.toLocaleString()} / {student.totalFee?.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden border border-black/5">
                       <div 
                         className="h-full bg-indigo-600 transition-all duration-1000 shadow-[0_0_15px_rgba(79,70,229,0.3)]" 
                         style={{ width: `${feeStatus}%` }}
                       />
                    </div>
                 </div>

                 <div className="pt-6 grid grid-cols-2 gap-6 border-t border-black/5">
                    <div className="bg-gray-50 rounded-2xl p-6">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Balance Due</p>
                       <p className="text-lg font-black text-black">PKR {(student.totalFee - student.feePaid).toLocaleString()}</p>
                    </div>
                    <button className="bg-black text-white rounded-2xl p-6 font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl">
                       Get Invoice <FileText size={16} />
                    </button>
                 </div>
              </div>

              {/* Assignment/Project Track */}
              <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white">
                    <Laptop size={24} />
                  </div>
                  <h2 className="text-xl font-black text-black uppercase tracking-tight">Active Projects</h2>
                </div>
                
                <div className="space-y-4">
                   <div className="p-6 bg-gray-50 rounded-2xl border border-black/5 flex items-center justify-between group hover:bg-white hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center text-indigo-600 font-black text-xs">01</div>
                         <div>
                            <p className="text-sm font-black text-black uppercase">Initial Tech Assessment</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Foundations & Logic</p>
                         </div>
                      </div>
                      <CheckCircle size={20} className="text-green-500" />
                   </div>
                   <div className="p-6 bg-gray-50 rounded-2xl border border-black/5 flex items-center justify-between group hover:bg-white hover:border-indigo-200 transition-all opacity-50">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center text-gray-400 font-black text-xs">02</div>
                         <div>
                            <p className="text-sm font-black text-black uppercase">Web Frameworks Module</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Upcoming Milestone</p>
                         </div>
                      </div>
                      <Clock size={20} className="text-gray-400" />
                   </div>
                </div>
              </div>
           </div>

           {/* Sidebar Info */}
           <div className="space-y-10">
              <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                 <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                 <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">Support Hub</h3>
                 <p className="text-xs text-indigo-100 font-bold leading-relaxed mb-10 uppercase tracking-tight">Need technical assistance or have queries regarding your course track?</p>
                 <button className="w-full bg-white text-indigo-600 rounded-[1.5rem] py-5 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all active:scale-95">
                    Contact Mentor
                 </button>
              </div>

              <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm space-y-8">
                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Personal Profile</h4>
                 <div className="space-y-6">
                    <div className="flex items-center gap-4">
                       <User size={18} className="text-indigo-600" />
                       <p className="text-xs font-black text-black">{student.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                       <Calendar size={18} className="text-indigo-600" />
                       <p className="text-xs font-black text-black">Member since {formatDateDMY(student.joiningDate)}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
