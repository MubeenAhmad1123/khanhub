// apps/web/src/lib/voice/intentParser.ts

import { WAKE_WORDS } from './voiceConfig';

export type VoiceIntentType = 'navigate' | 'query' | 'unknown';
export type VoiceQueryTopic = 
  | 'remaining_fee' 
  | 'attendance' 
  | 'total_paid' 
  | 'status' 
  | 'remaining_fee_today' 
  | 'earnings_today' 
  | 'unknown';

export interface ParsedVoiceIntent {
  type: VoiceIntentType;
  queryTopic?: VoiceQueryTopic;
  entityName: string | null;   // extracted name or ID, e.g. "Ahmed" or "99"
  rawTranscript: string;
  departmentCode?: string;     // department code (if query is about a department)
  entityType?: 'patient' | 'student' | 'seeker' | 'child' | 'client';
}

export interface VoicePhrasePattern {
  pattern: RegExp;
  type: VoiceIntentType;
  topic?: VoiceQueryTopic;
}

// English and romanized Urdu (Hinglish) patterns to match queries and extract names
export const VOICE_PHRASE_PATTERNS: VoicePhrasePattern[] = [
  // 1. NAVIGATE Intents
  // English: "open profile of Ahmed", "show me Ahmed's record"
  { pattern: /(?:open|show|go to|view)\s+(?:the\s+)?(?:profile|record)\s+(?:of\s+)?([a-zA-Z0-9\s]+)/i, type: 'navigate' },
  { pattern: /show\s+([a-zA-Z0-9\s]+)'s?\s+(?:profile|record)/i, type: 'navigate' },
  // Hinglish: "Ahmed ka profile kholo", "Ahmed ki record dikhao"
  { pattern: /([a-zA-Z0-9\s]+)\s+(?:ka|ki|ko)\s+(?:profile|record)\s+(?:kholo|dikhao|open\s*karo|show\s*karo)/i, type: 'navigate' },
  
  // 2. QUERY: remaining_fee
  // English: "what is the remaining of Ahmed", "tell me Ahmed's balance"
  { pattern: /(?:what is|tell me|check)\s+(?:the\s+)?(?:remaining|balance|outstanding|baki|fee|fees)\s+(?:of\s+)?([a-zA-Z0-9\s]+)/i, type: 'query', topic: 'remaining_fee' },
  { pattern: /check\s+([a-zA-Z0-9\s]+)'s?\s+(?:remaining|balance|outstanding|fee|fees)/i, type: 'query', topic: 'remaining_fee' },
  // Hinglish: "Ahmed ka remaining kitna hai", "Ahmed ka outstanding batao", "Ahmed ka balance kya hai"
  { pattern: /([a-zA-Z0-9\s]+)\s+(?:ka|ki|ko)\s+(?:remaining|balance|baki|outstanding|fee|fees)\s*(?:batao|check|kitna|show|bataein|kya|hai)*/i, type: 'query', topic: 'remaining_fee' },
  
  // 3. QUERY: attendance
  // English: "tell me Ahmed's attendance", "is Ahmed present today"
  { pattern: /(?:what is|tell me|check)\s+(?:the\s+)?(?:attendance|presence|hazri)\s+(?:of\s+)?([a-zA-Z0-9\s]+)/i, type: 'query', topic: 'attendance' },
  { pattern: /check\s+([a-zA-Z0-9\s]+)'s?\s+(?:attendance|presence|hazri)/i, type: 'query', topic: 'attendance' },
  // Hinglish: "Ahmed ki attendance batao", "Ahmed present hai kya"
  { pattern: /([a-zA-Z0-9\s]+)\s+(?:ki|ka|ko)\s+(?:attendance|hazri|presence)\s*(?:batao|check|kaisi|kya|show|bataein|hai)*/i, type: 'query', topic: 'attendance' },
  { pattern: /is\s+([a-zA-Z0-9\s]+)\s+(?:present|absent|leave)/i, type: 'query', topic: 'attendance' },
  { pattern: /([a-zA-Z0-9\s]+)\s+(?:present|absent)\s+hai/i, type: 'query', topic: 'attendance' },

  // 4. QUERY: total_paid
  // English: "how much has Ahmed paid", "total paid of Ahmed"
  { pattern: /(?:what is|tell me|check|how much has)\s+([a-zA-Z0-9\s]+)\s+(?:paid|total paid)/i, type: 'query', topic: 'total_paid' },
  { pattern: /(?:what is|tell me|check)\s+(?:the\s+)?(?:total paid|paid amount|paid|jama)\s+(?:of\s+)?([a-zA-Z0-9\s]+)/i, type: 'query', topic: 'total_paid' },
  // Hinglish: "Ahmed ka total paid kitna hai", "Ahmed ne kitna jama kiya"
  { pattern: /([a-zA-Z0-9\s]+)\s+(?:ka|ki|ko|ne)\s+(?:total paid|paid|jama)\s*(?:batao|check|kitna|show|bataein|kya|kiya|hai)*/i, type: 'query', topic: 'total_paid' },

  // 5. QUERY: status
  // English: "what is the status of Ahmed", "progress of Ahmed"
  { pattern: /(?:what is|tell me|check)\s+(?:the\s+)?(?:status|progress|report)\s+(?:of\s+)?([a-zA-Z0-9\s]+)/i, type: 'query', topic: 'status' },
  { pattern: /check\s+([a-zA-Z0-9\s]+)'s?\s+(?:status|progress|report)/i, type: 'query', topic: 'status' },
  // Hinglish: "Ahmed ka status kaisa hai", "Ahmed ki report batao"
  { pattern: /([a-zA-Z0-9\s]+)\s+(?:ka|ki|ko)\s+(?:status|progress|report|kaisa|kaisi)\s*(?:batao|check|kya|show|bataein|hai|kaisa hai|kaisi hai)*/i, type: 'query', topic: 'status' },
];

// Helper Urdu/English stop words to clean up from the extracted entity name
const STOP_WORDS = new Set([
  'ka', 'ki', 'ko', 'ne', 'ke', 'of', 'the', 'a', 'an', 'is', 'was', 'are', 'today', 'aj', 'aaj', 'batao', 'bataein', 'check', 'show', 'dikhao', 'kholo', 'open', 'me', 'my',
  'patient', 'student', 'seeker', 'child', 'client', 'id', 'no', 'number', 'roll', 'in', 'at', 'from'
]);

const DEPT_KEYWORDS: Record<string, string[]> = {
  'rehab': ['rehab', 'rehabilitation', 'rehab center'],
  'spims': ['spims', 'academy', 'spims academy'],
  'hospital': ['hospital', 'khan hospital', 'ilaj'],
  'sukoon': ['sukoon', 'sukoon center'],
  'welfare': ['welfare', 'foundation', 'welfare foundation'],
  'job-center': ['job center', 'job-center', 'jobs'],
  'hq': ['hq', 'headquarters', 'central'],
};

// Normalizes written numbers to digits (e.g. "ninety nine" to "99")
export function wordsToNumbers(text: string): string {
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

export function cleanEntityName(name: string): string {
  return name
    .split(/\s+/)
    .filter(token => !STOP_WORDS.has(token.toLowerCase()))
    .join(' ')
    .trim();
}

export function parseVoiceIntent(transcript: string): ParsedVoiceIntent {
  if (!transcript) {
    return { type: 'unknown', entityName: null, rawTranscript: '' };
  }

  // Normalize number words to digits first
  let cleaned = wordsToNumbers(transcript.trim());

  // 1. Strip wake word
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

  // Detect if transcript mentions a department
  let departmentCode: string | undefined = undefined;
  for (const [code, keywords] of Object.entries(DEPT_KEYWORDS)) {
    if (keywords.some(kw => lowercase.includes(kw))) {
      departmentCode = code;
      break;
    }
  }

  // Detect if transcript mentions an entity type
  let entityType: 'patient' | 'student' | 'seeker' | 'child' | 'client' | undefined = undefined;
  if (lowercase.includes('patient')) entityType = 'patient';
  else if (lowercase.includes('student')) entityType = 'student';
  else if (lowercase.includes('seeker')) entityType = 'seeker';
  else if (lowercase.includes('child')) entityType = 'child';
  else if (lowercase.includes('client')) entityType = 'client';

  // 2. Query Topics - Financial / Dashboard
  // check for remaining_fee_today
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
      rawTranscript: transcript,
      departmentCode,
      entityType
    };
  }

  // check for earnings_today
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
      rawTranscript: transcript,
      departmentCode,
      entityType
    };
  }

  // 3. Try regex phrase matches
  for (const item of VOICE_PHRASE_PATTERNS) {
    const match = item.pattern.exec(cleaned);
    if (match && match[1]) {
      const extractedName = cleanEntityName(match[1]);
      if (extractedName) {
        return {
          type: item.type,
          queryTopic: item.topic || 'unknown',
          entityName: extractedName,
          rawTranscript: transcript,
          departmentCode,
          entityType
        };
      }
    }
  }

  // 4. Fallback: Keyword Scoring for standard single-entity queries
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

  // Fallback entity name extraction: everything before or after key transition words
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
      extractedName = tokens.slice(0, 2).join(' '); // Use first 2 non-stop words
    }
  }

  return {
    type: intentType,
    queryTopic,
    entityName: intentType !== 'unknown' && extractedName ? cleanEntityName(extractedName) : null,
    rawTranscript: transcript,
    departmentCode,
    entityType
  };
}
