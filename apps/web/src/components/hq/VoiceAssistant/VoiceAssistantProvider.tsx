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
  getDischargesByDate,
  getFinancialSummary,
  getRemainingFee,
  searchPersonByName,
  getAttendanceSummary,
  getStudentsByCourse,
  getPendingTransactions,
  getStaffRanking,
  updateVoiceMemoryResult,
} from '@/lib/voice/voiceTools';
import { generateSpokenResponse } from '@/lib/voice/responseFormatter';
import { speak } from '@/lib/voice/speak';

interface VoiceAssistantContextType {
  mode: VoiceAssistantMode;
  setMode: (mode: VoiceAssistantMode) => void;
  listening: boolean;
  capturingCommand: boolean;
  liveTranscript: string;
  setLiveTranscript: (text: string) => void;
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
  spokenResponse: string | null;
  activeData: { topic: string; data: any } | null;
  closeAssistantCard: () => void;
  countdownDuration: number;
  countdownTimeLeft: number;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  submitManualCommand: (text: string) => void;
  activeMemoryDocId: string | null;
  lastSubmittedCommand: string;
  suggestedFollowUps: string[];
  inputLanguage: 'en' | 'ur';
  setInputLanguage: (lang: 'en' | 'ur') => void;
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
  const [spokenResponse, setSpokenResponse] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<{ topic: string; data: any } | null>(null);
  const [activeMemoryDocId, setActiveMemoryDocId] = useState<string | null>(null);
  const [lastSubmittedCommand, setLastSubmittedCommand] = useState('');
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);
  const [inputLanguage, setInputLanguageState] = useState<'en' | 'ur'>('en');

  const setInputLanguage = (lang: 'en' | 'ur') => {
    setInputLanguageState(lang);
    if (listening) {
      stopAssistant();
      setTimeout(() => startAssistant(), 200);
    }
  };

  const [countdownDuration, setCountdownDuration] = useState(0);
  const [countdownTimeLeft, setCountdownTimeLeft] = useState(0);
  const [isEditing, setIsEditingState] = useState(false);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const manualStopRef = useRef(false);

  const startSilenceTimer = (durationMs: number, onComplete: () => void) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setCountdownDuration(durationMs);
    setCountdownTimeLeft(durationMs);

    const startTime = Date.now();
    const endTime = startTime + durationMs;

    countdownIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setCountdownTimeLeft(remaining);
      if (remaining <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        onComplete();
      }
    }, 100);
  };

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setCountdownTimeLeft(0);
    setCountdownDuration(0);
  };

  const setIsEditing = (editing: boolean) => {
    setIsEditingState(editing);
    if (editing) {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    }
  };

  const submitManualCommand = (text: string) => {
    clearSilenceTimer();
    setIsEditingState(false);
    stopAssistant();
    handleCommandComplete(text);
  };

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
    setSpokenResponse(null);
    setActiveData(null);
    setSuggestedFollowUps([]);
    
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
      setActiveMemoryDocId(parsed.memoryDocId);
      setLastSubmittedCommand(commandText);
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
    const { tool, entityName, entityId, entityType, departmentCode, startDate, endDate, daysBack, course } = intent;

    // Show thinking state with LLM-generated message
    setVoiceState('thinking');
    setThinkingMessage(intent.thinkingMessage || 'Searching...');

    try {
      let data: any;
      let topic: string;

      switch (tool) {
        case 'getLatestAdmission': {
          data = await getLatestAdmission(departmentCode);
          topic = 'latest_admission';

          if (data && (
            intent.rawTranscript.toLowerCase().includes('open') ||
            intent.rawTranscript.toLowerCase().includes('profile') ||
            intent.rawTranscript.toLowerCase().includes('show') ||
            intent.rawTranscript.toLowerCase().includes('navigate') ||
            intent.rawTranscript.toLowerCase().includes('kholo')
          )) {
            let type = 'patient';
            if (data.department === 'spims') type = 'student';
            else if (data.department === 'welfare') type = 'child';
            else if (data.department === 'job-center') type = 'seeker';
            
            const profilePath = buildProfilePath(data.department, type, data.id);
            setThinkingMessage(null);
            speakUtterance(`Opening the profile of the latest admitted ${type === 'seeker' ? 'job seeker' : type === 'student' ? 'student' : type === 'child' ? 'child' : 'patient'}, ${data.name}.`);
            router.push(profilePath);
            return;
          }
          break;
        }

        case 'getMostRecentDischarge': {
          data = await getMostRecentDischarge(departmentCode);
          topic = 'most_recent_discharge';

          if (data && (
            intent.rawTranscript.toLowerCase().includes('open') ||
            intent.rawTranscript.toLowerCase().includes('profile') ||
            intent.rawTranscript.toLowerCase().includes('show') ||
            intent.rawTranscript.toLowerCase().includes('navigate') ||
            intent.rawTranscript.toLowerCase().includes('kholo')
          )) {
            let type = 'patient';
            if (data.department === 'spims') type = 'student';
            else if (data.department === 'welfare') type = 'child';
            else if (data.department === 'job-center') type = 'seeker';
            
            const profilePath = buildProfilePath(data.department, type, data.id);
            setThinkingMessage(null);
            speakUtterance(`Opening the profile of the last discharged ${type === 'seeker' ? 'job seeker' : type === 'student' ? 'student' : type === 'child' ? 'child' : 'patient'}, ${data.name}.`);
            router.push(profilePath);
            return;
          }
          break;
        }

        case 'getAdmissionsByDate': {
          data = await getAdmissionsByDate(departmentCode, startDate, endDate, daysBack);
          topic = 'admissions_by_date';
          break;
        }

        case 'getDischargesByDate': {
          data = await getDischargesByDate(departmentCode, startDate, endDate, daysBack);
          topic = 'discharges_by_date';
          break;
        }

        case 'getFinancialSummary': {
          data = await getFinancialSummary(departmentCode, startDate, endDate, daysBack);
          topic = 'financial_summary';
          break;
        }

        case 'getStaffRanking': {
          data = await getStaffRanking(departmentCode, startDate, endDate, daysBack);
          topic = 'staff_ranking';
          break;
        }

        case 'getRemainingFee': {
          if (!entityId && !entityName) {
            // General query for total remaining balance of a department / all
            data = await getRemainingFee(null, departmentCode);
            topic = 'remaining_fee';
            const res = await generateSpokenResponse(topic, data, undefined, intent.rawTranscript);
            setThinkingMessage(null);
            setActiveData({ topic, data });
            setSuggestedFollowUps(res.suggestedFollowUps);
            speakUtterance(res.spokenText);
            return;
          }
          if (!entityId) {
            // Need to search by name first
            const results = await searchPersonByName(entityName, null, entityType, departmentCode);
            if (results.length === 0) {
              setThinkingMessage(null);
              speakUtterance(`Sorry, no record found for ${entityName}.`);
              return;
            }
            if (results.length === 1) {
              data = await getRemainingFee(results[0].id, results[0].department);
              topic = 'remaining_fee';
              const res = await generateSpokenResponse(topic, data, results[0].name, intent.rawTranscript);
              setThinkingMessage(null);
              setActiveData({ topic, data: { ...data, name: results[0].name } });
              setSuggestedFollowUps(res.suggestedFollowUps);
              speakUtterance(res.spokenText);
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
            const names = results.slice(0, 3).map((r, i) => `${i + 1}. ${r.name}${r.fatherName ? `, son of ${r.fatherName}` : ''}`).join(', ');
            setThinkingMessage(null);
            speakUtterance(`Found ${results.length} matches. ${names}. Which one do you mean?`);
            return;
          }
          data = await getRemainingFee(entityId, departmentCode);
          topic = 'remaining_fee';
          break;
        }

        case 'searchPersonByName': {
          const results = await searchPersonByName(entityName, entityId, entityType, departmentCode);

          if (results.length === 0) {
            setThinkingMessage(null);
            speakUtterance(`Sorry, no record found for ${entityName || entityId}.`);
            return;
          }

          if (results.length === 1) {
            const match = results[0];
            const path = buildProfilePath(match.department, match.type, match.id);
            setThinkingMessage(null);
            speakUtterance(`Opening profile for ${match.name}.`);
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
            `${i + 1}. ${r.name}${r.fatherName ? `, son of ${r.fatherName}` : ''} - ${r.department}`
          ).join('. ');
          setThinkingMessage(null);
          speakUtterance(`Found ${results.length} matches: ${names}. Which one do you want to open?`);
          return;
        }

        case 'getAttendanceSummary': {
          data = await getAttendanceSummary(startDate, endDate, daysBack, departmentCode);
          topic = 'attendance_summary';
          break;
        }

        case 'getStudentsByCourse': {
          if (!course) {
            setThinkingMessage(null);
            speakUtterance('Please specify the course name.');
            return;
          }
          data = await getStudentsByCourse(course);
          topic = 'students_by_course';
          break;
        }

        case 'getPendingTransactions': {
          data = await getPendingTransactions(departmentCode);
          topic = 'pending_transactions';
          break;
        }

        case 'navigate': {
          if (!intent.routePath) {
            setThinkingMessage(null);
            speakUtterance("I could not resolve which page or dashboard you want to open. Please specify more clearly.");
            return;
          }
          setThinkingMessage(null);
          let routeName = intent.routePath;
          if (routeName.startsWith('/departments/')) {
            routeName = routeName.replace('/departments/', '');
          }
          if (routeName.startsWith('/hq/dashboard/')) {
            routeName = routeName.replace('/hq/dashboard/', '');
          }
          const cleanLabel = routeName.split('/').filter(Boolean).join(' ').replace(/-/g, ' ');
          speakUtterance(`Opening the ${cleanLabel} page.`);
          closeAssistantCard();
          router.push(intent.routePath);
          return;
        }

        default: {
          setThinkingMessage(null);
          speakUtterance("I did not understand that command. Please say it again or ask differently.");
          return;
        }
      }

      // Generate AI spoken response
      const res = await generateSpokenResponse(topic, data, entityName || undefined, intent.rawTranscript);
      setThinkingMessage(null);
      setActiveData({ topic, data });
      setSuggestedFollowUps(res.suggestedFollowUps);
      speakUtterance(res.spokenText);

      if (intent.memoryDocId) {
        updateVoiceMemoryResult(intent.memoryDocId, data).catch(err => 
          console.error('[VoiceAssistant] Failed to update voice memory:', err)
        );
      }

    } catch (err: any) {
      console.error('[Voice Dispatch] Error:', err);
      setThinkingMessage(null);

      if (intent.memoryDocId) {
        updateVoiceMemoryResult(intent.memoryDocId, { error: err?.message || 'Unknown error' }).catch(e => 
          console.error('[VoiceAssistant] Failed to update voice memory with error:', e)
        );
      }

      if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('rate limit')) {
        speakUtterance("I am a bit busy, please try again in 10 seconds.");
      } else {
        speakUtterance("Something went wrong. Please try again.");
      }
      setVoiceState('error');
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
    let entityType: EntityType = 'patient';
    if (match.collection.endsWith('_staff') || match.collection.endsWith('_users')) {
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
      startDate: null,
      endDate: null,
      daysBack: null,
      course: null,
      rawTranscript: '',
      llmConfidence: 1.0,
      thinkingMessage: 'Opening profile...',
      memoryDocId: null
    };
    
    await dispatchVoiceTool(resolvedIntent);
  };

  const clearPendingIntent = () => {
    setPendingIntent(null);
    speakUtterance("Cancelled.");
  };

  const closeAssistantCard = () => {
    setSpokenResponse(null);
    setActiveData(null);
    setSuggestedFollowUps([]);
    setActiveMemoryDocId(null);
    if (voiceState === 'speaking') {
      setVoiceState('idle');
    }
  };

  const speakUtterance = (text: string) => {
    setSpokenResponse(text);
    setVoiceState('speaking');
    setSpeaking(true);

    const hasUrduScript = /[\u0600-\u06FF]/.test(text);
    const synthLang = hasUrduScript ? 'ur-PK' : 'en-US';

    speak(text, synthLang);
    
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      let isEnded = false;
      const checkEnd = () => {
        if (isEnded) return;
        if (!window.speechSynthesis.speaking) {
          isEnded = true;
          setSpeaking(false);
          setVoiceState('idle');
          if ((mode === 'always_on' || pendingIntent) && !manualStopRef.current) {
            startRecognitionInstance();
          }
        } else {
          setTimeout(checkEnd, 200);
        }
      };
      setTimeout(checkEnd, 450);

      // Safety timeout: force-end after 8 seconds if stuck
      setTimeout(() => {
        if (!isEnded) {
          isEnded = true;
          setSpeaking(false);
          setVoiceState('idle');
          if ((mode === 'always_on' || pendingIntent) && !manualStopRef.current) {
            startRecognitionInstance();
          }
        }
      }, 8000);
    } else {
      setVoiceState('idle');
      setSpeaking(false);
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
    rec.lang = inputLanguage === 'ur' ? 'ur-PK' : 'en-US';
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

          startSilenceTimer(2500, () => {
            setCapturingCommand(false);
            handleCommandComplete(cmdPart.trim());
          });
        }
      } else {
        setLiveTranscript(combined);
        
        if (final) {
          startSilenceTimer(2500, () => {
            stopAssistant();
            handleCommandComplete(final.trim());
          });
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
    setSpokenResponse(null);
    setActiveData(null);
    
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
    
    clearSilenceTimer();
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  useEffect(() => {
    return () => {
      clearSilenceTimer();
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
        setLiveTranscript,
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
        thinkingMessage,
        spokenResponse,
        activeData,
        closeAssistantCard,
        countdownDuration,
        countdownTimeLeft,
        isEditing,
        setIsEditing,
        submitManualCommand,
        activeMemoryDocId,
        lastSubmittedCommand,
        suggestedFollowUps,
        inputLanguage,
        setInputLanguage
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
}
