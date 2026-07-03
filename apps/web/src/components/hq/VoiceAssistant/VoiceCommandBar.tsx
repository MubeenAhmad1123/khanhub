// apps/web/src/components/hq/VoiceAssistant/VoiceCommandBar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useVoiceAssistant } from './VoiceAssistantProvider';
import { Mic, Loader2, Volume2, AlertCircle, X, ArrowRight, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { saveVoiceMemoryFeedback, saveVoiceMemoryCorrection } from '@/lib/voice/voiceTools';

export default function VoiceCommandBar() {
  const {
    listening,
    capturingCommand,
    liveTranscript,
    setLiveTranscript,
    processing,
    speaking,
    error,
    mode,
    voiceState,
    thinkingMessage,
    spokenResponse,
    activeData,
    closeAssistantCard,
    countdownDuration,
    countdownTimeLeft,
    isEditing,
    setIsEditing,
    submitManualCommand,
    startAssistant,
    stopAssistant,
    activeMemoryDocId,
    lastSubmittedCommand
  } = useVoiceAssistant();

  const [editValue, setEditValue] = useState('');
  const [feedbackState, setFeedbackState] = useState<'like' | 'dislike' | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [viewportBottomOffset, setViewportBottomOffset] = useState(24);

  // Sync editValue with liveTranscript when not actively editing
  useEffect(() => {
    if (!isEditing) {
      setEditValue(liveTranscript);
    }
  }, [liveTranscript, isEditing]);

  // Reset feedback state when active memory doc ID changes
  useEffect(() => {
    setFeedbackState(null);
    setCorrectionText('');
  }, [activeMemoryDocId]);

  // Handle virtual viewport keyboard resizing for mobile
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const offset = window.innerHeight - vv.height;
      setViewportBottomOffset(Math.max(24, offset + 12));
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  const handleLikeFeedback = async () => {
    if (!activeMemoryDocId) return;
    setFeedbackState('like');
    try {
      await saveVoiceMemoryFeedback(activeMemoryDocId, true);
    } catch (e) {
      console.error('Failed to save like feedback:', e);
    }
  };

  const handleSaveCorrection = async () => {
    if (!activeMemoryDocId || !correctionText.trim()) return;
    setSubmittingFeedback(true);
    try {
      await saveVoiceMemoryCorrection(activeMemoryDocId, correctionText);
      setFeedbackState(null);
      setCorrectionText('');
    } catch (e) {
      console.error('Failed to save correction:', e);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleRetry = () => {
    if (lastSubmittedCommand) {
      submitManualCommand(lastSubmittedCommand);
      setFeedbackState(null);
      setCorrectionText('');
    }
  };

  // Determine if we should show the bar
  const isActive = (mode === 'always_on' && capturingCommand) || 
                   (mode === 'push_to_talk' && listening) || 
                   isEditing ||
                   processing || 
                   speaking || 
                   (error && liveTranscript) ||
                   voiceState === 'thinking' ||
                   voiceState === 'speaking' ||
                   spokenResponse !== null ||
                   activeData !== null;

  if (!isActive) return null;

  let statusLabel = 'Listening...';
  let statusIcon = <Mic size={14} className="text-indigo-500 animate-pulse" />;
  let barBorderColor = 'border-indigo-100';

  if (processing) {
    statusLabel = 'Processing Command...';
    statusIcon = <Loader2 size={14} className="text-amber-500 animate-spin" />;
    barBorderColor = 'border-amber-100';
  } else if (speaking) {
    statusLabel = 'Speaking...';
    statusIcon = <Volume2 size={14} className="text-emerald-500 animate-bounce" />;
    barBorderColor = 'border-emerald-100';
  } else if (isEditing) {
    statusLabel = 'Editing...';
    statusIcon = <Mic size={14} className="text-gray-400" />;
    barBorderColor = 'border-indigo-200';
  } else if (error) {
    statusLabel = 'Error';
    statusIcon = <AlertCircle size={14} className="text-rose-500" />;
    barBorderColor = 'border-rose-200';
  }

  function renderActiveDataCard(topic: string, data: any) {
    switch (topic) {
      case 'financial_summary': {
        const netColor = data.net >= 0 ? 'text-emerald-400' : 'text-rose-400';
        return (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400">Date/Range:</span>
              <span className="font-mono text-slate-200">{data.date}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/50">
                <p className="text-slate-500 font-bold uppercase tracking-wider text-[8px] mb-0.5">Total Income</p>
                <p className="text-sm font-black text-emerald-400">Rs {data.income.toLocaleString()}</p>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/50">
                <p className="text-slate-500 font-bold uppercase tracking-wider text-[8px] mb-0.5">Total Expense</p>
                <p className="text-sm font-black text-rose-400">Rs {data.expense.toLocaleString()}</p>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/50">
                <p className="text-slate-500 font-bold uppercase tracking-wider text-[8px] mb-0.5">Net Profit</p>
                <p className={`text-sm font-black ${netColor}`}>Rs {data.net.toLocaleString()}</p>
              </div>
            </div>

            {data.breakdown && data.breakdown.length > 0 && (
              <div className="space-y-2">
                <p className="font-bold text-slate-400 text-[9px] uppercase tracking-widest">Department Breakdown</p>
                <div className="space-y-2">
                  {data.breakdown.map((b: any, idx: number) => {
                    const totalDept = b.income + b.expense;
                    const incPercent = totalDept > 0 ? (b.income / totalDept) * 100 : 0;
                    return (
                      <div key={idx} className="bg-slate-950/30 p-2 rounded-lg border border-slate-800/30 flex items-center justify-between gap-4">
                        <span className="font-bold uppercase tracking-wider text-[9px] text-slate-300 min-w-[70px]">{b.dept}</span>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-400">
                            <span>Inc: Rs {b.income.toLocaleString()}</span>
                            <span>Exp: Rs {b.expense.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden flex">
                            <div className="bg-emerald-400 h-full" style={{ width: `${incPercent}%` }} />
                            <div className="bg-rose-400 h-full" style={{ width: `${100 - incPercent}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'admissions_by_date':
      case 'discharges_by_date': {
        const list = topic === 'admissions_by_date' ? data.admissions : data.discharges;
        const actionLabel = topic === 'admissions_by_date' ? 'Admitted' : 'Discharged';
        const colorLabel = topic === 'admissions_by_date' ? 'text-blue-400 border-blue-900/50 bg-blue-950/30' : 'text-purple-400 border-purple-900/50 bg-purple-950/30';
        
        return (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400">Date/Range:</span>
              <span className="font-mono text-slate-200">{data.date}</span>
            </div>
            
            <div className={`p-2.5 rounded-xl border ${colorLabel} flex items-center justify-between`}>
              <span className="font-bold uppercase tracking-wider text-[9px]">{actionLabel} Count</span>
              <span className="text-sm font-black">{data.count}</span>
            </div>

            {list && list.length > 0 && (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {list.map((item: any, idx: number) => {
                  const profilePath = buildItemProfilePath(item.department, item.type, item.id);
                  return (
                    <div key={idx} className="bg-slate-950/40 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-200">{item.name}</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider">{item.type} • {item.department}</p>
                      </div>
                      <Link 
                        href={profilePath}
                        onClick={closeAssistantCard}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-0.5"
                      >
                        View Profile <ArrowRight size={10} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 'attendance_summary': {
        return (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400">Date:</span>
              <span className="font-mono text-slate-200">{data.date}</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/30">
                <p className="text-emerald-400 font-bold text-[8px] uppercase tracking-wider mb-0.5">Present</p>
                <p className="text-base font-black text-emerald-400">{data.present}</p>
              </div>
              <div className="bg-rose-950/20 p-2 rounded-lg border border-rose-900/30">
                <p className="text-rose-400 font-bold text-[8px] uppercase tracking-wider mb-0.5">Absent</p>
                <p className="text-base font-black text-rose-400">{data.absent}</p>
              </div>
              <div className="bg-amber-950/20 p-2 rounded-lg border border-amber-900/30">
                <p className="text-amber-400 font-bold text-[8px] uppercase tracking-wider mb-0.5">Leave</p>
                <p className="text-base font-black text-amber-400">{data.leave}</p>
              </div>
              <div className="bg-indigo-950/20 p-2 rounded-lg border border-indigo-900/30">
                <p className="text-indigo-400 font-bold text-[8px] uppercase tracking-wider mb-0.5">Total</p>
                <p className="text-base font-black text-indigo-400">{data.total}</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {data.absentStaff && data.absentStaff.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-400 text-[9px] uppercase tracking-widest">Absent/Unmarked Staff</p>
                  <div className="space-y-1.5">
                    {data.absentStaff.map((staff: any, idx: number) => (
                      <div key={idx} className="bg-slate-950/40 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-200">{staff.name}</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider">{staff.role} • {staff.dept}</p>
                        </div>
                        <span className="text-[9px] font-bold text-rose-400 bg-rose-950/30 px-2 py-0.5 rounded-full border border-rose-900/50">
                          {staff.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.lateStaff && data.lateStaff.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-amber-500 text-[9px] uppercase tracking-widest">Late Staff</p>
                  <div className="space-y-1.5">
                    {data.lateStaff.map((staff: any, idx: number) => (
                      <div key={idx} className="bg-slate-950/40 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-200">{staff.name}</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider">{staff.role} • {staff.dept}</p>
                        </div>
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-900/50">
                          {staff.time ? `Check-in: ${staff.time}` : 'Late'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.noUniformStaff && data.noUniformStaff.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-rose-400 text-[9px] uppercase tracking-widest">Uniform Violations</p>
                  <div className="space-y-1.5">
                    {data.noUniformStaff.map((staff: any, idx: number) => (
                      <div key={idx} className="bg-slate-950/40 p-2 rounded-lg border border-slate-800 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-200">{staff.name}</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-wider">{staff.role} • {staff.dept}</p>
                          </div>
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-950/30 px-2 py-0.5 rounded-full border border-rose-900/50">
                            Incorrect Uniform
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                          Missing: {staff.missingItems.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.pendingDutyStaff && data.pendingDutyStaff.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-rose-450 text-[9px] uppercase tracking-widest">Pending Duties</p>
                  <div className="space-y-1.5">
                    {data.pendingDutyStaff.map((staff: any, idx: number) => (
                      <div key={idx} className="bg-slate-950/40 p-2 rounded-lg border border-slate-800 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-200">{staff.name}</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-wider">{staff.role} • {staff.dept}</p>
                          </div>
                          <span className="text-[9px] font-bold text-rose-450 bg-rose-950/30 px-2 py-0.5 rounded-full border border-rose-900/50">
                            {staff.dutyStatus}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                          Pending: {staff.pendingDuties.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'students_by_course': {
        return (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-lg border border-slate-800">
              <span className="font-bold text-slate-400">Course:</span>
              <span className="font-bold text-slate-200 uppercase tracking-wide">{data.course}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400">Total Active Students:</span>
              <span className="font-bold text-slate-200">{data.count}</span>
            </div>

            {data.students && data.students.length > 0 && (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {data.students.map((student: any, idx: number) => {
                  const profilePath = buildItemProfilePath('spims', 'student', student.id);
                  return (
                    <div key={idx} className="bg-slate-950/40 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-200">{student.name}</p>
                        <p className="text-[9px] text-slate-500">Roll No: {student.rollNo}</p>
                      </div>
                      <Link 
                        href={profilePath}
                        onClick={closeAssistantCard}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-0.5"
                      >
                        View Profile <ArrowRight size={10} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 'remaining_fee': {
        const paidPercent = data.totalAmount > 0 ? (data.amountPaid / data.totalAmount) * 100 : 0;
        return (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400">Client Name:</span>
              <span className="font-bold text-slate-200">{data.name}</span>
            </div>
            
            <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between font-bold text-slate-400 text-[10px] uppercase mb-1">
                <span>Paid (Rs {data.amountPaid.toLocaleString()})</span>
                <span>Remaining (Rs {data.amountRemaining.toLocaleString()})</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div className="bg-emerald-400 h-full" style={{ width: `${paidPercent}%` }} />
                <div className="bg-rose-400 h-full" style={{ width: `${100 - paidPercent}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                <span>Total Package: Rs {data.totalAmount.toLocaleString()}</span>
                <span>Dept: {data.department}</span>
              </div>
            </div>
          </div>
        );
      }

      case 'pending_transactions': {
        return (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400">Status:</span>
              <span className="font-bold text-slate-200">Pending Approvals</span>
            </div>
            
            <div className="p-2.5 rounded-xl border border-amber-900/50 bg-amber-950/30 flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[9px] text-amber-400">Total Pending</span>
              <span className="text-sm font-black text-amber-400">{data.totalPending}</span>
            </div>

            {data.pendingByDept && Object.keys(data.pendingByDept).length > 0 && (
              <div className="space-y-1.5">
                <p className="font-bold text-slate-400 text-[9px] uppercase tracking-widest">By Department</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(data.pendingByDept).map(([dept, count]: any) => (
                    <div key={dept} className="bg-slate-950/40 p-2 rounded-lg border border-slate-800 flex items-center justify-between uppercase tracking-wider text-[9px]">
                      <span className="text-slate-300 font-bold">{dept}</span>
                      <span className="font-black text-slate-100">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.transactions && data.transactions.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-bold text-slate-400 text-[9px] uppercase tracking-widest">Recent Pending</p>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {data.transactions.slice(0, 10).map((tx: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/40 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-200">{tx.name}</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider">{tx.category} • {tx.dept}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-100">Rs {tx.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'staff_ranking': {
        return (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400">Date Range:</span>
              <span className="font-mono text-slate-200">{data.dateRange}</span>
            </div>

            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {data.ranking && data.ranking.length > 0 ? (
                data.ranking.map((s: any) => (
                  <div key={s.rank} className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-indigo-400">#{s.rank}</span>
                      <div>
                        <p className="font-bold text-slate-200">{s.name}</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider">{s.designation} • {s.department}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div className="text-[9px] text-slate-400 text-left shrink-0">
                        <span className="block">Pres: {s.presents} | Abs: {s.absents}</span>
                        {s.fines > 0 && <span className="block text-rose-400 font-semibold">Fine: Rs {s.fines}</span>}
                      </div>
                      <div className="bg-indigo-950/40 border border-indigo-900/50 px-1.5 py-0.5 rounded text-center min-w-[40px] shrink-0">
                        <p className="text-[7px] text-indigo-400 uppercase tracking-widest leading-none mb-0.5">Points</p>
                        <p className="text-[11px] font-black text-indigo-300 leading-none">{s.totalPoints}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic text-center py-4">No staff ranking data found.</p>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }

  function buildItemProfilePath(department: string, entityType: string, id: string): string {
    if (entityType === 'staff') {
      return `/hq/dashboard/manager/staff/${department}_${id}`;
    }
    
    switch (department) {
      case 'rehab':
        return `/departments/rehab/dashboard/admin/patients/${id}`;
      case 'spims':
        return `/departments/spims/dashboard/admin/students/${id}`;
      case 'hospital':
        return `/departments/hospital/dashboard/admin/patients/${id}`;
      case 'sukoon':
        return `/departments/sukoon/dashboard/admin/clients/${id}`;
      case 'welfare':
        return `/departments/welfare/dashboard/admin/children/${id}`;
      case 'job-center':
        return `/departments/job-center/dashboard/admin/seekers/${id}`;
      default:
        return `/hq/dashboard`;
    }
  }

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 z-50 w-[min(92vw,480px)] sm:w-full sm:max-w-xl animate-in slide-in-from-bottom-5 duration-300 space-y-2"
      style={{ bottom: `${viewportBottomOffset}px` }}
    >
      {voiceState === 'thinking' && thinkingMessage && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-950 border border-blue-700 rounded-xl shadow-2xl">
          {/* Animated dots */}
          <div className="flex gap-1 shrink-0">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-blue-200 text-sm font-medium">{thinkingMessage}</p>
        </div>
      )}

      {(spokenResponse || activeData) && (
        <div className="bg-slate-900/95 border border-slate-800/80 shadow-2xl rounded-2xl p-5 relative animate-in fade-in zoom-in-95 duration-200 text-slate-100 max-h-[50vh] sm:max-h-[380px] overflow-y-auto flex flex-col justify-between">
          <div className="pr-8 relative space-y-4">
            <button 
              onClick={closeAssistantCard}
              className="absolute top-0 right-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all min-w-[32px] min-h-[32px] flex items-center justify-center"
              title="Close Assistant Card"
            >
              <X size={16} />
            </button>
            
            {/* Mubi Spoken Response */}
            {spokenResponse && (
              <div className="flex items-start gap-2.5">
                <div className="flex gap-0.5 items-center shrink-0 mt-1">
                  {[1, 2, 3, 2, 1].map((h, i) => (
                    <span
                      key={i}
                      className={`w-0.5 bg-emerald-400 rounded-full ${voiceState === 'speaking' ? 'animate-pulse' : ''}`}
                      style={{ height: `${h * 4}px`, animationDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">Mubi Assistant</p>
                  <p className="text-sm font-semibold leading-relaxed text-slate-100">{spokenResponse}</p>
                </div>
              </div>
            )}

            {/* Visual Data Content */}
            {activeData && (
              <div className="border-t border-slate-800/80 pt-4 mt-2">
                {renderActiveDataCard(activeData.topic, activeData.data)}
              </div>
            )}
          </div>

          {/* Feedback & Actions Footer */}
          {activeMemoryDocId && (
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-4 text-[11px] text-slate-400 flex-shrink-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <span>Was this correct?</span>
                <button 
                  onClick={handleLikeFeedback}
                  className={`p-1 rounded hover:bg-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${feedbackState === 'like' ? 'text-emerald-400 bg-slate-800' : 'hover:text-emerald-400'}`}
                  title="Yes, correct"
                >
                  <ThumbsUp size={14} />
                </button>
                <button 
                  onClick={() => setFeedbackState(feedbackState === 'dislike' ? null : 'dislike')}
                  className={`p-1 rounded hover:bg-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${feedbackState === 'dislike' ? 'text-rose-400 bg-slate-800' : 'hover:text-rose-400'}`}
                  title="No, wrong"
                >
                  <ThumbsDown size={14} />
                </button>
              </div>
              
              <button 
                onClick={handleRetry}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors min-h-[36px]"
                title="Retry command"
              >
                <RefreshCw size={12} />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Correction input panel */}
          {feedbackState === 'dislike' && (
            <div className="border-t border-slate-800/80 pt-3 mt-2 space-y-2 flex-shrink-0">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">What should it have shown instead?</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  placeholder="e.g. Show staff ranking, not finance"
                  className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button 
                  onClick={handleSaveCorrection}
                  disabled={submittingFeedback}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-semibold rounded transition-colors min-h-[36px] flex items-center justify-center shrink-0"
                >
                  {submittingFeedback ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!(voiceState === 'thinking' || voiceState === 'speaking' || spokenResponse || activeData) && (
        <div className={`bg-white/95 backdrop-blur-md border ${barBorderColor} shadow-2xl rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300`}>
          <div className="flex items-center gap-4 w-full">
            {/* Status indicator badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-50 bg-gray-50/50 text-[9px] font-black uppercase tracking-widest text-gray-500 flex-shrink-0">
              {statusIcon}
              <span>{statusLabel}</span>
            </div>

            {/* Live transcript text display */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      submitManualCommand(editValue);
                    }
                  }}
                  className="w-full text-xs font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              ) : liveTranscript ? (
                <p 
                  onClick={() => {
                    setEditValue(liveTranscript);
                    setIsEditing(true);
                  }}
                  className="text-xs font-bold text-gray-800 truncate uppercase tracking-wide cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
                  title="Click to edit command"
                >
                  {liveTranscript}
                </p>
              ) : (
                <p className="text-xs font-bold text-gray-400 italic">
                  {mode === 'always_on' ? "Speak, I'm listening..." : 'Speak...'}
                </p>
              )}
            </div>

            {/* Action buttons (Send, Cancel/Clear) or Pulse indicator */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      startAssistant();
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Cancel edit"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={() => submitManualCommand(editValue)}
                    className="p-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Send command"
                  >
                    <ArrowRight size={14} />
                  </button>
                </>
              ) : liveTranscript ? (
                <>
                  <button
                    onClick={() => {
                      setLiveTranscript('');
                      if (mode !== 'always_on') {
                        stopAssistant();
                      }
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Clear command"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={() => submitManualCommand(liveTranscript)}
                    className="p-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Send command immediately"
                  >
                    <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                /* Pulse indicator for capturing */
                (listening || capturingCommand) && !processing && !speaking && (
                  <div className="flex gap-1 items-center flex-shrink-0">
                    <span className="w-1.5 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )
              )}
            </div>
          </div>

          {/* Countdown indicator bar */}
          {!isEditing && countdownTimeLeft > 0 && countdownDuration > 0 && (
            <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all duration-100 ease-linear"
                style={{ width: `${(countdownTimeLeft / countdownDuration) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
