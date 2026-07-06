// src/components/welfare/child-profile/AdmissionTab.tsx
'use client';

import React, { useState } from 'react';
import { Child } from '@/types/welfare';
import { Edit3, Save, Loader2, User, Heart, Home, Phone, Shield, GraduationCap, DollarSign, FileText } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { formatDateDMY, parseDateDMY } from '@/lib/utils';

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

  const handleDocCheckboxChange = (key: string) => {
    setForm(prev => ({
      ...prev,
      documents: {
        ...(prev.documents || {}),
        [key]: !((prev.documents as any)?.[key])
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updatedFields = { ...form };
      // Fallback: make sure the child name is in sync with fullName if edited
      if (updatedFields.fullName && !updatedFields.name) {
        updatedFields.name = updatedFields.fullName;
      } else if (updatedFields.name && !updatedFields.fullName) {
        updatedFields.fullName = updatedFields.name;
      }

      await updateDoc(doc(db, 'welfare_children', child.id), updatedFields);
      onUpdate(updatedFields);
      setIsEditing(false);
      toast.success('Admission details updated ✓');
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
      let displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (isEmpty ? '—' : value);
      if (type === 'date' && !isEmpty) {
        displayValue = formatDateDMY(value);
      }
      return (
        <div className="space-y-1">
          <span className="block text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">{label}</span>
          <span className={`text-sm font-semibold text-gray-900 block ${isEmpty ? 'text-gray-300 italic' : ''}`}>
            {displayValue}
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

    if (type === 'date') {
      return (
        <div className="space-y-1">
          <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">{label}</label>
          <input
            type="text"
            placeholder="DD MM YYYY"
            value={value ? (value.includes('-') ? formatDateDMY(value) : value) : ''}
            onChange={e => {
              const val = e.target.value;
              handleChange(fieldKey, val);
            }}
            onBlur={e => {
              const val = e.target.value;
              const parsed = parseDateDMY(val);
              if (parsed) {
                const iso = parsed.toISOString().split('T')[0];
                handleChange(fieldKey, iso);
              }
            }}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none h-[42px]"
          />
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

  const isOrphan = form.admissionType !== 'old_age';

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-gray-900">Resident Demographics & Info</h2>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)} 
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
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
              className="bg-white border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-black text-sm hover:bg-gray-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg shadow-teal-900/10 active:scale-95 disabled:opacity-70 transition-all cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />} 
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Section 1: Demographics */}
        <SectionCard title="1. Identity & Demographics" icon={User}>
          <Field label="Admission ID" value={form.admissionNumber} fieldKey="admissionNumber" />
          <Field label="Full Name" value={form.fullName || form.name} fieldKey="fullName" />
          <Field label="Date of Birth" value={form.dateOfBirth || (form as any).dob} type="date" fieldKey="dateOfBirth" />
          <Field label="Age" value={form.age} type="number" fieldKey="age" />
          <Field label="Gender" value={form.gender} type="select" options={['Boy', 'Girl', 'Male', 'Female']} fieldKey="gender" />
          <Field label="Blood Group" value={form.bloodGroup} type="select" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} fieldKey="bloodGroup" />
          <Field label="B-Form / CNIC Number" value={form.bFormNumber || (form as any).bFormNumber} fieldKey="bFormNumber" />
          <Field label="Nationality" value={form.nationality} fieldKey="nationality" />
          <Field label="Religion" value={form.religion} fieldKey="religion" />
          <Field label="Caste" value={form.caste} fieldKey="caste" />
        </SectionCard>

        {/* Section 2: Family status */}
        <SectionCard title="2. Family Status & Contacts" icon={Phone}>
          <Field label="Father's Name" value={form.fatherName} fieldKey="fatherName" />
          <Field label="Father's CNIC" value={form.fatherCnic} fieldKey="fatherCnic" />
          <Field label="Father's Occupation" value={form.fatherOccupation} fieldKey="fatherOccupation" />
          <Field label="Father's Contact" value={form.fatherContact} fieldKey="fatherContact" />
          <Field label="Father Status" value={form.fatherStatus} type="select" options={['alive', 'deceased', 'unknown']} fieldKey="fatherStatus" />
          
          <Field label="Mother's Name" value={form.motherName} fieldKey="motherName" />
          <Field label="Mother's CNIC" value={form.motherCnic} fieldKey="motherCnic" />
          <Field label="Mother's Occupation" value={form.motherOccupation} fieldKey="motherOccupation" />
          <Field label="Mother Status" value={form.motherStatus} type="select" options={['alive', 'deceased', 'unknown']} fieldKey="motherStatus" />
          
          <Field label="Parents Living Status" value={form.status || (form as any).status} type="select" options={['Together', 'Deceased (Father)', 'Deceased (Mother)', 'Divorced', 'Deceased (Both)']} fieldKey="status" />
          <Field label="Parents Separated?" value={form.parentsSeparated} type="boolean" fieldKey="parentsSeparated" />
          
          <Field label="Guardian Name" value={form.guardianName} fieldKey="guardianName" />
          <Field label="Guardian Relationship" value={form.guardianRelationship} fieldKey="guardianRelationship" />
          <Field label="Guardian Address" value={form.guardianAddress || (form as any).guardianAddress} fieldKey="guardianAddress" />
          <Field label="Contact Number" value={form.contactNumber || (form as any).guardianContact} type="tel" fieldKey="contactNumber" />
          <Field label="WhatsApp Number" value={form.whatsappNumber} type="tel" fieldKey="whatsappNumber" />
        </SectionCard>

        {/* Section 3: Financial context */}
        <SectionCard title="3. Financial & Housing Situation" icon={DollarSign}>
          <Field label="House Status" value={form.houseStatus || (form as any).houseStatus} type="select" options={['Owned', 'Rented', "Relative's"]} fieldKey="houseStatus" />
          <Field label="Siblings Count" value={form.siblingsCount || (form as any).siblingsCount} type="number" fieldKey="siblingsCount" />
          <Field label="Dependents Count" value={form.dependentsCount || (form as any).dependentsCount} type="number" fieldKey="dependentsCount" />
          <Field label="Income Source" value={form.incomeSource || (form as any).incomeSource} fieldKey="incomeSource" />
          <Field label="Monthly Income (PKR)" value={form.monthlyIncome || (form as any).monthlyIncome} type="number" fieldKey="monthlyIncome" />
        </SectionCard>

        {/* Section 4: Admission details */}
        <SectionCard title="4. Admission & Program Placement" icon={Home}>
          <Field label="Admission Type" value={form.admissionType || (form as any).admissionType} type="select" options={['orphan', 'old_age']} fieldKey="admissionType" />
          <Field label="Admission Category" value={form.admissionCategory} type="select" options={['orphan', 'semi_orphan', 'destitute', 'abandoned', 'other']} fieldKey="admissionCategory" />
          <Field label="Reason & History" value={form.reasonForAdmission} type="textarea" fieldKey="reasonForAdmission" />
          <Field label="Planned Stay (Months)" value={form.durationMonths} type="number" fieldKey="durationMonths" />
          <Field label="Monthly Support Cost" value={form.packageAmount} type="number" fieldKey="packageAmount" />
          <Field label="Internal Remarks / Notes" value={form.remarks || (form as any).remarks} type="textarea" fieldKey="remarks" />
        </SectionCard>

        {/* Section 5: Educational Context */}
        {isOrphan && (
          <SectionCard title="5. Educational Records" icon={GraduationCap}>
            <Field label="Education Level" value={form.educationLevel} type="select" options={['none', 'primary', 'middle', 'secondary', 'higher_secondary', 'other']} fieldKey="educationLevel" />
            <Field label="School / Madressah Name" value={form.school} fieldKey="school" />
            <Field label="Requested Admission Class" value={form.admissionClassRequested || (form as any).admissionClassRequested} fieldKey="admissionClassRequested" />
            <Field label="Previous School Name" value={form.previousSchoolName || (form as any).previousSchoolName} fieldKey="previousSchoolName" />
            <Field label="Previous Class" value={form.previousClass || (form as any).previousClass} fieldKey="previousClass" />
            <Field label="Previous Class Result" value={form.previousClassResult || (form as any).previousClassResult} fieldKey="previousClassResult" />
          </SectionCard>
        )}

        {/* Section 6: Health info */}
        <SectionCard title="6. Health & Wellness Profile" icon={Heart}>
          <Field label="Overall Health" value={form.healthCondition} type="select" options={['healthy', 'minor_issues', 'chronic_condition', 'disability']} fieldKey="healthCondition" />
          <Field label="Has Disability?" value={form.hasDisability} type="boolean" fieldKey="hasDisability" />
          <Field label="Disability Details" value={form.disabilityDetails} type="textarea" fieldKey="disabilityDetails" />
          <Field label="Chronic Illnesses" value={form.chronicIllness || (form as any).chronicIllness} type="textarea" fieldKey="chronicIllness" />
          <Field label="Allergies" value={form.allergies || (form as any).allergies} type="textarea" fieldKey="allergies" />
          <Field label="Medical Notes" value={form.healthNotes} type="textarea" fieldKey="healthNotes" />
        </SectionCard>

        {/* Section 7: Documents checklist */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <h3 className="text-lg font-black text-gray-900">7. Submitted Documents Checklist</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'bForm', label: 'B-Form / Birth Cert' },
              { key: 'fatherCnic', label: "Father's CNIC Copy" },
              { key: 'motherCnic', label: "Mother's CNIC Copy" },
              { key: 'guardianCnic', label: "Guardian's CNIC Copy" },
              { key: 'incomeCertificate', label: 'Income Certificate' },
              { key: 'schoolLeavingCertificate', label: 'School Leaving Certificate' },
              { key: 'photos', label: 'Passport Photos' },
            ].map(docItem => {
              const val = !!((form.documents as any)?.[docItem.key]);
              return (
                <div key={docItem.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  {isEditing ? (
                    <input
                      type="checkbox"
                      id={`doc-${docItem.key}`}
                      checked={val}
                      onChange={() => handleDocCheckboxChange(docItem.key)}
                      className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                  ) : (
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                      val ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white text-transparent'
                    }`}>
                      ✓
                    </div>
                  )}
                  <label htmlFor={`doc-${docItem.key}`} className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
                    {docItem.label}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
