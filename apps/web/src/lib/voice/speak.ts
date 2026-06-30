// apps/web/src/lib/voice/speak.ts

import { LANGUAGE_SETTINGS } from './voiceConfig';

export function speak(text: string, lang: string = LANGUAGE_SETTINGS.synthesis) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[speak] SpeechSynthesis is not supported in this browser.');
    return;
  }

  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();

  // Create new speech utterance
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Log error if speech synthesis fails to trigger
  utterance.onerror = (e) => {
    console.error('[speak] Speech synthesis utterance error:', e);
  };

  // Speak
  window.speechSynthesis.speak(utterance);
}
