// src/components/sukoon/patient-profile/MedicationTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { MedicationRecord } from '@/types/sukoon';
import { getMedicationRecords, addMedicationRecord } from '@/lib/sukoon/patients';
import { Loader2, Plus, Calendar, Pill } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MedicationTab({ patientId, session }: { patientId: string, session: any }) {
  const [records, setRecords] = useState<MedicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timing, setTiming] = useState('Morning');
  const [medications, setMedications] = useState('');
  const [notes, setNotes] = useState('');
  const [medicalOfficerSig, setMedicalOfficerSig] = useState('');
  const [dispenserSig, setDispenserSig] = useState('');

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMedicationRecords(patientId);
      setRecords(data);
    } catch (error) {
      console.error("Error fetching medication records", error);
      toast.error('Failed to load medication records');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medications) {
      toast.error('Medications list is required');
      return;
    }
    
    try {
      setSaving(true);
      const newRecord: MedicationRecord = {
        id: '', 
        patientId,
        date,
        timing,
        medications,
        notes: notes || undefined,
        medicalOfficerSig: medicalOfficerSig || undefined,
        dispenserSig: dispenserSig || undefined,
        createdBy: session.uid,
        createdAt: new Date(),
      };
      
      await addMedicationRecord(newRecord);
      toast.success('Record added');
      setShowAddModal(false);
      setMedications('');
      setNotes('');
      fetchRecords();
    } catch (error) {
      console.error("Add record error", error);
      toast.error('Failed to add record');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-teal-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 overflow-x-hidden w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-black text-gray-900">Medication Assisted Therapy</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/10 active:scale-95 transition-all"
        >
          <Plus size={16} /> Add Record
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/30">
          <Pill className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No medication records found</p>
        </div>
      ) : (
        <>
        <div className="md:hidden space-y-3">
          {records.map(r => (
            <div key={r.id} className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                  <Calendar size={14} className="text-teal-500" />
                  <span>{r.date}</span>
                </div>
                <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md uppercase tracking-widest">
                  {r.timing}
                </span>
              </div>
              <div className="text-sm text-gray-800 break-words">{r.medications}</div>
              {r.notes && (
                <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded-lg border border-gray-100 break-words">
                  {r.notes}
                </p>
              )}
              <div className="grid grid-cols-1 gap-1 text-xs">
                {r.medicalOfficerSig && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[9px] w-12">MO:</span>
                    <span className="font-mono text-gray-900 bg-gray-100 px-2 rounded break-all">{r.medicalOfficerSig}</span>
                  </div>
                )}
                {r.dispenserSig && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[9px] w-12">Disp:</span>
                    <span className="font-mono text-gray-900 bg-gray-100 px-2 rounded break-all">{r.dispenserSig}</span>
                  </div>
                )}
                {!r.medicalOfficerSig && !r.dispenserSig && (
                  <span className="text-gray-300 italic">No signatures</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto rounded-[2rem] border border-gray-100 shadow-sm bg-white">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-500 font-black uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4 w-1/2">Medications</th>
                <th className="px-6 py-4">Signatures</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-teal-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-bold text-gray-900 mb-1">
                      <Calendar size={14} className="text-teal-500" />
                      {r.date}
                    </div>
                    <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md uppercase tracking-widest">
                      {r.timing}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-normal">
                    <div className="font-medium text-gray-800">
                      {r.medications}
                    </div>
                    {r.notes && (
                      <p className="text-xs text-gray-500 mt-2 italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                        {r.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 text-xs">
                      {r.medicalOfficerSig && (
                         <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 font-bold uppercase tracking-widest text-[9px] w-12">MO:</span>
                            <span className="font-mono text-gray-900 bg-gray-100 px-2 rounded">{r.medicalOfficerSig}</span>
                         </div>
                      )}
                      {r.dispenserSig && (
                         <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 font-bold uppercase tracking-widest text-[9px] w-12">Disp:</span>
                            <span className="font-mono text-gray-900 bg-gray-100 px-2 rounded">{r.dispenserSig}</span>
                         </div>
                      )}
                      {!r.medicalOfficerSig && !r.dispenserSig && (
                        <span className="text-gray-300 italic">No signatures</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">Add Medication Record</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl">✕</button>
            </div>
            <form onSubmit={handleAddRecord} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Date *</label>
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Timing *</label>
                   <select value={timing} onChange={e => setTiming(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none appearance-none">
                     <option value="Morning">Morning</option>
                     <option value="Afternoon">Afternoon</option>
                     <option value="Night">Night</option>
                   </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Medications *</label>
                <textarea required rows={2} value={medications} onChange={e => setMedications(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" placeholder="List medications..."></textarea>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Notes (Optional)</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Special instructions..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">M.O. Signature (Name)</label>
                  <input value={medicalOfficerSig} onChange={e => setMedicalOfficerSig(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Name" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Dispenser Signature (Name)</label>
                  <input value={dispenserSig} onChange={e => setDispenserSig(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Name" />
                </div>
              </div>

              <button type="submit" disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-100 disabled:opacity-70 mt-4">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus size={18} />}
                {saving ? 'Saving...' : 'Save Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
