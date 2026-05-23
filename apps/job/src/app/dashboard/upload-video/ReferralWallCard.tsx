'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  referralCode: string;
  completedReferrals: number;
  required: number;
}

export default function ReferralWallCard({ referralCode, completedReferrals, required }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/register?ref=${referralCode}`
    : '';

  const handleCopy = () => {
    if (referralUrl) {
      navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Generate progress dots
  const dots = [];
  for (let i = 0; i < required; i++) {
    dots.push(
      <span
        key={i}
        style={{
          fontSize: '28px',
          color: i < completedReferrals ? '#FF0069' : '#E5E5E5',
          margin: '0 6px',
          transition: 'color 0.3s ease',
        }}
      >
        ●
      </span>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        fontFamily: 'DM Sans, sans-serif',
        color: '#0A0A0A',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center',
          padding: '40px 24px',
          borderRadius: '24px',
          border: '1px solid #E5E5E5',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
          boxSizing: 'border-box',
        }}
      >
        {/* Lock / Link Icon */}
        <div
          style={{
            fontSize: '64px',
            marginBottom: '24px',
            lineHeight: '1',
          }}
        >
          🔒
        </div>

        {/* Heading */}
        <h2
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontSize: '24px',
            fontWeight: 800,
            margin: '0 0 16px 0',
            lineHeight: '1.25',
          }}
        >
          You've used your <span style={{ color: '#FF0069', fontWeight: 800 }}>2 free videos</span>
        </h2>

        {/* Subtext */}
        <p
          style={{
            fontSize: '14px',
            color: '#666666',
            lineHeight: '1.6',
            margin: '0 0 24px 0',
          }}
        >
          Refer <span style={{ color: '#FF0069', fontWeight: 700 }}>3</span> people to unlock your next upload. A referral counts when the person you referred uploads their first video and it gets approved.
        </p>

        {/* Progress Display */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#888888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Referral Progress ({completedReferrals}/{required})
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {dots}
          </div>
        </div>

        {/* Referral URL Input */}
        <div style={{ marginBottom: '16px', position: 'relative', width: '100%' }}>
          <input
            type="text"
            readOnly
            value={referralUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid #E5E5E5',
              backgroundColor: '#F8F8F8',
              color: '#666666',
              fontSize: '13px',
              outline: 'none',
              textAlign: 'center',
              boxSizing: 'border-box',
              cursor: 'text',
            }}
          />
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#FF0069',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none',
            marginBottom: '24px',
            boxSizing: 'border-box',
            boxShadow: '0 4px 12px rgba(255, 0, 105, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'none';
          }}
        >
          {copied ? 'Copied! ✓' : 'Copy Link'}
        </button>

        {/* Back Link */}
        <div>
          <span
            onClick={() => router.push('/dashboard')}
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#888888',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0A0A0A')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#888888')}
          >
            Back to Dashboard
          </span>
        </div>
      </div>
    </div>
  );
}
