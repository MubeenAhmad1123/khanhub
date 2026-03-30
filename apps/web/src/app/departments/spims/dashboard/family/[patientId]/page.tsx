'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  User, DollarSign, Award, BookOpen, Clock, 
  CheckCircle, AlertCircle, Loader2, GraduationCap,
  CreditCard, Calendar, Hash, ShieldCheck
} from 'lucide-react';

export default function StudentDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.patientId as string; // Legacy parameter name remains for routing compatibility

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [student, setStudent] = useState<any>(null);
  const [feeRecord, setFeeRecord] = useState<any>(null);
  const [boardFees, setBoardFees] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);

  const fetchStudentData = useCallback(async () => {
    try {
      // 1. Student Profile
      const sDoc = await getDoc(doc(db, 'spims_students', studentId));
      if (!sDoc.exists()) {
        router.push('/departments/spims/login');
        return;
      }
      const sData = sDoc.data();
      setStudent({ id: sDoc.id, ...sData });

      // 2. Course Fee Record
      const fDoc = await getDoc(doc(db, 'spims_fees', studentId));
      if (fDoc.exists()) {
        setFeeRecord(fDoc.data());
      }

      // 3. Board Fees
      const bfSnap = await getDocs(query(
        collection(db, 'spims_board_fees'), 
        where('studentId', '==', studentId),
        orderBy('date', 'desc')
      ));
      setBoardFees(bfSnap.docs.map(d => d.data()));

      // 4. Exam Results
      const exSnap = await getDocs(query(
        collection(db, 'spims_exams'), 
        where('studentId', '==', studentId),
        orderBy('year', 'asc')
      ));
      setExamResults(exSnap.docs.map(d => d.data()));

    } catch (error) {
      console.error("Error fetching student data:", error);
    } finally {
      setLoading(false);
    }
  }, [studentId, router]);

  useEffect(() => {
    const sessionData = localStorage.getItem('spims_session');
    if (!sessionData) {
      router.push('/departments/spims/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    
    // STRICT SECURITY GUARD
    if (parsed.role !== 'student' || parsed.studentId !== studentId) {
      setLoading(false);
      return; 
    }
    
    setSession(parsed);
  }, [router, studentId]);

  useEffect(() => {
    if (!session) return;
    fetchStudentData();
  }, [session, fetchStudentData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // Access Denied State
  if (!session || session.role !== 'student' || session.studentId !== studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 text-center max-w-sm w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm mb-6">Unauthorized dashboard access.</p>
          <button 
            onClick={() => router.push('/departments/spims/login')}
            className="w-full bg-gray-900 text-white rounded-xl py-2.5 font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* WELCOME BANNER */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 md:p-10 relative overflow-hidden flex flex-col items-center md:items-start md:flex-row md:justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-teal-50 rounded-bl-full opacity-50 -z-0"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} className="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover border-4 border-white shadow-xl bg-gray-100" />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-teal-100 text-teal-700 flex items-center justify-center font-black text-4xl border-4 border-white shadow-xl">
                {student.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div>
              <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] mb-1">Student Portal</p>
              <h1 className="text-2xl md:text-4xl font-black text-gray-900 mb-2">Welcome, {student.name.split(' ')[0]}!</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-bold text-gray-500">
                <span className="flex items-center gap-1 text-teal-700"><GraduationCap size={16} /> {student.courseName}</span>
                <span className="flex items-center gap-1"><Hash size={16} /> Roll: {student.rollNumber || '---'}</span>
                <span className="flex items-center gap-1"><ShieldCheck size={16} className="text-green-500" /> Verified</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* COURSE FEE STATUS */}
          <section className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={16} className="text-teal-600" />
                Course Fee Status
              </h2>
              <span className="text-[10px] font-black bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-100 uppercase">Current Session</span>
            </div>

            {!feeRecord ? (
              <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-xs font-bold text-gray-400 uppercase">Records not available</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total Paid</p>
                    <p className="text-xl font-black text-teal-600">Rs. {feeRecord.totalPaid?.toLocaleString()}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-red-400 uppercase mb-1">Current Dues</p>
                    <p className="text-xl font-black text-red-600">Rs. {feeRecord.totalRemaining?.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black inline-block py-1 px-2 uppercase rounded-full text-teal-600 bg-teal-100">
                        {Math.round((feeRecord.totalPaid / feeRecord.totalCourseFee) * 100)}% Cleared
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2.5 mb-4 text-xs flex rounded-full bg-gray-100">
                    <div style={{ width: `${(feeRecord.totalPaid / feeRecord.totalCourseFee) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-teal-500 transition-all duration-1000"></div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* QUICK STATS */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-[2rem] text-white shadow-xl shadow-gray-200">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Academic Year</p>
              <p className="text-4xl font-black mb-1">{student.year}<span className="text-lg text-gray-500 ml-1">ST</span></p>
              <p className="text-xs font-bold text-gray-400">Current Academic Instance</p>
            </div>
          </div>
        </div>

        {/* EXAM STATUS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Award size={16} className="text-orange-600" />
              Latest Result
            </h2>
            
            {examResults.length > 0 ? (
              <div className="space-y-4">
                {examResults.map((res, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <p className="text-xs font-black text-gray-800 uppercase">Year {res.year} - {res.examType}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Passed with Distinction</p>
                    </div>
                    <span className="bg-green-600 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-green-900/20">PASS</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-xs font-bold text-gray-400 uppercase">No results published</p>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Calendar size={16} className="text-blue-600" />
              Board Registrations
            </h2>
            
            <div className="space-y-4">
              {boardFees.map((bf, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-xs font-black text-gray-800 uppercase">{bf.feeType} Fee</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Receipt: {bf.receiptNumber || 'N/A'}</p>
                  </div>
                  <span className={`font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest ${
                    bf.status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {bf.status}
                  </span>
                </div>
              ))}
              {boardFees.length === 0 && (
                 <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-xs font-bold text-gray-400 uppercase">No entries found</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <div className="text-center pb-12 pt-6">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">South Punjab Institute of Medical & Health Sciences</p>
          <div className="flex justify-center gap-4 mt-2">
            <span className="text-[10px] font-black text-gray-400 uppercase">Portal v3.1</span>
            <span className="text-[10px] font-black text-gray-200 opacity-20">•</span>
            <span className="text-[10px] font-black text-gray-400 uppercase">Privacy Policy</span>
          </div>
        </div>

      </div>
    </div>
  );
}
