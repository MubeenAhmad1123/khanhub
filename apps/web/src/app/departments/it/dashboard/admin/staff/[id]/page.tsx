'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Users, ArrowLeft, Edit, Trash2, 
  User, Mail, Phone, Shield, Calendar, 
  CheckCircle, AlertCircle, Save, X, Briefcase, Lock
} from 'lucide-react';
import { Spinner } from '@/components/ui';
import { formatDateDMY } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function ITStaffDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('it_session');
    if (!sessionData) { router.push('/departments/it/login'); return; }
    fetchMember();
  }, [id]);

  const fetchMember = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'it_staff', id as string);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const memberData = {
          id: snap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date()
        };
        setMember(memberData);
        setFormData(memberData);
      } else {
        toast.error('Staff member not found');
        router.push('/departments/it/dashboard/admin/staff');
      }
    } catch (err: any) {
      console.error('Fetch staff error:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'it_staff', id as string);
      await updateDoc(docRef, {
        ...formData
      });
      toast.success('Member profile updated');
      setIsEditing(false);
      fetchMember();
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this team member?')) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'it_staff', id as string));
      toast.success('Member removed from team');
      router.push('/departments/it/dashboard/admin/staff');
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !member) {
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
                {member.name}
              </h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Engineer ID: {member.employeeId || member.id}</p>
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
              {isEditing ? 'Cancel' : 'Edit Member'}
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
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Briefcase size={24} /></div>
                <h2 className="text-xl font-black text-black uppercase tracking-tight">Engineering Profile</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Designation</p>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={formData.designation} 
                      onChange={e => setFormData({...formData, designation: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    />
                  ) : (
                    <p className="text-lg font-black text-black">{member.designation || 'Engineer'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Role</p>
                  {isEditing ? (
                    <select 
                      value={formData.role} 
                      onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      member.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {member.role || 'Staff'}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Corporate Email</p>
                  <p className="text-lg font-black text-black">{member.email}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Number</p>
                  <p className="text-lg font-black text-black">{member.phone}</p>
                </div>
              </div>

              {isEditing && (
                <div className="pt-6 border-t border-black/5 flex items-center justify-between">
                   <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Update Access Code</p>
                      <input 
                        type="password" 
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none w-40"
                        placeholder="••••••"
                      />
                   </div>
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

          {/* Performance Sidebar */}
          <div className="space-y-8">
            <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-[2.5rem] bg-gray-100 text-gray-500 flex items-center justify-center font-black text-4xl mb-6">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-3 h-3 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-black">{member.status}</span>
                </div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Team Availability</p>
              </div>

              <div className="mt-10 pt-10 border-t border-black/5 space-y-6">
                 <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Last Logged In</p>
                    <p className="text-sm font-black text-indigo-700">{formatDateDMY(member.createdAt)}</p>
                 </div>
                 <div className="bg-gray-50 rounded-2xl p-6 border border-black/5">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Growth Index</p>
                    <p className="text-sm font-black text-black">100 / 100 Pts</p>
                 </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
