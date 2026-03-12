'use client'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Compass, Bookmark, User, X, Video, LogOut } from 'lucide-react'
import { getAuth, signOut } from 'firebase/auth'

const menuItems = [
  { label: 'Home', icon: Home, href: '/feed' },
  { label: 'Explore', icon: Compass, href: '/explore' },
  { label: 'Saved', icon: Bookmark, href: '/saved' },
  { label: 'Profile', icon: User, href: '/dashboard/profile' },
  { label: 'Upload Video', icon: Video, href: '/dashboard/upload-video' },
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
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 99998,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'all' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Drawer panel — slides in from right */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: '280px',
        backgroundColor: '#FFFFFF',        // ← explicit, not 'white' or 'bg-white'
        zIndex: 99999,
        isolation: 'isolate',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '20px 20px 16px',
          borderBottom: '1px solid #F0F0F0',
          backgroundColor: '#FFFFFF',      // ← explicit on every section
        }}>
          <span style={{
            fontWeight: 800, fontSize: '18px',
            color: '#0A0A0A',              // ← explicit dark text
            letterSpacing: '-0.5px',
          }}>
            KHAN HUB
          </span>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#F5F5F5',
              border: 'none', borderRadius: '50%',
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} color="#0A0A0A" />
          </button>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '8px 0', backgroundColor: '#FFFFFF' }}>
          {menuItems.map(item => {
            const isActive = pathname.startsWith(item.href)
            return (
              <button
                key={item.href}
                onClick={() => handleNav(item.href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  width: '100%', padding: '14px 20px',
                  backgroundColor: isActive ? '#FFF0F5' : '#FFFFFF',  // ← explicit
                  border: 'none',
                  borderLeft: `3px solid ${isActive ? '#FF0069' : 'transparent'}`,
                  cursor: 'pointer',
                }}
              >
                <item.icon
                  size={20}
                  color={isActive ? '#FF0069' : '#333333'}
                />
                <span style={{
                  fontSize: '15px',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#FF0069' : '#0A0A0A',  // ← explicit
                }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Sign Out at bottom */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #F0F0F0',
          backgroundColor: '#FFFFFF',
        }}>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 0', width: '100%',
            }}
          >
            <LogOut size={18} color="#FF3B30" />
            <span style={{ color: '#FF3B30', fontSize: '15px', fontWeight: 500 }}>
              Sign Out
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
