'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Menu, X, Briefcase, Building2, Plus } from 'lucide-react';
import { AuthButton } from '@khanhub/auth';

export default function JobNavbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
        }
    };

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <Image
                            src="/logo.webp"
                            alt="Khanhub Jobs"
                            width={40}
                            height={40}
                            className="rounded-lg"
                        />
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-bold text-jobs-primary">Khanhub Jobs</h1>
                            <p className="text-xs text-jobs-dark/60">Find Your Dream Career</p>
                        </div>
                    </Link>

                    {/* Search Bar - Desktop */}
                    <div className="hidden md:block flex-1 max-w-2xl mx-8">
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                placeholder="Search jobs by title, company, or skills..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-jobs-primary hover:text-jobs-primary/80"
                            >
                                <Search className="h-5 w-5" />
                            </button>
                        </form>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-4">
                        <Link
                            href="/search"
                            className="flex items-center gap-2 px-4 py-2 text-jobs-dark hover:text-jobs-primary font-medium transition-colors"
                        >
                            <Briefcase className="h-5 w-5" />
                            Find Jobs
                        </Link>
                        <Link
                            href="/companies"
                            className="flex items-center gap-2 px-4 py-2 text-jobs-dark hover:text-jobs-primary font-medium transition-colors"
                        >
                            <Building2 className="h-5 w-5" />
                            Companies
                        </Link>
                        <Link
                            href="/post-job"
                            className="flex items-center gap-2 px-4 py-2 bg-jobs-accent text-white rounded-lg hover:opacity-90 font-medium transition-all shadow-lg shadow-jobs-accent/20"
                        >
                            <Plus className="h-5 w-5" />
                            Post Job
                        </Link>

                        <AuthButton />
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-gray-700"
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t bg-white pb-4">
                        {/* Mobile Search */}
                        <div className="p-4">
                            <form onSubmit={handleSearch}>
                                <input
                                    type="text"
                                    placeholder="Search jobs..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </form>
                        </div>

                        {/* Mobile Links */}
                        <div className="px-4 space-y-2">
                            <Link
                                href="/search"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 py-2 text-jobs-dark hover:text-jobs-primary"
                            >
                                <Briefcase className="h-5 w-5" />
                                <span className="font-medium">Find Jobs</span>
                            </Link>
                            <Link
                                href="/companies"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 py-2 text-jobs-dark hover:text-jobs-primary"
                            >
                                <Building2 className="h-5 w-5" />
                                <span className="font-medium">Companies</span>
                            </Link>
                            <Link
                                href="/post-job"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 py-2 text-jobs-accent font-bold"
                            >
                                <Plus className="h-5 w-5" />
                                <span>Post a Job</span>
                            </Link>
                            <div className="border-t pt-4">
                                <AuthButton />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}