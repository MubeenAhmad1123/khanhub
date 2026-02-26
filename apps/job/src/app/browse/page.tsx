'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Search,
    Filter,
    LayoutGrid,
    Users,
    Building2,
    ChevronRight,
    Play,
    Info,
    Menu,
    X,
    ArrowRight,
    Video,
    Loader2
} from 'lucide-react';
import { INDUSTRIES } from '@/lib/constants/categories';
import VideoCard from '@/components/video/VideoCard';
import MobileFilterBar from '@/components/browse/MobileFilterBar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

interface VideoData {
    id: string; // User ID
    seekerId: string;
    role: string;
    industry: string;
    subcategory: string;
    videoUrl: string;
    thumbnailUrl: string;
    experience?: string | number;
    salary?: string;
    hiringFor?: string;
    expectedExperience?: string;
    salaryMin?: number;
    salaryMax?: number;
    hideSalary?: boolean;
    jobType?: string;
    targetJobTitle?: string;
}

function BrowseContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [selectedRole, setSelectedRole] = useState<'all' | 'jobseeker' | 'employer'>('all');
    const [selectedIndustry, setSelectedIndustry] = useState<string | null>(searchParams.get('industry'));
    const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [videos, setVideos] = useState<VideoData[]>([]);

    useEffect(() => {
        // Update industry if query param changes
        const industry = searchParams.get('industry');
        if (industry) setSelectedIndustry(industry);

        const fetchVideos = async () => {
            try {
                setLoading(true);
                const loadedVideos: VideoData[] = [];

                // 1. Fetch Videos (from videos collection)
                // REQUIRED FIRESTORE INDEX: videos collection
                // Fields: is_live (ASC), admin_status (ASC)
                // Create at: Firebase Console → Firestore → Indexes
                const videosQuery = query(
                    collection(db, 'videos'),
                    where('is_live', '==', true),
                    where('admin_status', '==', 'approved')
                );
                const videosSnap = await getDocs(videosQuery);

                const usersSnap = await getDocs(collection(db, 'users'));
                const usersMap: Record<string, any> = {};
                usersSnap.forEach(d => usersMap[d.id] = d.data());

                videosSnap.forEach((docSnap) => {
                    const data = docSnap.data();
                    const userData = usersMap[data.userId] || {};

                    const videoRole = (data.role === 'employer' || data.role === 'company')
                        ? 'employer'
                        : 'jobseeker';

                    loadedVideos.push({
                        id: docSnap.id,
                        seekerId: data.userId,
                        role: videoRole,
                        industry: data.industry || userData.industry || 'General',
                        subcategory: data.subcategory
                            || userData.subcategory
                            || userData.desiredJobTitle
                            || 'General',
                        videoUrl: data.videoUrl || data.cloudinaryUrl || '',
                        thumbnailUrl: data.thumbnailUrl || userData.photoURL || '',
                        experience: userData.totalExperience
                            || userData.profile?.yearsOfExperience
                            || '',
                        salary: '',
                        hiringFor: data.hiringFor || null,
                        expectedExperience: data.expectedExperience || null,
                        salaryMin: data.salaryMin || null,
                        salaryMax: data.salaryMax || null,
                        hideSalary: data.hideSalary || false,
                        jobType: data.jobType || null,
                        targetJobTitle: data.targetJobTitle || null,
                    });
                });

                setVideos(loadedVideos);
            } catch (error) {
                console.error("Error fetching videos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, [searchParams]);

    // Industry Counts
    const industryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        videos.forEach(v => {
            counts[v.industry] = (counts[v.industry] || 0) + 1;
        });
        return counts;
    }, [videos]);

    // Filtered Videos
    const filteredVideos = useMemo(() => {
        return videos.filter(video => {
            const roleMatch = selectedRole === 'all' || video.role === selectedRole;
            const industryMatch = !selectedIndustry || video.industry === selectedIndustry;
            const subcategoryMatch = !selectedSubcategory || video.subcategory === selectedSubcategory;
            const searchMatch = !searchQuery ||
                video.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
                video.subcategory.toLowerCase().includes(searchQuery.toLowerCase());

            return roleMatch && industryMatch && subcategoryMatch && searchMatch;
        });
    }, [selectedRole, selectedIndustry, selectedSubcategory, searchQuery, videos]);

    return (
        <div className="min-h-screen bg-[#F8FAFF] flex flex-col lg:flex-row">
            {/* Left Sidebar (Desktop Only) */}
            <aside className="hidden lg:flex flex-col w-80 bg-white border-r border-slate-200 sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto p-8">
                <div className="mb-10">
                    <h2 className="text-xl font-black text-[#0F172A] flex items-center gap-2 mb-8">
                        <LayoutGrid className="w-5 h-5 text-[#1B4FD8]" />
                        Filter Videos
                    </h2>

                    {/* Role Filter */}
                    <div className="mb-10">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                            I am looking for
                        </label>
                        <div className="flex flex-col gap-2">
                            {[
                                { id: 'all', label: 'All Content', icon: <LayoutGrid className="w-4 h-4" /> },
                                { id: 'jobseeker', label: 'Candidates', icon: <Users className="w-4 h-4" /> },
                                { id: 'employer', label: 'Companies', icon: <Building2 className="w-4 h-4" /> },
                            ].map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => setSelectedRole(role.id as any)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all border-2 uppercase tracking-tighter italic",
                                        selectedRole === role.id
                                            ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                                            : "bg-transparent border-transparent text-slate-500 hover:bg-slate-50"
                                    )}
                                >
                                    {role.icon}
                                    {role.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Industry Filter */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                            Industry
                        </label>
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => setSelectedIndustry(null)}
                                className={cn(
                                    "text-left px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                    !selectedIndustry ? "text-[#1B4FD8] bg-blue-50" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                All Industries
                            </button>
                            {INDUSTRIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setSelectedIndustry(cat.id);
                                        setSelectedSubcategory(null);
                                    }}
                                    className={cn(
                                        "flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                                        selectedIndustry === cat.id
                                            ? "bg-blue-50 text-[#1B4FD8]"
                                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span>{cat.icon}</span>
                                        <span>{cat.label}</span>
                                        {industryCounts[cat.id] > 0 && (
                                            <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                                {industryCounts[cat.id]}
                                            </span>
                                        )}
                                    </div>
                                    <ChevronRight className={cn("w-4 h-4 opacity-0 transition-opacity", selectedIndustry === cat.id && "opacity-100")} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Search Bar & Subcategory Pills (Sticky) */}
                <div className="sticky top-0 lg:top-[80px] z-40 bg-white border-b border-slate-100 shadow-sm">
                    <div className="p-3 lg:p-6 pb-2 lg:pb-3">
                        <div className="relative max-w-2xl mx-auto lg:mx-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Find talent or companies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-blue-200 rounded-2xl outline-none transition-all text-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Subcategory Pills */}
                    {selectedIndustry && (
                        <div className="px-3 lg:px-6 pb-4">
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                                <button
                                    onClick={() => setSelectedSubcategory(null)}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-2",
                                        !selectedSubcategory
                                            ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                    )}
                                >
                                    All {INDUSTRIES.find(i => i.id === selectedIndustry)?.label || 'Results'}
                                </button>
                                {INDUSTRIES.find(i => i.id === selectedIndustry)?.subcategories.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setSelectedSubcategory(sub.label)}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-2",
                                            selectedSubcategory === sub.label
                                                ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        {sub.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile Filter Bar (Hidden on Desktop) */}
                <MobileFilterBar
                    selectedRole={selectedRole}
                    setSelectedRole={setSelectedRole}
                    selectedIndustry={selectedIndustry}
                    setSelectedIndustry={setSelectedIndustry}
                    selectedSubcategory={selectedSubcategory}
                    setSelectedSubcategory={setSelectedSubcategory}
                />

                {/* Results Count */}
                {!loading && (
                    <div className="px-4 lg:px-8 pt-6 pb-2 flex items-center justify-between">
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                            {filteredVideos.length}
                            {filteredVideos.length === 1 ? ' Profile' : ' Profiles'} Found
                        </p>
                    </div>
                )}

                {/* Video Grid */}
                <div className="p-4 lg:p-8">
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-8">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="animate-pulse flex flex-col gap-3">
                                    <div className="aspect-[9/16] bg-slate-200 rounded-3xl" />
                                    <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto" />
                                    <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto" />
                                </div>
                            ))}
                        </div>
                    ) : filteredVideos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 sm:gap-4 lg:gap-8 overflow-x-hidden">
                            {filteredVideos.map((item) => (
                                <VideoCard
                                    key={item.id}
                                    {...item}
                                    role={item.role as any}
                                    className="animate-in fade-in zoom-in-95 duration-500"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center py-20 px-4">
                            {selectedRole !== 'all' || selectedIndustry ? (
                                <>
                                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                        <Filter className="w-12 h-12 text-slate-200" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2">No results in this filter</h3>
                                    <p className="text-slate-500 font-bold mb-8 max-w-xs">
                                        Try selecting a different industry or switch to All Content
                                    </p>
                                    <button
                                        onClick={() => {
                                            setSelectedRole('all');
                                            setSelectedIndustry(null);
                                            setSelectedSubcategory(null);
                                        }}
                                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        Clear Filters
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                        <Video className="w-12 h-12 text-slate-200" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2">No videos here yet</h3>
                                    <p className="text-slate-500 font-bold mb-8 max-w-xs">
                                        Be the first to upload and get discovered in this category.
                                    </p>
                                    <button
                                        onClick={() => window.location.href = '/dashboard/video'}
                                        className="px-8 py-4 bg-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                        Upload Your Video
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function BrowsePage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>}>
            <BrowseContent />
        </Suspense>
    );
}
