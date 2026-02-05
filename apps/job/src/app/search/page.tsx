'use client';

import React, { useState } from 'react';
import { Search, MapPin, Filter, SlidersHorizontal, ChevronDown, Bookmark, Building2, Clock, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Button } from '@khanhub/shared-ui';

export default function JobSearchPage() {
    const [activeView, setActiveView] = useState('list');

    const jobs = [
        {
            id: 1,
            title: 'Senior Registered Nurse',
            company: 'Indus Hospital',
            location: 'Multan Road, Vehari',
            type: 'Full-time',
            salary: 'PKR 85,000 - 120,000',
            posted: '2 hours ago',
            logo: '🏥',
            category: 'Healthcare'
        },
        {
            id: 2,
            title: 'Frontend Developer (Next.js)',
            company: 'TechFlow Solutions',
            location: 'Gulberg, Lahore',
            type: 'Remote',
            salary: 'PKR 150,000 - 250,000',
            posted: '5 hours ago',
            logo: '💻',
            category: 'Technology'
        },
        {
            id: 3,
            title: 'Administrative Officer',
            company: 'Khanhub Enterprise',
            location: 'Peer Murad, Vehari',
            type: 'Full-time',
            salary: 'PKR 45,000 - 60,000',
            posted: '1 day ago',
            logo: '🏢',
            category: 'Services'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Search Header */}
            <div className="bg-white border-b sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                placeholder="Job title, keywords, or company"
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                                defaultValue="Nursing"
                            />
                        </div>
                        <div className="w-full md:w-64 relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                placeholder="City or region"
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                                defaultValue="Vehari, Pakistan"
                            />
                        </div>
                        <Button variant="primary" className="md:w-32">Find Jobs</Button>
                    </div>

                    <div className="flex flex-wrap items-center mt-6 gap-4 text-sm">
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 font-bold">
                            <Filter className="h-4 w-4" /> Filter by Type <ChevronDown className="h-4 w-4" />
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg border border-transparent font-bold text-gray-600 transition-colors">
                            Salary Range <ChevronDown className="h-4 w-4" />
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg border border-transparent font-bold text-gray-600 transition-colors">
                            Experience Level <ChevronDown className="h-4 w-4" />
                        </button>
                        <div className="ml-auto flex items-center gap-2 text-gray-500">
                            <SlidersHorizontal className="h-4 w-4" />
                            <span>Sort by: <strong>Newest</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Main Results */}
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-gray-500 font-medium">Found <span className="font-black text-gray-900">42</span> jobs matching your criteria</p>
                        </div>

                        {jobs.map((job) => (
                            <div key={job.id} className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative">
                                <button className="absolute top-6 right-6 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                    <Bookmark className="h-5 w-5" />
                                </button>

                                <div className="flex gap-6">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-blue-50 transition-colors">
                                        {job.logo}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500 font-medium">
                                            <div className="flex items-center gap-1">
                                                <Building2 className="h-4 w-4" /> {job.company}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-4 w-4" /> {job.location}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" /> {job.posted}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 mt-4">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wide">{job.type}</span>
                                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                                <DollarSign className="h-3 w-3" /> {job.salary}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sidebar */}
                    <div className="w-full lg:w-80 space-y-6">
                        <div className="bg-blue-600 rounded-2xl p-6 text-white overflow-hidden relative">
                            <div className="relative z-10">
                                <h4 className="text-xl font-black mb-2">Job Alerts</h4>
                                <p className="text-blue-100 text-sm mb-6">Get notified as soon as new nursing jobs are posted in Vehari.</p>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl mb-3 text-white placeholder:text-blue-200 focus:outline-none focus:bg-white/20 transition-all"
                                />
                                <Button variant="primary" className="w-full !bg-white !text-blue-600">Activate Alert</Button>
                            </div>
                            <div className="absolute -bottom-4 -right-4 text-white opacity-10">
                                <TrendingUp className="h-24 w-24" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" /> Featured Companies
                            </h4>
                            <div className="space-y-4">
                                {['Punjab Health', 'Indus Bank', 'Orient Electronics'].map((comp) => (
                                    <div key={comp} className="flex items-center justify-between group cursor-pointer">
                                        <span className="font-bold text-gray-600 group-hover:text-blue-600 transition-colors">{comp}</span>
                                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-400 font-bold group-hover:bg-blue-100 group-hover:text-blue-600">12 Jobs</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
