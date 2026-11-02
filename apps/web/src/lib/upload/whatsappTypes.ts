// apps/web/src/lib/upload/whatsappTypes.ts

export type WhatsAppTargetKey =
  | 'khanhub_1'
  | 'khanhub_2'
  | 'khanhub_3'
  | 'khanhub_4'
  | 'khanhub_5'
  | 'khanhub_6'
  | 'khanhub_7'
  | 'khanhub_8'
  | 'channel_mk';

export interface WhatsAppTargetConfig {
  key: WhatsAppTargetKey;
  name: string;
  type: 'group' | 'channel';
  serialNo: number;
  description: string;
}

export const ALL_WHATSAPP_TARGET_KEYS: WhatsAppTargetKey[] = [
  'khanhub_1',
  'khanhub_2',
  'khanhub_3',
  'khanhub_4',
  'khanhub_5',
  'khanhub_6',
  'khanhub_7',
  'khanhub_8',
  'channel_mk'
];

export const DEFAULT_WHATSAPP_TARGETS: WhatsAppTargetConfig[] = [
  { key: 'khanhub_1', name: 'KhanHub 1', type: 'group', serialNo: 1, description: 'Community Group 1' },
  { key: 'khanhub_2', name: 'KhanHub 2', type: 'group', serialNo: 2, description: 'Community Group 2' },
  { key: 'khanhub_3', name: 'KhanHub 3', type: 'group', serialNo: 3, description: 'Community Group 3' },
  { key: 'khanhub_4', name: 'KhanHub 4', type: 'group', serialNo: 4, description: 'Community Group 4' },
  { key: 'khanhub_5', name: 'KhanHub 5', type: 'group', serialNo: 5, description: 'Community Group 5' },
  { key: 'khanhub_6', name: 'KhanHub 6', type: 'group', serialNo: 6, description: 'Community Group 6' },
  { key: 'khanhub_7', name: 'KhanHub 7', type: 'group', serialNo: 7, description: 'Community Group 7' },
  { key: 'khanhub_8', name: 'KhanHub 8', type: 'group', serialNo: 8, description: 'Community Group 8' },
  { key: 'channel_mk', name: 'Muhammad Khan', type: 'channel', serialNo: 9, description: 'Official WhatsApp Channel' }
];

export type WhatsAppTargetStatus = 'todo' | 'posted' | 'skipped';

export interface WhatsAppTargetPublishState {
  status: WhatsAppTargetStatus;
  postedAt?: string;
  postedBy?: string;
  skipReason?: string;
  notes?: string;
}

export interface WhatsAppDailyBroadcastDoc {
  id: string; // 'YYYY-MM-DD' e.g. '2026-11-02'
  month: string; // 'YYYY-MM'
  date: string; // 'YYYY-MM-DD'
  targets: Record<WhatsAppTargetKey, WhatsAppTargetPublishState>;
  notes?: string;
  createdAt?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface WhatsAppDayContentItem {
  id: string;
  title: string;
  caption: string;
  hashtags: string[];
  contentType: 'image' | 'video';
  primaryUrl?: string;
  categoryName?: string;
}

