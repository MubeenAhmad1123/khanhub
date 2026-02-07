// Auth Types for Khanhub Store

export interface User {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    role: 'customer' | 'admin';
    avatar?: string;
    createdAt: string;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    user?: User;
    error?: string;
}
