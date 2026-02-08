
import { Timestamp } from 'firebase/firestore';

export type ApplicationStatus =
    | 'applied'
    | 'viewed'
    | 'shortlisted'
    | 'interviewing'
    | 'offer'
    | 'hired'
    | 'rejected'
    | 'withdrawn';

export interface Application {
    id: string;

    jobId: string;
    jobTitle: string;
    jobSeekerId: string;
    employerId: string;

    applicantName: string;
    applicantEmail: string;
    applicantPhone?: string;
    applicantCvUrl?: string; // URL to PDF/DOCX
    applicantVideoUrl?: string; // URL to video

    coverLetter?: string;

    matchScore: number; // 0-100 calculated by algorithm

    status: ApplicationStatus;

    appliedAt: Date | Timestamp;
    updatedAt: Date | Timestamp;

    // Employer actions
    employerNotes?: string;
    interviewDate?: Date | Timestamp;
}

export interface ApplicationStatistics {
    total: number;
    pending: number;
    shortlisted: number;
    rejected: number;
    hired: number;

    today: number;
    thisWeek: number;
    thisMonth: number;
}