'use client';

import React from 'react';
import { useCategory } from '@/context/CategoryContext';

export function FeedTabs() {
    const [activeTab, setActiveTab] = React.useState('for-you');

    const tabs = [
        { id: 'for-you', label: 'For You' },
        { id: 'nearby', label: 'Nearby' },
        { id: 'following', label: 'Following' },
    ];

    return (
        <div className="fixed top-16 left-0 right-0 z-40 flex justify-center pointer-events-none">
            <div className="flex items-center gap-6 bg-black/20 backdrop-blur-sm px-6 py-2 rounded-full pointer-events-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="relative"
                    >
                        <span className={`text-xs font-black uppercase tracking-widest transition-colors ${activeTab === tab.id ? 'text-white' : 'text-white/40'
                            }`}>
                            {tab.label}
                        </span>
                        {activeTab === tab.id && (
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[--accent] rounded-full" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
