// apps/web/src/components/hq/superadmin/EditStaffModal.tsx
'use client';

import React, { useState } from 'react';
import { StaffProfile, updateStaffProfile } from '@/lib/hq/superadmin/staff';
import { X, Save, Loader2, User, Mail, Phone, MapPin, CreditCard, Shield, Clock } from 'lucide-react';

interface EditStaffModalProps {
  staff: StaffProfile;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditStaffModal({ staff, onClose, onSuccess }: EditStaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: staff.name,
    email: staff.email || '',
    phone: staff.phone || '',
    address: staff.address || '',
    cnic: staff.cnic || '',
    role: staff.role,
    customId: staff.customId || '',
    isActive: staff.isActive,
    photoUrl: staff.photoUrl || '',
    dutyStartTime: staff.dutyStartTime || '09:00',
    dutyEndTime: staff.dutyEndTime || '18:00',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateStaffProfile(staff.id, form);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        alert(res.error || 'Failed to update');
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-[#0A0A0A] dark:border dark:border-white/10 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6 dark:border-white/5">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">Edit Profile</h2>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                <input
                  type="text"
                  required
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition-all dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-orange-500"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                <input
                  type="email"
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition-all dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-orange-500"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Phone Number</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                <input
                  type="text"
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition-all dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-orange-500"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>

            {/* CNIC */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">CNIC / ID</label>
              <div className="relative group">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                <input
                  type="text"
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition-all dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-orange-500"
                  value={form.cnic}
                  onChange={e => setForm(f => ({ ...f, cnic: e.target.value }))}
                />
              </div>
            </div>

            {/* Custom ID */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Staff ID (Custom)</label>
              <div className="relative group">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                <input
                  type="text"
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition-all dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-orange-500"
                  value={form.customId}
                  onChange={e => setForm(f => ({ ...f, customId: e.target.value }))}
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Assigned Role</label>
              <select
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm font-bold text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition-all dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-orange-500"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))}
              >
                <option value="staff">Staff Member</option>
                <option value="manager">Dept Manager</option>
                <option value="admin">Administrator</option>
                <option value="cashier">Cashier</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>

            {/* Photo URL */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Photo URL</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                <input
                  type="url"
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition-all dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-orange-500"
                  value={form.photoUrl}
                  onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Duty Timing */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Duty Start Time</label>
              <input
                type="time"
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm font-bold text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition-all dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-orange-500"
                value={form.dutyStartTime}
                onChange={e => setForm(f => ({ ...f, dutyStartTime: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Duty End Time</label>
              <input
                type="time"
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm font-bold text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition-all dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-orange-500"
                value={form.dutyEndTime}
                onChange={e => setForm(f => ({ ...f, dutyEndTime: e.target.value }))}
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Permanent Address</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                <textarea
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition-all min-h-[80px] dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-orange-500"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  />
                  <div className={`w-12 h-6 rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-gray-200 dark:bg-white/10'}`}></div>
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-6' : ''}`}></div>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Active Status</p>
                  <p className="text-[10px] text-gray-500">Allow this user to access their dashboard</p>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl bg-gray-50 text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-gray-100 transition-colors dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-4 rounded-2xl bg-orange-600 text-xs font-black uppercase tracking-widest text-white hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
