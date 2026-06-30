// apps/web/src/lib/voice/intentParser.ts
'use server';

import { getGroqClient, GROQ_MODEL } from './groqClient';
import { KHAN_HUB_SYSTEM_AWARENESS } from './systemAwareness';

export type VoiceTool =
  | 'getLatestAdmission'
  | 'getMostRecentDischarge'
  | 'getAdmissionsByDate'
  | 'getDischargesByDate'
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
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;   // YYYY-MM-DD
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
  "tool": "getLatestAdmission" | "getMostRecentDischarge" | "getAdmissionsByDate" | "getDischargesByDate" | 
          "getFinancialSummary" | "getRemainingFee" | "searchPersonByName" | 
          "getAttendanceSummary" | "getStudentsByCourse" | "navigate" | "unknown",
  "entityName": string or null,
  "entityId": string or null (convert word-numbers: "ninety nine" → "99"),
  "entityType": "patient"|"student"|"staff"|"child"|"seeker" or null,
  "departmentCode": "rehab"|"spims"|"hospital"|"welfare"|"job-center" or null,
  "startDate": "YYYY-MM-DD" or null,
  "endDate": "YYYY-MM-DD" or null,
  "daysBack": number or null,
  "course": exact course name from SPIMS list or null,
  "llmConfidence": 0.0 to 1.0,
  "thinkingMessage": short English message shown in UI while fetching (e.g. "Searching Rehab data..." or "Checking patient records...")
}

Date Range Guidelines:
- If the user specifies a specific day (e.g., "24th of June"), set both "startDate" and "endDate" to that date ("2026-06-24").
- If the user specifies a date range (e.g., "1st of June till 7th of June" or "first week of June"), calculate the exact dates and set "startDate" to the beginning date ("2026-06-01") and "endDate" to the ending date ("2026-06-07").
- If the user specifies a relative range (e.g. "last week"), set "daysBack" to 7, and populate "startDate" and "endDate" with null.

Tool selection guide:
- getLatestAdmission     → "latest patient", "last admitted", "recent admission", "naya patient"
- getMostRecentDischarge → "recently discharged", "last discharge", "most recent discharge", "discharge hua"
- getAdmissionsByDate    → "how many patients", "admissions on [date]", "count of patients", "new clients"
- getDischargesByDate    → "how many discharges", "discharges last week", "discharged from rehab last week", "discharged in the first week of June"
- getFinancialSummary    → "income", "expense", "earnings", "revenue", "loss", "kamaya", "kharch", "stats of 24 of June"
- getRemainingFee        → "remaining", "balance", "fee left"
- searchPersonByName     → name mentioned + open/profile/find (e.g., "open profile of Raman", "profile of Rehman")
- getAttendanceSummary   → "attendance", "present", "absent"
- getStudentsByCourse    → "students in [course]"
- navigate               → "open profile", "show me", "profile of" WITH a specific name/ID

Examples:
"open the profile of last discharge patient" → tool: "getMostRecentDischarge", thinkingMessage: "Finding most recently discharged patient..."
"tell me from the date range 1st of June till 7th of June how many patient got discharged from rehab" → tool: "getDischargesByDate", departmentCode: "rehab", startDate: "2026-06-01", endDate: "2026-06-07", thinkingMessage: "Checking Rehab discharges..."
"how much did rehab earn yesterday" → tool: "getFinancialSummary", departmentCode: "rehab", daysBack: 1, thinkingMessage: "Calculating rehab revenue..."
"how many patient got discharged in the very first week of June" → tool: "getDischargesByDate", startDate: "2026-06-01", endDate: "2026-06-07", thinkingMessage: "Checking discharges..."
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
      startDate: parsed.startDate || null,
      endDate: parsed.endDate || null,
      daysBack: typeof parsed.daysBack === 'number' ? parsed.daysBack : null,
      course: parsed.course || null,
      rawTranscript: transcript,
      llmConfidence: parsed.llmConfidence || 0.5,
      thinkingMessage: parsed.thinkingMessage || 'Searching...',
    };
  } catch (err) {
    console.error('[LLM Intent Parser] Error:', err);
    return {
      tool: 'unknown',
      entityName: null,
      entityId: null,
      entityType: null,
      departmentCode: null,
      startDate: null,
      endDate: null,
      daysBack: null,
      course: null,
      rawTranscript: transcript,
      llmConfidence: 0,
      thinkingMessage: 'Searching...',
    };
  }
}
