// src/components/rehab/patient-profile/ProgressTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { WeeklyProgress } from '@/types/rehab';
import { getWeeklyProgress, addWeeklyProgress } from '@/lib/rehab/patients';
import { Loader2, Plus, TrendingUp, LineChart as LineChartIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function ProgressTab({ patientId, session }: { patientId: string, session: any }) {
  const [progress, setProgress] = useState<WeeklyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [weekNum, setWeekNum] = useState(1);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [score, setScore] = useState<1|2|3|4>(2);
  const [notes, setNotes] = useState('');

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWeeklyProgress(patientId);
      // Sort by week number ASC
      data.sort((a, b) => a.weekNumber - b.weekNumber);
      setProgress(data);
      if (data.length > 0) {
        setWeekNum(data[data.length - 1].weekNumber + 1);
      }
    } catch (error) {
      console.error("Error fetching progress", error);
      toast.error('Failed to load progress records');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const newProgress: WeeklyProgress = {
        id: '',
        patientId,
        weekNumber: weekNum,
        weekStartDate: startDate,
        weekEndDate: endDate,
        score,
        notes: notes || undefined,
        createdBy: session.uid,
        createdAt: new Date(),
      };
      
      await addWeeklyProgress(newProgress);
      toast.success('Progress updated');
      setShowAddModal(false);
      setNotes('');
      setScore(2);
      fetchProgress();
    } catch (error) {
      console.error("Add progress error", error);
      toast.error('Failed to add progress');
    } finally {
      setSaving(false);
    }
  };

  const chartData = progress.map(p => ({
    name: `Week ${p.weekNumber}`,
    score: p.score,
    label: p.score === 1 ? 'Static' : p.score === 2 ? 'Slow' : p.score === 3 ? 'Good' : 'Max',
    notes: p.notes
  }));

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-teal-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-black text-gray-900">Weekly Progress Tracking</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg shadow-teal-900/10 active:scale-95 transition-all"
        >
          <Plus size={16} /> Add Progress
        </button>
      </div>

      {progress.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/30">
          <TrendingUp className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No progress recorded yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Chart */}
          <div className="h-64 w-full bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis domain={[1, 4]} ticks={[1,2,3,4]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string, props: any) => [props.payload.label, 'Progress']}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#0d9488" 
                  strokeWidth={3} 
                  dot={{ r: 6, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Records List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {progress.map(p => (
              <div key={p.id} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:border-teal-200 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-gray-900">Week {p.weekNumber}</h3>
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    p.score === 4 ? 'bg-green-100 text-green-700' :
                    p.score === 3 ? 'bg-teal-100 text-teal-700' :
                    p.score === 2 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {p.score === 4 ? 'Max Progress (4)' : p.score === 3 ? 'Good Progress (3)' : p.score === 2 ? 'Slow Progress (2)' : 'Static (1)'}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-bold mb-4 bg-gray-50 p-2 rounded-lg inline-flex">
                  {p.weekStartDate} <span className="text-gray-300">→</span> {p.weekEndDate}
                </div>
                {p.notes ? (
                  <p className="text-gray-600 text-sm">{p.notes}</p>
                ) : (
                  <p className="text-gray-400 text-sm italic">No notes provided</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Progress Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">Log Weekly Progress</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl">✕</button>
            </div>
            <form onSubmit={handleAddProgress} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Week Number</label>
                  <input type="number" required value={weekNum} onChange={e => setWeekNum(parseInt(e.target.value))} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" min={1} />
                </div>
                <div>
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Progress Score *</label>
                   <select value={score} onChange={e => setScore(Number(e.target.value) as 1|2|3|4)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none appearance-none">
                     <option value={1}>1 - Static</option>
                     <option value={2}>2 - Slow Progress</option>
                     <option value={3}>3 - Good Progress</option>
                     <option value={4}>4 - Max Progress</option>
                   </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Start Date *</label>
                  <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">End Date *</label>
                  <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Review Notes</label>
                <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" placeholder="Overall progress observations..."></textarea>
              </div>

              <button type="submit" disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-100 disabled:opacity-70 mt-4">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus size={18} />}
                {saving ? 'Saving...' : 'Save Progress'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
