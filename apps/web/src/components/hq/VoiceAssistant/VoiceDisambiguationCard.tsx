// apps/web/src/components/hq/VoiceAssistant/VoiceDisambiguationCard.tsx
'use client';

import React from 'react';
import { useVoiceAssistant } from './VoiceAssistantProvider';
import { User, X, Landmark, ShieldAlert } from 'lucide-react';

export default function VoiceDisambiguationCard() {
  const { pendingIntent, resolveDisambiguation, clearPendingIntent } = useVoiceAssistant();

  if (!pendingIntent) return null;

  const { matches, intent } = pendingIntent;

  // Format department labels for user readability
  const getDeptLabel = (dept: string): string => {
    const labels: Record<string, string> = {
      rehab: 'Rehab Center',
      spims: 'SPIMS Academy',
      hospital: 'Khan Hospital',
      sukoon: 'Sukoon Center',
      welfare: 'Welfare Foundation',
      'job-center': 'Job Center',
    };
    return labels[dept] || dept.toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-gray-100 shadow-2xl rounded-2xl p-6 relative animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={clearPendingIntent}
          className="absolute top-4 right-4 p-2 rounded-xl border border-gray-100 text-gray-400 bg-white hover:text-rose-600 hover:border-rose-100 transition-all active:scale-95 shadow-sm"
          title="Cancel"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              Disambiguation Conflict
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Multiple Records Found for "{intent.entityName}"
            </p>
          </div>
        </div>

        <p className="text-xs font-semibold text-gray-500 mb-4 normal-case leading-relaxed">
          Mujhe is naam ke do ya zyada records mile hain. Niche diye gaye logo me se sahi record select karein:
        </p>

        {/* Matches List */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
          {matches.map((match) => (
            <button
              key={match.id}
              onClick={() => resolveDisambiguation(match)}
              className="w-full text-left p-4 border border-gray-100 bg-white hover:bg-indigo-50/30 hover:border-indigo-100 rounded-2xl flex items-center gap-4 transition-all duration-200 active:scale-[0.99] group"
            >
              {/* Profile Icon */}
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <User size={18} />
              </div>

              {/* Identity Details */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-900 uppercase tracking-wide truncate">
                  {match.name}
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  S/O D/O: {match.fatherName}
                </p>
              </div>

              {/* Department Tag */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 border border-gray-100/50">
                  {match.identifierLabel}
                </span>
                <div className="flex items-center gap-1 text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                  <Landmark size={10} />
                  <span>{getDeptLabel(match.department)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer actions */}
        <div className="mt-6 pt-5 border-t border-gray-50 flex justify-end">
          <button
            onClick={clearPendingIntent}
            className="px-4 py-2.5 border border-gray-100 text-[10px] font-black uppercase tracking-[0.2em] transition-all bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 shadow-sm rounded-xl active:scale-[0.98]"
          >
            Cancel Request
          </button>
        </div>
      </div>
    </div>
  );
}
