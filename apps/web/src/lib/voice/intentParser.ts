'use server';
import { getGroqClient, GROQ_MODEL } from './groqClient';
import { WAKE_WORDS } from './voiceConfig';

export type VoiceIntentType = 'navigate' | 'query' | 'unknown';
export type VoiceQueryTopic = 
  | 'remaining_fee' 
  | 'attendance' 
  | 'earnings_today'
  | 'earnings_date'      // NEW: specific date earnings
  | 'patient_count'      // NEW: how many patients/students on a date
  | 'total_paid' 
  | 'status' 
  | 'remaining_fee_today'
  | 'unknown';

export type EntityType = 'patient' | 'student' | 'staff' | 'child' | 'seeker' | null;

export interface ParsedVoiceIntent {
  type: VoiceIntentType;
  queryTopic?: VoiceQueryTopic;
  entityName: string | null;
  entityId: string | null;
  entityType: EntityType;        // NEW: what TYPE of person
  departmentCode: string | null;
  targetDate: string | null;     // NEW: ISO date string e.g. "2026-06-25"
  daysBack: number | null;       // NEW: e.g. 5 for "5 din pehle"
  rawTranscript: string;
  llmConfidence: number;
}

const SYSTEM_PROMPT = `You are an intent parser for a Pakistani hospital/college ERP 
voice assistant called "Mubi". Users speak in Hinglish (mixed Urdu-English).

Your job: parse the transcript and return ONLY a valid JSON object. No explanation. 
No markdown. No extra text. Only the raw JSON.

JSON structure:
{
  "type": "navigate" | "query" | "unknown",
  "queryTopic": "remaining_fee" | "attendance" | "earnings_today" | "earnings_date" | "patient_count" | "total_paid" | "status" | "remaining_fee_today" | null,
  "entityName": string | null,
  "entityId": string | null,
  "entityType": "patient" | "student" | "staff" | "child" | "seeker" | null,
  "departmentCode": "rehab" | "spims" | "hospital" | "welfare" | "job-center" | null,
  "targetDate": "YYYY-MM-DD" | null,
  "daysBack": number | null,
  "llmConfidence": 0.0-1.0
}

Rules:
- navigate: user wants to OPEN a profile/page (open, kholo, dikhao, show, go to)
- query: user wants to HEAR information (remaining, kitna, earnings, income, attendance, count)
- entityType: extract from context words — "staff Moeeen" → staff, "patient Ahmed" → patient, "student Sana" → student
- entityId: convert word-numbers to digits. "ninety nine" → "99", "twelve" → "12"
- targetDate: if user says a specific date like "25 June" → "2026-06-25" (assume current year 2026)
- daysBack: if user says "5 din pehle" or "5 days ago" → 5
- departmentCode: rehab/spims/hospital/welfare/job-center if mentioned
- llmConfidence: your confidence 0.0-1.0 in this parse

Examples:
"open profile of staff Moeeen" → { "type":"navigate", "entityName":"Moeeen", "entityType":"staff", "queryTopic":null, "entityId":null, "departmentCode":null, "targetDate":null, "daysBack":null, "llmConfidence":1.0 }
"patient ID ninety nine ka profile kholo" → { "type":"navigate", "entityName":null, "entityType":"patient", "queryTopic":null, "entityId":"99", "departmentCode":null, "targetDate":null, "daysBack":null, "llmConfidence":1.0 }
"Ahmed ka remaining batao" → { "type":"query", "queryTopic":"remaining_fee", "entityName":"Ahmed", "entityType":null, "entityId":null, "departmentCode":null, "targetDate":null, "daysBack":null, "llmConfidence":1.0 }
"25 June ko hospital mein kitna income hua" → { "type":"query", "queryTopic":"earnings_date", "entityName":null, "entityType":null, "entityId":null, "departmentCode":"hospital", "targetDate":"2026-06-25", "daysBack":null, "llmConfidence":1.0 }
"5 din pehle rehab mein kitne naye patient aaye" → { "type":"query", "queryTopic":"patient_count", "entityName":null, "entityType":"patient", "entityId":null, "departmentCode":"rehab", "targetDate":null, "daysBack":5, "llmConfidence":1.0 }
"aaj ka overall remaining" → { "type":"query", "queryTopic":"remaining_fee_today", "entityName":null, "entityType":null, "entityId":null, "departmentCode":null, "targetDate":null, "daysBack":null, "llmConfidence":1.0 }
"aaj hospital ne kitna kamaya" → { "type":"query", "queryTopic":"earnings_today", "entityName":null, "entityType":null, "entityId":null, "departmentCode":"hospital", "targetDate":null, "daysBack":null, "llmConfidence":1.0 }`;

