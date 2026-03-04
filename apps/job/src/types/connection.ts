export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface Connection {
    id: string;
    senderId: string;
    receiverId: string;
    seekerId?: string;
    employerId?: string;
    status: ConnectionStatus;
    createdAt: any;
    updatedAt: any;
    message?: string;
    type?: 'job_application' | 'general_contact';
}
