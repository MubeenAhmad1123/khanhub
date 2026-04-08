// src/components/welfare/patient-profile/AdmissionTab.tsx
import React, { useState } from 'react';
import { Patient } from '@/types/welfare';
import { Edit3, Save, Loader2, User, Heart, Brain, Phone, Shield } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

export default function AdmissionTab({ 
  patient, 
  onUpdate 
}: { 
  patient: Patient; 
  onUpdate: (updatedPatient: Partial<Patient>) => void 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Patient>>({ ...patient });

  const handleChange = (field: keyof Patient | string, value: any) => {
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
      await updateDoc(doc(db, 'welfare_patients', patient.id), {
        ...form
      });
      onUpdate(form);
      setIsEditing(false);
      toast.success('Patient admission details updated');
    } catch (error) {
      console.error("Error updating patient", error);
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
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none h-[42px]"
          >
            <option value="">Select...</option>
            {options.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
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
        <h2 className="text-xl font-black text-gray-900">Admission Details</h2>
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
                setForm({ ...patient });
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
          <Field label="Inpatient Number" value={form.inpatientNumber} fieldKey="inpatientNumber" />
          <Field label="Name" value={form.name} fieldKey="name" />
          <Field label="Father/Husband Name" value={form.fatherName} fieldKey="fatherName" />
          <Field label="Date of Birth" value={form.dateOfBirth} type="date" fieldKey="dateOfBirth" />
          <Field label="Age" value={form.age} type="number" fieldKey="age" />
          <Field label="Gender" value={form.gender} type="select" options={['male', 'female', 'other']} fieldKey="gender" />
          <Field label="Ethnicity/Caste" value={form.ethnicity} fieldKey="ethnicity" />
          <Field label="Marital Status" value={form.maritalStatus} type="select" options={['single', 'married', 'divorced', 'widowed']} fieldKey="maritalStatus" />
          <Field label="Education" value={form.education} fieldKey="education" />
          <Field label="Profession" value={form.profession} fieldKey="profession" />
        </SectionCard>

        <SectionCard title="2. Guardian & Contact Info" icon={Phone}>
          <Field label="Guardian Name" value={form.guardianName} fieldKey="guardianName" />
          <Field label="Relationship (e.g. Father, Brother)" value={form.guardianRelationship} fieldKey="guardianRelationship" />
          <Field label="Contact Number" value={form.contactNumber} type="tel" fieldKey="contactNumber" />
          <Field label="WhatsApp Number" value={form.whatsappNumber} type="tel" fieldKey="whatsappNumber" />
          <Field label="Expected Names of Visitors" value={form.nameOfVisitors} type="textarea" fieldKey="nameOfVisitors" />
          <Field label="Detailed Address" value={form.address} type="textarea" fieldKey="address" />
          <Field label="Town / Police Station" value={form.townPoliceStation} fieldKey="townPoliceStation" />
        </SectionCard>

        <SectionCard title="3. Addiction & Treatment" icon={Shield}>
          <Field label="Substance of Addiction" value={form.substanceOfAddiction} fieldKey="substanceOfAddiction" />
          <Field label="Duration of Use" value={form.durationOfUse} fieldKey="durationOfUse" />
          <Field label="Avg Daily Intake / Expense" value={form.averageDailyIntake} fieldKey="averageDailyIntake" />
          <Field label="Presenting Complaints" value={form.presentingComplaints} type="textarea" fieldKey="presentingComplaints" />
          <Field label="Previous Treatment Duration" value={form.previousTreatmentDuration} fieldKey="previousTreatmentDuration" />
          <Field label="Previous Welfare Center" value={form.previousHospital} fieldKey="previousHospital" />
        </SectionCard>

        <SectionCard title="4. Health & Medical Status" icon={Heart}>
          <Field label="Any Major Illness?" value={form.healthStatus?.majorIllnessLast12Months} type="boolean" fieldKey="healthStatus.majorIllnessLast12Months" />
          <Field label="Asthma?" value={form.healthStatus?.hasAsthma} type="boolean" fieldKey="healthStatus.hasAsthma" />
          <Field label="Fits / Seizures?" value={form.healthStatus?.hasFits} type="boolean" fieldKey="healthStatus.hasFits" />
          <Field label="Physical Disability?" value={form.healthStatus?.hasDisability} type="boolean" fieldKey="healthStatus.hasDisability" />
          <Field label="HBsAg Status" value={form.healthStatus?.hbsagStatus} type="select" options={['positive', 'negative', 'not_known']} fieldKey="healthStatus.hbsagStatus" />
          <Field label="HCV Status" value={form.healthStatus?.hcvStatus} type="select" options={['positive', 'negative', 'not_known']} fieldKey="healthStatus.hcvStatus" />
          <Field label="HIV Status" value={form.healthStatus?.hivStatus} type="select" options={['positive', 'negative', 'not_known']} fieldKey="healthStatus.hivStatus" />
          <Field label="TB Status" value={form.healthStatus?.tbStatus} type="select" options={['positive', 'negative', 'not_known']} fieldKey="healthStatus.tbStatus" />
          <Field label="Other Details / Aches" value={form.healthStatus?.otherCondition} type="textarea" fieldKey="healthStatus.otherCondition" />
        </SectionCard>

        <SectionCard title="5. Psychiatric Evaluation" icon={Brain}>
          <Field label="General Aptitude" value={form.psychiatricEvaluation?.generalAptitude} fieldKey="psychiatricEvaluation.generalAptitude" />
          <Field label="Thought Disorder" value={form.psychiatricEvaluation?.thoughtDisorder} type="boolean" fieldKey="psychiatricEvaluation.thoughtDisorder" />
          <Field label="Hallucinations" value={form.psychiatricEvaluation?.hallucinations} type="boolean" fieldKey="psychiatricEvaluation.hallucinations" />
          <Field label="Delusions" value={form.psychiatricEvaluation?.delusions} type="boolean" fieldKey="psychiatricEvaluation.delusions" />
          <Field label="Insights" value={form.psychiatricEvaluation?.insights} type="boolean" fieldKey="psychiatricEvaluation.insights" />
          <Field label="Memory" value={form.psychiatricEvaluation?.memory} fieldKey="psychiatricEvaluation.memory" />
          <Field label="Intelligence Level" value={form.psychiatricEvaluation?.intelligence} fieldKey="psychiatricEvaluation.intelligence" />
        </SectionCard>
      </div>
    </div>
  );
}
