// Main exports
export { AuthProvider, useAuth } from './context/AuthContext';
export { initializeFirebase } from './lib/firebase';
export type { User, AuthContextType } from './types';

// Component exports
export { default as AuthButton } from './components/AuthButton';
export { default as LoginModal } from './components/LoginModal';
export { default as SignupModal } from './components/SignupModal';
