'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronRight, 
  Send, 
  CheckCircle2, 
  Phone, 
  User, 
  GraduationCap, 
  BookOpen, 
  MapPin, 
  MessageSquare 
} from 'lucide-react';
import { SectionHeader, Spinner } from '@/components/ui';
import { submitItStudentApplication } from '../actions/apply';

export default function ItApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    education: '',
    course: 'Full Stack Development',
    city: '',
    experience: '',
    notes: ''
  });

  const courses = [
    'Full Stack Development',
    'Frontend Engineering',
    'Backend Systems',
    'UI/UX Design',
    'Mobile App Development',
    'Cloud Computing',
    'Data Science',
    'Cybersecurity'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await submitItStudentApplication(formData);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => router.push('/departments/it'), 5000);
      } else {
        alert('Error: ' + res.error);
      }
    } catch (err) {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-indigo-600" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-gray-900">Application Sent!</h1>
            <p className="text-gray-500 font-medium leading-relaxed">
              Thank you for applying to Khan Hub IT Department. Our team will review your profile and contact you via WhatsApp shortly.
            </p>
          </div>
          <div className="pt-8">
            <button
              onClick={() => router.push('/departments/it')}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
            >
              Return to IT Dept
            </button>
          </div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest pt-12">
            Redirecting in 5 seconds...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <span className="inline-flex px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] animate-fade-in">
            Join the elite
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-[0.9] animate-fade-up">
            Start Your <span className="text-indigo-600">Tech Journey</span>
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto font-medium text-lg leading-relaxed pt-4">
            Submit your application to join Khan Hub IT department as an intern/student and work on real-world projects.
          </p>
        </div>

        <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-gray-200/50 p-8 md:p-16 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 blur-[100px] -mr-32 -mt-32 rounded-full group-hover:bg-indigo-100/50 transition-colors duration-700" />
          
          <form onSubmit={handleSubmit} className="relative z-10 space-y-12">
            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                  <User size={14} className="text-indigo-400" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abdullah Khan"
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-5 text-gray-900 font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-300"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                  <Phone size={14} className="text-indigo-400" /> WhatsApp Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +92 300 1234567"
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-5 text-gray-900 font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-300"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                />
              </div>
            </div>

            {/* Education & Course */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                  <GraduationCap size={14} className="text-indigo-400" /> Education
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BSCS (Final Year)"
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-5 text-gray-900 font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-300"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                  <BookOpen size={14} className="text-indigo-400" /> Preferred Course
                </label>
                <select
                  required
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-5 text-gray-900 font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all appearance-none cursor-pointer"
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                >
                  {courses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* City & Experience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                  <MapPin size={14} className="text-indigo-400" /> City
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Faisalabad"
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-5 text-gray-900 font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-300"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                  <ChevronRight size={14} className="text-indigo-400" /> Prior Experience
                </label>
                <input
                  type="text"
                  placeholder="e.g. None / 6 Months Internship"
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-5 text-gray-900 font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-300"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                <MessageSquare size={14} className="text-indigo-400" /> Additional Notes
              </label>
              <textarea
                placeholder="Tell us why you want to join Khan Hub IT..."
                rows={4}
                className="w-full bg-gray-50 border-none rounded-[30px] px-8 py-6 text-gray-900 font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-300 resize-none"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="pt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white rounded-3xl py-6 font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-4 group"
              >
                {loading ? (
                  <Spinner size="sm" showText={false} className="invert" />
                ) : (
                  <>
                    Apply Now <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-12 text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] leading-relaxed">
          Khan Hub IT Department · Faisalabad · Pakistan<br />
          Built for the future.
        </p>
      </div>
    </div>
  );
}
