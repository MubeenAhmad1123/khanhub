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

// localStorage key for user-selected category (overrides DB default)
const USER_SELECTED_CATEGORY_KEY = 'jobreel_user_selected_category';
const ACTIVE_CATEGORY_KEY = 'jobreel_active_category';
const ACTIVE_ROLE_KEY = 'jobreel_active_role';
const PERMANENT_CATEGORY_KEY = 'jobreel_permanent_category';
const PERMANENT_ROLE_KEY = 'jobreel_permanent_role';

export function CategoryProvider({ children }: { children: React.ReactNode }) {
    // Synchronous initial state — user-selected takes priority over DB default
    const [activeCategory, setActiveCategoryState] = useState<CategoryKey>(() => {
        if (typeof window !== 'undefined') {
            // User explicitly chose a category — always honour this first
            const userSelected = localStorage.getItem(USER_SELECTED_CATEGORY_KEY);
            if (userSelected && Object.keys(CATEGORY_CONFIG).includes(userSelected)) {
                return userSelected as CategoryKey;
            }
            // Fall back to last saved category
            const saved = localStorage.getItem(ACTIVE_CATEGORY_KEY);
            if (saved && Object.keys(CATEGORY_CONFIG).includes(saved)) {
                return saved as CategoryKey;
            }
        }
        return 'jobs';
    });

    const [activeRole, setActiveRoleState] = useState<'provider' | 'seeker'>(() => {
        if (typeof window !== 'undefined') {
            const savedRole = localStorage.getItem(ACTIVE_ROLE_KEY);
            if (savedRole === 'provider' || savedRole === 'seeker') {
                return savedRole;
            }
        }
        return 'provider';
    });

    // Sync with Firebase Auth — but respect user-selected category override
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();

                    if (data.category && Object.keys(CATEGORY_CONFIG).includes(data.category)) {
                        // Store DB profile category as permanent baseline
                        localStorage.setItem(PERMANENT_CATEGORY_KEY, data.category);

                        // Only apply DB category if user has NOT manually selected one
                        const userSelected = localStorage.getItem(USER_SELECTED_CATEGORY_KEY);
                        if (!userSelected) {
                            setActiveCategoryState(data.category as CategoryKey);
                            localStorage.setItem(ACTIVE_CATEGORY_KEY, data.category);
                        }
                        // If user DID select a category, keep their choice — don't override
                    }

                    if (data.role) {
                        setActiveRoleState(data.role as 'provider' | 'seeker');
                        localStorage.setItem(PERMANENT_ROLE_KEY, data.role);
                    }
                }
            } else {
                // Logged out — restore last known category (user-selected takes priority)
                const userSelected = localStorage.getItem(USER_SELECTED_CATEGORY_KEY);
                const saved = userSelected
                    || localStorage.getItem(PERMANENT_CATEGORY_KEY)
                    || localStorage.getItem(ACTIVE_CATEGORY_KEY);

                if (saved && Object.keys(CATEGORY_CONFIG).includes(saved)) {
                    setActiveCategoryState(saved as CategoryKey);
                } else {
                    setActiveCategoryState('jobs');
                }

                const savedRole =
                    localStorage.getItem(PERMANENT_ROLE_KEY) ||
                    localStorage.getItem(ACTIVE_ROLE_KEY);
                if (savedRole === 'provider' || savedRole === 'seeker') {
                    setActiveRoleState(savedRole);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // CSS variable update whenever category changes
    useEffect(() => {
        const config = CATEGORY_CONFIG[activeCategory] || CATEGORY_CONFIG['jobs'];
        if (config) {
            document.documentElement.style.setProperty('--accent', config.accent);
            const glowColor = hexToRgba(config.accent, 0.3);
            document.documentElement.style.setProperty('--accent-glow', glowColor);
        }
    }, [activeCategory, activeRole]);

    // setCategory — called when user clicks a category in the dropdown
    // Saves to localStorage so refresh preserves the choice
    const setCategory = (cat: CategoryKey) => {
        setActiveCategoryState(cat);
        // Persist user-selected choice — survives refresh
        localStorage.setItem(USER_SELECTED_CATEGORY_KEY, cat);
        localStorage.setItem(ACTIVE_CATEGORY_KEY, cat);
    };

    const setRole = (role: 'provider' | 'seeker') => {
        setActiveRoleState(role);
        localStorage.setItem(ACTIVE_ROLE_KEY, role);
    };

    const categoryConfig = CATEGORY_CONFIG[activeCategory] || CATEGORY_CONFIG['jobs'];

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
                categoryConfig,
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
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
