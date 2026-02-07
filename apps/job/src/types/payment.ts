// Payment Types

export type PaymentType = 'registration' | 'premium';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface Payment {
    id: string;
    userId: string;
    type: PaymentType;
    amount: number;
    screenshotUrl: string;
    status: PaymentStatus;

    // Admin Review
    reviewedBy: string | null;
    reviewedAt: Date | null;
    rejectionReason: string | null;

    createdAt: Date;
    updatedAt: Date;
}
