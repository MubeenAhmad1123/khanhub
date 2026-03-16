'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import Image from 'next/image';
import {
    LayoutDashboard, Search, User, Video,
    Users, CirclePlus, BookmarkCheck, Settings,
    CreditCard, BarChart2, LogOut, ShieldCheck,
} from 'lucide-react';

// ── Menu definitions ──────────────────────────────────────────────────────────
const seekerMenu = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Browse Videos', path: '/browse', icon: Search },
    { name: 'My Video', path: '/dashboard/upload-video', icon: Video },
    { name: 'My Profile', path: '/dashboard/profile', icon: User },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
]

const employerMenu = [
    { name: 'Dashboard', path: '/employer/dashboard', icon: LayoutDashboard },
    { name: 'Post Job', path: '/employer/post-job', icon: CirclePlus },
    { name: 'Candidates', path: '/browse', icon: Users },
    { name: 'Reveals', path: '/employer/connections', icon: BookmarkCheck },
    { name: 'Settings', path: '/employer/settings', icon: Settings },
]

const adminMenu = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Payments', path: '/admin/payments', icon: CreditCard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Placements', path: '/admin/placements', icon: BookmarkCheck },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart2 },
    { name: 'Browse', path: '/browse', icon: Search },
]

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();

    const menuItems =
        user?.role === 'admin' ? adminMenu :
        user?.role === 'employer' ? employerMenu :
        seekerMenu;

    const displayName = user?.displayName || user?.email?.split('@')[0] || '';
    const displayRole =
        user?.role === 'employer' ? 'COMPANY' :
        user?.role === 'admin' ? 'ADMIN' :
        'CANDIDATE';

    const isActive = (path: string) =>
        pathname === path || pathname.startsWith(path + '/');

    const handleSignOut = async () => {
        await signOut(getAuth());
        router.push('/auth/login');
    };

    return (
        <aside style={{
            width: '240px',
            minWidth: '240px',
            backgroundColor: '#FFFFFF',
            borderRight: '1px solid #F0F0F0',
            height: '100vh',
            position: 'sticky',
            top: 0,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
            zIndex: 50,
        }}>

            {/* ── Logo ─────────────────────────────────────────────────── */}
            <div style={{
                padding: '24px 20px 20px',
                borderBottom: '1px solid #F0F0F0',
            }}>
                <Link href="/" style={{ textDecoration: 'none' }}>
                    <span style={{
                        fontSize: '22px',
                        fontWeight: 900,
                        color: '#FF0069',
                        fontStyle: 'italic',
                        letterSpacing: '-0.5px',
                    }}>
                        KHAN HUB
                    </span>
                </Link>
                <p style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#AAAAAA',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    marginTop: '4px',
                }}>
                    {user?.role === 'admin' ? 'Admin Panel' :
                     user?.role === 'employer' ? 'Employer Dashboard' :
                     'Candidate Dashboard'}
                </p>
            </div>

            {/* ── User Card ─────────────────────────────────────────────── */}
            {user && (
                <div style={{
                    margin: '16px',
                    padding: '14px',
                    backgroundColor: '#FFF0F5',
                    borderRadius: '14px',
                    border: '1px solid #FFD6E7',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <div style={{
                        width: '40px', height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#FF0069',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 900, fontSize: '16px',
                        flexShrink: 0, overflow: 'hidden',
                        border: '2px solid white',
                        boxShadow: '0 2px 8px rgba(255,0,105,0.25)',
                    }}>
                        {user.photoURL ? (
                            <Image src={user.photoURL} alt="avatar" width={40} height={40} style={{ objectFit: 'cover' }} />
                        ) : (
                            user.email?.[0].toUpperCase()
                        )}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <span style={{
                            display: 'inline-block',
                            fontSize: '8px', fontWeight: 900,
                            color: '#FF0069',
                            backgroundColor: '#FFD6E7',
                            padding: '2px 6px',
                            borderRadius: '20px',
                            textTransform: 'uppercase' as const,
                            letterSpacing: '0.1em',
                            marginBottom: '3px',
                        }}>
                            {displayRole}
                        </span>
                        <p style={{
                            fontSize: '13px', fontWeight: 700,
                            color: '#0A0A0A', margin: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {displayName}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Nav Links ─────────────────────────────────────────────── */}
            <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto' }}>
                <p style={{
                    fontSize: '9px', fontWeight: 900,
                    color: '#BBBBBB',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.15em',
                    padding: '8px 8px 4px',
                    margin: 0,
                }}>
                    Navigation
                </p>
                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '11px 14px',
                                borderRadius: '12px',
                                marginBottom: '2px',
                                backgroundColor: active ? '#FFF0F5' : 'transparent',
                                textDecoration: 'none',
                                transition: 'background 0.15s ease',
                                border: active ? '1px solid #FFD6E7' : '1px solid transparent',
                            }}
                        >
                            <Icon
                                size={18}
                                color={active ? '#FF0069' : '#666666'}
                                strokeWidth={active ? 2.5 : 2}
                            />
                            <span style={{
                                fontSize: '13px',
                                fontWeight: active ? 800 : 500,
                                color: active ? '#FF0069' : '#333333',
                            }}>
                                {item.name}
                            </span>
                            {active && (
                                <div style={{
                                    marginLeft: 'auto',
                                    width: '6px', height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#FF0069',
                                    flexShrink: 0,
                                }} />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* ── Sign Out ──────────────────────────────────────────────── */}
            {user && (
                <div style={{
                    padding: '16px',
                    borderTop: '1px solid #F0F0F0',
                }}>
                    <button
                        onClick={handleSignOut}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            width: '100%', padding: '11px 14px',
                            backgroundColor: '#FFF5F5',
                            border: '1px solid #FFE0E0',
                            borderRadius: '12px',
                            cursor: 'pointer',
                        }}
                    >
                        <LogOut size={17} color="#FF3B30" />
                        <span style={{
                            fontSize: '13px', fontWeight: 700,
                            color: '#FF3B30',
                        }}>
                            Sign Out
                        </span>
                    </button>
                </div>
            )}
        </aside>
    );
}