'use client';

import { useState, useMemo, useEffect } from 'react';
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
    Video
} from 'lucide-react';
import { INDUSTRY_CATEGORIES } from '@/lib/data/categories';
import VideoCard from '@/components/video/VideoCard';
import MobileFilterBar from '@/components/browse/MobileFilterBar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

// Dummy Video Data
const DUMMY_VIDEOS = [
    { seekerId: 'user1', seekerName: 'Ahmad Ali', role: 'jobseeker', industry: 'Technology', subcategory: 'Software Engineer' },
    { seekerId: 'user2', seekerName: 'Sara Khan', role: 'employer', industry: 'Healthcare', subcategory: 'Hospital Admin' },
    { seekerId: 'user3', seekerName: 'Zainab Bibi', role: 'jobseeker', industry: 'Finance', subcategory: 'Accountant' },
    { seekerId: 'user4', seekerName: 'Bilal Ahmad', role: 'jobseeker', industry: 'Education', subcategory: 'Teacher' },
    { seekerId: 'user5', seekerName: 'Fatima Zahra', role: 'employer', industry: 'Technology', subcategory: 'UI/UX Designer' },
    { seekerId: 'user6', seekerName: 'Hamza Malik', role: 'jobseeker', industry: 'Engineering', subcategory: 'Civil Engineer' },
    { seekerId: 'user7', seekerName: 'Mubeen Ahmad', role: 'employer', industry: 'Retail', subcategory: 'Store Manager' },
    { seekerId: 'user8', seekerName: 'Ayesha Omer', role: 'jobseeker', industry: 'Healthcare', subcategory: 'Nurse' },
    { seekerId: 'user9', seekerName: 'Usman Ghani', role: 'jobseeker', industry: 'Technology', subcategory: 'Data Analyst' },
    { seekerId: 'user10', seekerName: 'Hafsa Qasim', role: 'employer', industry: 'Finance', subcategory: 'Banker' },
].map(v => ({
    ...v,
    id: v.seekerId,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-308-large.mp4',
    thumbnailUrl: ''
}));

export default function BrowsePage() {
    const { user } = useAuth();
    const [selectedRole, setSelectedRole] = useState<'all' | 'jobseeker' | 'employer'>('all');
    const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Filtered Videos
    const filteredVideos = useMemo(() => {
        return DUMMY_VIDEOS.filter(video => {
            const roleMatch = selectedRole === 'all' || video.role === selectedRole;
            const industryMatch = !selectedIndustry || video.industry === selectedIndustry;
            const searchMatch = !searchQuery ||
                video.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
                video.subcategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
                video.seekerName.toLowerCase().includes(searchQuery.toLowerCase());

            return roleMatch && industryMatch && searchMatch;
        });
    }, [selectedRole, selectedIndustry, searchQuery]);

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
                                { id: 'all', label: 'All Videos', icon: <LayoutGrid className="w-4 h-4" /> },
                                { id: 'jobseeker', label: 'Candidates', icon: <Users className="w-4 h-4" /> },
                                { id: 'employer', label: 'Companies', icon: <Building2 className="w-4 h-4" /> },
                            ].map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => setSelectedRole(role.id as any)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all border-2",
                                        selectedRole === role.id
                                            ? "bg-blue-50 border-blue-100 text-[#1B4FD8]"
                                            : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50"
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
                            {INDUSTRY_CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedIndustry(cat.label)}
                                    className={cn(
                                        "flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                                        selectedIndustry === cat.label
                                            ? "bg-blue-50 text-[#1B4FD8]"
                                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span>{cat.icon}</span>
                                        <span>{cat.label}</span>
                                    </div>
                                    <ChevronRight className={cn("w-4 h-4 opacity-0 transition-opacity", selectedIndustry === cat.label && "opacity-100")} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Search Bar (Sticky) */}
                <div className="sticky top-0 lg:top-[80px] z-40 bg-white border-b border-slate-100 p-3 lg:p-6 shadow-sm">
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

                {/* Mobile Filter Bar (Hidden on Desktop) */}
                <MobileFilterBar
                    selectedRole={selectedRole}
                    setSelectedRole={setSelectedRole}
                    selectedIndustry={selectedIndustry}
                    setSelectedIndustry={setSelectedIndustry}
                />

                {/* Video Grid */}
                <div className="p-4 lg:p-8">
                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-8">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="animate-pulse flex flex-col gap-3">
                                    <div className="aspect-[9/16] bg-slate-200 rounded-3xl" />
                                    <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto" />
                                    <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto" />
                                </div>
                            ))}
                        </div>
                    ) : filteredVideos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-8 overflow-x-hidden">
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
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
