'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';
import { createRehabUserServer, deactivateRehabUser, resetRehabPassword } from '../../../actions/createRehabUser';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RehabUser, Patient, StaffMember } from '@/types/rehab';

export default function AdminUserManagement() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useRehabSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [familyUsers, setFamilyUsers] = useState<RehabUser[]>([]);
  const [staffUsers, setStaffUsers] = useState<RehabUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState<'family' | 'staff'>('family');

  // Form states
  const [familyForm, setFamilyForm] = useState({ name: '', id: 'REHAB-FAM-101', pass: '', patientId: '' });
  const [staffForm, setStaffForm] = useState({ name: '', id: 'REHAB-STF-101', pass: '', role: 'Doctor' });

  const fetchData = async () => {
    try {
      const qPatients = query(collection(db, 'rehab_patients'));
      const qFamily = query(collection(db, 'rehab_users'), where('role', '==', 'family'));
      const qStaff = query(collection(db, 'rehab_users'), where('role', '==', 'staff'));
      
      const [snapP, snapF, snapS] = await Promise.all([getDocs(qPatients), getDocs(qFamily), getDocs(qStaff)]);
      
      setPatients(snapP.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
      setFamilyUsers(snapF.docs.map(doc => ({ uid: doc.id, ...doc.data() } as RehabUser)));
      setStaffUsers(snapS.docs.map(doc => ({ uid: doc.id, ...doc.data() } as RehabUser)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading) {
      if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
        router.push('/departments/rehab/login');
      } else {
        fetchData();
      }
    }
  }, [user, sessionLoading, router]);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const res = await createRehabUserServer(familyForm.id, familyForm.pass, 'family', familyForm.name, familyForm.patientId);
    if (res.success) {
      setMessage({ type: 'success', text: `Family user ${familyForm.id} created!` });
      setFamilyForm({ name: '', id: 'REHAB-FAM-101', pass: '', patientId: '' });
      fetchData();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to create family user' });
    }
    setActionLoading(false);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const res = await createRehabUserServer(staffForm.id, staffForm.pass, 'staff', staffForm.name);
    if (res.success) {
      // Also create record in rehab_staff collection
      await addDoc(collection(db, 'rehab_staff'), {
        name: staffForm.name,
        role: staffForm.role,
        isActive: true,
        joiningDate: new Date(),
        salary: 0,
        staffId: staffForm.id // Link by customId for convenience
      });
      setMessage({ type: 'success', text: `Staff user ${staffForm.id} created!` });
      setStaffForm({ name: '', id: 'REHAB-STF-101', pass: '', role: 'Doctor' });
      fetchData();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to create staff user' });
    }
    setActionLoading(false);
  };

  const handleDeactivate = async (uid: string) => {
    if (!confirm('Are you sure?')) return;
    setActionLoading(true);
    const res = await deactivateRehabUser(uid);
    if (res.success) {
      setMessage({ type: 'success', text: 'User deactivated' });
      fetchData();
    }
    setActionLoading(false);
  };

  const handleResetPass = async (uid: string) => {
    const newPass = prompt('Enter new password:');
    if (!newPass) return;
    setActionLoading(true);
    const res = await resetRehabPassword(uid, newPass);
    if (res.success) setMessage({ type: 'success', text: 'Password reset successful' });
    setActionLoading(false);
  };

  if (sessionLoading || loading) return <div className="p-20 text-center font-black text-gray-200">LOADING HUB...</div>;

  return (
    <div className="space-y-12 pb-20 max-w-6xl mx-auto">
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Internal Access Control</h1>
        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">Managed by {user?.displayName}</p>
      </div>

      {message.text && (
        <div className={`p-6 rounded-[2rem] border font-bold flex items-center gap-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* CREATE FAMILY */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
           <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Provision Family Access</h2>
           <form onSubmit={handleCreateFamily} className="space-y-4">
              <input required placeholder="Family Member Name" className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none" value={familyForm.name} onChange={e => setFamilyForm({...familyForm, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="User ID" className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none" value={familyForm.id} onChange={e => setFamilyForm({...familyForm, id: e.target.value})} />
                <input type="password" required placeholder="Initial Pass" className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none" value={familyForm.pass} onChange={e => setFamilyForm({...familyForm, pass: e.target.value})} />
              </div>
              <select required className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none appearance-none" value={familyForm.patientId} onChange={e => setFamilyForm({...familyForm, patientId: e.target.value})}>
                <option value="">Select Linked Patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} (#{p.id.slice(-4)})</option>)}
              </select>
              <button disabled={actionLoading} className="w-full bg-[#1D9E75] text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-[#1D9E75]/20">Authorize Family User</button>
           </form>
        </div>

        {/* CREATE STAFF */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
           <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Provision Staff Access</h2>
           <form onSubmit={handleCreateStaff} className="space-y-4">
              <input required placeholder="Staff Full Name" className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none" value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Staff User ID" className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none" value={staffForm.id} onChange={e => setStaffForm({...staffForm, id: e.target.value})} />
                <input type="password" required placeholder="Initial Pass" className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none" value={staffForm.pass} onChange={e => setStaffForm({...staffForm, pass: e.target.value})} />
              </div>
              <input required placeholder="Role/Designation (e.g. Nurse)" className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none" value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})} />
              <button disabled={actionLoading} className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-gray-900/10">Authorize Staff User</button>
           </form>
        </div>
      </div>

      {/* ROSTER TABS */}
      <div className="bg-white rounded-[4rem] border border-gray-100 overflow-hidden shadow-sm">
        <div className="flex bg-gray-50 border-b border-gray-100">
          <button onClick={() => setActiveTab('family')} className={`flex-1 py-8 font-black text-xs uppercase tracking-[0.3em] transition-all ${activeTab === 'family' ? 'bg-white text-[#1D9E75]' : 'text-gray-400 hover:text-gray-600'}`}>Family Users</button>
          <button onClick={() => setActiveTab('staff')} className={`flex-1 py-8 font-black text-xs uppercase tracking-[0.3em] transition-all ${activeTab === 'staff' ? 'bg-white text-[#1D9E75]' : 'text-gray-400 hover:text-gray-600'}`}>Staff Users</button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
               <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identity</th>
               <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
               <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(activeTab === 'family' ? familyUsers : staffUsers).map(u => (
              <tr key={u.uid} className="group hover:bg-gray-50/50 transition-colors">
                <td className="px-10 py-8">
                  <p className="font-black text-gray-900">{u.displayName}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{u.customId}</p>
                </td>
                <td className="px-10 py-8">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${u.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {u.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="px-10 py-8 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="flex justify-end gap-2">
                      <button onClick={() => handleResetPass(u.uid)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Reset</button>
                      {u.isActive && <button onClick={() => handleDeactivate(u.uid)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Deactivate</button>}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
