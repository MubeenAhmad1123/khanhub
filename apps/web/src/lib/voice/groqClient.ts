import Groq from 'groq-sdk';

let _groq: Groq | null = null;

export function getGroqClient(): Groq {
  if (_groq) return _groq;
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set in environment variables');
    _groq = new Groq({ apiKey });
    console.log('[GROQ] Client initialized successfully');
    return _groq;
  } catch (err: any) {
    console.error('[GROQ] Client init failed:', err.message);
    throw err;
  }
}

export const GROQ_MODEL = 'llama-3.1-8b-instant';
