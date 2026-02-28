'use client';

import React, { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import Image from 'next/image';
import { MapPin, Phone, Building2, User, Play, Briefcase, GraduationCap, Award, Lightbulb, Loader2, ArrowRight, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ConnectModal from '@/components/video/ConnectModal';
import StructuredData from '@/components/seo/StructuredData';

// Generate dynamic data for SEO
const getProfileStructuredData = (userData: any, isEmployer: boolean) => {
    if (isEmployer) {
        return {
            title: userData.company?.name || userData.displayName || 'Job Opportunity',
            description: userData.company?.description || userData.bio || 'Join our team.',
            company: userData.company?.name || userData.displayName,
            location: userData.company?.location || userData.location || 'Pakistan',
            datePosted: userData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            employmentType: 'FULL_TIME',
            baseSalary: userData.company?.salaryRange || 'Competitive',
        };
    }
    return {
        name: userData.profile?.fullName || userData.displayName,
        jobTitle: userData.profile?.preferredJobTitle || 'Candidate',
        description: userData.profile?.bio || 'Professional profile.',
    };
};

export default function PublicProfilePage() {
    const params = useParams();
    const role = params.role as string;
    const id = params.id as string;

    const { user } = useAuth();
    const [showConnectModal, setShowConnectModal] = useState(false);

    const [userData, setUserData] = useState<any>(null);
    const [userVideos, setUserVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFoundError, setNotFoundError] = useState(false);

    useEffect(() => {
        if (role !== 'jobseeker' && role !== 'employer') {
            setNotFoundError(true);
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', id));
                if (!userDoc.exists()) {
                    setNotFoundError(true);
                } else {
                    setUserData({ id: userDoc.id, ...userDoc.data() });

                    // Fetch all approved videos for this user
                    const videosQuery = query(
                        collection(db, 'videos'),
                        where('userId', '==', id),
                        where('is_live', '==', true),
                        where('admin_status', '==', 'approved')
                    );
                    const videosSnap = await getDocs(videosQuery);
                    const videosList = videosSnap.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .sort((a: any, b: any) => {
                            // Sort by videoIndex so Video 1 always shows first
                            return (a.videoIndex || 1) - (b.videoIndex || 1);
                        });
                    setUserVideos(videosList);
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
                setNotFoundError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id, role]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (notFoundError || !userData) {
        notFound();
    }

    const isEmployer = userData.role === 'employer';

    // Determine who is viewing and who is being viewed
    const viewerRole = user?.role || null;                  // logged-in user's role
    const profileRole = userData?.role || role;       // the profile owner's role
    const isOwnProfile = user?.uid === id;

    // Extract data based on role
    const profileData = isEmployer ? (userData.company || userData.companyProfile) : userData.profile;
    if (!profileData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Profile Not Setup</h2>
                    <p className="text-slate-500">This user hasn't completed their profile yet.</p>
                </div>
            </div>
        );
    }

    const displayName = isEmployer ? (profileData.name || profileData.companyName || userData.displayName) : (profileData.fullName || userData.displayName);
    const displayPhone = profileData.phone || profileData.contactPhone || userData.phoneNumber || 'Contact Restricted';
    const displayLocation = profileData.location || profileData.address || 'Location Not Specified';
    const displayIndustry = userData.industry || profileData.industry || 'General';
    const displaySubcategory = userData.subcategory || profileData.preferredSubcategory || profileData.subcategory || 'General';
    const displayBio = profileData.description || profileData.bio || 'This profile represents a verified member of our community, committed to professional excellence and collaboration within their industry.';
    const displayPhoto = isEmployer ? (profileData.logoUrl || profileData.logo || userData.photoURL) : (profileData.photo || userData.photoURL);



    return (
        <div className="min-h-screen bg-[#F8FAFF] selection:bg-blue-100 selection:text-blue-900 pb-20">
            {/* SEO Structured Data */}
            <StructuredData
                type={isEmployer ? 'JobPosting' : 'BreadcrumbList'}
                data={getProfileStructuredData(userData, isEmployer)}
            />

            {/* Dynamic Hero Section */}
            <div className="relative h-[40vh] sm:h-[50vh] w-full overflow-hidden bg-slate-900">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 opacity-90" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />

                {/* Floating Elements for visual depth */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[150px] animate-pulse delay-700" />

                <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-12 sm:pb-20">
                    <div className="animate-in slide-in-from-bottom-8 duration-700 delay-100">
                        <div className="flex flex-wrap gap-3 mb-6">
                            <span className="px-4 py-1.5 rounded-full bg-blue-500/20 backdrop-blur-md border border-white/10 text-blue-200 text-[10px] font-black uppercase tracking-[0.2em]">
                                {displayIndustry}
                            </span>
                            <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/5 text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">
                                {displaySubcategory}
                            </span>
                        </div>
                        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white italic tracking-tighter leading-none mb-4">
                            {displayName}
                        </h1>
                        <p className="text-blue-200/70 text-lg sm:text-xl font-medium tracking-tight max-w-2xl">
                            {userData.role_in_category || profileData.preferredJobTitle || `Verified ${isEmployer ? 'Company' : 'Candidate'}`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-12 sm:-mt-16 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Profile Sidebar */}
                    <div className="lg:col-span-4 space-y-8 animate-in slide-in-from-left-8 duration-700">
                        {/* Avatar Card */}
                        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 p-8 border border-white relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent pointer-events-none" />

                            <div className="relative mb-8 text-center sm:text-left">
                                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2rem] bg-slate-100 overflow-hidden shadow-2xl shadow-blue-500/20 mx-auto sm:mx-0 ring-4 ring-white relative group-hover:scale-105 transition-transform duration-500">
                                    {displayPhoto ? (
                                        <Image src={displayPhoto} alt={displayName} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-5xl font-black text-blue-600 bg-blue-50">
                                            {displayName?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                {(isOwnProfile || (viewerRole === 'employer' && profileRole === 'job_seeker')) ? (
                                    <>
                                        <div className="flex items-center gap-4 group/item">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:text-blue-600 group-hover/item:bg-blue-50 transition-all">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Location</p>
                                                <p className="text-sm font-black text-slate-800">{displayLocation}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 group/item">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:text-green-600 group-hover/item:bg-green-50 transition-all">
                                                <Phone className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Phone</p>
                                                <p className="text-sm font-black text-slate-800">{displayPhone}</p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                            <span>🔒</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Hidden</p>
                                            <p className="text-xs font-bold text-slate-400">رابطہ چھپا ہوا ہے</p>
                                        </div>
                                    </div>
                                )}

                                {!isEmployer && (
                                    <div className="flex items-center gap-4 group/item">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:text-orange-600 group-hover/item:bg-orange-50 transition-all">
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Experience</p>
                                            <p className="text-sm font-black text-slate-800">
                                                {profileData.yearsOfExperience || 'Entry Level'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ===== SMART CTA SECTION ===== */}
                            {!isOwnProfile && (
                                <div className="flex flex-col gap-3 mt-6">

                                    {/* Case 1: Employer viewing a Job Seeker */}
                                    {viewerRole === 'employer' && profileRole === 'job_seeker' && (
                                        <button
                                            onClick={() => setShowConnectModal(true)}
                                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                                        >
                                            <span>💼</span>
                                            Hire This Candidate · امیدوار کو بھرتی کریں
                                        </button>
                                    )}

                                    {/* Case 2: Job Seeker viewing an Employer */}
                                    {viewerRole === 'job_seeker' && profileRole === 'employer' && (
                                        <>
                                            <button
                                                onClick={() => setShowConnectModal(true)}
                                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                                            >
                                                <span>📨</span>
                                                Apply / Contact Company · رابطہ کریں
                                            </button>
                                            {/* Show their video cards with "Apply for this job" on each video */}
                                            <p className="text-xs text-slate-400 font-bold text-center uppercase tracking-widest">
                                                Watch their job videos below and apply to a specific role
                                            </p>
                                        </>
                                    )}

                                    {/* Case 3: Job Seeker viewing another Job Seeker — NO CTA, info only */}
                                    {viewerRole === 'job_seeker' && profileRole === 'job_seeker' && (
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                                Candidate Profile · امیدوار پروفائل
                                            </p>
                                            <p className="text-xs text-slate-500 font-medium mt-1">
                                                Contact details are visible to employers only.
                                                رابطہ تفصیلات صرف آجروں کے لیے ہیں۔
                                            </p>
                                        </div>
                                    )}

                                    {/* Case 4: Employer viewing another Employer — read only */}
                                    {viewerRole === 'employer' && profileRole === 'employer' && (
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                                Company Profile · کمپنی پروفائل
                                            </p>
                                        </div>
                                    )}

                                    {/* Case 5: Not logged in */}
                                    {!user && (
                                        <a
                                            href="/auth/login"
                                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl flex items-center justify-center gap-3 hover:bg-slate-800 active:scale-95 transition-all"
                                        >
                                            <span>🔐</span>
                                            Login to Connect · رابطہ کریں
                                        </a>
                                    )}
                                </div>
                            )}
                            {/* ===== END SMART CTA SECTION ===== */}
                        </div>

                        {/* Skills / Perks */}
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 p-8 border border-slate-50 overflow-hidden">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3 italic">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                {isEmployer ? 'Company Benefits' : 'Core Expertise'}
                            </h3>
                            <div className="flex flex-wrap gap-2.5">
                                {(isEmployer ? (profileData.benefits || ['Innovation', 'Culture', 'Growth']) : (profileData.skills || ['Leadership', 'Problem Solving'])).map((item: string, i: number) => (
                                    <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 text-xs font-black rounded-xl border border-slate-100 hover:border-blue-200 hover:text-blue-600 transition-all cursor-default uppercase tracking-tight">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Profile Main Content */}
                    <div className="lg:col-span-8 space-y-10 animate-in slide-in-from-right-8 duration-700 delay-200">
                        {/* Video Showcase - The Central Piece */}
                        {userVideos.length > 0 && (
                            <div className="space-y-6">
                                {userVideos.map((video: any, index: number) => (
                                    <div
                                        key={video.id}
                                        className="bg-slate-950 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-800 group relative"
                                    >
                                        <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none" />
                                        <div className="px-8 py-6 bg-slate-900 border-b border-slate-800 flex justify-between items-center relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                                                <h3 className="text-white font-black uppercase tracking-widest text-xs italic">
                                                    {isEmployer
                                                        ? 'Company Pitch'
                                                        : index === 0
                                                            ? 'Video Resume'
                                                            : 'Second Introduction'}
                                                </h3>
                                            </div>
                                            {userVideos.length > 1 && (
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    Video {index + 1} of {userVideos.length}
                                                </span>
                                            )}
                                        </div>
                                        <div className="aspect-video relative bg-black group-hover:scale-[1.01] transition-transform duration-700">
                                            <video
                                                src={video.videoUrl || video.cloudinaryUrl}
                                                controls
                                                playsInline
                                                poster={video.thumbnailUrl || displayPhoto}
                                                className="w-full h-full object-cover sm:object-contain"
                                            >
                                                Your browser does not support the video tag.
                                            </video>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* About Section */}
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 p-10 border border-slate-50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[5rem] -mr-8 -mt-8 opacity-50" />
                            <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3 italic tracking-tight">
                                <User className="w-7 h-7 text-blue-600" />
                                Professional Story
                            </h3>
                            <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap font-medium tracking-tight relative z-10">
                                {displayBio}
                            </p>
                        </div>

                        {/* Additional Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 p-8 border border-slate-50">
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Background</h4>
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <GraduationCap className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900 uppercase">Education</p>
                                            <p className="text-sm text-slate-500 font-bold">{typeof profileData.education === 'string' ? profileData.education : 'Advanced Degree Holder'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                            <Award className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900 uppercase">Achievements</p>
                                            <p className="text-sm text-slate-500 font-bold">Top Verified Profile Status</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] shadow-2xl p-8 text-white flex flex-col justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10">
                                    <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-4 opacity-70">Next Steps</h4>
                                    <h3 className="text-2xl font-black italic mb-6 leading-tight">Ready to collaborate and build the future?</h3>
                                    <div className="flex items-center gap-3 text-sm font-black uppercase tracking-widest border-b border-white/30 pb-2 w-fit group-hover:gap-5 transition-all decoration-2 underline-offset-8">
                                        View Full Portfolio <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            <ConnectModal
                isOpen={showConnectModal}
                onClose={() => setShowConnectModal(false)}
                seekerId={id}
            />
        </div>
    );
}
