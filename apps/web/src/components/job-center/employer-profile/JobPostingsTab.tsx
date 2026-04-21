// d:\Khan Hub\apps\web\src\components\job-center\employer-profile\JobPostingsTab.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { JobOpening, Employer } from '@/types/job-center';
import { 
  Briefcase, Plus, Calendar, MapPin, Search, Loader2, 
  X, CheckCircle, AlertCircle, Trash2, Edit3 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface JobPostingsTabProps {
  employerId: string;
  employer: Employer;
}

export default function JobPostingsTab({ employerId, employer }: JobPostingsTabProps) {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New Job State
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    requirements: '',
    salaryRange: '',
    vacancyCount: 1,
    location: '',
  });

  useEffect(() => {
    fetchJobs();
  }, [employerId]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'jobcenter_jobs'), 
        where('employerId', '==', employerId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })) as JobOpening[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const jobData: Omit<JobOpening, 'id'> = {
        employerId,
        companyName: employer.companyName,
        title: newJob.title,
        description: newJob.description,
        requirements: newJob.requirements.split('\n').filter(r => r.trim()),
        salaryRange: newJob.salaryRange,
        vacancyCount: Number(newJob.vacancyCount),
        location: newJob.location || employer.address,
        status: 'open',
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'jobcenter_jobs'), jobData);
      toast.success('Job posted successfully');
      setShowAddModal(false);
      setNewJob({ title: '', description: '', requirements: '', salaryRange: '', vacancyCount: 1, location: '' });
      fetchJobs();
    } catch (err) {
      toast.error('Failed to post job');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900">Active Job Postings</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Manage recruitment for this company</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/10 active:scale-95"
        >
          <Plus size={16} />
          POST NEW JOB
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 opacity-20" />
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Loading Postings...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-gray-900 font-black">No jobs posted yet</h3>
          <p className="text-gray-500 text-xs mt-1">Start by adding the first vacancy for this employer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map(job => (
            <div key={job.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-indigo-200 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 text-sm">{job.title}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{job.vacancyCount} {job.vacancyCount === 1 ? 'Position' : 'Positions'}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${job.status === 'open' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {job.status}
                </div>
              </div>

              <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                {job.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {job.requirements.slice(0, 2).map((req, idx) => (
                  <span key={idx} className="bg-gray-50 text-gray-500 text-[9px] font-bold px-2 py-1 rounded-lg border border-gray-100">
                    {req}
                  </span>
                ))}
                {job.requirements.length > 2 && <span className="text-[9px] font-bold text-gray-400">+{job.requirements.length - 2} more</span>}
              </div>

              <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[10px] font-black text-gray-400">
                    <MapPin size={12} className="text-indigo-400" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black text-green-600">
                    {job.salaryRange || 'Competitive'}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><Edit3 size={14} /></button>
                  <button className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
              <div>
                <h3 className="text-xl font-black text-gray-900 leading-tight">Post Vacancy</h3>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Creating job for {employer.companyName}</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddJob} className="p-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Job Title *</label>
                <input required placeholder="e.g. Senior Mason, HR Manager" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-semibold outline-none focus:bg-white focus:border-indigo-500/50 transition-all" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Salary Range</label>
                  <input placeholder="e.g. 40k - 50k" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-semibold outline-none focus:bg-white focus:border-indigo-500/50 transition-all" value={newJob.salaryRange} onChange={e => setNewJob({...newJob, salaryRange: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Openings</label>
                  <input type="number" min={1} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-semibold outline-none focus:bg-white focus:border-indigo-500/50 transition-all" value={newJob.vacancyCount} onChange={e => setNewJob({...newJob, vacancyCount: Number(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Job Description</label>
                <textarea rows={3} placeholder="Briefly describe the role and main responsibilities..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-semibold outline-none focus:bg-white focus:border-indigo-500/50 transition-all resize-none" value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Key Requirements (One per line)</label>
                <textarea rows={3} placeholder="e.g. 2 years experience&#10;Driver license required&#10;Secondary education" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-semibold outline-none focus:bg-white focus:border-indigo-500/50 transition-all resize-none" value={newJob.requirements} onChange={e => setNewJob({...newJob, requirements: e.target.value})} />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3.5 rounded-2xl font-black text-xs text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/10 transition-all active:scale-[0.98]">Confirm Posting</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
