// d:\khanhub\apps\web\src\components\job-center\seeker-profile\RegistrationTab.tsx
import React, { useState } from 'react';
import { JobSeeker } from '@/types/job-center';
import { Edit3, Save, Loader2, User, Phone, Briefcase, GraduationCap, Clock } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { formatDateDMY, parseDateDMY } from '@/lib/utils';

export default function RegistrationTab({ 
  seeker, 
  onUpdate 
}: { 
  seeker: JobSeeker; 
  onUpdate: (updatedSeeker: Partial<JobSeeker>) => void 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<JobSeeker>>({ ...seeker });

  const handleChange = (field: keyof JobSeeker | string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setForm((prev: any) => ({
        ...prev,
        [parent]: {
          ...(prev[parent] || {}),
          [child]: value
        }
      }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateDoc(doc(db, 'jobcenter_seekers', seeker.id), {
        ...form
      });
      onUpdate(form);
      setIsEditing(false);
      toast.success('Registration details updated');
    } catch (error) {
      console.error("Error updating seeker", error);
      toast.error('Failed to update details');
    } finally {
      setSaving(false);
    }
  };

  const SectionCard = ({ title, icon: Icon, children }: any) => (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
        <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
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
      let displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (isEmpty ? '—' : Array.isArray(value) ? value.join(', ') : value);
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
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none h-[42px]"
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
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none h-[42px]"
          >
            <option value="">Select...</option>
            {options.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
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
            onChange={e => handleChange(fieldKey, e.target.value)}
            onBlur={e => {
              const val = e.target.value;
              const parsed = parseDateDMY(val);
              if (parsed) {
                const iso = parsed.toISOString().split('T')[0];
                handleChange(fieldKey, iso);
              }
            }}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none h-[42px]"
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
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
            rows={2}
          />
        ) : (
          <input
            type={type}
            value={value ?? ''}
            onChange={e => handleChange(fieldKey, type === 'number' ? Number(e.target.value) : e.target.value)}
            inputMode={type === 'tel' ? 'numeric' : undefined}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none h-[42px]"
          />
        )}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-gray-900">Registration Details</h2>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)} 
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Edit3 size={16} /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setForm({ ...seeker });
                setIsEditing(false);
              }} 
              className="bg-white border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-black text-sm hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg shadow-orange-900/10 active:scale-95 disabled:opacity-70 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />} 
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <SectionCard title="1. Personal Information" icon={User}>
          <Field label="Seeker ID" value={form.seekerNumber} fieldKey="seekerNumber" />
          <Field label="Full Name" value={form.name} fieldKey="name" />
          <Field label="Father/Husband Name" value={form.fatherName} fieldKey="fatherName" />
          <Field label="Date of Birth" value={form.dateOfBirth} type="date" fieldKey="dateOfBirth" />
          <Field label="Age" value={form.age} type="number" fieldKey="age" />
          <Field label="Gender" value={form.gender} type="select" options={['male', 'female', 'other']} fieldKey="gender" />
        </SectionCard>

        <SectionCard title="2. Education & Skills" icon={GraduationCap}>
          <Field label="Highest Education" value={form.education} fieldKey="education" />
          <Field label="Key Skills (comma separated)" value={form.skills?.join(', ')} fieldKey="skills" />
          <Field label="Work Experience" value={form.experience} type="textarea" fieldKey="experience" />
        </SectionCard>

        <SectionCard title="3. Job Preferences" icon={Briefcase}>
          <Field label="Job Interests" value={form.jobInterests?.join(', ')} fieldKey="jobInterests" />
          <Field label="Expected Salary" value={form.expectedSalary} fieldKey="expectedSalary" />
          <Field label="Availability" value={form.availability} type="select" options={['immediate', '1_week', '2_plus_weeks']} fieldKey="availability" />
        </SectionCard>

        <SectionCard title="4. Contact Information" icon={Phone}>
          <Field label="Contact Number" value={form.contactNumber} type="tel" fieldKey="contactNumber" />
          <Field label="WhatsApp Number" value={form.whatsappNumber} type="tel" fieldKey="whatsappNumber" />
          <Field label="Detailed Address" value={form.address} type="textarea" fieldKey="address" />
        </SectionCard>

        <SectionCard title="5. Emergency Contact" icon={Clock}>
          <Field label="Contact Name" value={form.emergencyContact?.name} fieldKey="emergencyContact.name" />
          <Field label="Relationship" value={form.emergencyContact?.relationship} fieldKey="emergencyContact.relationship" />
          <Field label="Emergency Number" value={form.emergencyContact?.number} type="tel" fieldKey="emergencyContact.number" />
        </SectionCard>
      </div>
    </div>
  );
}
