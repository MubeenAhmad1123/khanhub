// src/app/departments/welfare/dashboard/admin/children/new/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { 
  Heart, User, Users, Home, GraduationCap, 
  Baby, ShieldCheck, FileText, Save, Loader2,
  ChevronLeft, AlertCircle, Calendar, Plus, Trash2,
  Phone, MapPin, Briefcase, CreditCard
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function NewChildAdmissionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Section 1: Child Basic
    fullName: '',
    dob: '',
    age: '',
    gender: 'Boy',
    bFormNumber: '',
    nationality: 'Pakistani',
    religion: 'Islam',
    admissionClassRequested: '',
    previousSchoolName: '',
    previousClass: '',
    previousClassResult: '',

    // Section 2: Parents
    fatherName: '',
    fatherCnic: '',
    fatherOccupation: '',
    fatherContact: '',
    motherName: '',
    motherCnic: '',
    motherOccupation: '',
    status: 'Together', // Living Together, Deceased (Father), Deceased (Mother), Divorced

    // Section 3: Guardian
    guardianName: '',
    guardianRelation: '',
    guardianContact: '',
    guardianAddress: '',

    // Section 4: Financial
    siblingsCount: '',
    dependentsCount: '',
    houseStatus: 'Rented', // Owned, Rented, Relative's
    incomeSource: '',
    monthlyIncome: '',

    // Section 5: Educational / Welfare
    admissionDate: new Date().toISOString().split('T')[0],
    remarks: '',

    // Section 6: Health
    bloodGroup: '',
    chronicIllness: '',
    allergies: '',

    // Section 7: Documents (JSON mapped from array)
    documents: {
      bForm: false,
      fatherCnic: false,
      motherCnic: false,
      guardianCnic: false,
      incomeCertificate: false,
      schoolLeavingCertificate: false,
      photos: false,
    },

    // Section 8: Status
    isActive: true,
    isApproved: false,
  });

  useEffect(() => {
    const sessionData = localStorage.getItem('welfare_session');
    if (!sessionData) { router.push('/departments/welfare/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/welfare/login'); return;
    }
    setSession(parsed);
  }, [router]);

  // Auto-calculate Age
  useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setFormData(prev => ({ ...prev, age: age >= 0 ? age.toString() : '0' }));
    }
  }, [formData.dob]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: keyof typeof formData.documents) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [name]: !prev.documents[name]
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName) { toast.error('Full Name is required'); return; }

    try {
      setLoading(true);
      
      // Generate Custom ID (Optional, can be automated)
      // For now, let firestore autogenerate ID, we can add a counter later
      
      const docRef = await addDoc(collection(db, 'welfare_children'), {
        ...formData,
        createdAt: serverTimestamp(),
        createdBy: session.uid,
        createdByName: session.displayName
      });

      toast.success('Child admission recorded successfully!');
      router.push(`/departments/welfare/dashboard/admin/children`);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to save admission');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all";
  const labelClass = "text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block ml-1";
  const sectionClass = "bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-10 space-y-8";
  const gridClass = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-teal-600 transition-colors font-bold text-sm mb-2"
          >
            <ChevronLeft size={16} /> Back to Registry
          </button>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-4">
            <span className="w-12 h-12 bg-teal-600 text-white rounded-2xl flex items-center justify-center">
              <Plus size={24} />
            </span>
            New Admission
          </h1>
          <p className="text-gray-500 font-medium mt-1 ml-16">Enter child details for welfare sponsorship enrollment.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section 1: Child's Basic Information */}
        <div className={sectionClass}>
          <div className="flex items-center gap-3 border-b border-gray-50 pb-6 mb-8">
            <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
              <Baby size={20} />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Child's Basic Information</h2>
          </div>

          <div className={gridClass}>
            <div className="lg:col-span-2">
              <label className={labelClass}>Full Name</label>
              <input 
                name="fullName" 
                value={formData.fullName} 
                onChange={handleChange} 
                placeholder="Enter child's full name" 
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                <input 
                  type="date"
                  name="dob" 
                  value={formData.dob} 
                  onChange={handleChange} 
                  className={`${inputClass} pl-11`}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Age (Auto)</label>
              <input 
                name="age" 
                value={formData.age} 
                readOnly 
                className={`${inputClass} bg-gray-100 font-bold text-teal-600`}
                placeholder="Auto-calculated"
              />
            </div>
            <div>
              <label className={labelClass}>Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                <option value="Boy">Boy</option>
                <option value="Girl">Girl</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>B-Form Number (NADRA)</label>
              <input 
                name="bFormNumber" 
                value={formData.bFormNumber} 
                onChange={handleChange} 
                placeholder="XXXXX-XXXXXXX-X" 
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Nationality</label>
              <select name="nationality" value={formData.nationality} onChange={handleChange} className={inputClass}>
                <option value="Pakistani">Pakistani</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Religion</label>
              <select name="religion" value={formData.religion} onChange={handleChange} className={inputClass}>
                <option value="Islam">Islam</option>
                <option value="Christian">Christian</option>
                <option value="Hindu">Hindu</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Class Requested</label>
              <select name="admissionClassRequested" value={formData.admissionClassRequested} onChange={handleChange} className={inputClass}>
                <option value="">Select Class</option>
                {['Nursery', 'KG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-1">
              <label className={labelClass}>Previous School Name</label>
              <input 
                name="previousSchoolName" 
                value={formData.previousSchoolName} 
                onChange={handleChange} 
                placeholder="Mention previous school if any" 
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Previous Class</label>
              <input 
                name="previousClass" 
                value={formData.previousClass} 
                onChange={handleChange} 
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Previous Result</label>
              <select name="previousClassResult" value={formData.previousClassResult} onChange={handleChange} className={inputClass}>
                <option value="N/A">N/A</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Parents' Information */}
        <div className={sectionClass}>
          <div className="flex items-center gap-3 border-b border-gray-50 pb-6 mb-8 text-blue-600">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Parent's Information</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
            {/* Father's Info */}
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-teal-600 mb-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div> Father Details
              </h3>
              <div>
                <label className={labelClass}>Father's Name</label>
                <input name="fatherName" value={formData.fatherName} onChange={handleChange} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Father's CNIC</label>
                  <input name="fatherCnic" value={formData.fatherCnic} onChange={handleChange} placeholder="00000-0000000-0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Occupation</label>
                  <input name="fatherOccupation" value={formData.fatherOccupation} onChange={handleChange} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Contact number</label>
                <input name="fatherContact" value={formData.fatherContact} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            {/* Mother's Info */}
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-pink-500 mb-2 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div> Mother Details
              </h3>
              <div>
                <label className={labelClass}>Mother's Name</label>
                <input name="motherName" value={formData.motherName} onChange={handleChange} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Mother's CNIC</label>
                  <input name="motherCnic" value={formData.motherCnic} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Occupation</label>
                  <input name="motherOccupation" value={formData.motherOccupation} onChange={handleChange} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Family Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
                  <option value="Together">Living Together</option>
                  <option value="Father Deceased">Father Deceased</option>
                  <option value="Mother Deceased">Mother Deceased</option>
                  <option value="Both Deceased">Orphan (Both Deceased)</option>
                  <option value="Divorced">Divorced / Separated</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Guardian's Information */}
        <div className={sectionClass}>
          <div className="flex items-center gap-3 border-b border-gray-50 pb-6 mb-8 text-amber-600">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Guardian / Reference Information</h2>
          </div>

          <div className={gridClass}>
            <div>
              <label className={labelClass}>Guardian Name</label>
              <input name="guardianName" value={formData.guardianName} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Relation with child</label>
              <input name="guardianRelation" value={formData.guardianRelation} onChange={handleChange} placeholder="e.g. Uncle, Grandparent" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact Number</label>
              <input name="guardianContact" value={formData.guardianContact} onChange={handleChange} className={inputClass} />
            </div>
            <div className="lg:col-span-3">
              <label className={labelClass}>Residential Address</label>
              <textarea 
                name="guardianAddress" 
                value={formData.guardianAddress} 
                onChange={handleChange} 
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Financial Background */}
        <div className={sectionClass}>
          <div className="flex items-center gap-3 border-b border-gray-50 pb-6 mb-8 text-emerald-600">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Home size={20} />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Financial & Family Background</h2>
          </div>

          <div className={gridClass}>
            <div>
              <label className={labelClass}>Total Siblings</label>
              <input type="number" name="siblingsCount" value={formData.siblingsCount} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Total Dependents</label>
              <input type="number" name="dependentsCount" value={formData.dependentsCount} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Residence Status</label>
              <select name="houseStatus" value={formData.houseStatus} onChange={handleChange} className={inputClass}>
                <option value="Rented">Rented</option>
                <option value="Owned">Owned</option>
                <option value="Relative's">Relative's / Shared</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Major Source of Income</label>
              <input name="incomeSource" value={formData.incomeSource} onChange={handleChange} placeholder="e.g. Daily Wages, Job" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Approx. Monthly Income (Rs)</label>
              <input type="number" name="monthlyIncome" value={formData.monthlyIncome} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Section 5: Education & Section 6: Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className={sectionClass}>
            <div className="flex items-center gap-3 border-b border-gray-50 pb-6 mb-8 text-purple-600">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <GraduationCap size={20} />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Academic History</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className={labelClass}>Admission Date</label>
                <input type="date" name="admissionDate" value={formData.admissionDate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Remarks / Case History</label>
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={4} className={`${inputClass} resize-none`} placeholder="Mention why this child needs support..." />
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <div className="flex items-center gap-3 border-b border-gray-50 pb-6 mb-8 text-red-600">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Heart size={20} />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Medical Information</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className={labelClass}>Blood Group</label>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className={inputClass}>
                  <option value="">Select</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Chronic Illness (if any)</label>
                <input name="chronicIllness" value={formData.chronicIllness} onChange={handleChange} placeholder="e.g. Diabetes, Asthma" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Known Allergies</label>
                <input name="allergies" value={formData.allergies} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* Section 7: Documents Checklist */}
        <div className={sectionClass}>
          <div className="flex items-center gap-3 border-b border-gray-50 pb-6 mb-8 text-indigo-600">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <FileText size={20} />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Document Checklist (Physical Copies Verified)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(formData.documents).map(([key, value]) => (
              <label 
                key={key} 
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  value ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-white border-gray-50 grayscale hover:grayscale-0'
                }`}
              >
                <input 
                  type="checkbox" 
                  checked={value} 
                  onChange={() => handleCheckboxChange(key as any)}
                  className="w-5 h-5 rounded-lg border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-bold capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="sticky bottom-8 z-20">
          <div className="bg-gray-900/95 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="text-teal-400" size={24} />
              </div>
              <div>
                <p className="text-white font-black text-sm">Save Admission Data</p>
                <p className="text-white/50 text-[10px] uppercase font-black tracking-widest">Verify all information before submitting</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 md:flex-none px-8 py-4 bg-white/5 text-white rounded-2xl text-sm font-black hover:bg-white/10 transition-colors uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 md:flex-none px-12 py-4 bg-teal-500 text-white rounded-2xl text-sm font-black hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
                Submit Case
              </button>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