export async function parseLlmIntent(transcript: string): Promise<ParsedVoiceIntent> {
  try {
    const groq = getGroqClient();
    
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript }
      ],
      temperature: 0.1,      // Low temp = more consistent JSON
      max_tokens: 300,
      response_format: { type: 'json_object' }  // Forces JSON output
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    return {
      type: parsed.type || 'unknown',
      queryTopic: parsed.queryTopic || undefined,
      entityName: parsed.entityName || null,
      entityId: parsed.entityId || null,
      entityType: parsed.entityType || null,
      departmentCode: parsed.departmentCode || null,
      targetDate: parsed.targetDate || null,
      daysBack: parsed.daysBack || null,
      rawTranscript: transcript,
      llmConfidence: parsed.llmConfidence || 0.5,
    };
  } catch (err) {
    console.error('[LLM Intent Parser] Groq error, falling back to regex parser:', err);
    try {
      return parseRegexVoiceIntent(transcript);
    } catch (fallbackErr) {
      console.error('[LLM Intent Parser] Fallback regex parser also failed:', fallbackErr);
      return {
        type: 'unknown',
        queryTopic: 'unknown',
        entityName: null,
        entityId: null,
        entityType: null,
        departmentCode: null,
        targetDate: null,
        daysBack: null,
        rawTranscript: transcript,
        llmConfidence: 0,
      };
    }
  }
}

// ==========================================
// REGEX FALLBACK PARSER & HELPER FUNCTIONS
// ==========================================

interface VoicePhrasePattern {
  pattern: RegExp;
  type: VoiceIntentType;
  topic?: VoiceQueryTopic;
}

