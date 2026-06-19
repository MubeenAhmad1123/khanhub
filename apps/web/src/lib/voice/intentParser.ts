// apps/web/src/lib/voice/intentParser.ts

import { WAKE_WORDS } from './voiceConfig';

export type VoiceIntentType = 'navigate' | 'query' | 'unknown';
export type VoiceQueryTopic = 'remaining_fee' | 'attendance' | 'total_paid' | 'status' | 'unknown';

export interface ParsedVoiceIntent {
  type: VoiceIntentType;
  queryTopic?: VoiceQueryTopic;
  entityName: string | null;   // extracted name, e.g. "Ahmed"
  rawTranscript: string;
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

// List of helper Urdu/English stop words to clean up from the extracted entity name
const STOP_WORDS = new Set([
  'ka', 'ki', 'ko', 'ne', 'ke', 'of', 'the', 'a', 'an', 'is', 'was', 'are', 'today', 'aj', 'aaj', 'batao', 'bataein', 'check', 'show', 'dikhao', 'kholo', 'open', 'me', 'my'
]);

function cleanEntityName(name: string): string {
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

  // 1. Strip wake word
  let cleaned = transcript.trim();
  for (const wakeWord of WAKE_WORDS) {
    const regex = new RegExp(`^(?:hey\\s+)?${wakeWord}\\b[\\s,.]*`, 'i');
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '');
      break;
    }
  }

  // Fallback check to strip wake word from anywhere in the string
  for (const wakeWord of WAKE_WORDS) {
    const regex = new RegExp(`\\b(?:hey\\s+)?${wakeWord}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 2. Try regex phrase matches
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
        };
      }
    }
  }

  // 3. Fallback: Keyword Scoring
  const lowercase = cleaned.toLowerCase();
  let intentType: VoiceIntentType = 'unknown';
  let queryTopic: VoiceQueryTopic = 'unknown';

  // Keyword check
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

  // Fallback to capitalizing strategy or longest word sequence
  if (!extractedName && cleaned.length > 0) {
    const tokens = cleaned.split(/\s+/).filter(t => !STOP_WORDS.has(t.toLowerCase()));
    // Try to find capitalized tokens (indicates a name in English transcript)
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
  };
}
