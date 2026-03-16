'use client'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Compass, User, X, LogOut } from 'lucide-react'
import { getAuth, signOut } from 'firebase/auth'
import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image'
const menuItems = [
  { label: 'Feed', icon: Home, href: '/feed' },
  { label: 'Explore', icon: Compass, href: '/explore' },
  { label: 'Profile', icon: User, href: '/dashboard/profile' },
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
        right: 0,
        width: '280px',
        height: '100%',
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
            fontWeight: 900, fontSize: '18px',
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
              width: '40px', height: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={20} color="#0A0A0A" />
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
                (user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()
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
                {(user?.role || 'User').toUpperCase()}
              </span>
              <p style={{
                fontSize: '14px', fontWeight: 700,
                color: '#0A0A0A', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.displayName || user?.email?.split('@')[0]}
              </p>
              <p style={{
                fontSize: '11px', color: '#888888', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user.email}
              </p>
            </div>
          </div>
        ) : null}

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '8px 12px', backgroundColor: '#FFFFFF' }}>
          {menuItems.map(item => {
            const isActive = pathname === item.href
            return (
              <button
                key={item.href}
                onClick={() => handleNav(item.href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  width: '100%', padding: '14px 16px',
                  backgroundColor: isActive ? '#FFF0F5' : 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  marginBottom: '2px',
                  transition: 'background 0.15s ease',
                  minHeight: '48px', // tap target
                }}
              >
                <item.icon
                  size={22}
                  color={isActive ? '#FF0069' : '#555555'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span style={{
                  fontSize: '15px',
                  fontWeight: isActive ? 800 : 500,
                  color: isActive ? '#FF0069' : '#0A0A0A',
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

        {/* Footer — Buttons & Sign Out */}
        <div style={{
          padding: '16px 20px 32px',
          borderTop: '1px solid #F0F0F0',
          backgroundColor: '#FFFFFF',
        }}>
          {!user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => handleNav('/auth/register')}
                style={{
                  width: '100%', padding: '14px',
                  backgroundColor: '#FF0069', color: 'white',
                  border: 'none', borderRadius: '12px',
                  fontWeight: 900, fontSize: '14px',
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
              >
                REGISTER
              </button>
              <button
                onClick={() => handleNav('/auth/login')}
                style={{
                  width: '100%', padding: '14px',
                  backgroundColor: '#F5F5F5', color: '#0A0A0A',
                  border: 'none', borderRadius: '12px',
                  fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
              >
                LOG IN
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '12px 16px',
                backgroundColor: '#FFF5F5',
                border: '1px solid #FFE0E0',
                borderRadius: '12px',
                cursor: 'pointer',
                minHeight: '48px',
              }}
            >
              <LogOut size={18} color="#FF3B30" />
              <span style={{ color: '#FF3B30', fontSize: '14px', fontWeight: 700 }}>
                Sign Out
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  )
}