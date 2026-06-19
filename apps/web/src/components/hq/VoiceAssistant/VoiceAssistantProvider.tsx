// apps/web/src/components/hq/VoiceAssistant/VoiceAssistantProvider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { 
  MODE_STORAGE_KEY, 
  DEFAULT_MODE, 
  VoiceAssistantMode, 
  WAKE_WORDS 
} from '@/lib/voice/voiceConfig';
import { parseVoiceIntent, ParsedVoiceIntent } from '@/lib/voice/intentParser';
import { resolveEntityByName, EntityMatch } from '@/lib/voice/entityResolver';
import { 
  getRemainingFeeForEntity, 
  getAttendanceStatusForEntity, 
  getTotalPaidForEntity, 
  getStatusForEntity 
} from '@/lib/voice/voiceQueryActions';
import { 
  formatRemainingFeeResponse, 
  formatAttendanceResponse, 
  formatTotalPaidResponse, 
  formatStatusResponse 
} from '@/lib/voice/responseFormatter';
import { speak } from '@/lib/voice/speak';

interface VoiceAssistantContextType {
  mode: VoiceAssistantMode;
  setMode: (mode: VoiceAssistantMode) => void;
  listening: boolean;
  capturingCommand: boolean;
  liveTranscript: string;
  processing: boolean;
  speaking: boolean;
  error: string | null;
  isSupported: boolean;
  pendingIntent: { intent: ParsedVoiceIntent; matches: EntityMatch[] } | null;
  startAssistant: () => void;
  stopAssistant: () => void;
  resolveDisambiguation: (match: EntityMatch) => void;
  clearPendingIntent: () => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export function useVoiceAssistant() {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error('useVoiceAssistant must be used within a VoiceAssistantProvider');
  }
  return context;
}

// Helper to play a clean synthesizer beep using Web Audio API
function playAudioCue() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (err) {
    console.warn('[VoiceAssistant] Beep audio failed:', err);
  }
}

