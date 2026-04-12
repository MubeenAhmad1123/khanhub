// src/components/welfare/child-profile/DailySheetTab.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DailyActivityRecord, DAILY_ACTIVITIES, ActivityStatus } from '@/types/welfare';
import { getDailyActivities, saveDailyActivity } from '@/lib/welfare/children';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, MinusCircle, FileText, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DailySheetTab({ childId, session, readOnly = false }: { childId: string, session: any, readOnly?: boolean }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [records, setRecords] = useState<Record<string, DailyActivityRecord>>({});
  const [loading, setLoading] = useState(true);
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());
  const [noteModal, setNoteModal] = useState<{ type: 'counselling' | 'vital'; date: string; value: string } | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());

  const { year, monthIndex, daysInMonth } = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    return { year: y, monthIndex: m - 1, daysInMonth: new Date(y, m, 0).getDate() };
  }, [currentMonth]);

  const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  useEffect(() => {
    setSelectedDay((prev) => Math.min(Math.max(prev, 1), daysInMonth));
  }, [daysInMonth, currentMonth]);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDailyActivities(childId, currentMonth);
      const indexed: Record<string, DailyActivityRecord> = {};
      data.forEach(r => { indexed[r.date] = r; });
      setRecords(indexed);
    } catch (error) {
      console.error("Fetch activities error", error);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [childId, currentMonth]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const changeMonth = (dir: number) => {
    const d = new Date(year, monthIndex + dir, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleCellClick = async (day: number, activityId: number) => {
    if (readOnly) return;
    const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
    const key = `${dateStr}-${activityId}`;
    if (pendingSaves.has(key)) return;

    // Special rows: counselling (#8) and vital sign (#11)
    if (activityId === 8 || activityId === 11) {
      const currentRecord = records[dateStr];
      const currentActivities = currentRecord?.activities || [];
      const existingActivity = currentActivities.find(a => a.activityId === activityId);
      const type = activityId === 8 ? 'counselling' : 'vital';
      const existingNote = activityId === 8 ? (currentRecord?.counsellingSessionNotes || '') : (currentRecord?.vitalSignNotes || '');
      setNoteModal({ type, date: dateStr, value: existingNote });
      if (!existingActivity || existingActivity.status === 'na') {
        const newActivities = [...currentActivities];
        const actIndex = newActivities.findIndex(a => a.activityId === activityId);
        if (actIndex >= 0) newActivities[actIndex] = { ...newActivities[actIndex], status: 'done' };
        else newActivities.push({ activityId, status: 'done' });
        setRecords(prev => ({
          ...prev,
          [dateStr]: { ...prev[dateStr], date: dateStr, childId, id: prev[dateStr]?.id || '', activities: newActivities, markedBy: session.uid, createdAt: prev[dateStr]?.createdAt || new Date() } as DailyActivityRecord
        }));
      }
      return;
    }

    const currentRecord = records[dateStr];
    let currentActivities = currentRecord?.activities || [];
    let existingActivity = currentActivities.find(a => a.activityId === activityId);
    
    let newStatus: ActivityStatus = 'done';
    if (existingActivity) {
      if (existingActivity.status === 'na') newStatus = 'done';
      else if (existingActivity.status === 'done') newStatus = 'not_done';
      else if (existingActivity.status === 'not_done') newStatus = 'na';
    }

    const newActivities = [...currentActivities];
    const actIndex = newActivities.findIndex(a => a.activityId === activityId);
    if (actIndex >= 0) newActivities[actIndex] = { ...newActivities[actIndex], status: newStatus };
    else newActivities.push({ activityId, status: newStatus });

    setRecords(prev => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], date: dateStr, childId, id: prev[dateStr]?.id || '', activities: newActivities, markedBy: session.uid, createdAt: prev[dateStr]?.createdAt || new Date() } as DailyActivityRecord
    }));

    try {
      setPendingSaves(prev => new Set(prev).add(key));
      await saveDailyActivity(childId, dateStr, newActivities, session.uid);
    } catch (error) {
      console.error("Error saving activity cell", error);
      toast.error('Failed to save activity');
      fetchRecords();
    } finally {
      setPendingSaves(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const handleSaveNote = async () => {
    if (!noteModal) return;
    setNoteSaving(true);
    try {
      const dateStr = noteModal.date;
      const currentRecord = records[dateStr];
      const currentActivities = currentRecord?.activities || [];
      const counsellingNotes = noteModal.type === 'counselling' ? noteModal.value : (currentRecord?.counsellingSessionNotes || '');
      const vitalNotes = noteModal.type === 'vital' ? noteModal.value : (currentRecord?.vitalSignNotes || '');
      await saveDailyActivity(childId, dateStr, currentActivities, session.uid, { counsellingNotes, vitalNotes });
      setRecords(prev => ({
        ...prev,
        [dateStr]: { ...prev[dateStr], counsellingSessionNotes: counsellingNotes, vitalSignNotes: vitalNotes } as DailyActivityRecord
      }));
      setNoteModal(null);
      toast.success('Notes saved');
    } catch (error) {
      toast.error('Failed to save notes');
    } finally {
      setNoteSaving(false);
    }
  };

  const getCellIcon = (status?: ActivityStatus, activityId?: number, dateStr?: string) => {
    if (!status || status === 'na') return <MinusCircle className="w-4 h-4 text-gray-500" />;
    if (status === 'done') {
      const hasNote = dateStr && records[dateStr] && (
        (activityId === 8 && records[dateStr]?.counsellingSessionNotes) ||
        (activityId === 11 && records[dateStr]?.vitalSignNotes)
      );
      return (
        <span className="relative">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          {hasNote && <FileText className="w-2.5 h-2.5 text-blue-500 absolute -top-1 -right-1" />}
        </span>
      );
    }
    if (status === 'not_done') return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getRowCompletion = (activityId: number) => {
    let done = 0, total = 0;
    daysArray.forEach(day => {
      const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
      const activities = records[dateStr]?.activities || [];
      const act = activities.find(a => a.activityId === activityId);
      if (act && act.status !== 'na') {
        total++;
        if (act.status === 'done') done++;
      }
    });
    if (total === 0) return null;
    return Math.round((done / total) * 100);
  };

  const getDayCompletion = (day: number) => {
    const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
    const activities = records[dateStr]?.activities || [];
    const marked = activities.filter(a => a.status !== 'na');
    if (marked.length === 0) return null;
    const done = marked.filter(a => a.status === 'done').length;
    return Math.round((done / marked.length) * 100);
  };

  const completionColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600 bg-green-50';
    if (pct >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const selectedDateStr = `${currentMonth}-${String(selectedDay).padStart(2, '0')}`;
  const selectedDayActivities = records[selectedDateStr]?.activities || [];
  const selectedDayPct = getDayCompletion(selectedDay);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-black text-gray-900">Daily Activity Sheet</h2>
        <div className="flex items-center gap-3 bg-white p-1 rounded-2xl border border-gray-200/50 shadow-sm">
          <button onClick={() => changeMonth(-1)} className="p-2.5 rounded-xl hover:bg-gray-100 transition active:scale-95">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <span className="font-black text-gray-900 text-sm min-w-[140px] text-center w-full uppercase tracking-wider">
            {new Date(year, monthIndex, 1).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2.5 rounded-xl hover:bg-gray-100 transition active:scale-95">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-4 justify-center md:justify-start">
        <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> <span className="font-bold text-gray-700">Done</span></div>
        <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" /> <span className="font-bold text-gray-700">Not Done</span></div>
        <div className="flex items-center gap-2"><MinusCircle className="w-4 h-4 text-gray-300" /> <span className="text-gray-500">N/A</span></div>
        {!readOnly && <span className="text-xs text-gray-400 font-bold">Click cells to cycle status</span>}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-teal-600" /></div>
      ) : (
        <>
        <div className="md:hidden space-y-4">
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200/60 shadow-sm">
            <button
              onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
              className="p-2 rounded-xl hover:bg-gray-100 transition active:scale-95"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Selected Date</p>
              <p className="text-sm font-black text-gray-900">
                {new Date(`${selectedDateStr}T00:00:00`).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => setSelectedDay((d) => Math.min(daysInMonth, d + 1))}
              className="p-2 rounded-xl hover:bg-gray-100 transition active:scale-95"
            >
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
            {DAILY_ACTIVITIES.map((activity) => {
              const existing = selectedDayActivities.find((a) => a.activityId === activity.id);
              const key = `${selectedDateStr}-${activity.id}`;
              const isSaving = pendingSaves.has(key);
              return (
                <div key={activity.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      <span className="text-teal-600 font-black mr-1">{activity.id}.</span>{activity.name}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCellClick(selectedDay, activity.id)}
                    disabled={isSaving || readOnly}
                    className={`shrink-0 w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center ${
                      readOnly ? 'cursor-default' : 'hover:bg-gray-50'
                    }`}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 text-teal-600 animate-spin" /> : getCellIcon(existing?.status, activity.id, selectedDateStr)}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Daily Completion</p>
            <p className={`text-lg font-black mt-1 ${selectedDayPct !== null ? completionColor(selectedDayPct).split(' ')[0] : 'text-gray-400'}`}>
              {selectedDayPct !== null ? `${selectedDayPct}%` : 'N/A'}
            </p>
          </div>
        </div>

        <div className="relative rounded-[2rem] border border-gray-200 bg-white overflow-hidden shadow-sm hidden md:block">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead className="bg-gray-50 uppercase text-[9px] font-black text-gray-500 tracking-widest sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-5 py-4 border-b border-r border-gray-200 sticky left-0 bg-gray-50 z-20 min-w-[200px]">Activity / Time</th>
                  {daysArray.map(day => (
                    <th key={day} className="px-2 py-4 border-b border-gray-200 text-center min-w-[44px]">{day}</th>
                  ))}
                  <th className="px-2 py-4 border-b border-gray-200 text-center min-w-[50px]">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {DAILY_ACTIVITIES.map(activity => {
                  const pct = getRowCompletion(activity.id);
                  return (
                    <tr key={activity.id} className="hover:bg-teal-50/20 transition-colors group">
                      <td className="px-5 py-3 border-r border-gray-100 sticky left-0 bg-white group-hover:bg-teal-50/20 z-10 transition-colors font-semibold text-gray-800 text-xs">
                        <span className="text-[10px] text-teal-600 w-5 inline-block font-black">{activity.id}.</span> 
                        {activity.name}
                      </td>
                      {daysArray.map(day => {
                        const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
                        const dayActivities = records[dateStr]?.activities || [];
                        const existing = dayActivities.find(a => a.activityId === activity.id);
                        const key = `${dateStr}-${activity.id}`;
                        const isSaving = pendingSaves.has(key);
                        
                        return (
                          <td key={day} className="border-r border-gray-50 last:border-r-0">
                            <button
                              onClick={() => handleCellClick(day, activity.id)}
                              disabled={isSaving || readOnly}
                              className={`w-full h-full min-h-[44px] flex items-center justify-center transition-colors active:scale-90 disabled:opacity-50 ${
                                readOnly ? 'cursor-default' : 'hover:bg-gray-100'
                              }`}
                              title={`${activity.name} — ${dateStr}`}
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                              ) : (
                                getCellIcon(existing?.status, activity.id, dateStr)
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="text-center">
                        {pct !== null && (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${completionColor(pct)}`}>
                            {pct}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 font-black text-[10px] text-gray-500 uppercase tracking-widest">
                  <td className="px-5 py-3 border-r border-gray-200 sticky left-0 bg-gray-50 z-10">Daily %</td>
                  {daysArray.map(day => {
                    const pct = getDayCompletion(day);
                    return (
                      <td key={day} className="text-center">
                        {pct !== null && (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black ${completionColor(pct)}`}>
                            {pct}%
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">
                {noteModal.type === 'counselling' ? '📝 Counselling Session Notes' : '📋 Vital Sign Notes'}
              </h2>
              <button onClick={() => setNoteModal(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-400 font-bold">{noteModal.date}</p>
              <textarea
                value={noteModal.value}
                onChange={e => setNoteModal({ ...noteModal, value: e.target.value })}
                rows={6}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                placeholder={noteModal.type === 'counselling' ? 'Write counselling session notes...' : 'Write vital sign observations...'}
              />
              <div className="flex gap-2">
                <button onClick={() => setNoteModal(null)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest">Cancel</button>
                <button onClick={handleSaveNote} disabled={noteSaving} className="flex-1 bg-teal-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50">
                  {noteSaving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}