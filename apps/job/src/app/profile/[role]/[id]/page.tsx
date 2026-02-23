'use client';

import React, { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import Image from 'next/image';
import { MapPin, Phone, Building2, User, Play, Briefcase, GraduationCap, Award, Lightbulb, Loader2 } from 'lucide-react';

export default function PublicProfilePage() {
    const params = useParams();
    const role = params.role as string;
    const id = params.id as string;

    const [userData, setUserData] = useState<any>(null);
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

    const displayName = isEmployer ? (profileData.name || userData.displayName) : (profileData.fullName || userData.displayName);
    const displayPhone = profileData.phone || profileData.contactPhone || userData.phoneNumber || 'Not provided';
    const displayLocation = profileData.location || profileData.address || 'Not specified';
    const displayIndustry = userData.industry || profileData.industry || 'General';
    const displaySubcategory = userData.subcategory || profileData.preferredSubcategory || profileData.subcategory || 'General';
    const displayBio = profileData.description || profileData.bio || 'No summary provided.';
    const displayPhoto = isEmployer ? (profileData.logoUrl || profileData.logo || userData.photoURL) : (profileData.photo || userData.photoURL);

    const videoUrl = profileData.videoResume || profileData.videoUrl;

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="h-32 sm:h-48 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                    <div className="px-8 pb-8 relative">
                        {/* Avatar */}
                        <div className="absolute -top-16 sm:-top-20">
                            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white bg-slate-100 overflow-hidden shadow-lg relative flex items-center justify-center text-4xl font-bold text-slate-400">
                                {displayPhoto ? (
                                    <Image src={displayPhoto} alt={displayName || 'User'} fill className="object-cover" />
                                ) : (
                                    displayName?.charAt(0) || 'U'
                                )}
                            </div>
                        </div>

                        {/* Top Info */}
                        <div className="pt-20 sm:pt-24 flex flex-col md:flex-row justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-3 flex-wrap mb-2">
                                    <h1 className="text-3xl font-black text-slate-900">{displayName}</h1>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${isEmployer ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {isEmployer ? 'Company (کمپنی)' : 'Candidate (امیدوار)'}
                                    </span>
                                </div>
                                <h2 className="text-xl text-slate-600 font-medium mb-4">
                                    {userData.role_in_category || profileData.preferredJobTitle || displayIndustry}
                                </h2>

                                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        {displayLocation}
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        {displayPhone}
                                    </div>
                                    {!isEmployer && profileData.yearsOfExperience !== undefined && (
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full">
                                            <Briefcase className="w-4 h-4 text-slate-400" />
                                            {profileData.yearsOfExperience} {Number(profileData.yearsOfExperience) === 1 ? 'Year' : 'Years'} Exp
                                        </div>
                                    )}
                                    {isEmployer && profileData.size && (
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full">
                                            <Building2 className="w-4 h-4 text-slate-400" />
                                            {profileData.size} Employees
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column (Main Info) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Summary */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" />
                                {isEmployer ? 'Company Overview' : 'Professional Summary'}
                            </h3>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {displayBio}
                            </p>
                        </div>

                        {/* Video Player */}
                        {videoUrl && (
                            <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-800">
                                <div className="p-4 bg-slate-800 flex justify-between items-center">
                                    <h3 className="text-white font-bold flex items-center gap-2">
                                        <Play className="w-5 h-5 text-red-500 fill-red-500" />
                                        {isEmployer ? 'Company Pitch' : 'Video Resume'}
                                    </h3>
                                </div>
                                <div className="aspect-[16/9] relative bg-black">
                                    <video
                                        src={videoUrl}
                                        controls
                                        playsInline
                                        className="w-full h-full object-contain"
                                        poster={displayPhoto}
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column (Sidebar Stats) */}
                    <div className="space-y-8">
                        {/* Industry & Subcategory Card */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Domain</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Industry</div>
                                    <div className="font-medium text-slate-900">{displayIndustry}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Sub-Sector</div>
                                    <div className="font-medium text-slate-900">{displaySubcategory}</div>
                                </div>
                                {isEmployer && profileData.website && (
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Website</div>
                                        <a href={profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline break-all">
                                            {profileData.website}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Skills (Candidate Only) */}
                        {!isEmployer && profileData.skills && profileData.skills.length > 0 && (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4" />
                                    Skills
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {profileData.skills.map((skill: string, index: number) => (
                                        <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg border border-blue-100">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Education (Candidate Only) */}
                        {!isEmployer && profileData.education && (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4" />
                                    Education
                                </h3>
                                <div className="font-medium text-slate-900">
                                    {typeof profileData.education === 'string' ? profileData.education : 'See Resume for details'}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
