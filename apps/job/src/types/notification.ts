import { Timestamp } from 'firebase/firestore';

export type NotificationType =
    | 'payment_approved'
    | 'payment_rejected'
    | 'video_approved'
    | 'video_rejected'
    | 'new_connection';

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    message: string;
    isRead: boolean;
    createdAt: Timestamp;

    // Optional reference data
    reference_Id?: string; // e.g., payment_id or video_id
    action_url?: string;
    
    // For backward compatibility while migrating
    user_id?: string;
    is_read?: boolean;
    created_at?: Timestamp;
}
