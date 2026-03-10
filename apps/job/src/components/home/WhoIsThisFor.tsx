'use client';

import React from 'react';

const ITEMS = [
    { provider: "Daily Workers", seeker: "People Hiring" },
    { provider: "Marriage Proposals (Grooms)", seeker: "Looking to Marry (Brides)" },
    { provider: "Property Agents / Sellers", seeker: "Buyers & Renters" },
    { provider: "Vehicle Sellers", seeker: "Car/Bike Buyers" },
    { provider: "Buy / Sell Items", seeker: "Local Buyers" },
    { provider: "Teachers & Tutors", seeker: "Students & Parents" },
];

export default function WhoIsThisFor() {
    const freeStyle = { fontWeight: 900, color: '#FF0069', fontStyle: 'italic' as const };

    return (
        <section style={{
            width: '100%',
            overflowX: 'hidden',
            padding: 'clamp(32px, 6vw, 80px) clamp(16px, 4vw, 32px)',
            background: '#f8fafc',
            textAlign: 'center',
        }}>
            <div style={{
                maxWidth: 480,
                margin: '0 auto',
                width: '100%',
            }}>
                <h2 style={{
                    fontFamily: 'Poppins',
                    fontWeight: 900,
                    fontSize: 'clamp(18px, 4.5vw, 32px)',
                    color: '#0A0A0A',
                    margin: '0 0 12px',
                }}>
                    Who Is KHAN HUB For?
                </h2>

                <p style={{
                    fontFamily: 'Poppins',
                    fontSize: 'clamp(12px, 2.8vw, 15px)',
                    color: '#666',
                    marginBottom: 32,
                }}>
                    If you have a skill, a service, a need — you belong here.
                </p>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginBottom: 32,
                }}>
                    {ITEMS.map((item, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                            background: '#fff',
                            borderRadius: 12,
                            border: '1px solid #F0F0F0',
                            borderBottom: '1px solid #F0F0F0',
                        }}>
                            <span style={{
                                color: '#0A0A0A',
                                flex: 1,
                                textAlign: 'right',
                                fontFamily: 'Poppins',
                                fontWeight: 700,
                                fontSize: 'clamp(11px, 2.5vw, 13px)',
                                padding: '4px clamp(8px, 2vw, 12px)',
                            }}>
                                {item.provider}
                            </span>
                            <span style={{ fontSize: 12, color: '#CCC', flexShrink: 0 }}>|</span>
                            <span style={{
                                color: '#666',
                                flex: 1,
                                textAlign: 'left',
                                fontFamily: 'Poppins',
                                fontWeight: 700,
                                fontSize: 'clamp(11px, 2.5vw, 13px)',
                                padding: '4px clamp(8px, 2vw, 12px)',
                            }}>
                                {item.seeker}
                            </span>
                        </div>
                    ))}
                </div>

                <p style={{
                    fontFamily: 'Poppins',
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

