'use client';

import HeroSection from '@/components/home/HeroSection';
import StatsSection from '@/components/home/StatsSection';
import FeaturesSection from '@/components/home/FeaturesSection';
import WhoIsThisFor from '@/components/home/WhoIsThisFor';
import CategorySection from '@/components/home/CategorySection';
import TrustSection from '@/components/home/TrustSection';
import FinalCTA from '@/components/home/FinalCTA';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-white font-inter overflow-x-hidden">
            {/* 1. Hero Section - Video-First Focus */}
            <HeroSection />

            {/* 2. Stats Bar - Social Proof */}
            <StatsSection />

            {/* 3. How It Works - Three Clean Steps */}
            <FeaturesSection />

            {/* 4. Who is this for? - Seekers vs Employers */}
            <WhoIsThisFor />

            {/* 5. Industries - Find Your Field */}
            <CategorySection />

            {/* 6. Trust & Verification Pillar */}
            <TrustSection />

            {/* 7. Final Conversion Section */}
            <FinalCTA />
        </div>
    );
}
