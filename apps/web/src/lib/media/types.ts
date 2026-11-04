// apps/web/src/lib/media/types.ts

export type MediaType = 'photo' | 'video' | 'other';

export interface PublicMediaItem {
  id: string;
  mediaType: MediaType;
  title: string;
  departmentSlug: string;
  departmentName: string;
  imageUrl: string;
  cloudinaryPublicId: string;
  width: number;
  height: number;
  bytes: number;
  publishedDate: string; // YYYY-MM-DD (Asia/Karachi)
  publishedAt: string;   // ISO 8601 string
  sortKey: string;       // ${publishedAt}_${id}
  visible: boolean;
  deletedAt?: string | null;
  uploadedBy: string;    // uid
  uploadedByName: string;
  campusId: 'vehari';
  clientToken: string;
  youtubeVideoId?: string | null;
  externalUrl?: string | null;
}

export type MediaLogAction =
  | 'published'
  | 'title_edited'
  | 'department_edited'
  | 'date_edited'
  | 'hidden'
  | 'unhidden'
  | 'removed';

export interface PublicMediaLog {
  id: string;
  mediaId: string;
  action: MediaLogAction;
  performedBy: string; // uid
  name: string;
  role: string;
  reason?: string;
  timestamp: string; // ISO 8601 string
  details?: Record<string, any>;
}

export interface PublishPhotoInput {
  clientToken: string;
  title: string;
  departmentSlug: string;
  imageUrl: string;
  cloudinaryPublicId: string;
  width: number;
  height: number;
  bytes: number;
  publishedDate: string; // YYYY-MM-DD
}

export interface UpdateMediaItemInput {
  id: string;
  title?: string;
  departmentSlug?: string;
  publishedDate?: string;
}

export interface DashboardMediaStats {
  total: number;
  visible: number;
  hidden: number;
  uploadedToday: number;
}

export interface DashboardMediaListResult {
  items: PublicMediaItem[];
  nextCursor?: string;
  hasMore: boolean;
  stats: DashboardMediaStats;
}

export interface PublicMediaListResult {
  items: PublicMediaItem[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount: number;
}
