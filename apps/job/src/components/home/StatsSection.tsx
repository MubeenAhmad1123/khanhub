'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { Video, Building2, Users, Clock } from 'lucide-react';

export default function StatsSection() {
    const [stats, setStats] = useState([
        { label: 'Videos Uploaded', value: '2,400+', icon: Video, color: 'text-blue-600' },
        { label: 'Companies Registered', value: '800+', icon: Building2, color: 'text-orange-600' },
        { label: 'Job Seekers', value: '5,000+', icon: Users, color: 'text-teal-600' },
        { label: 'Admin Approval Time', value: '30 Min', icon: Clock, color: 'text-green-600' },
    ]);

    useEffect(() => {
        const fetchLiveStats = async () => {
            try {
                // 1. Videos Uploaded (where is_live is true)
                const videosQuery = query(collection(db, 'videos'), where('is_live', '==', true));
                const videoCount = await getCountFromServer(videosQuery);

                // 2. Companies
                const companiesQuery = query(collection(db, 'users'), where('role', '==', 'employer'));
                const companyCount = await getCountFromServer(companiesQuery);

                // 3. Job Seekers
                const seekersQuery = query(collection(db, 'users'), where('role', '==', 'job_seeker'));
                const seekerCount = await getCountFromServer(seekersQuery);

                setStats([
                    { label: 'Videos Uploaded', value: `${videoCount.data().count.toLocaleString()}+`, icon: Video, color: 'text-blue-600' },
                    { label: 'Companies Registered', value: `${companyCount.data().count.toLocaleString()}+`, icon: Building2, color: 'text-orange-600' },
                    { label: 'Job Seekers', value: `${seekerCount.data().count.toLocaleString()}+`, icon: Users, color: 'text-teal-600' },
                    { label: 'Admin Approval Time', value: '30 Min', icon: Clock, color: 'text-green-600' },
                ]);
            } catch (error) {
                console.error("Error fetching live stats:", error);
                // Fallback to static numbers (already set by useState)
            }
        };

        fetchLiveStats();
    }, []);

    return (
        <section className="py-12 lg:py-20 bg-white border-b border-gray-100 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="flex flex-col items-center text-center group relative">
                            <div className="inline-flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 bg-gray-50 rounded-2xl mb-4 lg:mb-5 group-hover:scale-110 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-blue-500/10 transition-all duration-500">
                                <stat.icon className={`h-6 w-6 lg:h-7 lg:w-7 ${stat.color}`} />
                            </div>
                            <p className="text-2xl lg:text-4xl font-black text-slate-900 mb-1 lg:mb-2 tracking-tighter italic leading-none">
                                {stat.value}
                            </p>
                            <p className="text-slate-500 text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em]">
                                {stat.label}
                            </p>

                            {/* Border divider for desktop */}
                            {idx < 3 && (
                                <div className="hidden lg:block absolute right-[-24px] top-1/2 -translate-y-1/2 h-12 w-px bg-slate-100" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
