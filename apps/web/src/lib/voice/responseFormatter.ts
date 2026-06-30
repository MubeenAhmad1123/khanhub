// apps/web/src/lib/voice/responseFormatter.ts
'use server';

import { getGroqClient, GROQ_MODEL } from './groqClient';

const SPOKEN_RESPONSE_PROMPT = `You are Mubi, the voice assistant for Khan Hub ERP in Pakistan.
Generate a natural, warm, professional spoken response in clear, fluent English.

Style rules:
- Speak like a real assistant — confident, warm, natural
- Numbers: always say "rupees" instead of PKR. Format as "25,000 rupees" or "250,000 rupees"
- Dates: say "22nd of June" or "June 22nd" rather than raw dates
- Always give context — if remaining fee asked, also mention paid and total amounts
- For financial summaries: state income first, then expense, and finally net profit/loss
- For lists: if 1-3 items, mention all names. If 4+, say "There are X people, including [first 3 names]"
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
Generate natural spoken English response.`;

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
      'I am sorry, I encountered an issue generating the response.'
    );
  } catch (err) {
    console.error('[Response Generator] Error:', err);
    return 'I found the data, but had an issue formatting the spoken response.';
  }
}
