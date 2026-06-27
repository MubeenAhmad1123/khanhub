// apps/web/src/lib/voice/responseFormatter.ts
'use server';

import { getGroqClient, GROQ_MODEL } from './groqClient';

const SPOKEN_RESPONSE_PROMPT = `You are Mubi, the voice assistant for Khan Hub ERP in Pakistan.
Generate a natural, warm, professional spoken response in Hinglish (Urdu-English mix).

Style rules:
- Speak like a real assistant — confident, warm, natural
- Use Pakistani expressions: "Janaab", "sahib", "bilkul", "theek hai"
- Numbers: always say "rupees" not PKR. Format as "25 hazaar" or "2 lakh 50 hazaar"
- Dates: say "22 June" not "2026-06-22"
- Always give context — if remaining fee asked, also mention paid and total
- For financial summaries: say income first, then expense, then net
- For lists: if 1-3 items, say all names. If 4+, say "X log hain, jin mein se [first 3 names] shamil hain"
- Maximum 4 sentences
- Never say "data shows", "according to records", "system indicates"
- Respond ONLY with the spoken text — no JSON, no formatting`;

export async function generateSpokenResponse(
  topic: string,
  data: any,
  entityName?: string
): Promise<string> {
  const groq = getGroqClient();

  const userPrompt = `Topic: ${topic}
Entity: ${entityName || 'N/A'}
Data: ${JSON.stringify(data, null, 2)}
Generate natural spoken Hinglish response.`;

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SPOKEN_RESPONSE_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    return (
      completion.choices[0]?.message?.content?.trim() ||
      'Maafi chahta hoon, jawab generate karne mein masla aaya.'
    );
  } catch (err) {
    console.error('[Response Generator] Error:', err);
    return 'Data mil gaya, lekin response mein masla aaya. Console check karein.';
  }
}
