'use client';

import React from 'react';

const ITEMS = [
    { provider: "Job Seekers", seeker: "Companies Hiring" },
    { provider: "Doctors", seeker: "Patients" },
    { provider: "Teachers & Tutors", seeker: "Students & Parents" },
    { provider: "Lawyers", seeker: "Clients" },
    { provider: "Domestic Helpers", seeker: "Households" },
    { provider: "Real Estate Agents", seeker: "Property Buyers" },
    { provider: "IT Freelancers", seeker: "Business Clients" },
    { provider: "Marriage Proposals", seeker: "Looking to Marry" },
];

export default function WhoIsThisFor() {
    const freeStyle = { fontWeight: 900, color: '#FF0069', fontStyle: 'italic' as const };

    return (
        <section style={{
            padding: 'clamp(40px, 8vw, 96px) clamp(16px, 4vw, 48px)',
            background: '#f8fafc',
            textAlign: 'center',
        }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <h2 style={{
                    fontFamily: 'Syne',
                    fontWeight: 900,
                    fontSize: 'clamp(20px, 5vw, 38px)',
                    color: '#0A0A0A',
                    margin: '0 0 12px',
                }}>
                    Who Is JobReel For?
                </h2>

                <p style={{
                    fontFamily: 'DM Sans',
                    fontSize: 'clamp(14px, 3vw, 16px)',
                    color: '#666',
                    marginBottom: 40,
                }}>
                    If you have a skill, a service, a need — you belong here.
                </p>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    marginBottom: 40,
                }}>
                    {ITEMS.map((item, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'clamp(8px, 2vw, 24px)',
                            padding: 'clamp(8px, 2vw, 14px) clamp(12px, 3vw, 20px)',
                            background: '#fff',
                            borderRadius: 12,
                            border: '1px solid #e2e8f0',
                            fontFamily: 'Syne',
                            fontWeight: 700,
                            fontSize: 'clamp(12px, 2.8vw, 15px)',
                        }}>
                            <span style={{ color: '#0A0A0A', flex: 1, textAlign: 'right' }}>{item.provider}</span>
                            <span style={{ color: '#FF0069', fontWeight: 900 }}>|</span>
                            <span style={{ color: '#666', flex: 1, textAlign: 'left' }}>{item.seeker}</span>
                        </div>
                    ))}
                </div>

                <p style={{
                    fontFamily: 'Syne',
                    fontWeight: 800,
                    fontSize: 'clamp(14px, 3.5vw, 18px)',
                    color: '#0A0A0A',
                    margin: 0,
                }}>
                    Upload your video <span style={freeStyle}>FREE</span> and let the right people find you.
                </p>
            </div>
        </section>
    );
}
