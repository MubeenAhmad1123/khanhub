'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User as UserIcon, LogOut, Heart, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthButton() {
    const { user, signOut, loading } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut();
            setShowUserMenu(false);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
            </div>
        );
    }

    if (user) {
        return (
            <div className="relative">
                <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                    {user.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName || 'User'}
                            className="w-8 h-8 rounded-full border-2 border-primary-500"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold">
                            {(user.displayName || user.email || 'U')[0].toUpperCase()}
                        </div>
                    )}
                    <span className="hidden md:block font-medium text-gray-700">
                        {user.displayName || user.email?.split('@')[0]}
                    </span>
                </button>

                {showUserMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-[999]"
                            onClick={() => setShowUserMenu(false)}
                        ></div>
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[1000] animate-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-3 border-b border-gray-50 bg-slate-50/50 rounded-t-2xl">
                                <p className="font-bold text-gray-900 truncate">
                                    {user.displayName || 'User'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                            <div className="p-1">
                                <Link
                                    href="/account"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    <UserIcon className="h-4 w-4 text-gray-400" />
                                    My Profile
                                </Link>
                                <Link
                                    href="/account/wishlist"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    <Heart className="h-4 w-4 text-gray-400" />
                                    Wishlist
                                </Link>
                                <Link
                                    href="/orders"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    <ShoppingBag className="h-4 w-4 text-gray-400" />
                                    Orders
                                </Link>
                                <div className="h-px bg-gray-100 my-1 mx-2"></div>
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <Link
                href="/auth/login"
                className="px-4 py-2 text-gray-700 hover:text-primary-600 font-semibold transition-colors"
            >
                Sign In
            </Link>
            <Link
                href="/auth/register"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/25"
            >
                Sign Up
            </Link>
        </div>
    );
}
