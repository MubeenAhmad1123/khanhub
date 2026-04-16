// src/components/welfare/child-profile/AdmissionTab.tsx
'use client';

import React, { useState } from 'react';
import { Child } from '@/types/welfare';
import { Edit3, Save, Loader2, User, Heart, Home, Phone, Shield, GraduationCap } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

export default function AdmissionTab({ 
  child, 
  onUpdate 
}: { 
  child: Child; 
  onUpdate: (updatedChild: Partial<Child>) => void 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Child>>({ ...child });

  const handleChange = (field: keyof Child | string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateDoc(doc(db, 'welfare_children', child.id), {
        ...form
      });
      onUpdate(form);
      setIsEditing(false);
      toast.success('Child details updated ✓');
    } catch (error) {
      console.error("Error updating child", error);
      toast.error('Failed to update details');
    } finally {
      setSaving(false);
    }
  };

  const SectionCard = ({ title, icon: Icon, children }: any) => (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <Icon size={16} />
        </div>
        <h3 className="text-lg font-black text-gray-900">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );

  const Field = ({ label, value, type = "text", fieldKey, options }: any) => {
    const isEmpty = value === null || value === undefined || value === '';
    if (!isEditing) {
      return (
        <div className="space-y-1">
          <span className="block text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">{label}</span>
          <span className={`text-sm font-semibold text-gray-900 block ${isEmpty ? 'text-gray-300 italic' : ''}`}>
            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (isEmpty ? '—' : value)}
          </span>
        </div>
      );
    }

    if (type === "boolean") {
      return (
        <div className="space-y-1">
          <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">{label}</label>
          <select 
            value={value ? 'true' : 'false'} 
            onChange={e => handleChange(fieldKey, e.target.value === 'true')}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none h-[42px]"
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
      );
    }

    if (type === "select" && options) {
      return (
        <div className="space-y-1">
          <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">{label}</label>
          <select 
            value={value ?? ''} 
            onChange={e => handleChange(fieldKey, e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none h-[42px] capitalize"
          >
            <option value="">Select...</option>
            {options.map((opt: string) => (
              <option key={opt} value={opt} className="capitalize">{opt.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">{label}</label>
        {type === 'textarea' ? (
          <textarea
            value={value ?? ''}
            onChange={e => handleChange(fieldKey, e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
            rows={2}
          />
        ) : (
          <input
            type={type}
            value={value ?? ''}
            onChange={e => handleChange(fieldKey, type === 'number' ? Number(e.target.value) : e.target.value)}
            inputMode={type === 'tel' ? 'numeric' : undefined}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none h-[42px]"
          />
        )}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-gray-900">Child Discovery & Info</h2>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)} 
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Edit3 size={16} /> Edit Form
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setForm({ ...child });
                setIsEditing(false);
              }} 
              className="bg-white border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-black text-sm hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg shadow-teal-900/10 active:scale-95 disabled:opacity-70 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />} 
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <SectionCard title="1. Identity & Demographics" icon={User}>
          <Field label="Admission ID" value={form.admissionNumber} fieldKey="admissionNumber" />
          <Field label="Full Name" value={form.name} fieldKey="name" />
          <Field label="Date of Birth" value={form.dateOfBirth} type="date" fieldKey="dateOfBirth" />
          <Field label="Age" value={form.age} type="number" fieldKey="age" />
          <Field label="Gender" value={form.gender} type="select" options={['male', 'female', 'other']} fieldKey="gender" />
          <Field label="Blood Group" value={form.bloodGroup} fieldKey="bloodGroup" />
        </SectionCard>

        <SectionCard title="2. Family & Guardian Status" icon={Phone}>
          <Field label="Father Status" value={form.fatherStatus} type="select" options={['alive', 'deceased', 'unknown']} fieldKey="fatherStatus" />
          <Field label="Mother Status" value={form.motherStatus} type="select" options={['alive', 'deceased', 'unknown']} fieldKey="motherStatus" />
          <Field label="Parents Separated?" value={form.parentsSeparated} type="boolean" fieldKey="parentsSeparated" />
          <Field label="Guardian Name" value={form.guardianName} fieldKey="guardianName" />
          <Field label="Relationship" value={form.guardianRelationship} fieldKey="guardianRelationship" />
          <Field label="Contact Number" value={form.contactNumber} type="tel" fieldKey="contactNumber" />
          <Field label="WhatsApp" value={form.whatsappNumber} type="tel" fieldKey="whatsappNumber" />
        </SectionCard>

        <SectionCard title="3. Admission Details" icon={Home}>
          <Field label="Admission Category" value={form.admissionCategory} type="select" options={['orphan', 'semi_orphan', 'destitute', 'abandoned', 'other']} fieldKey="admissionCategory" />
          <Field label="Reason & History" value={form.reasonForAdmission} type="textarea" fieldKey="reasonForAdmission" />
          <Field label="Planned Stay (Months)" value={form.durationMonths} type="number" fieldKey="durationMonths" />
          <Field label="Monthly Support Cost" value={form.packageAmount} type="number" fieldKey="packageAmount" />
        </SectionCard>

        <SectionCard title="4. Health & Wellness" icon={Heart}>
          <Field label="Overall Health" value={form.healthCondition} type="select" options={['healthy', 'minor_issues', 'chronic_condition', 'disability']} fieldKey="healthCondition" />
          <Field label="Disability?" value={form.hasDisability} type="boolean" fieldKey="hasDisability" />
          <Field label="Disability Details" value={form.disabilityDetails} type="textarea" fieldKey="disabilityDetails" />
          <Field label="Medical Notes" value={form.healthNotes} type="textarea" fieldKey="healthNotes" />
        </SectionCard>

        <SectionCard title="5. Education & Progress" icon={GraduationCap}>
          <Field label="Education Level" value={form.educationLevel} type="select" options={['none', 'primary', 'middle', 'secondary', 'higher_secondary', 'other']} fieldKey="educationLevel" />
          <Field label="School / Madressah" value={form.school} fieldKey="school" />
        </SectionCard>
      </div>
    </div>
  );
}
