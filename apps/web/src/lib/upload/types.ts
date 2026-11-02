// apps/web/src/lib/upload/types.ts

import { CanonicalCampusId, CanonicalDeptId } from './departmentRegistry';

export type UploadPlatformKey =
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'whatsapp'
  | 'website'
  | 'linkedin';

export const DEFAULT_PLATFORM_KEYS: UploadPlatformKey[] = [
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'whatsapp',
  'website'
];

export const ALL_PLATFORM_KEYS: UploadPlatformKey[] = [
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'whatsapp',
  'website',
  'linkedin'
];

export type UploadPlatformStatus = 'todo' | 'ready' | 'scheduled' | 'posted' | 'failed' | 'skipped';

export interface PlatformPublishState {
  status: UploadPlatformStatus;
  postUrl?: string;          // Verified live post URL or embed link (optional for whatsapp)
  scheduledFor?: string;     // ISO timestamp if scheduled
  postedAt?: string;         // ISO timestamp of publish confirmation
  postedBy?: string;         // Name / ID of staff user
  assignedTo?: string;       // Staff UID assigned to execute this target
  method: 'manual' | 'api';  // 'manual' (default) or 'api'
  skipReason?: string;       // Required if status === 'skipped'
  correctionReason?: string; // Stored if edited after posted
  error?: string;            // Last error message if failed
  lastUpdated?: string;      // ISO timestamp
}

export interface UploadItemDoc {
  id: string;                               // '{YYYY-MM}_{creationTaskId}'
  month: string;                            // 'YYYY-MM'
  date: string;                             // 'YYYY-MM-DD' (Asia/Karachi)
  creationTaskId: string;                   // Reference ID to media_calendar_tasks
  creationCategoryId?: string;              // media_content_categories doc ID
  creationCategoryName?: string;            // media_content_categories name
  campusId: CanonicalCampusId;              // 'vehari' (default)
  departmentId: CanonicalDeptId | null;     // Resolved canonical department ID or null if unmapped
  title: string;                            // Title from creation calendar or override
  caption: string;                          // Ready-to-copy social caption text
  hashtags: string[];                       // Tags (e.g. ['#KhanHub', '#Rehab'])
  contentType: 'image' | 'video';           // Distinguishes image vs video link
  assets: {
    primaryUrl: string;                     // Cloudinary image URL or video embed URL
    thumbnailUrl?: string;                  // Cover image URL
    cloudinaryPublicId?: string;            // Cloudinary asset ID if uploaded image
    sourceType: 'cloudinary_image' | 'youtube_link' | 'social_link' | 'none';
    durationSeconds?: number;
  };
  platforms: Record<UploadPlatformKey, PlatformPublishState>;
  assigneeIds: string[];                    // Derived from all platform assignees for indexed querying
  syncStatus: 'in_sync' | 'out_of_sync' | 'orphaned' | 'needs_department';
  createdAt: string;                        // ISO string
  updatedAt: string;                        // ISO string
  createdYear: number;                      // 2026
  createdMonth: number;                     // 11
}

export interface UploadAuditLogDoc {
  id: string;
  uploadItemId: string;
  platform?: UploadPlatformKey;
  action:
    | 'sheet_generated'
    | 'status_changed'
    | 'post_url_updated'
    | 'post_corrected'
    | 'website_published'
    | 'website_hidden'
    | 'assignee_changed'
    | 'sync_updated'
    | 'details_updated';
  previousStatus?: UploadPlatformStatus;
  newStatus?: UploadPlatformStatus;
  previousUrl?: string;
  newUrl?: string;
  reason?: string;                       // Mandatory when skipping or editing after posted
  performedBy: string;                   // User UID
  performedByName: string;               // User Display Name
  performedByRole: string;               // e.g. 'uploader' | 'admin' | 'manager' | 'superadmin'
  createdAt: string;                     // ISO Timestamp
}

export interface TaskRowOverride {
  title?: string;
  contentType?: 'image' | 'video';
  departmentId?: CanonicalDeptId | null;
  enabledPlatforms?: UploadPlatformKey[];
}

export interface CustomUploadTaskRow {
  id: string;
  serialNo: number;
  name: string;
  type: 'video' | 'graphic';
  departmentId?: CanonicalDeptId | null;
  enabledPlatforms?: UploadPlatformKey[];
  createdAt: string;
}

export interface UploadSettingsDoc {
  id: 'config_vehari';
  campusId: CanonicalCampusId;
  categoryDepartmentMap: Record<string, CanonicalDeptId>; // Category ID or Name -> CanonicalDeptId
  allowedVideoDomains: string[];
  taskRowOverrides?: Record<string, TaskRowOverride>;
  deletedTaskRowIdsByMonth?: Record<string, string[]>;
  customTaskRows?: CustomUploadTaskRow[];
  updatedAt: string;
  updatedBy: string;
}

