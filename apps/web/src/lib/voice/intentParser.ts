// apps/web/src/lib/voice/intentParser.ts
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { readHqSessionCookie } from '@/app/hq/actions/auth';
import { getCompletion } from './aiProvider';
import { getModuleKnowledge } from './getData';

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
  | 'getPendingTransactions'
  | 'getStaffRanking'
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

const buildParserPrompt = (
  modulesKnowledge: any[],
  corrections: any[],
  recentTurns: any[]
) => `
=== SYSTEM CONTEXT ===
You are parsing a voice command from a KhanHub ERP staff member.
Today's date (Pakistan time): ${getTodayPKT()}

Return ONLY a valid JSON object — no explanation, no markdown wrapping, no extra text.

=== ERP DATABASE SCHEMA & MODULE KNOWLEDGE ===
${JSON.stringify(modulesKnowledge, null, 2)}

=== LEARNED SYSTEM CORRECTIONS (APPLY STRICTLY!) ===
${JSON.stringify(corrections, null, 2)}

=== RECENT CONVERSATION (LAST 5 TURNS) ===
${JSON.stringify(recentTurns, null, 2)}

=== YOUR TARGET JSON FORMAT ===
{
  "tool": "getLatestAdmission" | "getMostRecentDischarge" | "getAdmissionsByDate" | "getDischargesByDate" | 
          "getFinancialSummary" | "getRemainingFee" | "searchPersonByName" | 
          "getAttendanceSummary" | "getStudentsByCourse" | "getPendingTransactions" | "getStaffRanking" | "navigate" | "unknown",
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

=== DATE RANGE GUIDELINES ===
- If the user specifies a specific day (e.g., "24th of June"), set both "startDate" and "endDate" to that date ("2026-06-24").
- If the user specifies a date range (e.g., "1st of June till 7th of June" or "first week of June"), calculate the exact dates and set "startDate" to the beginning date ("2026-06-01") and "endDate" to the ending date ("2026-06-07").
- If the user specifies a relative range (e.g. "last week"), set "daysBack" to 7, and populate "startDate" and "endDate" with null.

=== TOOL SELECTION GUIDE ===
- getLatestAdmission     → "latest patient", "last admitted", "recent admission", "naya patient"
- getMostRecentDischarge → "recently discharged", "last discharge", "most recent discharge", "discharge hua"
- getAdmissionsByDate    → "how many patients", "admissions on [date]", "count of patients", "new clients"
- getDischargesByDate    → "how many discharges", "discharges last week", "discharged from rehab last week", "discharged in the first week of June"
- getFinancialSummary    → "income", "expense", "earnings", "revenue", "loss", "kamaya", "kharch", "stats of 24 of June" (Use ONLY for income/expense/profit/loss queries, NOT for outstanding/remaining fees/left patient amounts)
- getRemainingFee        → "remaining", "balance", "fee left", "left amount of patients", "outstanding patient amount", "outstanding amount in hospital", "total remaining amount"
- searchPersonByName     → name mentioned + open/profile/find (e.g., "open profile of Raman", "profile of Rehman")
- getAttendanceSummary   → "attendance", "present", "absent"
- getStudentsByCourse    → "students in [course]"
- getPendingTransactions  → "pending approvals", "pending transactions", "transactions waiting for approval", "unapproved transactions", "super admin approvals"
- getStaffRanking        → "staff ranking", "monthly ranking of staff", "staff performance", "performance score", "best staff of the month", "who is on top in staff", "staff points"
- navigate               → "open profile", "show me", "profile of" WITH a specific name/ID
`;

export async function parseLlmIntent(transcript: string): Promise<ParsedVoiceIntent> {
  try {
    // 1. Fetch ERP System Knowledge (7 modules)
    const knowledgeSnap = await adminDb.collection('erp_system_knowledge').get();
    let modulesKnowledge = knowledgeSnap.docs.map(doc => doc.data());
    
    // Auto-seed if empty
    if (modulesKnowledge.length === 0) {
      await getModuleKnowledge('hq'); // Triggers auto-seeding of all modules
      const reSnap = await adminDb.collection('erp_system_knowledge').get();
      modulesKnowledge = reSnap.docs.map(doc => doc.data());
    }

    // 2. Fetch Learned Corrections
    const correctionsSnap = await adminDb.collection('ai_learned_corrections').limit(50).get().catch(() => ({ docs: [] } as any));
    const corrections = correctionsSnap.docs.map((doc: any) => doc.data());

    // 3. Fetch Session & Last 5 Conversation Turns (No combined orderBy/where to avoid missing index errors)
    const session = await readHqSessionCookie().catch(() => null);
    const userId = session?.uid || 'anonymous';
    
    const historySnap = await adminDb.collection('ai_memory')
      .where('userId', '==', userId)
      .get()
      .catch(() => ({ docs: [] } as any));
    
    const recentTurns = historySnap.docs
      .map((doc: any) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
      .map((d: any) => ({
        query: d.query,
        parsedIntent: {
          tool: d.parsedIntent?.tool,
          entityName: d.parsedIntent?.entityName,
          entityId: d.parsedIntent?.entityId,
          departmentCode: d.parsedIntent?.departmentCode,
        }
      }))
      .reverse();

    // 4. Invoke Dual AI Provider Router
    const prompt = buildParserPrompt(modulesKnowledge, corrections, recentTurns);
    const response = await getCompletion({
      systemPrompt: prompt,
      userMessage: transcript,
      temperature: 0.1,
      jsonMode: true
    });

    const raw = response.text || '{}';
    console.log(`[INTENT PARSER] parsed using ${response.provider}:`, raw);
    const parsed = JSON.parse(raw);

    const intentPayload = {
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

    // 5. Log Query to Memory (runs asynchronously)
    adminDb.collection('ai_memory').add({
      userId,
      query: transcript,
      parsedIntent: intentPayload,
      timestamp: new Date().toISOString(),
      wasCorrect: null,
      correction: null
    }).catch(err => console.error('[intentParser] Failed to log memory:', err));

    return intentPayload;
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
