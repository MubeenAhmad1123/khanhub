// apps/web/src/lib/voice/responseFormatter.ts
'use server';

import { getGroqClient, GROQ_MODEL } from './groqClient';

export interface FormattedVoiceResponse {
  spokenText: string;
  suggestedFollowUps: string[];
}

const SPOKEN_RESPONSE_PROMPT = `You are Mubi, the voice assistant for Khan Hub ERP in Pakistan.
Generate a JSON response containing:
1. "spokenText": a natural, warm, professional spoken response in clear, fluent English.
2. "suggestedFollowUps": 2-3 short, natural follow-up questions the user might ask next, specific to this data (use real names/dates/numbers from the result, not placeholders, max ~6 words each).

Style rules for spokenText:
- Speak like a real assistant — confident, warm, natural
- Numbers: always say "rupees" instead of PKR. Format as "25,000 rupees" or "250,000 rupees"
- Dates: say "22nd of June" or "June 22nd" rather than raw dates
- Always give context — if remaining fee asked, also mention paid and total amounts
- For financial summaries: state income first, then expense, and finally net profit/loss
- For lists: if 1-3 items, mention all names. If 4+, say "There are X people, including [first 3 names]"
- Maximum 4 sentences
- Never say "data shows", "according to records", "system indicates"

Department Terminology Rules:
- rehab: call them "patients" or "clients"
- hospital: call them "patients"
- spims: call them "students" (never patients)
- welfare: call them "children" (never patients)
- job-center: call them "job seekers" (never patients)
- sukoon: call them "clients" (never patients)

Output MUST be a valid JSON object matching this schema:
{
  "spokenText": "the natural spoken text response",
  "suggestedFollowUps": ["suggested question 1", "suggested question 2", "suggested question 3"]
}
Respond ONLY with this JSON. No markup blocks, no explanations.`;

const STATIC_FOLLOW_UPS: Record<string, string[]> = {
  financial_summary: [
    "Show department breakdown",
    "Show last month comparison",
    "Show pending transactions"
  ],
  remaining_fee: [
    "Who has the highest remaining fee?",
    "Show hospital remaining fee",
    "Show spims remaining fee"
  ],
  admissions_by_date: [
    "Show discharges for today",
    "Show total active count",
    "Show rehab admissions"
  ],
  discharges_by_date: [
    "Show admissions for today",
    "Show total active count",
    "Show rehab discharges"
  ],
  attendance_summary: [
    "Show today's absent list",
    "Show staff ranking",
    "Who was late today?"
  ],
  students_by_course: [
    "Show remaining fee for this course",
    "Show spims student attendance",
    "Show total student count"
  ],
  pending_transactions: [
    "Who approved these?",
    "Show hospital pending approvals",
    "Show rehab pending approvals"
  ],
  staff_ranking: [
    "Show attendance summary",
    "Show top staff of last month",
    "Show fines for this month"
  ]
};

export async function generateSpokenResponse(
  topic: string,
  data: any,
  entityName?: string
): Promise<FormattedVoiceResponse> {
  const groq = getGroqClient();

  const userPrompt = `Topic: ${topic}
Entity: ${entityName || data?.name || 'N/A'}
Data: ${JSON.stringify(data, null, 2)}
Generate JSON response with spokenText and suggestedFollowUps.`;

  const fallbackFollowUps = STATIC_FOLLOW_UPS[topic] || [
    "Show financial summary",
    "Show remaining fee",
    "Show attendance summary"
  ];

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SPOKEN_RESPONSE_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content?.trim() || '';
    const parsed = JSON.parse(content);

    return {
      spokenText: parsed.spokenText || 'I found the data you requested.',
      suggestedFollowUps: (parsed.suggestedFollowUps && parsed.suggestedFollowUps.length > 0)
        ? parsed.suggestedFollowUps
        : fallbackFollowUps
    };
  } catch (err) {
    console.error('[Response Generator] Error:', err);
    return {
      spokenText: 'I found the data, but had an issue formatting the spoken response.',
      suggestedFollowUps: fallbackFollowUps
    };
  }
}