export default function VoiceAssistantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session } = useHqSession();
  
  const [mode, setModeState] = useState<VoiceAssistantMode>(DEFAULT_MODE);
  const [listening, setListening] = useState(false);
  const [capturingCommand, setCapturingCommand] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<{ intent: ParsedVoiceIntent; matches: EntityMatch[] } | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeSpeechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const manualStopRef = useRef(false);

  // Read allowed departments from localStorage sessions
  const getScopedDepartments = (): string[] => {
    if (typeof window === 'undefined') return [];
    const depts = ['rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'];
    return depts.filter(d => {
      try { return !!localStorage.getItem(`${d}_session`); } catch { return false; }
    });
  };

  // Persist mode to localStorage
  const setMode = (newMode: VoiceAssistantMode) => {
    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
    // Restart assistant with new mode if listening
    if (listening) {
      stopAssistant();
      setTimeout(() => startAssistant(), 200);
    }
  };

  // Detect browser SpeechRecognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
      
      const stored = localStorage.getItem(MODE_STORAGE_KEY) as VoiceAssistantMode;
      if (stored === 'always_on' || stored === 'push_to_talk') {
        setModeState(stored);
      }
    }
  }, []);

  // Web Speech API Voice synthesis cancellation & state tracking
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const syncSpeakingState = () => {
      setSpeaking(window.speechSynthesis.speaking);
    };

    const interval = setInterval(syncSpeakingState, 250);
    return () => clearInterval(interval);
  }, []);

  const handleCommandComplete = async (commandText: string) => {
    if (!commandText.trim()) {
      setCapturingCommand(false);
      setLiveTranscript('');
      return;
    }

    setProcessing(true);
    setLiveTranscript(commandText);
    
    // Stop recognition during processing & speaking to avoid feedback loop
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    try {
      const parsed = parseVoiceIntent(commandText);
      if (parsed.type === 'unknown' || !parsed.entityName) {
        speakUtterance("Mujhe samajh nahi aya. Dobara boliye.");
        return;
      }

      const scopedDepts = getScopedDepartments();
      const { matches } = await resolveEntityByName(parsed.entityName, scopedDepts);

      if (matches.length === 0) {
        speakUtterance(`Mujhe "${parsed.entityName}" naam ka koi active record nahi mila.`);
        return;
      }

      if (matches.length === 1) {
        await executeResolvedIntent(parsed, matches[0]);
      } else {
        // Disambiguation needed
        setPendingIntent({ intent: parsed, matches });
        const nameListPrompt = matches
          .map((m, idx) => `number ${idx + 1}, ${m.name} jin ke walid ka naam ${m.fatherName} hai`)
          .join(', aur ');
        speakUtterance(
          `Mujhe ${parsed.entityName} ke naam ke ${matches.length} log mile hain. ${nameListPrompt}. Aap kis ke baare me baat kar rahe hain? Ya screen par card tap karein.`
        );
      }
    } catch (err: any) {
      console.error('[VoiceAssistant] Command execution failed:', err);
      setError('Command perform karne me koi masla pesh aya.');
      speakUtterance("Server par query process karte hue error aya.");
    } finally {
      setProcessing(false);
    }
  };

  const executeResolvedIntent = async (intent: ParsedVoiceIntent, match: EntityMatch) => {
    if (intent.type === 'navigate') {
      let path = '';
      switch (match.department) {
        case 'rehab':
          path = `/departments/rehab/dashboard/admin/patients/${match.id}`;
          break;
        case 'spims':
          path = `/departments/spims/dashboard/admin/students/${match.id}`;
          break;
        case 'hospital':
          path = `/departments/hospital/dashboard/admin/patients/${match.id}`;
          break;
        case 'sukoon':
          path = `/departments/sukoon/dashboard/admin/clients/${match.id}`;
          break;
        case 'welfare':
          path = `/departments/welfare/dashboard/admin/children/${match.id}`;
          break;
        case 'job-center':
          path = `/departments/job-center/dashboard/admin/seekers/${match.id}`;
          break;
        default:
          path = `/hq/dashboard`;
      }
      
      router.push(path);
      // Spoken notification confirming navigation
      speakUtterance(`theek hai, ${match.name} ka record khol rahi hoon.`);
    } else if (intent.type === 'query') {
      try {
        let answer = '';
        if (intent.queryTopic === 'remaining_fee') {
          const res = await getRemainingFeeForEntity(match.id, match.collection);
          answer = formatRemainingFeeResponse(res);
        } else if (intent.queryTopic === 'attendance') {
          const res = await getAttendanceStatusForEntity(match.id, match.collection);
          answer = formatAttendanceResponse(res);
        } else if (intent.queryTopic === 'total_paid') {
          const res = await getTotalPaidForEntity(match.id, match.collection);
          answer = formatTotalPaidResponse(res);
        } else if (intent.queryTopic === 'status') {
          const res = await getStatusForEntity(match.id, match.collection);
          answer = formatStatusResponse(res);
        } else {
          answer = "Mujhe topic samajh nahi aya.";
        }
        
        speakUtterance(answer);
      } catch (err) {
        console.error('[VoiceAssistant] Query detail fetch failed:', err);
        speakUtterance("Un ka record check karne me error aya.");
      }
    }
  };

  const resolveDisambiguation = async (match: EntityMatch) => {
    if (!pendingIntent) return;
    const intent = pendingIntent.intent;
    setPendingIntent(null);
    await executeResolvedIntent(intent, match);
  };

  const clearPendingIntent = () => {
    setPendingIntent(null);
    speakUtterance("Cancel kar diya.");
  };

  // Wrapper for speak utility to capture speech completion and resume background listening if always_on
  const speakUtterance = (text: string) => {
    setSpeaking(true);
    speak(text);
    
    // Check speech completion using SpeechSynthesisUtterance event or simple interval fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const checkEnd = () => {
        if (!window.speechSynthesis.speaking) {
          setSpeaking(false);
          // Restart background recognition if mode is always_on and not manually stopped
          if (mode === 'always_on' && !manualStopRef.current && !pendingIntent) {
            startRecognitionInstance();
          }
        } else {
          setTimeout(checkEnd, 200);
        }
      };
      setTimeout(checkEnd, 400);
    }
  };

  const startRecognitionInstance = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    const rec = new SpeechRecognition();
    rec.lang = 'en-US'; // Best compatibility for Romanized Urdu/English mixing
    rec.interimResults = true;
    rec.continuous = (mode === 'always_on');

    rec.onstart = () => {
      setListening(true);
      setError(null);
    };

    rec.onerror = (e: any) => {
      console.warn('[VoiceAssistant] Speech recognition error event:', e.error);
      if (e.error === 'not-allowed') {
        setError('Microphone permission denied.');
        setListening(false);
      }
    };

    rec.onend = () => {
      setListening(false);
      // Auto-restart if always_on and not manually stopped, speaking, processing, or waiting on disambiguation
      if (mode === 'always_on' && !manualStopRef.current && !window.speechSynthesis.speaking && !processing && !pendingIntent) {
        setTimeout(() => {
          if (mode === 'always_on' && !manualStopRef.current) {
            startRecognitionInstance();
          }
        }, 1000); // 1s cool-down to prevent infinite fast loops
      }
    };

    rec.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const trans = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += trans;
        } else {
          interim += trans;
        }
      }

      const combined = (final + interim).trim();

      if (mode === 'always_on') {
        if (!capturingCommand) {
          // Listen for wake word
          const matchedWakeWord = WAKE_WORDS.find(word => 
            combined.toLowerCase().includes(word)
          );

          if (matchedWakeWord) {
            playAudioCue();
            setCapturingCommand(true);
            setLiveTranscript('');
            
            // Clear recognition buffers by resetting or restarting
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          }
        } else {
          // We are capturing the command utterance
          // Extract the part after the wake word
          let cmdPart = combined;
          for (const word of WAKE_WORDS) {
            const index = cmdPart.toLowerCase().indexOf(word);
            if (index !== -1) {
              cmdPart = cmdPart.substring(index + word.length);
              break;
            }
          }
          
          setLiveTranscript(cmdPart.trim());

          // Reset silence timer on every new speech fragment
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            setCapturingCommand(false);
            handleCommandComplete(cmdPart.trim());
          }, 2500); // 2.5 seconds of silence finishes the command
        }
      } else {
        // Push-to-talk mode
        setLiveTranscript(combined);
        
        if (final) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            stopAssistant();
            handleCommandComplete(final.trim());
          }, 1500); // 1.5 seconds after final speech finishes
        }
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const startAssistant = () => {
    manualStopRef.current = false;
    setError(null);
    setLiveTranscript('');
    setPendingIntent(null);
    
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    playAudioCue();
    
    if (mode === 'always_on') {
      setCapturingCommand(false);
    } else {
      setCapturingCommand(true); // Direct capturing in push to talk
    }

    startRecognitionInstance();
  };

  const stopAssistant = () => {
    manualStopRef.current = true;
    setListening(false);
    setCapturingCommand(false);
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, []);

  return (
    <VoiceAssistantContext.Provider
      value={{
        mode,
        setMode,
        listening,
        capturingCommand,
        liveTranscript,
        processing,
        speaking,
        error,
        isSupported,
        pendingIntent,
        startAssistant,
        stopAssistant,
        resolveDisambiguation,
        clearPendingIntent
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
}
