import { Timestamp } from 'firebase/firestore';

export type ConnectionStatus = 'pending' | 'approved' | 'rejected';

export interface Connection {
    id: string;
    seekerId: string;
    employerId: string;

    // Detailed info for display without extra lookups if possible
    seekerName: string;
    employerName: string;
    employerCompany: string;

    // Status
    status: ConnectionStatus;

    // Payment Reference (reveals contact info when status is approved)
    paymentId?: string;

    // Reason for connection (optional message from employer)
    message?: string;

    // Metadata
    createdAt: Timestamp;
    updatedAt: Timestamp;
    approvedAt?: Timestamp;
    rejectedAt?: Timestamp;
}

export interface ConnectionRequest {
    seekerId: string;
    employerId: string;
    message?: string;
}
