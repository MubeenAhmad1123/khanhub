'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  GraduationCap, ArrowLeft, Edit, Trash2, 
  User, Mail, Phone, BookOpen, Calendar, 
  CheckCircle, AlertCircle, Save, X, Laptop
} from 'lucide-react';
import { Spinner } from '@/components/ui';
import { formatDateDMY } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function ITStudentDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);

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
        const studentData = {
          id: snap.id,
          ...data,
          joiningDate: data.joiningDate?.toDate?.() || data.joiningDate || new Date()
        };
        setStudent(studentData);
        setFormData(studentData);
      } else {
        toast.error('Student not found');
        router.push('/departments/it/dashboard/admin/students');
      }
    } catch (err: any) {
      console.error('Fetch student error:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'it_students', id as string);
      await updateDoc(docRef, {
        ...formData,
        joiningDate: new Date(formData.joiningDate)
      });
      toast.success('Profile updated');
      setIsEditing(false);
      fetchStudent();
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'it_students', id as string));
      toast.success('Student removed');
      router.push('/departments/it/dashboard/admin/students');
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 w-full">
      <div className="max-w-5xl mx-auto space-y-10">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-black/5 pb-10">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()}
              className="w-12 h-12 rounded-2xl bg-white border border-black/5 flex items-center justify-center text-gray-400 hover:text-black transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-black tracking-tighter flex items-center gap-4">
                {student.name}
              </h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">{student.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`p-4 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                isEditing ? 'bg-black text-white' : 'bg-white text-black border-black/5 hover:border-black'
              }`}
            >
              {isEditing ? <X size={16} /> : <Edit size={16} />}
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
            {!isEditing && (
              <button 
                onClick={handleDelete}
                className="p-4 rounded-2xl bg-red-50 text-red-600 border border-red-100 font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm space-y-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600"><User size={24} /></div>
                <h2 className="text-xl font-black text-black uppercase tracking-tight">Academic Profile</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enrolled Course</p>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={formData.course} 
                      onChange={e => setFormData({...formData, course: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                       <Laptop size={16} className="text-indigo-500" />
                       <p className="text-lg font-black text-black">{student.course || 'Core IT'}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Joining Date</p>
                  <div className="flex items-center gap-3">
                     <Calendar size={16} className="text-indigo-500" />
                     <p className="text-lg font-black text-black">{formatDateDMY(student.joiningDate)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Access</p>
                  <p className="text-lg font-black text-black">{student.email || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</p>
                  <p className="text-lg font-black text-black">{student.phone}</p>
                </div>
              </div>

              {isEditing && (
                <div className="pt-6">
                  <button 
                    onClick={handleUpdate}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-indigo-100"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Status Sidebar */}
          <div className="space-y-8">
            <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-4xl mb-6">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 ${
                  student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {student.status}
                </span>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Current Status</p>
              </div>

              <div className="mt-10 pt-10 border-t border-black/5 space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fee Progress</p>
                  <p className="text-sm font-black text-black">
                    {((student.feePaid || 0) / (student.totalFee || 1) * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-1000" 
                    style={{ width: `${((student.feePaid || 0) / (student.totalFee || 1) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
