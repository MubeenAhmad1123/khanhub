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
import { parseLlmIntent, ParsedVoiceIntent } from '@/lib/voice/intentParser';
import { resolveEntityByName, EntityMatch } from '@/lib/voice/entityResolver';
import { 
  getRemainingFeeForEntity, 
  getAttendanceStatusForEntity, 
  getTotalPaidForEntity, 
  getStatusForEntity,
  getTodayRemainingOverall,
  getTodayEarnings,
  getEarningsByDate,
  getPatientCountByDate
} from '@/lib/voice/voiceQueryActions';
import { generateSpokenResponse } from '@/lib/voice/responseFormatter';
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
  const manualStopRef = useRef(false);

  const getScopedDepartments = (): string[] => {
    if (typeof window === 'undefined') return [];
    const depts = ['rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'];
    return depts.filter(d => {
      try { return !!localStorage.getItem(`${d}_session`); } catch { return false; }
    });
  };

  const setMode = (newMode: VoiceAssistantMode) => {
    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
    if (listening) {
      stopAssistant();
      setTimeout(() => startAssistant(), 200);
    }
  };

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
    
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    try {
      // Check for voice selection or cancellation if there is a pending disambiguation intent
      if (pendingIntent) {
        const text = commandText.toLowerCase().trim();
        
        if (text === 'cancel' || text === 'no' || text.includes('cancel') || text === 'back') {
          clearPendingIntent();
          return;
        }

        let selectedIdx = -1;
        if (text.includes('two') || text.includes('2') || text.includes('second') || text.includes('number two') || text.includes('number 2')) {
          selectedIdx = 1;
        } else if (text.includes('three') || text.includes('3') || text.includes('third') || text.includes('number three') || text.includes('number 3')) {
          selectedIdx = 2;
        } else if (text.includes('four') || text.includes('4') || text.includes('fourth') || text.includes('number four') || text.includes('number 4')) {
          selectedIdx = 3;
        } else if (text.includes('five') || text.includes('5') || text.includes('fifth') || text.includes('number five') || text.includes('number 5')) {
          selectedIdx = 4;
        } else if (text.includes('one') || text.includes('1') || text.includes('first') || text.includes('number one') || text.includes('number 1')) {
          selectedIdx = 0;
        }

        if (selectedIdx >= 0 && selectedIdx < pendingIntent.matches.length) {
          const match = pendingIntent.matches[selectedIdx];
          setPendingIntent(null);
          await executeResolvedIntent(pendingIntent.intent, match);
          return;
        }
      }

      const parsed = await parseLlmIntent(commandText);

      // Bypasses entity resolution for dashboard queries
      if (parsed.queryTopic === 'remaining_fee_today' || 
          parsed.queryTopic === 'earnings_today' || 
          parsed.queryTopic === 'earnings_date' || 
          parsed.queryTopic === 'patient_count') {
        await executeDashboardQuery(parsed);
        return;
      }

      if (parsed.type === 'unknown' || (!parsed.entityName && !parsed.entityId)) {
        speakUtterance("I didn't understand that. Please say it again.");
        return;
      }

      const scopedDepts = getScopedDepartments();
      const depts = parsed.departmentCode ? [parsed.departmentCode] : scopedDepts;
      const { matches } = await resolveEntityByName(
        parsed.entityName,
        parsed.entityId,
        parsed.entityType,
        depts
      );

      if (matches.length === 0) {
        speakUtterance(`I couldn't find any record for "${parsed.entityName || parsed.entityId}".`);
        return;
      }

      if (matches.length === 1) {
        await executeResolvedIntent(parsed, matches[0]);
      } else {
        setPendingIntent({ intent: parsed, matches });
        const nameListPrompt = matches
          .map((m, idx) => {
            const isStaff = m.collection.endsWith('_users') || m.collection.endsWith('_staff');
            if (isStaff) {
              return `number ${idx + 1}, ${m.name}, ${m.designation || 'Staff'} in ${m.department} department`;
            }
            if (m.fatherName && m.fatherName !== 'N/A') {
              return `number ${idx + 1}, ${m.name} whose father is ${m.fatherName}`;
            }
            return `number ${idx + 1}, ${m.name} in ${m.department} department`;
          })
          .join(', and ');
        speakUtterance(
          `I found ${matches.length} matches for ${parsed.entityName || parsed.entityId}. ${nameListPrompt}. Which one do you mean? Or you can tap the card on the screen.`
        );
      }
    } catch (err: any) {
      console.error('[VoiceAssistant] Command execution failed:', err);
      setError('An error occurred performing the command.');
      speakUtterance("There was an error processing your query on the server.");
    } finally {
      setProcessing(false);
    }
  };

  const executeDashboardQuery = async (intent: ParsedVoiceIntent) => {
    try {
      let answer = '';
      if (intent.queryTopic === 'remaining_fee_today') {
        const res = await getTodayRemainingOverall();
        answer = await generateSpokenResponse('remaining_fee_today', res);
      } else if (intent.queryTopic === 'earnings_today') {
        const res = await getTodayEarnings(intent.departmentCode || undefined);
        answer = await generateSpokenResponse('earnings_today', { ...res, departmentCode: intent.departmentCode });
      } else if (intent.queryTopic === 'earnings_date') {
        const res = await getEarningsByDate(intent.departmentCode, intent.targetDate, intent.daysBack);
        answer = await generateSpokenResponse('earnings_date', { ...res, departmentCode: intent.departmentCode });
      } else if (intent.queryTopic === 'patient_count') {
        const res = await getPatientCountByDate(intent.departmentCode, intent.targetDate, intent.daysBack);
        answer = await generateSpokenResponse('patient_count', res);
      } else {
        answer = "I couldn't understand the topic.";
      }
      
      speakUtterance(answer);
    } catch (err) {
      console.error('[VoiceAssistant] Dashboard query failed:', err);
      speakUtterance("There was an error checking the financial details.");
    }
  };

  const executeResolvedIntent = async (intent: ParsedVoiceIntent, match: EntityMatch) => {
    if (intent.type === 'navigate') {
      let path = '';
      const isStaff = match.collection.endsWith('_users') || match.collection.endsWith('_staff');
      if (isStaff) {
        path = `/hq/dashboard/manager/staff/${match.department}_${match.id}`;
      } else {
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
      }
      
      router.push(path);
      speakUtterance(`Sure, opening the record for ${match.name}.`);
    } else if (intent.type === 'query') {
      try {
        let answer = '';
        if (intent.queryTopic === 'remaining_fee') {
          const res = await getRemainingFeeForEntity(match.id, match.collection);
          answer = await generateSpokenResponse('remaining_fee', res, match.name);
        } else if (intent.queryTopic === 'attendance') {
          const res = await getAttendanceStatusForEntity(match.id, match.collection);
          answer = await generateSpokenResponse('attendance', res, match.name);
        } else if (intent.queryTopic === 'total_paid') {
          const res = await getTotalPaidForEntity(match.id, match.collection);
          answer = await generateSpokenResponse('total_paid', res, match.name);
        } else if (intent.queryTopic === 'status') {
          const res = await getStatusForEntity(match.id, match.collection);
          answer = await generateSpokenResponse('status', res, match.name);
        } else {
          answer = "I couldn't understand the topic.";
        }
        
        speakUtterance(answer);
      } catch (err) {
        console.error('[VoiceAssistant] Query detail fetch failed:', err);
        speakUtterance("There was an error checking their record.");
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
    speakUtterance("Cancelled.");
  };

  const speakUtterance = (text: string) => {
    setSpeaking(true);
    speak(text);
    
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const checkEnd = () => {
        if (!window.speechSynthesis.speaking) {
          setSpeaking(false);
          if ((mode === 'always_on' || pendingIntent) && !manualStopRef.current) {
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
    rec.lang = 'en-US';
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
      const shouldRestart = (mode === 'always_on' || pendingIntent) && !manualStopRef.current && !window.speechSynthesis.speaking && !processing;
      if (shouldRestart) {
        setTimeout(() => {
          if ((mode === 'always_on' || pendingIntent) && !manualStopRef.current) {
            startRecognitionInstance();
          }
        }, 1000);
      }
    };
    rec.onresult = (event: any) => {
      // Confidence check removed — Web Speech API returns unreliable
      // confidence values in continuous/always-on mode (often 0.0 even
      // when transcript is perfectly correct). LLM handles bad input instead.
      
      // const lastResultIndex = event.results.length - 1;
      // const lastResult = event.results[lastResultIndex];
      // if (lastResult && lastResult.isFinal) {
      //   const speechConfidence = lastResult[0].confidence;
      //   if (speechConfidence < 0.45) {
      //     speakUtterance('Sahi se nahi suna, dobara boliye');
      //     if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      //     if (mode === 'push_to_talk') {
      //       stopAssistant();
      //     } else {
      //       setCapturingCommand(false);
      //       setLiveTranscript('');
      //     }
      //     return;
      //   }
      // }

      let interim = '';
      let final = '';

      for (let i = 0; i < event.results.length; ++i) {
        const trans = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += trans;
        } else {
          interim += trans;
        }
      }

      const combined = (final + interim).trim();

      if (mode === 'always_on') {
        let isActivelyCapturing = capturingCommand;

        if (!isActivelyCapturing) {
          const matchedWakeWord = WAKE_WORDS.find(word => 
            combined.toLowerCase().includes(word)
          );

          if (matchedWakeWord) {
            playAudioCue();
            setCapturingCommand(true);
            isActivelyCapturing = true;
          }
        }

        if (isActivelyCapturing) {
          let cmdPart = combined;
          for (const word of WAKE_WORDS) {
            const index = cmdPart.toLowerCase().indexOf(word);
            if (index !== -1) {
              cmdPart = cmdPart.substring(index + word.length);
              break;
            }
          }
          
          setLiveTranscript(cmdPart.trim());

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            setCapturingCommand(false);
            handleCommandComplete(cmdPart.trim());
          }, 2500);
        }
      } else {
        setLiveTranscript(combined);
        
        if (final) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            stopAssistant();
            handleCommandComplete(final.trim());
          }, 1500);
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
      setCapturingCommand(true);
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
