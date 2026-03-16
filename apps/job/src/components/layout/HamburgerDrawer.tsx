'use client'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Compass, Bookmark, User, X, Video, LogOut, Settings, LayoutDashboard, CirclePlus, Users, CreditCard, BarChart2 } from 'lucide-react'
import { getAuth, signOut } from 'firebase/auth'
import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image'

const seekerMenuItems = [
  { label: 'Home', icon: Home, href: '/feed' },
  { label: 'Explore', icon: Compass, href: '/explore' },
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Upload Video', icon: Video, href: '/dashboard/upload-video' },
  { label: 'Profile', icon: User, href: '/dashboard/profile' },
  { label: 'Saved', icon: Bookmark, href: '/saved' },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
]

const employerMenuItems = [
  { label: 'Home', icon: Home, href: '/feed' },
  { label: 'Explore', icon: Compass, href: '/explore' },
  { label: 'Dashboard', icon: LayoutDashboard, href: '/employer/dashboard' },
  { label: 'Post Job', icon: CirclePlus, href: '/employer/post-job' },
  { label: 'Candidates', icon: Users, href: '/browse' },
  { label: 'Settings', icon: Settings, href: '/employer/settings' },
]

const adminMenuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { label: 'Payments', icon: CreditCard, href: '/admin/payments' },
  { label: 'Users', icon: Users, href: '/admin/users' },
  { label: 'Analytics', icon: BarChart2, href: '/admin/analytics' },
  { label: 'Explore', icon: Compass, href: '/explore' },
]

const guestMenuItems = [
  { label: 'Home', icon: Home, href: '/feed' },
  { label: 'Explore', icon: Compass, href: '/explore' },
  { label: 'Saved', icon: Bookmark, href: '/saved' },
]

export default function HamburgerDrawer({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  const menuItems =
    user?.role === 'admin' ? adminMenuItems :
    user?.role === 'employer' ? employerMenuItems :
    user ? seekerMenuItems :
    guestMenuItems

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Guest'
  const displayRole =
    user?.role === 'employer' ? 'COMPANY' :
    user?.role === 'admin' ? 'ADMIN' :
    user ? 'CANDIDATE' : 'GUEST'

  const handleNav = (href: string) => {
    router.push(href)
    onClose()
  }

  const handleSignOut = async () => {
    await signOut(getAuth())
    router.push('/auth/login')
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="hamburger-drawer-backdrop"
        onClick={onClose}
        style={{
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'all' : 'none',
          transition: 'opacity 0.3s ease',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer Panel */}
      <div 
        className="hamburger-drawer-panel"
        style={{
        backgroundColor: '#FFFFFF',
        isolation: 'isolate',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '20px 20px 16px',
          borderBottom: '1px solid #F0F0F0',
          backgroundColor: '#FFFFFF',
        }}>
          <span style={{
            fontWeight: 900, fontSize: '20px',
            color: '#FF0069',
            letterSpacing: '-0.5px',
            fontStyle: 'italic',
          }}>
            KHAN HUB
          </span>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#F5F5F5',
              border: 'none', borderRadius: '50%',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} color="#0A0A0A" />
          </button>
        </div>

        {/* User Profile Card */}
        {user ? (
          <div style={{
            margin: '16px',
            padding: '14px',
            backgroundColor: '#FFF0F5',
            borderRadius: '16px',
            border: '1px solid #FFD6E7',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            {/* Avatar */}
            <div style={{
              width: '46px', height: '46px',
              borderRadius: '50%',
              backgroundColor: '#FF0069',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: '18px',
              flexShrink: 0, overflow: 'hidden',
              border: '2px solid white',
              boxShadow: '0 2px 8px rgba(255,0,105,0.3)',
            }}>
              {user.photoURL ? (
                <Image src={user.photoURL} alt="avatar" width={46} height={46} style={{ objectFit: 'cover' }} />
              ) : (
                user.email?.[0].toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <span style={{
                display: 'inline-block',
                fontSize: '9px', fontWeight: 900,
                color: '#FF0069',
                backgroundColor: '#FFD6E7',
                padding: '2px 8px',
                borderRadius: '20px',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                marginBottom: '4px',
              }}>
                {displayRole}
              </span>
              <p style={{
                fontSize: '14px', fontWeight: 700,
                color: '#0A0A0A', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {displayName}
              </p>
              <p style={{
                fontSize: '11px', color: '#888888', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user.email}
              </p>
            </div>
          </div>
        ) : (
          /* Guest CTA */
          <div style={{ margin: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => handleNav('/auth/register')}
              style={{
                width: '100%', padding: '12px',
                backgroundColor: '#FF0069', color: 'white',
                border: 'none', borderRadius: '12px',
                fontWeight: 900, fontSize: '13px',
                textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                cursor: 'pointer',
              }}
            >
              Join Now — Free
            </button>
            <button
              onClick={() => handleNav('/auth/login')}
              style={{
                width: '100%', padding: '12px',
                backgroundColor: '#F5F5F5', color: '#0A0A0A',
                border: 'none', borderRadius: '12px',
                fontWeight: 700, fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Log In
            </button>
          </div>
        )}

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '8px 12px', backgroundColor: '#FFFFFF' }}>
          {menuItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <button
                key={item.href}
                onClick={() => handleNav(item.href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  width: '100%', padding: '13px 16px',
                  backgroundColor: isActive ? '#FFF0F5' : 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  marginBottom: '2px',
                  transition: 'background 0.15s ease',
                }}
              >
                <item.icon
                  size={20}
                  color={isActive ? '#FF0069' : '#555555'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span style={{
                  fontSize: '14px',
                  fontWeight: isActive ? 800 : 500,
                  color: isActive ? '#FF0069' : '#0A0A0A',
                  letterSpacing: isActive ? '-0.2px' : 'normal',
                }}>
                  {item.label}
                </span>
                {isActive && (
                  <div style={{
                    marginLeft: 'auto',
                    width: '6px', height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#FF0069',
                  }} />
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer — Sign Out */}
        {user && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #F0F0F0',
            backgroundColor: '#FFFFFF',
          }}>
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '12px 16px',
                backgroundColor: '#FFF5F5',
                border: '1px solid #FFE0E0',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              <LogOut size={18} color="#FF3B30" />
              <span style={{ color: '#FF3B30', fontSize: '14px', fontWeight: 700 }}>
                Sign Out
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}