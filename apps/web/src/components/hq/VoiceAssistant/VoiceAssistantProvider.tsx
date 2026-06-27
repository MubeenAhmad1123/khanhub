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
import { parseLlmIntent, ParsedVoiceIntent, EntityType } from '@/lib/voice/intentParser';
import type { EntityMatch } from '@/lib/voice/entityResolver';
import {
  getLatestAdmission,
  getMostRecentDischarge,
  getAdmissionsByDate,
  getFinancialSummary,
  getRemainingFee,
  searchPersonByName,
  getAttendanceSummary,
  getStudentsByCourse,
} from '@/lib/voice/voiceTools';
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
  voiceState: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
  thinkingMessage: string | null;
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
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'speaking' | 'error'>('idle');
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null);

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

  const getContextDepartment = (): string | null => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    if (path.includes('/departments/rehab')) return 'rehab';
    if (path.includes('/departments/spims')) return 'spims';
    if (path.includes('/departments/hospital')) return 'hospital';
    if (path.includes('/departments/sukoon')) return 'sukoon';
    if (path.includes('/departments/welfare')) return 'welfare';
    if (path.includes('/departments/job-center')) return 'job-center';
    return null;
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
          await resolveDisambiguation(match);
          return;
        }
      }

      const parsed = await parseLlmIntent(commandText);
      console.log('[VOICE INTENT RESULT]', JSON.stringify(parsed, null, 2));

      await dispatchVoiceTool(parsed);
    } catch (err: any) {
      console.error('[VoiceAssistant] Command execution failed:', err);
      setError('An error occurred performing the command.');
      speakUtterance("There was an error processing your query on the server.");
    } finally {
      setProcessing(false);
    }
  };

  const dispatchVoiceTool = async (intent: ParsedVoiceIntent) => {
    const { tool, entityName, entityId, entityType, departmentCode, targetDate, daysBack, course } = intent;

    // Show thinking state with LLM-generated message
    setVoiceState('thinking');
    setThinkingMessage(intent.thinkingMessage || 'Data dhundh raha hoon...');

    try {
      let data: any;
      let topic: string;

      switch (tool) {
        case 'getLatestAdmission': {
          data = await getLatestAdmission(departmentCode);
          topic = 'latest_admission';
          break;
        }

        case 'getMostRecentDischarge': {
          data = await getMostRecentDischarge(departmentCode);
          topic = 'most_recent_discharge';
          break;
        }

        case 'getAdmissionsByDate': {
          data = await getAdmissionsByDate(departmentCode, targetDate, daysBack);
          topic = 'admissions_by_date';
          break;
        }

        case 'getFinancialSummary': {
          data = await getFinancialSummary(departmentCode, targetDate, daysBack);
          topic = 'financial_summary';
          break;
        }

        case 'getRemainingFee': {
          if (!entityId) {
            // Need to search by name first
            const results = await searchPersonByName(entityName, null, entityType, departmentCode);
            if (results.length === 0) {
              setVoiceState('speaking');
              speak(`Maafi chahta hoon, ${entityName} naam ka koi record nahi mila.`);
              setThinkingMessage(null);
              return;
            }
            if (results.length === 1) {
              data = await getRemainingFee(results[0].id, results[0].department);
              topic = 'remaining_fee';
              const spokenText = await generateSpokenResponse(topic, data, results[0].name);
              setVoiceState('speaking');
              setThinkingMessage(null);
              speak(spokenText);
              return;
            }
            // Multiple matches — disambiguate
            const entityMatches: EntityMatch[] = results.map(r => {
              let collection = 'rehab_patients';
              if (r.type === 'staff') {
                collection = `${r.department}_staff`;
              } else if (r.type === 'student') {
                collection = 'spims_students';
              } else if (r.type === 'child') {
                collection = 'welfare_children';
              } else if (r.type === 'seeker') {
                collection = 'job_center_seekers';
              } else if (r.department === 'sukoon') {
                collection = 'sukoon_patients';
              } else if (r.department === 'hospital') {
                collection = 'hospital_patients';
              }
              
              return {
                id: r.id,
                name: r.name,
                fatherName: r.fatherName || 'N/A',
                department: r.department,
                collection,
                identifierLabel: r.id
              };
            });
            setPendingIntent({ intent, matches: entityMatches });
            const names = results.slice(0, 3).map((r, i) => `${i + 1}. ${r.name}${r.fatherName ? `, walid ${r.fatherName}` : ''}`).join(', ');
            setVoiceState('speaking');
            speak(`${results.length} log mile hain. ${names}. Kaunsa wala?`);
            setThinkingMessage(null);
            return;
          }
          data = await getRemainingFee(entityId, departmentCode);
          topic = 'remaining_fee';
          break;
        }

        case 'searchPersonByName': {
          const results = await searchPersonByName(entityName, entityId, entityType, departmentCode);

          if (results.length === 0) {
            setVoiceState('speaking');
            speak(`Maafi chahta hoon, ${entityName || entityId} naam ka koi record nahi mila.`);
            setThinkingMessage(null);
            return;
          }

          if (results.length === 1) {
            const match = results[0];
            const path = buildProfilePath(match.department, match.type, match.id);
            setVoiceState('speaking');
            speak(`${match.name} ka profile khol raha hoon.`);
            setThinkingMessage(null);
            router.push(path);
            return;
          }

          // Multiple matches
          const entityMatches: EntityMatch[] = results.map(r => {
            let collection = 'rehab_patients';
            if (r.type === 'staff') {
              collection = `${r.department}_staff`;
            } else if (r.type === 'student') {
              collection = 'spims_students';
            } else if (r.type === 'child') {
              collection = 'welfare_children';
            } else if (r.type === 'seeker') {
              collection = 'job_center_seekers';
            } else if (r.department === 'sukoon') {
              collection = 'sukoon_patients';
            } else if (r.department === 'hospital') {
              collection = 'hospital_patients';
            }
            
            return {
              id: r.id,
              name: r.name,
              fatherName: r.fatherName || 'N/A',
              department: r.department,
              collection,
              identifierLabel: r.id
            };
          });
          setPendingIntent({ intent, matches: entityMatches });
          const names = results.slice(0, 3).map((r, i) =>
            `${i + 1}. ${r.name}${r.fatherName ? `, walid ${r.fatherName}` : ''} — ${r.department}`
          ).join('. ');
          setVoiceState('speaking');
          speak(`${results.length} log mile hain. ${names}. Kaunsa wala chahiye?`);
          setThinkingMessage(null);
          return;
        }

        case 'getAttendanceSummary': {
          data = await getAttendanceSummary(targetDate, daysBack);
          topic = 'attendance_summary';
          break;
        }

        case 'getStudentsByCourse': {
          if (!course) {
            setVoiceState('speaking');
            speak('Kripya course ka naam bataiye.');
            setThinkingMessage(null);
            return;
          }
          data = await getStudentsByCourse(course);
          topic = 'students_by_course';
          break;
        }

        default: {
          setVoiceState('speaking');
          speak('Yeh command samajh nahi aaya. Dobara boliye ya alag tarike se puchiye.');
          setThinkingMessage(null);
          return;
        }
      }

      // Generate AI spoken response
      const spokenText = await generateSpokenResponse(topic, data, entityName || undefined);
      setVoiceState('speaking');
      setThinkingMessage(null);
      speak(spokenText);

    } catch (err: any) {
      console.error('[Voice Dispatch] Error:', err);
      if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('rate limit')) {
        speak('Thoda busy hoon, 10 second baad dobara boliye.');
      } else {
        speak('Kuch masla aa gaya. Dobara koshish karein.');
      }
      setVoiceState('error');
      setThinkingMessage(null);
    } finally {
      setTimeout(() => setVoiceState('idle'), 3000);
    }
  };

  function buildProfilePath(department: string, entityType: string, id: string): string {
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

  const resolveDisambiguation = async (match: EntityMatch) => {
    if (!pendingIntent) return;
    setPendingIntent(null);
    
    let entityType: EntityType = 'patient';
    if (match.collection.endsWith('_users') || match.collection.endsWith('_staff')) {
      entityType = 'staff';
    } else if (match.collection === 'spims_students') {
      entityType = 'student';
    } else if (match.collection === 'welfare_children') {
      entityType = 'child';
    } else if (match.collection === 'job_center_seekers') {
      entityType = 'seeker';
    }

    const resolvedIntent: ParsedVoiceIntent = {
      tool: 'navigate',
      entityName: match.name,
      entityId: match.id,
      entityType,
      departmentCode: match.department as any,
      targetDate: null,
      daysBack: null,
      course: null,
      rawTranscript: '',
      llmConfidence: 1.0,
      thinkingMessage: 'Profile khol raha hoon...'
    };
    
    await dispatchVoiceTool(resolvedIntent);
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
        clearPendingIntent,
        voiceState,
        thinkingMessage
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
}
