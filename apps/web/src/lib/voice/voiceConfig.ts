// apps/web/src/lib/voice/voiceConfig.ts

export const WAKE_WORDS = ['hey mubi', 'mubi'];
export const WAKE_WORD = 'mubi'; // Primary wake word constant

export const MODE_STORAGE_KEY = 'voice_assistant_mode';
export type VoiceAssistantMode = 'always_on' | 'push_to_talk';
export const DEFAULT_MODE: VoiceAssistantMode = 'push_to_talk';

export const LANGUAGE_SETTINGS = {
  recognition: 'en-US', // Speech recognition language
  synthesis: 'ur-PK',   // Speech synthesis/output language
};
