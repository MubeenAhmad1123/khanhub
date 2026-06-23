// apps/web/src/lib/voice/intentParser.ts
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
  tool: 'getLatestAdmission' | 'getAdmissionsByDate' | 'getFinancialSummary' | 'searchPersonByName' | 'navigate' | 'unknown';
  entityName: string | null;
  entityId: string | null;
  entityType: EntityType;
  departmentCode: string | null;
  targetDate: string | null;     // ISO date string e.g. "2026-06-25"
  daysBack: number | null;       // e.g. 5 for "5 din pehle"
  queryTopic?: 'remaining_fee' | 'attendance' | 'total_paid' | 'status' | 'remaining_fee_today' | 'earnings_today' | 'unknown' | null;
  rawTranscript: string;
  llmConfidence: number;
}

function getSystemPrompt(contextDepartment: string | null = null): string {
  const todayStr = new Date(Date.now() + 5 * 3600000).toISOString().split('T')[0];
  return `You are Mubi, an intelligent voice assistant for Khan Hub 
ERP — a Pakistani multi-department organization managing rehab center, medical 
college (SPIMS), hospital, welfare, and job center.

Users speak in Hinglish (Urdu-English mix). Parse their command and return ONLY 
valid JSON — no explanation, no markdown, just raw JSON.

AVAILABLE TOOLS (pick ONE that best matches the request):
- "getLatestAdmission": user wants most recent patient/student name
- "getAdmissionsByDate": user wants count or names of admissions on a specific date
- "getFinancialSummary": user wants income/expense/earnings data
- "searchPersonByName": user wants to find or open a specific person's profile, or ask a question about their record
- "navigate": user wants to open a profile page (entityId or entityName known)
- "unknown": cannot determine intent

JSON format:
{
  "tool": "getLatestAdmission"|"getAdmissionsByDate"|"getFinancialSummary"|"searchPersonByName"|"navigate"|"unknown",
  "entityName": string|null,
  "entityId": string|null,
  "entityType": "patient"|"student"|"staff"|"child"|"seeker"|null,
  "departmentCode": "rehab"|"spims"|"hospital"|"welfare"|"job-center"|"sukoon"|null,
  "targetDate": "YYYY-MM-DD"|null,
  "daysBack": number|null,
  "queryTopic": "remaining_fee"|"attendance"|"total_paid"|"status"|"remaining_fee_today"|"earnings_today"|null,
  "llmConfidence": 0.0-1.0
}

Rules for queryTopic:
- queryTopic: set ONLY if the user is asking a specific question about a person or overall stats:
  * dues, outstanding, remaining, balance, baki → remaining_fee
  * attendance, presence, hazri, present, absent → attendance
  * paid, total paid, jama, payments → total_paid
  * status, progress, report, kaisa hai → status
  * overall dues, total outstanding, today's remaining → remaining_fee_today
  * daily earnings, today's earnings, total income → earnings_today

Date rules (today is ${todayStr} Pakistan time):
- "kal" / "yesterday" → daysBack: 1
- "aaj" / "today" → targetDate: "${todayStr}"
- "5 din pehle" → daysBack: 5
- "22 June" / "22 tarikh" → targetDate: "2026-06-22"

${contextDepartment ? `CURRENT CONTEXT: The user is currently viewing the "${contextDepartment}" department dashboard. If their query is ambiguous or doesn't specify a department, default the "departmentCode" in your response to "${contextDepartment}".` : ''}

Examples:
"latest patient kaun hai rehab mein" → tool: getLatestAdmission, departmentCode: rehab
"kal kitne patient admit hue" → tool: getAdmissionsByDate, daysBack: 1
"22 June ko hospital mein income kya thi" → tool: getFinancialSummary, departmentCode: hospital, targetDate: 2026-06-22
"Ahmed ka remaining batao" → tool: searchPersonByName, entityName: Ahmed, queryTopic: remaining_fee
"Sana present hai?" → tool: searchPersonByName, entityName: Sana, queryTopic: attendance
"open profile of staff Moeeen" → tool: searchPersonByName, entityName: Moeeen, entityType: staff
"aaj rehab ne kitna kamaya" → tool: getFinancialSummary, departmentCode: rehab, targetDate: today`;
}

export async function parseLlmIntent(
  transcript: string,
  contextDepartment: string | null = null
): Promise<ParsedVoiceIntent> {
  try {
    const groq = getGroqClient();
    const systemPrompt = getSystemPrompt(contextDepartment);
    
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript }
      ],
      temperature: 0.1,      // Low temp = more consistent JSON
      max_tokens: 300,
      response_format: { type: 'json_object' }  // Forces JSON output
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    console.log('[GROQ INTENT]', JSON.stringify(parsed, null, 2));

    return {
      tool: parsed.tool || 'unknown',
      entityName: parsed.entityName || null,
      entityId: parsed.entityId || null,
      entityType: parsed.entityType || null,
      departmentCode: parsed.departmentCode || null,
      targetDate: parsed.targetDate || null,
      daysBack: parsed.daysBack || null,
      queryTopic: parsed.queryTopic || null,
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
        tool: 'unknown',
        entityName: null,
        entityId: null,
        entityType: null,
        departmentCode: null,
        targetDate: null,
        daysBack: null,
        queryTopic: null,
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
      tool: 'unknown',
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
      tool: 'getFinancialSummary',
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
      tool: 'getFinancialSummary',
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
          tool: item.type === 'navigate' ? 'navigate' : 'searchPersonByName',
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

  if (lowercase.includes('open') || lowercase.includes('profile') || lowercase.includes('record') || lowercase.includes('kholo') || lowercase.includes('dikhao')) {
    intentType = 'navigate';
  } else if (lowercase.includes('attendance') || lowercase.includes('hazri') || lowercase.includes('present') || lowercase.includes('absent') ||
             lowercase.includes('remaining') || lowercase.includes('balance') || lowercase.includes('outstanding') || lowercase.includes('baki') ||
             lowercase.includes('paid') || lowercase.includes('jama') || lowercase.includes('payment') ||
             lowercase.includes('status') || lowercase.includes('progress') || lowercase.includes('report') || lowercase.includes('kaisa')) {
    intentType = 'query';
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
    tool: intentType === 'navigate' ? 'navigate' : (intentType === 'query' ? 'searchPersonByName' : 'unknown'),
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
