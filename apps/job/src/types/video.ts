import { Timestamp } from 'firebase/firestore';

export interface Video {
    id: string;
    user_id: string;
    user_role: 'job_seeker' | 'employer';
    industry: string;
    subcategory: string;

    // Cloudinary Data
    cloudinary_url: string;
    cloudinary_public_id: string;
    thumbnail_url: string; // Derived or separate

    // Transcription & AI
    transcription_text?: string;
    ai_flags: {
        phone_detected: boolean;
        location_detected: boolean;
        contact_sharing_detected: boolean;
        flagged_segments: string[];
    };
    ai_status: 'pending' | 'passed' | 'rejected';

    // Admin Moderation
    admin_status: 'pending' | 'approved' | 'rejected';
    rejection_reason?: string;

    // Metadata
    submitted_at: Timestamp;
    published_at?: Timestamp | null;
    is_live: boolean;
}
