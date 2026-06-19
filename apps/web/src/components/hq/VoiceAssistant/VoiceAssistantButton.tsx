// apps/web/src/components/hq/VoiceAssistant/VoiceAssistantButton.tsx
'use client';

import React, { useState } from 'react';
import { useVoiceAssistant } from './VoiceAssistantProvider';
import { Mic, MicOff, Settings, Volume2, Loader2, AlertCircle } from 'lucide-react';

export default function VoiceAssistantButton() {
  const {
    mode,
    setMode,
    listening,
    capturingCommand,
    processing,
    speaking,
    error,
    isSupported,
    startAssistant,
    stopAssistant
  } = useVoiceAssistant();

  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!isSupported) {
    return (
      <div className="relative group">
        <button
          disabled
          className="p-2.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed shadow-sm"
          title="Voice assistant not supported in this browser"
        >
          <MicOff size={18} />
        </button>
        <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-white border border-gray-100 shadow-xl rounded-xl hidden group-hover:block z-50 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
          Voice Assistant not supported in this browser. Use Chrome or Safari.
        </div>
      </div>
    );
  }

  const handleMicClick = () => {
    if (listening) {
      stopAssistant();
    } else {
      startAssistant();
    }
  };

  // Determine button styles based on state
  let buttonClasses = 'p-2.5 rounded-xl border transition-all duration-300 relative ';
  let icon = <Mic size={18} />;

  if (processing) {
    buttonClasses += 'border-amber-200 bg-amber-50 text-amber-600 animate-pulse';
    icon = <Loader2 size={18} className="animate-spin" />;
  } else if (speaking) {
    buttonClasses += 'border-emerald-200 bg-emerald-50 text-emerald-600 shadow-md shadow-emerald-100';
    icon = <Volume2 size={18} className="animate-bounce" />;
  } else if (capturingCommand) {
    buttonClasses += 'border-indigo-300 bg-indigo-500 text-white shadow-lg shadow-indigo-200 animate-pulse';
    icon = <Mic size={18} />;
  } else if (listening) {
    buttonClasses += 'border-rose-200 bg-rose-50 text-rose-600 shadow-lg shadow-rose-100 animate-pulse';
    icon = <Mic size={18} />;
  } else if (error) {
    buttonClasses += 'border-rose-300 bg-rose-100 text-rose-700';
    icon = <AlertCircle size={18} />;
  } else {
    // Idle
    buttonClasses += 'border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50 active:scale-95';
  }

  const modeLabels = {
    always_on: 'Always On (Hey Mubi)',
    push_to_talk: 'Push To Talk',
  };

  return (
    <div className="relative flex items-center gap-1.5">
      {/* Settings Toggle Button */}
      <button
        onClick={() => setSettingsOpen(!settingsOpen)}
        className={`p-2.5 rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-gray-600 transition-all hover:bg-gray-50 active:scale-95 shadow-sm ${
          settingsOpen ? 'border-gray-200 text-gray-600' : ''
        }`}
        title="Voice Settings"
      >
        <Settings size={14} className={listening ? 'animate-spin' : ''} />
      </button>

      {/* Main Microphone Button */}
      <button
        onClick={handleMicClick}
        className={buttonClasses}
        title={listening ? 'Stop listening' : 'Start voice assistant'}
      >
        {icon}
        
        {/* Continuous Active Pulse Dot */}
        {mode === 'always_on' && listening && !capturingCommand && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        )}
      </button>

      {/* Settings Dropdown Popover */}
      {settingsOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setSettingsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-64 p-4 border border-gray-100 shadow-2xl rounded-2xl z-50 bg-white animate-in fade-in slide-in-from-top-2">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-3 text-black/50">
              Voice Assistant Mode
            </p>
            
            <div className="space-y-2">
              <button
                onClick={() => {
                  setMode('push_to_talk');
                  setSettingsOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-black transition-all ${
                  mode === 'push_to_talk'
                    ? 'border-indigo-100 bg-indigo-50 text-indigo-600 shadow-sm'
                    : 'border-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                Push To Talk
                <span className="block text-[9px] font-normal text-gray-400 mt-0.5 normal-case">
                  Click the mic to trigger a single command.
                </span>
              </button>

              <button
                onClick={() => {
                  setMode('always_on');
                  setSettingsOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-black transition-all ${
                  mode === 'always_on'
                    ? 'border-indigo-100 bg-indigo-50 text-indigo-600 shadow-sm'
                    : 'border-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                Always On (Wake Word)
                <span className="block text-[9px] font-normal text-gray-400 mt-0.5 normal-case">
                  Continuous listening. Say "Hey Mubi" or "Mubi" to activate.
                </span>
              </button>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-tight">
              <span>Wake Word: "Mubi"</span>
              <span className={`px-2 py-0.5 rounded ${listening ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50'}`}>
                {listening ? 'ACTIVE' : 'IDLE'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
