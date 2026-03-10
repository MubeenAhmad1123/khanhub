'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CategoryKey, CategoryConfig, CATEGORY_CONFIG } from '@/lib/categories';

interface CategoryContextType {
    activeCategory: CategoryKey;
    activeRole: 'provider' | 'seeker';
    setCategory: (cat: CategoryKey) => void;
    setRole: (role: 'provider' | 'seeker') => void;
    setActiveCategory: (cat: CategoryKey) => void;
    setActiveRole: (role: 'provider' | 'seeker') => void;
    accentColor: string;
    categoryConfig: CategoryConfig;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

import { auth, db } from '@/lib/firebase/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export function CategoryProvider({ children }: { children: React.ReactNode }) {
    // Synchronous initial state from localStorage
    const [activeCategory, setActiveCategory] = useState<CategoryKey>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('jobreel_active_category');
            if (saved && Object.keys(CATEGORY_CONFIG).includes(saved)) {
                return saved as CategoryKey;
            }
        }
        return 'dailywages';
    });

    const [activeRole, setActiveRole] = useState<'provider' | 'seeker'>(() => {
        if (typeof window !== 'undefined') {
            const savedRole = localStorage.getItem('jobreel_active_role');
            if (savedRole === 'provider' || savedRole === 'seeker') {
                return savedRole;
            }
        }
        return 'provider';
    });

    // Restore from localStorage (Guest) - No longer strictly needed for initialization but kept for safety
    useEffect(() => {
        const saved = localStorage.getItem('jobreel_active_category');
        if (saved && Object.keys(CATEGORY_CONFIG).includes(saved)) {
            setActiveCategory(saved as CategoryKey);
        }
        const savedRole = localStorage.getItem('jobreel_active_role');
        if (savedRole === 'provider' || savedRole === 'seeker') {
            setActiveRole(savedRole);
        }
    }, []);

    // Sync with Firebase Auth
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.category && Object.keys(CATEGORY_CONFIG).includes(data.category)) {
                        setActiveCategory(data.category as CategoryKey);
                    }
                    if (data.role) setActiveRole(data.role as 'provider' | 'seeker');
                }
            } else {
                // Return to localStorage prefs if logged out
                const saved = localStorage.getItem('jobreel_active_category');
                if (saved && Object.keys(CATEGORY_CONFIG).includes(saved)) {
                    setActiveCategory(saved as CategoryKey);
                } else {
                    setActiveCategory('dailywages');
                }
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        localStorage.setItem('jobreel_active_category', activeCategory);
        localStorage.setItem('jobreel_active_role', activeRole);

        // Update CSS Variable
        const config = CATEGORY_CONFIG[activeCategory] || CATEGORY_CONFIG['dailywages'];
        if (config) {
            document.documentElement.style.setProperty('--accent', config.accent);

            // Create accent glow (30% opacity)
            const glowColor = hexToRgba(config.accent, 0.3);
            document.documentElement.style.setProperty('--accent-glow', glowColor);
        }
    }, [activeCategory, activeRole]);

    const setCategory = (cat: CategoryKey) => setActiveCategory(cat);
    const setRole = (role: 'provider' | 'seeker') => setActiveRole(role);

    const categoryConfig = CATEGORY_CONFIG[activeCategory] || CATEGORY_CONFIG['dailywages'];

    return (
        <CategoryContext.Provider
            value={{
                activeCategory,
                activeRole,
                setCategory,
                setRole,
                setActiveCategory: setCategory,
                setActiveRole: setRole,
                accentColor: categoryConfig.accent,
                categoryConfig
            }}
        >
            {children}
        </CategoryContext.Provider>
    );
}

export function useCategory() {
    const context = useContext(CategoryContext);
    if (context === undefined) {
        throw new Error('useCategory must be used within a CategoryProvider');
    }
    return context;
}

function hexToRgba(hex: string, opacity: number) {
    let r = 0, g = 0, b = 0;
    // 3 digits
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    }
    // 6 digits
    else if (hex.length === 7) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
