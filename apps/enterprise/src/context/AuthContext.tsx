'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, AuthResponse } from '@/types/auth';

interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<AuthResponse>;
    register: (name: string, email: string, password: string) => Promise<AuthResponse>;
    logout: () => void;
    updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        isAuthenticated: false,
        isLoading: true,
    });

    // Check for saved session
    useEffect(() => {
        const savedUser = localStorage.getItem('khanhub-user');
        if (savedUser) {
            try {
                setState({
                    user: JSON.parse(savedUser),
                    isAuthenticated: true,
                    isLoading: false,
                });
            } catch (error) {
                console.error('Failed to parse user session:', error);
                setState(prev => ({ ...prev, isLoading: false }));
            }
        } else {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    const login = async (email: string, password: string): Promise<AuthResponse> => {
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock login logic
            const user: User = {
                id: 'USR-' + Math.random().toString(36).substr(2, 9),
                fullName: email.split('@')[0], // Extract name from email for mock
                email,
                role: 'customer',
                createdAt: new Date().toISOString()
            };

            localStorage.setItem('khanhub-user', JSON.stringify(user));
            setState({
                user,
                isAuthenticated: true,
                isLoading: false,
            });

            return { success: true, message: 'Logged in successfully', user };
        } catch (error) {
            return { success: false, message: 'Login failed', error: 'Invalid credentials' };
        }
    };

    const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const user: User = {
                id: 'USR-' + Math.random().toString(36).substr(2, 9),
                fullName: name,
                email,
                role: 'customer',
                createdAt: new Date().toISOString()
            };

            localStorage.setItem('khanhub-user', JSON.stringify(user));
            setState({
                user,
                isAuthenticated: true,
                isLoading: false,
            });

            return { success: true, message: 'Registration successful', user };
        } catch (error) {
            return { success: false, message: 'Registration failed', error: 'Email already exists' };
        }
    };

    const logout = () => {
        localStorage.removeItem('khanhub-user');
        setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
        });
    };

    const updateProfile = (data: Partial<User>) => {
        if (!state.user) return;
        const updatedUser = { ...state.user, ...data };
        localStorage.setItem('khanhub-user', JSON.stringify(updatedUser));
        setState(prev => ({ ...prev, user: updatedUser }));
    };

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                register,
                logout,
                updateProfile
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
