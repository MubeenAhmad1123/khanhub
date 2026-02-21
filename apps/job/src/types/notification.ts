import { Timestamp } from 'firebase/firestore';

export type NotificationType =
    | 'payment_approved'
    | 'payment_rejected'
    | 'video_approved'
    | 'video_rejected'
    | 'new_connection';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    message: string;
    is_read: boolean;
    created_at: Timestamp;

    // Optional reference data
    reference_id?: string; // e.g., payment_id or video_id
    action_url?: string;
}
