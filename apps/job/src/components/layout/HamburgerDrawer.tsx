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
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9997,
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
        background: '#FFFFFF',
        zIndex: 9999,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '20px 20px 16px',
          borderBottom: '1px solid #F0F0F0',
        }}>
          <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px' }}>
            KHAN HUB
          </span>
          <button
            onClick={onClose}
            style={{
              background: '#F0F0F0', border: 'none',
              borderRadius: '50%', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {menuItems.map(item => {
            const isActive = pathname === item.href || 
              (item.href === '/feed' && pathname === '/')
            return (
              <button
                key={item.href}
                onClick={() => handleNav(item.href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  width: '100%', padding: '14px 20px',
                  background: isActive ? '#FFF0F5' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderLeft: isActive ? '3px solid #FF0069' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <item.icon
                  size={20}
                  color={isActive ? '#FF0069' : '#444'}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span style={{
                  fontSize: '15px',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#FF0069' : '#0A0A0A',
                }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Sign Out at bottom */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #F0F0F0' }}>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              width: '100%', padding: '12px 0',
              background: 'none', border: 'none', cursor: 'pointer',
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