const VOICE_PHRASE_PATTERNS: VoicePhrasePattern[] = [
  { pattern: /(?:open|show|go to|view)\s+(?:the\s+)?(?:profile|record)\s+(?:of\s+)?([a-zA-Z0-9\s]+)/i, type: 'navigate' },
  { pattern: /show\s+([a-zA-Z0-9\s]+)'s?\s+(?:profile|record)/i, type: 'navigate' },
  { pattern: /([a-zA-Z0-9\s]+)\s+(?:ka|ki|ko)\s+(?:profile|record)\s+(?:kholo|dikhao|open\s*karo|show\s*karo)/i, type: 'navigate' },
  { pattern: /(?:what is|tell me|check)\s+(?:the\s+)?(?:remaining|balance|outstanding|baki|fee|fees)\s+(?:of\s+)?([a-zA-Z0-9\s]+)/i, type: 'query', topic: 'remaining_fee' },
  { pattern: /check\s+([a-zA-Z0-9\s]+)'s?\s+(?:remaining|balance|outstanding|fee|fees)/i, type: 'query', topic: 'remaining_fee' },
  { pattern: /([a-zA-Z0-9\s]+)\s+(?:ka|ki|ko)\s+(?:remaining|balance|baki|outstanding|fee|fees)\s*(?:batao|check|kitna|show|bataein|kya|hai)*/i, type: 'query', topic: 'remaining_fee' },
  { pattern: /(?:what is|tell me|check)\s+(?:the\s+)?(?:attendance|presence|hazri)\s+(?:of\s+)?([a-zA-Z0-9\s]+)/i, type: 'query', topic: 'attendance' },
  { pattern: /check\s+([a-zA-Z0-9\s]+)'s?\s+(?:attendance|presence|hazri)/i, type: 'query', topic: 'attendance' },
  { pattern: /([a-zA-Z0-9\s]+)\s+(?:ki|ka|ko)\s+(?:attendance|hazri|presence)\s*(?:batao|check|kaisi|kya|show|bataein|hai)*/i, type: 'query', topic: 'attendance' },
  { pattern: /is\s+([a-zA-Z0-9\s]+)\s+(?:present|absent|leave)/i, type: 'query', topic: 'attendance' },
  { pattern: /([a-zA-Z0-9\s]+)\s+(?:present|absent)\s+hai/i, type: 'query', topic: 'attendance' },
  { pattern: /(?:what is|tell me|check|how much has)\s+([a-zA-Z0-9\s]+)\s+(?:paid|total paid)/i, type: 'query', topic: 'total_paid' },
  { pattern: /(?:what is|tell me|check)\s+(?:the\s+)?(?:total paid|paid amount|paid|jama)\s+(?:of\s+)?([a-zA-Z0-9\s]+)/i, type: 'query', topic: 'total_paid' },
  { pattern: /([a-zA-Z0-9\s]+)\s+(?:ka|ki|ko|ne)\s+(?:total paid|paid|jama)\s*(?:batao|check|kitna|show|bataein|kya|kiya|hai)*/i, type: 'query', topic: 'total_paid' },
  { pattern: /(?:what is|tell me|check)\s+(?:the\s+)?(?:status|progress|report)\s+(?:of\s+)?([a-zA-Z0-9\s]+)/i, type: 'query', topic: 'status' },
  { pattern: /check\s+([a-zA-Z0-9\s]+)'s?\s+(?:status|progress|report)/i, type: 'query', topic: 'status' },
  { pattern: /([a-zA-Z0-9\s]+)\s+(?:ka|ki|ko)\s+(?:status|progress|report|kaisa|kaisi)\s*(?:batao|check|kya|show|bataein|hai|kaisa hai|kaisi hai)*/i, type: 'query', topic: 'status' },
];

const STOP_WORDS = new Set([
  'ka', 'ki', 'ko', 'ne', 'ke', 'of', 'the', 'a', 'an', 'is', 'was', 'are', 'today', 'aj', 'aaj', 'batao', 'bataein', 'check', 'show', 'dikhao', 'kholo', 'open', 'me', 'my',
  'patient', 'student', 'seeker', 'child', 'client', 'staff', 'employee', 'teacher', 'doctor', 'nurse', 'worker', 'id', 'no', 'number', 'roll', 'in', 'at', 'from',
  'rehab', 'rehabilitation', 'spims', 'academy', 'hospital', 'sukoon', 'welfare', 'foundation', 'job-center', 'job', 'jobs', 'hq', 'headquarters', 'it', 'technology',
  'media', 'social-media', 'department', 'dept'
]);

const DEPT_KEYWORDS: Record<string, string[]> = {
  'rehab': ['rehab', 'rehabilitation', 'rehab center'],
  'spims': ['spims', 'academy', 'spims academy'],
  'hospital': ['hospital', 'khan hospital', 'ilaj'],
  'sukoon': ['sukoon', 'sukoon center'],
  'welfare': ['welfare', 'foundation', 'welfare foundation'],
  'job-center': ['job center', 'job-center', 'jobs'],
  'hq': ['hq', 'headquarters', 'central'],
  'it': ['it', 'it department', 'information technology'],
  'social-media': ['social media', 'media', 'facebook', 'instagram', 'youtube'],
};

function wordsToNumbers(text: string): string {
  const units: Record<string, number> = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19
  };
  const tens: Record<string, number> = {
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90
  };
  const scales: Record<string, number> = {
    'hundred': 100, 'thousand': 1000
  };

  const tokens = text.toLowerCase().split(/[\s-]+/);
  const result: string[] = [];
  let currentNum = 0;
  let parsedAny = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (units[token] !== undefined) {
      currentNum += units[token];
      parsedAny = true;
    } else if (tens[token] !== undefined) {
      currentNum += tens[token];
      parsedAny = true;
    } else if (scales[token] !== undefined) {
      const scale = scales[token];
      if (currentNum === 0) currentNum = 1;
      currentNum *= scale;
      parsedAny = true;
    } else {
      if (parsedAny) {
        result.push(String(currentNum));
        currentNum = 0;
        parsedAny = false;
      }
      result.push(token);
    }
  }

  if (parsedAny) {
    result.push(String(currentNum));
  }

  return result.join(' ');
}

function cleanEntityName(name: string): string {
  return name
    .split(/\s+/)
    .filter(token => !STOP_WORDS.has(token.toLowerCase()))
    .join(' ')
    .trim();
}

function parseRegexVoiceIntent(transcript: string): ParsedVoiceIntent {
  if (!transcript) {
    return {
      type: 'unknown',
      entityName: null,
      entityId: null,
      entityType: null,
      departmentCode: null,
      targetDate: null,
      daysBack: null,
      rawTranscript: '',
      llmConfidence: 0
    };
  }

  let cleaned = wordsToNumbers(transcript.trim());

  for (const wakeWord of WAKE_WORDS) {
    const regex = new RegExp(`^(?:hey\\s+)?${wakeWord}\\b[\\s,.]*`, 'i');
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '');
      break;
    }
  }

  for (const wakeWord of WAKE_WORDS) {
    const regex = new RegExp(`\\b(?:hey\\s+)?${wakeWord}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  const lowercase = cleaned.toLowerCase();

  let departmentCode: string | null = null;
  for (const [code, keywords] of Object.entries(DEPT_KEYWORDS)) {
    if (keywords.some(kw => lowercase.includes(kw))) {
      departmentCode = code;
      break;
    }
  }

  let entityType: EntityType = null;
  if (lowercase.includes('patient')) entityType = 'patient';
  else if (lowercase.includes('student')) entityType = 'student';
  else if (lowercase.includes('seeker')) entityType = 'seeker';
  else if (lowercase.includes('child')) entityType = 'child';
  else if (lowercase.includes('client')) entityType = 'patient'; // Map client to patient
  else if (
    lowercase.includes('staff') ||
    lowercase.includes('employee') ||
    lowercase.includes('teacher') ||
    lowercase.includes('doctor') ||
    lowercase.includes('nurse') ||
    lowercase.includes('worker')
  ) {
    entityType = 'staff';
  }

  const isRemainingToday = lowercase.includes("today's remaining") || 
                           lowercase.includes("remaining today") || 
                           lowercase.includes("total remaining") || 
                           lowercase.includes("total outstanding") || 
                           (lowercase.includes("remaining") && lowercase.includes("total")) ||
                           (lowercase.includes("baki") && lowercase.includes("total"));
                           
  if (isRemainingToday) {
    return {
      type: 'query',
      queryTopic: 'remaining_fee_today',
      entityName: null,
      entityId: null,
      entityType,
      departmentCode,
      targetDate: null,
      daysBack: null,
      rawTranscript: transcript,
      llmConfidence: 0.5
    };
  }

  const isEarningsToday = lowercase.includes("earn") || 
                          lowercase.includes("earnings") || 
                          lowercase.includes("income") || 
                          lowercase.includes("collection") || 
                          lowercase.includes("jama kiya") || 
                          lowercase.includes("kamaya");
                          
  if (isEarningsToday && (lowercase.includes("today") || lowercase.includes("overall") || lowercase.includes("aaj") || lowercase.includes("daily") || departmentCode)) {
    return {
      type: 'query',
      queryTopic: 'earnings_today',
      entityName: null,
      entityId: null,
      entityType,
      departmentCode,
      targetDate: null,
      daysBack: null,
      rawTranscript: transcript,
      llmConfidence: 0.5
    };
  }

  for (const item of VOICE_PHRASE_PATTERNS) {
    const match = item.pattern.exec(cleaned);
    if (match && match[1]) {
      const extractedName = cleanEntityName(match[1]);
      if (extractedName) {
        return {
          type: item.type,
          queryTopic: item.topic || 'unknown',
          entityName: extractedName,
          entityId: null,
          entityType,
          departmentCode,
          targetDate: null,
          daysBack: null,
          rawTranscript: transcript,
          llmConfidence: 0.5
        };
      }
    }
  }

  let intentType: VoiceIntentType = 'unknown';
  let queryTopic: VoiceQueryTopic = 'unknown';

  if (lowercase.includes('open') || lowercase.includes('profile') || lowercase.includes('record') || lowercase.includes('kholo') || lowercase.includes('dikhao')) {
    intentType = 'navigate';
  } else if (lowercase.includes('attendance') || lowercase.includes('hazri') || lowercase.includes('present') || lowercase.includes('absent')) {
    intentType = 'query';
    queryTopic = 'attendance';
  } else if (lowercase.includes('remaining') || lowercase.includes('balance') || lowercase.includes('outstanding') || lowercase.includes('baki')) {
    intentType = 'query';
    queryTopic = 'remaining_fee';
  } else if (lowercase.includes('paid') || lowercase.includes('jama') || lowercase.includes('payment')) {
    intentType = 'query';
    queryTopic = 'total_paid';
  } else if (lowercase.includes('status') || lowercase.includes('progress') || lowercase.includes('report') || lowercase.includes('kaisa')) {
    intentType = 'query';
    queryTopic = 'status';
  }

  let extractedName: string | null = null;
  const delimiters = [' ka ', ' ki ', ' ko ', ' ne ', ' of ', ' to ', ' for '];
  
  for (const delim of delimiters) {
    if (cleaned.toLowerCase().includes(delim)) {
      const parts = cleaned.split(new RegExp(delim, 'i'));
      if (parts[0] && parts[0].trim().length > 1) {
        extractedName = cleanEntityName(parts[0]);
        break;
      } else if (parts[1] && parts[1].trim().length > 1) {
        extractedName = cleanEntityName(parts[1]);
        break;
      }
    }
  }

  if (!extractedName && cleaned.length > 0) {
    const tokens = cleaned.split(/\s+/).filter(t => !STOP_WORDS.has(t.toLowerCase()));
    const capitalized = tokens.filter(t => /^[A-Z]/.test(t));
    if (capitalized.length > 0) {
      extractedName = capitalized.join(' ');
    } else if (tokens.length > 0) {
      extractedName = tokens.slice(0, 2).join(' ');
    }
  }

  return {
    type: intentType,
    queryTopic,
    entityName: intentType !== 'unknown' && extractedName ? cleanEntityName(extractedName) : null,
    entityId: null,
    entityType,
    departmentCode,
    targetDate: null,
    daysBack: null,
    rawTranscript: transcript,
    llmConfidence: 0.5
  };
}
