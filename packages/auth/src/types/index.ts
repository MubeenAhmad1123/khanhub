export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    phoneNumber?: string | null;
}

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    signInWithGoogle: () => Promise<User>;
    signInWithEmail: (email: string, password: string) => Promise<User>;
    signUpWithEmail: (email: string, password: string, displayName: string, phoneNumber?: string) => Promise<User>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}
