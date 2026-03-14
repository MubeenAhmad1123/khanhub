'use client';

import React, { useState, useRef } from 'react';
import { Search, Bell, ChevronDown, Menu, X } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { useCategory } from '@/context/CategoryContext';

import { CATEGORY_CONFIG, CategoryKey, CategoryConfig } from '@/lib/categories';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { startProgress } from '@/components/layout/RouteProgressBar';

import { db } from '@/lib/firebase/firebase-config';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import NotificationDropdown from './NotificationDropdown';
import HamburgerDrawer from './HamburgerDrawer';
import { useClickOutside } from '@/hooks/useClickOutside';

export function TopBar({ hideCategorySwitcher = false }: { hideCategorySwitcher?: boolean }) {
    const { activeCategory, categoryConfig, setCategory } = useCategory();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const isFeed = pathname === '/feed' || pathname.startsWith('/feed');
    const iconColor = isFeed ? '#FFFFFF' : '#0A0A0A';

    // Search state
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    const handleSearchToggle = () => {
        setSearchOpen(prev => !prev);
        if (!searchOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            setSearchQuery('');
        }
    };

    // Notification state
    const [notifOpen, setNotifOpen] = useState(false);
    const triggerNotifRef = useRef<HTMLButtonElement>(null);

    const [unreadCount, setUnreadCount] = useState(0);
    const [uid, setUid] = useState<string | null>(null);

    useEffect(() => {
        const auth = getAuth();
        const unsub = onAuthStateChanged(auth, user => {
            setUid(user?.uid || null);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!uid) return;
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', uid),
            where('isRead', '==', false),
            limit(99)
        );
        const unsub = onSnapshot(q, snap => {
            setUnreadCount(snap.size);
        }, () => { });
        return () => unsub();
    }, [uid]);

    const [showSwitcher, setShowSwitcher] = useState(false);
    const switcherRef = useRef<HTMLDivElement>(null);
    const switcherTriggerRef = useRef<HTMLButtonElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    const [drawerOpen, setDrawerOpen] = useState(false);

    useClickOutside([switcherRef, switcherTriggerRef], () => setShowSwitcher(false), showSwitcher);

    return (
        <header style={{
            position: 'sticky', top: 0, zIndex: 1000,
            background: isFeed ? 'transparent' : '#FFFFFF',
            backdropFilter: isFeed ? 'none' : 'blur(10px)',
            borderBottom: isFeed ? 'none' : '1px solid #F0F0F0',
            // Mobile edge-to-edge fix:
            marginLeft: '-1px', marginRight: '-1px',
            padding: '0 4px',
        }}>
            <div style={{
                height: '56px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 12px',
                maxWidth: '600px', margin: '0 auto',
            }}>
                {/* Left: Brand */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        style={{
                            fontSize: '16px',
                            fontWeight: 800,
                            letterSpacing: '-0.5px',
                            color: iconColor,
                            textTransform: 'uppercase',
                            fontStyle: 'italic',
                            textDecoration: 'none'
                        }}
                    >
                        KHAN HUB
                    </Link>
                </div>

                {/* Center: Category Dropdown */}
                {!hideCategorySwitcher && (
                    <div className="relative">
                        <button
                            ref={switcherTriggerRef}
                            onClick={() => {
                                if (!showSwitcher && switcherTriggerRef.current) {
                                    const rect = switcherTriggerRef.current.getBoundingClientRect();
                                    const dropdownWidth = 240; 
                                    let leftPos = rect.left;
                                    if (leftPos + dropdownWidth > window.innerWidth - 16) {
                                        leftPos = window.innerWidth - dropdownWidth - 16;
                                    }
                                    if (leftPos < 8) leftPos = 8;
                                    setDropdownPos({
                                        top: rect.bottom + 8,
                                        left: leftPos,
                                    });
                                }
                                setShowSwitcher(!showSwitcher);
                            }}
                            className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full hover:border-[--accent] transition-all"
                        >
                            <span className="text-[11px] font-black font-poppins uppercase tracking-wider text-[#0A0A0A]">
                                {categoryConfig?.label || 'All'}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-[#333333] transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showSwitcher && (
                                <motion.div
                                    ref={switcherRef}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    style={{
                                        position: 'fixed',
                                        top: dropdownPos.top,
                                        left: dropdownPos.left,
                                        minWidth: '200px',
                                        width: 'max-content',
                                        maxWidth: '240px',
                                        zIndex: 9999,
                                    }}
                                    className="bg-white border border-[#E5E5E5] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-3 grid grid-cols-1 gap-1 overflow-hidden"
                                >
                                    <div className="px-4 py-2 mb-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Category</span>
                                    </div>
                                    {(Object.entries(CATEGORY_CONFIG) as [CategoryKey, CategoryConfig][]).map(([key, config]) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setShowSwitcher(false);
                                                setCategory(key as CategoryKey);
                                            }}
                                            className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all whitespace-nowrap ${activeCategory === key
                                                ? 'bg-[#F0F0F0] border border-[#E5E5E5] text-[#0A0A0A]'
                                                : 'hover:bg-black/5 text-[#444444]'
                                                }`}
                                        >
                                            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10">
                                                {config.imageUrl ? (
                                                    <Image src={config.imageUrl} alt={config.label} fill className="object-cover" />
                                                ) : (
                                                    <span className="text-sm">{config.emoji}</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-black font-poppins uppercase tracking-wider text-[#0A0A0A] whitespace-nowrap">{config.label}</span>
                                            {activeCategory === key && (
                                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[--accent]" />
                                            )}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Right: Icons & Menu */}
                <div className="flex items-center gap-1.5 flex-1 justify-end">

                    {/* Expanding search container */}
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <div style={{
                            overflow: 'hidden',
                            width: searchOpen ? '180px' : '0px',
                            transition: 'width 0.3s ease',
                            marginRight: searchOpen ? '8px' : '0px',
                        }}>
                            <input
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && searchQuery.trim()) {
                                        router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
                                        setSearchOpen(false);
                                        setSearchQuery('');
                                    }
                                    if (e.key === 'Escape') {
                                        setSearchOpen(false);
                                        setSearchQuery('');
                                    }
                                }}
                                placeholder="Search..."
                                style={{
                                    width: '100%',
                                    background: isFeed ? 'rgba(255,255,255,0.2)' : '#F0F0F0',
                                    border: 'none',
                                    borderRadius: '20px',
                                    padding: '7px 14px',
                                    fontSize: '13px',
                                    color: iconColor,
                                    outline: 'none',
                                }}
                                className="placeholder-current"
                            />
                        </div>

                        <button
                            onClick={handleSearchToggle}
                            style={{
                                background: 'none', border: 'none',
                                cursor: 'pointer', padding: '4px',
                                display: 'flex', alignItems: 'center',
                                color: iconColor,
                            }}
                        >
                            {searchOpen
                                ? <X size={20} />
                                : <Search size={20} />
                            }
                        </button>
                    </div>

                    {/* Notification Bell */}
                    <button
                        ref={triggerNotifRef}
                        onClick={() => setNotifOpen(prev => !prev)}
                        style={{
                            position: 'relative', background: 'none',
                            border: 'none', cursor: 'pointer', padding: '4px',
                            display: 'flex', alignItems: 'center',
                        }}
                    >
                        <Bell size={20} color={iconColor} />
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: '0px', right: '0px',
                                background: '#FF0000', color: 'white',
                                borderRadius: '50%', minWidth: '16px', height: '16px',
                                fontSize: '10px', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1.5px solid white', lineHeight: 1,
                            }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    <NotificationDropdown 
                        isOpen={notifOpen} 
                        onClose={() => setNotifOpen(false)} 
                        triggerRef={triggerNotifRef}
                    />

                    <button
                        onClick={() => setDrawerOpen(true)}
                        style={{
                            background: 'none', border: 'none',
                            cursor: 'pointer', padding: '4px',
                            display: 'flex', alignItems: 'center',
                        }}
                    >
                        <Menu size={22} color={iconColor} />
                    </button>

                    <HamburgerDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
                </div>
            </div>
        </header>
    );
}


