'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import CategoryRoleFlow from './CategoryRoleFlow';

export default function OnboardingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user && user.onboardingCompleted) {
            console.log('🔵 [Onboarding] User already completed onboarding. Redirecting to feed...');
            router.push('/feed');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'DM Sans, sans-serif',
                color: '#666666',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontSize: '12px'
            }}>
                Loading setup...
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '24px 16px',
            fontFamily: 'DM Sans, sans-serif',
            boxSizing: 'border-box'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '480px',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box'
            }}>
                {/* Logo Section */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <span style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 900,
                        fontSize: '28px',
                        letterSpacing: '-0.04em',
                        fontStyle: 'italic'
                    }}>
                        <span style={{ color: '#FF0069' }}>KHAN</span> <span style={{ color: '#0A0A0A' }}>HUB</span>
                    </span>
                    <p style={{
                        marginTop: '4px',
                        color: '#666666',
                        fontWeight: 600,
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.2em'
                    }}>
                        Complete your profile setup
                    </p>
                </div>

                {/* Onboarding Flow Wizard */}
                <CategoryRoleFlow />
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800;900&family=DM+Sans:wght@400;500;700&display=swap');
                
                body {
                    background: #FFFFFF !important;
                    font-family: 'DM Sans', sans-serif;
                }
                h1, h2, h3, h4, h5, h6 {
                    font-family: 'Poppins', sans-serif;
                }
            `}</style>
        </div>
    );
}
