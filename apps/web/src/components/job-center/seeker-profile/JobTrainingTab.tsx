// d:\khanhub\apps\web\src\components\job-center\seeker-profile\JobTrainingTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { TherapySession } from '@/types/job-center'; // Reusing type for consistency
import { getTherapySessions, addTherapySession } from '@/lib/job-center/seekers';
import { Loader2, Plus, Star, Calendar, User, FileText, GraduationCap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY, parseDateDMY } from '@/lib/utils';

export default function JobTrainingTab({ seekerId, session }: { seekerId: string, session: any }) {
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [progressRating, setProgressRating] = useState<1|2|3|4>(2);
  const [trainerName, setTrainerName] = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTherapySessions(seekerId);
      setSessions(data);
    } catch (error) {
      console.error("Error fetching training sessions", error);
      toast.error('Failed to load training record');
    } finally {
      setLoading(false);
    }
  }, [seekerId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionNotes) {
      toast.error('Notes are required');
      return;
    }
    
    try {
      setSaving(true);
      const nextNum = sessions.length > 0 ? Math.max(...sessions.map(s => s.sessionNumber)) + 1 : 1;
      
      const newSession: TherapySession = {
        id: '',
        seekerId,
        sessionNumber: nextNum,
        date,
        sessionNotes,
        therapistName: trainerName || undefined, // Mapping trainer name to therapist field
        progressRating,
        createdBy: session.uid,
        createdAt: new Date(),
      };
      
      await addTherapySession(newSession);
      toast.success('Training record added');
      setShowAddModal(false);
      setSessionNotes('');
      setTrainerName('');
      setProgressRating(2);
      fetchSessions();
    } catch (error) {
      console.error("Add session error", error);
      toast.error('Failed to add record');
    } finally {
      setSaving(false);
    }
  };

  const renderStars = (rating: number = 1) => {
    return Array(4).fill(0).map((_, i) => (
      <Star 
        key={i} 
        size={16} 
        className={i < rating ? "text-orange-400 fill-orange-400" : "text-gray-200"} 
        strokeWidth={2}
      />
    ));
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-orange-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 overflow-x-hidden w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <GraduationCap className="text-orange-600" size={24} />
          Job Training & Skill Sessions
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-900/10 active:scale-95 transition-all"
        >
          <Plus size={16} /> Log Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/30">
          <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No training sessions recorded</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map(s => (
            <div key={s.id} className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm hover:border-orange-100 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-50 text-orange-700 font-black text-lg w-12 h-12 rounded-xl flex items-center justify-center border border-orange-100">
                    #{s.sessionNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-bold mb-1">
                      <Calendar size={14} className="text-orange-500" />
                      {formatDateDMY(s.date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400 font-black uppercase mr-2 tracking-widest leading-none">Learning:</span>
                      {renderStars(s.progressRating)}
                    </div>
                  </div>
                </div>
                {s.therapistName && (
                  <div className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border border-slate-100">
                    <User size={12} /> {s.therapistName}
                  </div>
                )}
              </div>
              <div className="bg-gray-50/50 p-5 rounded-2xl text-sm text-gray-700 leading-relaxed border border-gray-100 whitespace-pre-wrap">
                {s.sessionNotes}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">Add Training Session</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl">✕</button>
            </div>
            <form onSubmit={handleAddSession} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Date *</label>
                  <input
                    type="text"
                    placeholder="DD MM YYYY"
                    required
                    value={formatDateDMY(date)}
                    onChange={e => setDate(e.target.value)}
                    onBlur={e => {
                      const parsed = parseDateDMY(e.target.value);
                      if (parsed) setDate(parsed.toISOString().split('T')[0]);
                    }}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Skill Rating</label>
                   <select value={progressRating} onChange={e => setProgressRating(Number(e.target.value) as 1|2|3|4)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                     <option value={1}>1 - Basic Understanding</option>
                     <option value={2}>2 - Growing Skill</option>
                     <option value={3}>3 - Proficient</option>
                     <option value={4}>4 - Mastered / Expert</option>
                   </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Trainer / Instructor Name</label>
                <input value={trainerName} onChange={e => setTrainerName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. Mr. Ahmad, IT Head" />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Session Highlights / Performance *</label>
                <textarea required rows={4} value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none" placeholder="What parts of training were covered today? How did the seeker perform?"></textarea>
              </div>

              <button type="submit" disabled={saving} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-orange-900/10 disabled:opacity-70 mt-4">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus size={18} />}
                {saving ? 'Saving...' : 'Save Training Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
