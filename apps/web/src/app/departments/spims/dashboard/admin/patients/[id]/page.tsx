'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  doc, getDoc, collection, getDocs, query, where, 
  orderBy, updateDoc, Timestamp, deleteDoc, addDoc, setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ArrowLeft, User, DollarSign, Edit3, Save, X, Loader2, 
  Calendar, Upload, Trash2, FileText, Camera,
  Plus, Shield, GraduationCap, BookOpen, Hash, CreditCard,
  CheckCircle2, AlertCircle, Award
} from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { toast } from 'react-hot-toast';
import { SPIMS_COURSES } from '@/types/spims';

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [student, setStudent] = useState<any>(null);
  const [feeRecord, setFeeRecord] = useState<any>(null);
  const [boardFees, setBoardFees] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'fees' | 'board' | 'exams' | 'notes'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit Form State
  const [editForm, setEditForm] = useState<any>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);

  useEffect(() => {
    const sessionData = localStorage.getItem('spims_session');
    if (!sessionData) {
      router.push('/departments/spims/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/spims/login');
      return;
    }
    setSession(parsed);
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      
      // 1. Student Info
      const sDoc = await getDoc(doc(db, 'spims_students', studentId));
      if (!sDoc.exists()) {
        toast.error('Student not found');
        router.push('/departments/spims/dashboard/admin/patients');
        return;
      }
      const sData = sDoc.id ? { id: sDoc.id, ...sDoc.data() } : null;
      setStudent(sData);
      setEditForm(sData);
      setPhotoPreview(sData?.photoUrl || '');

      // 2. Fee Record
      const fDoc = await getDoc(doc(db, 'spims_fees', studentId));
      if (fDoc.exists()) {
        setFeeRecord({ id: fDoc.id, ...fDoc.data() });
      }

      // 3. Board Fees
      const bfSnap = await getDocs(query(collection(db, 'spims_board_fees'), where('studentId', '==', studentId), orderBy('date', 'desc')));
      setBoardFees(bfSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 4. Exam Results
      const exSnap = await getDocs(query(collection(db, 'spims_exams'), where('studentId', '==', studentId), orderBy('year', 'asc')));
      setExamResults(exSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error(err);
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  }, [studentId, router]);

  useEffect(() => {
    if (session && studentId) fetchData();
  }, [session, studentId, fetchData]);

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);
      let photoUrl = editForm.photoUrl;
      if (photoFile) {
        photoUrl = await uploadToCloudinary(photoFile, 'khanhub/spims/students');
      }

      const updateData = {
        ...editForm,
        photoUrl,
        updatedAt: Timestamp.now()
      };
      delete updateData.id;

      await updateDoc(doc(db, 'spims_students', studentId), updateData);
      setStudent({ ...editForm, photoUrl });
      setIsEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
    </div>
  );

  if (!student) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Back Link */}
        <Link href="/departments/spims/dashboard/admin/patients" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors">
          <ArrowLeft size={16} /> Back to Students
        </Link>

        {/* Header Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full opacity-50 -z-0"></div>
          
          <div className="relative z-10">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} className="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover border-4 border-white shadow-xl bg-gray-100" />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-teal-100 text-teal-700 flex items-center justify-center font-black text-4xl border-4 border-white shadow-xl">
                {student.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="relative z-10 flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
              <h1 className="text-2xl md:text-3xl font-black text-gray-900">{student.name}</h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                student.status === 'enrolled' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {student.status}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1 font-bold text-teal-700">
                <GraduationCap size={14} /> {student.courseName}
              </span>
              <span className="flex items-center gap-1">
                <Hash size={14} /> Roll: {student.rollNumber || 'Not Assigned'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} /> Year: {student.year}
              </span>
            </div>
          </div>

          <div className="relative z-10">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2"
            >
              {isEditing ? <X size={14} /> : <Edit3 size={14} />}
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto hide-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'fees', label: 'Course Fees', icon: CreditCard },
            { id: 'board', label: 'Board Fees', icon: DollarSign },
            { id: 'exams', label: 'Exams', icon: Award },
            { id: 'notes', label: 'Notes & Docs', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10 min-h-[400px]">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <section>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Personal Information</h3>
                  <div className="space-y-4">
                    <InfoRow label="Father's Name" value={student.fatherName} />
                    <InfoRow label="CNIC / B-Form" value={student.cnic} />
                    <InfoRow label="Phone" value={student.phone} />
                    <InfoRow label="Gender" value={student.gender} />
                    <InfoRow label="Address" value={student.address} />
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <section>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Academic Information</h3>
                  <div className="space-y-4">
                    <InfoRow label="Enrollment Date" value={student.enrollmentDate?.toDate?.().toLocaleDateString()} />
                    <InfoRow label="Expected Completion" value={student.expectedCompletionDate?.toDate?.().toLocaleDateString()} />
                    <InfoRow label="Referral" value={student.referredBy || 'Direct'} />
                  </div>
                </section>
                
                <div className="bg-teal-50 border border-teal-100 p-6 rounded-3xl">
                  <h4 className="font-black text-teal-800 text-sm mb-2">Student Status</h4>
                  <p className="text-xs text-teal-600 leading-relaxed">
                    Student is currently {student.status}. All academic records are maintained in compliance with board regulations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: COURSE FEES */}
          {activeTab === 'fees' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard label="Total Course Fee" value={`Rs ${feeRecord?.totalCourseFee?.toLocaleString()}`} color="gray" />
                <StatsCard label="Paid Amount" value={`Rs ${feeRecord?.totalPaid?.toLocaleString()}`} color="green" />
                <StatsCard label="Remaining Balance" value={`Rs ${feeRecord?.totalRemaining?.toLocaleString()}`} color="red" />
              </div>

              <div className="border border-gray-100 rounded-3xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 font-black text-gray-500 uppercase text-[10px] tracking-widest">Date</th>
                      <th className="px-6 py-4 font-black text-gray-500 uppercase text-[10px] tracking-widest">Type</th>
                      <th className="px-6 py-4 font-black text-gray-500 uppercase text-[10px] tracking-widest">Amount</th>
                      <th className="px-6 py-4 font-black text-gray-500 uppercase text-[10px] tracking-widest">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {feeRecord?.payments?.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-700">{p.date?.toDate?.().toLocaleDateString() || p.date}</td>
                        <td className="px-6 py-4 uppercase text-[10px] font-black text-gray-400">{p.paymentType}</td>
                        <td className="px-6 py-4 font-black text-teal-600">Rs {p.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono text-[10px] text-gray-400">{p.transactionId?.substring(0,8)}</td>
                      </tr>
                    ))}
                    {(!feeRecord?.payments || feeRecord.payments.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No payments recorded</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: BOARD FEES */}
          {activeTab === 'board' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-gray-800">Board Related Fees</h3>
                <button 
                  onClick={() => toast('Only Cashier can add entries')}
                  className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  View Only
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {boardFees.map(bf => (
                  <div key={bf.id} className="border border-gray-100 p-6 rounded-3xl hover:border-teal-200 transition-all flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{bf.feeType} Fee</p>
                      <p className="text-lg font-black text-gray-800">Rs {bf.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">{bf.date?.toDate?.().toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      {bf.status === 'paid' ? (
                        <span className="flex items-center gap-1 text-green-600 font-black text-[10px] uppercase tracking-widest">
                          <CheckCircle2 size={12} /> Paid
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-600 font-black text-[10px] uppercase tracking-widest">
                          <AlertCircle size={12} /> Pending
                        </span>
                      )}
                      <p className="text-[9px] text-gray-400 mt-1 font-mono">{bf.receiptNumber || 'No Receipt'}</p>
                    </div>
                  </div>
                ))}
                {boardFees.length === 0 && (
                   <div className="col-span-2 py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                     <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No board fees recorded yet</p>
                   </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: EXAMS */}
          {activeTab === 'exams' && (
            <div className="space-y-8">
              {examResults.map(res => (
                <div key={res.id} className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                   <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex justify-between items-center">
                     <div>
                       <h4 className="font-black text-gray-800 text-sm italic uppercase tracking-widest">Year {res.year} — {res.examType} Exam</h4>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Roll No: {res.rollNumber}</p>
                     </div>
                     <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${
                       res.overallResult === 'pass' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                     }`}>
                       {res.overallResult}
                     </span>
                   </div>
                   <div className="p-0 overflow-x-auto">
                     <table className="w-full text-left text-xs">
                        <thead className="bg-white border-b border-gray-50">
                          <tr>
                            <th className="px-8 py-3 font-black text-gray-400 uppercase tracking-widest">Subject</th>
                            <th className="px-8 py-3 font-black text-gray-400 uppercase tracking-widest">Total</th>
                            <th className="px-8 py-3 font-black text-gray-400 uppercase tracking-widest">Obtained</th>
                            <th className="px-8 py-3 font-black text-gray-400 uppercase tracking-widest">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {res.subjects?.map((sub: any, sIdx: number) => (
                            <tr key={sIdx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-8 py-4 font-bold text-gray-700">{sub.name}</td>
                              <td className="px-8 py-4 font-black">{sub.totalMarks}</td>
                              <td className="px-8 py-4 font-black text-teal-600">{sub.obtainedMarks}</td>
                              <td className="px-8 py-4">
                                <span className={`font-black uppercase text-[10px] tracking-widest ${
                                  sub.result === 'pass' ? 'text-green-600' : 'text-red-500'
                                }`}>{sub.result}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                     </table>
                   </div>
                </div>
              ))}
              {examResults.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                  <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No exam results published yet</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest">Counselor Notes & Documents</h3>
                 <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                   <Plus size={14} /> Add Note
                 </button>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Initial Counseling — Admission Day</p>
                  <p className="text-sm text-gray-600 italic">Student expressed strong interest in Nursing. Previous academic background is solid. Document verification completed with original DMC.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-gray-50 pb-2 mr-6">
      <span className="text-sm font-bold text-gray-400 capitalize">{label}</span>
      <span className="text-sm font-black text-gray-800">{value || '---'}</span>
    </div>
  );
}

function StatsCard({ label, value, color }: { label: string, value: string, color: 'gray' | 'green' | 'red' }) {
  const colors = {
    gray: 'bg-white border-gray-200 text-gray-900',
    green: 'bg-green-50 border-green-100 text-green-700',
    red: 'bg-red-50 border-red-100 text-red-600'
  };
  return (
    <div className={`${colors[color]} border-2 p-6 rounded-[2rem] shadow-sm`}>
      <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}
