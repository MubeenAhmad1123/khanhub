'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Bookmark, User, Plus } from 'lucide-react'

const navItems = [
  { href: '/feed',               label: 'Home',    Icon: Home },
  { href: '/explore',            label: 'Explore', Icon: Compass },
  { href: '/dashboard/upload-video', label: 'Post', Icon: Plus, isPost: true },
  { href: '/saved',              label: 'Saved',   Icon: Bookmark },
  { href: '/dashboard/profile',  label: 'Profile', Icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
      background: '#FFFFFF',
      borderTop: '1px solid #F0F0F0',
      display: 'flex', alignItems: 'flex-start',
      paddingTop: '8px',
      zIndex: 500,
      // GPU acceleration for smoother transitions:
      WebkitTransform: 'translateZ(0)',
      transform: 'translateZ(0)',
      willChange: 'transform',
    }}>
      {navItems.map(({ href, label, Icon, isPost }) => {
        const isActive = pathname === href ||
          (href === '/feed' && pathname === '/')

        if (isPost) {
          return (
            <Link key={href} href={href} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', textDecoration: 'none',
              // Increase tap target for mobile:
              minHeight: '44px', justifyContent: 'center',
            }}>
              <div style={{
                width: '48px', height: '32px',
                background: '#FF0069', borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255,0,105,0.4)',
              }}>
                <Plus size={22} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '10px', color: '#FF0069', marginTop: '2px', fontWeight: 600 }}>
                Post
              </span>
            </Link>
          )
        }

        return (
          <Link key={href} href={href} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '2px',
            textDecoration: 'none',
            // LARGE tap target — 44px minimum for iOS HIG:
            minHeight: '44px', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent', // remove iOS tap flash
          }}>
            <Icon
              size={22}
              color={isActive ? '#FF0069' : '#888'}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
            <span style={{
              fontSize: '10px',
              color: isActive ? '#FF0069' : '#888',
              fontWeight: isActive ? 700 : 400,
            }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

