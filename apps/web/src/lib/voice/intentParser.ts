// apps/web/src/lib/voice/intentParser.ts
'use server';

import { getGroqClient, GROQ_MODEL } from './groqClient';
import { KHAN_HUB_SYSTEM_AWARENESS } from './systemAwareness';

export type VoiceTool =
  | 'getLatestAdmission'
  | 'getMostRecentDischarge'
  | 'getAdmissionsByDate'
  | 'getFinancialSummary'
  | 'getRemainingFee'
  | 'searchPersonByName'
  | 'getAttendanceSummary'
  | 'getStudentsByCourse'
  | 'navigate'
  | 'unknown';

export type EntityType = 'patient' | 'student' | 'staff' | 'child' | 'seeker' | null;

export interface ParsedVoiceIntent {
  tool: VoiceTool;
  entityName: string | null;
  entityId: string | null;
  entityType: EntityType;
  departmentCode: string | null;
  targetDate: string | null;
  daysBack: number | null;
  course: string | null;
  rawTranscript: string;
  llmConfidence: number;
  thinkingMessage: string;  // What to show in UI while processing
}

// Today's date in PKT for injection into prompt
function getTodayPKT(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + 300); // UTC+5
  return now.toISOString().split('T')[0];
}

const buildParserPrompt = () => `
${KHAN_HUB_SYSTEM_AWARENESS}

=== YOUR TASK ===
You are parsing a voice command from an HQ staff member.
Today's date (Pakistan time): ${getTodayPKT()}

Return ONLY valid JSON — no explanation, no markdown, no extra text.

JSON format:
{
  "tool": one of: getLatestAdmission | getMostRecentDischarge | getAdmissionsByDate | 
          getFinancialSummary | getRemainingFee | searchPersonByName | 
          getAttendanceSummary | getStudentsByCourse | navigate | unknown,
  "entityName": string or null,
  "entityId": string or null (convert word-numbers: "ninety nine" → "99"),
  "entityType": "patient"|"student"|"staff"|"child"|"seeker" or null,
  "departmentCode": "rehab"|"spims"|"hospital"|"welfare"|"job-center" or null,
  "targetDate": "YYYY-MM-DD" or null,
  "daysBack": number or null,
  "course": exact course name from SPIMS list or null,
  "llmConfidence": 0.0 to 1.0,
  "thinkingMessage": short Hinglish message shown in UI while fetching (e.g. "Rehab ka data dhundh raha hoon..." or "Patient record check kar raha hoon...")
}

Tool selection guide:
- getLatestAdmission     → "latest patient", "naya patient", "abhi abhi admit", "most recent admission"
- getMostRecentDischarge → "recently discharged", "discharge hua", "last discharge"  
- getAdmissionsByDate    → "kitne patient aaye", "admissions on [date]", "count of patients"
- getFinancialSummary    → "income", "expense", "earnings", "kamaya", "kharch"
- getRemainingFee        → "remaining", "bacha hua", "balance", "fee kitni bachi"
- searchPersonByName     → name mentioned + open/profile/find
- getAttendanceSummary   → "attendance", "present", "absent", "kaun aaya"
- getStudentsByCourse    → "dental mein kaun hai", "students in [course]"
- navigate               → "open profile", "show me", "profile kholo" WITH a specific name/ID

Examples:
"rehab mein recently kaunsa patient discharge hua" → getMostRecentDischarge, departmentCode: rehab
"kal hospital mein kitne patient the" → getAdmissionsByDate, departmentCode: hospital, daysBack: 1  
"22 June ko rehab ne kitna income kiya" → getFinancialSummary, departmentCode: rehab, targetDate: "2026-06-22"
"Adnan Haider ka profile kholo" → searchPersonByName, entityName: "Adnan Haider"
"dental technician mein kaun kaun hai" → getStudentsByCourse, course: "Dental Technician", departmentCode: spims
"aaj kitne staff present hain" → getAttendanceSummary, targetDate: today
"patient ninety nine ka profile" → searchPersonByName, entityId: "99", entityType: patient
`;

export async function parseLlmIntent(transcript: string): Promise<ParsedVoiceIntent> {
  const groq = getGroqClient();

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: buildParserPrompt() },
        { role: 'user', content: transcript },
      ],
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    console.log('[GROQ INTENT]', raw); // Keep this for debugging
    const parsed = JSON.parse(raw);

    return {
      tool: parsed.tool || 'unknown',
      entityName: parsed.entityName || null,
      entityId: parsed.entityId || null,
      entityType: parsed.entityType || null,
      departmentCode: parsed.departmentCode || null,
      targetDate: parsed.targetDate || null,
      daysBack: typeof parsed.daysBack === 'number' ? parsed.daysBack : null,
      course: parsed.course || null,
      rawTranscript: transcript,
      llmConfidence: parsed.llmConfidence || 0.5,
      thinkingMessage: parsed.thinkingMessage || 'Data dhundh raha hoon...',
    };
  } catch (err) {
    console.error('[LLM Intent Parser] Error:', err);
    return {
      tool: 'unknown',
      entityName: null,
      entityId: null,
      entityType: null,
      departmentCode: null,
      targetDate: null,
      daysBack: null,
      course: null,
      rawTranscript: transcript,
      llmConfidence: 0,
      thinkingMessage: '',
    };
  }
}
