// Application Types

export type ApplicationStatus = 'pending' | 'viewed' | 'shortlisted' | 'interview' | 'rejected' | 'hired';

export interface StatusHistoryEntry {
    status: ApplicationStatus;
    timestamp: Date;
    note?: string;
}

export interface JobApplication {
    id?: string;
    jobId: string;
    jobTitle: string;
    employerId: string;
    companyName: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
    cvUrl: string;
    videoUrl: string | null;
    coverLetter: string;
    matchScore: number;
    status: 'pending' | 'shortlisted' | 'rejected' | 'hired';
    appliedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
