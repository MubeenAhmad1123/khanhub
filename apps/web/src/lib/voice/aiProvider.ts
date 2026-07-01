// apps/web/src/lib/voice/aiProvider.ts
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface CompletionRequest {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  jsonMode?: boolean;
}

export async function getCompletion({ systemPrompt, userMessage, temperature = 0.1, jsonMode = true }: CompletionRequest) {
  try {
    const result = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
    });
    return { provider: 'groq', text: result.choices[0].message.content || '' };
  } catch (err: any) {
    // Groq 429 (rate limit) or 5xx — fall back to Gemini rather than failing the voice command
    const isRateLimitOrServerError = err?.status === 429 || err?.status >= 500 || 
      String(err?.message || '').toLowerCase().includes('rate limit') || 
      String(err?.message || '').toLowerCase().includes('429');

    if (isRateLimitOrServerError) {
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
        console.warn('[aiProvider] Groq failed, falling back to Gemini...', err);
        try {
          const model = gemini.getGenerativeModel({ 
            model: 'gemini-2.5-flash',
            ...(jsonMode ? { generationConfig: { responseMimeType: 'application/json' } } : {})
          });
          const result = await model.generateContent(`${systemPrompt}\n\nUser request: ${userMessage}`);
          return { provider: 'gemini-fallback', text: result.response.text() };
        } catch (geminiErr) {
          console.error('[aiProvider] Gemini fallback also failed:', geminiErr);
        }
      }

      // Secondary fallback to a different Groq model (which has a separate rate-limit pool)
      console.warn('[aiProvider] Gemini API Key not present or failed. Falling back to secondary Groq model (mixtral-8x7b-32768)...');
      try {
        const result = await groq.chat.completions.create({
          model: 'mixtral-8x7b-32768',
          temperature,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
        });
        return { provider: 'groq-fallback', text: result.choices[0].message.content || '' };
      } catch (fallbackErr) {
        console.error('[aiProvider] Secondary Groq model fallback failed:', fallbackErr);
        throw err; // Throw original error if all fallbacks fail
      }
    }
    throw err;
  }
}
