// apps/web/src/components/hq/VoiceAssistant/VoiceCommandBar.tsx
'use client';

import React from 'react';
import { useVoiceAssistant } from './VoiceAssistantProvider';
import { Mic, Loader2, Volume2, AlertCircle } from 'lucide-react';

export default function VoiceCommandBar() {
  const {
    listening,
    capturingCommand,
    liveTranscript,
    processing,
    speaking,
    error,
    mode
  } = useVoiceAssistant();

  // Determine if we should show the bar
  // We only show it if we are actively capturing, processing, speaking, or if an error is active
  const isActive = (mode === 'always_on' && capturingCommand) || 
                   (mode === 'push_to_talk' && listening) || 
                   processing || 
                   speaking || 
                   (error && liveTranscript);

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
  } else if (error) {
    statusLabel = 'Error';
    statusIcon = <AlertCircle size={14} className="text-rose-500" />;
    barBorderColor = 'border-rose-200';
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className={`bg-white/95 backdrop-blur-md border ${barBorderColor} shadow-2xl rounded-2xl p-4 flex items-center gap-4 transition-all duration-300`}>
        {/* Status indicator badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-50 bg-gray-50/50 text-[9px] font-black uppercase tracking-widest text-gray-500 flex-shrink-0">
          {statusIcon}
          <span>{statusLabel}</span>
        </div>

        {/* Live transcript text display */}
        <div className="flex-1 min-w-0">
          {liveTranscript ? (
            <p className="text-xs font-bold text-gray-800 truncate uppercase tracking-wide">
              {liveTranscript}
            </p>
          ) : (
            <p className="text-xs font-bold text-gray-400 italic">
              {mode === 'always_on' ? 'Boliye, main sun rahi hoon...' : 'Boliye...'}
            </p>
          )}
        </div>

        {/* Pulse indicator for capturing */}
        {(listening || capturingCommand) && !processing && !speaking && (
          <div className="flex gap-1 items-center flex-shrink-0">
            <span className="w-1.5 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
}
