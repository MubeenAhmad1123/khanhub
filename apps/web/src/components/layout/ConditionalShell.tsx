'use client';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SocialMediaSidebar from '@/components/SocialMediaSidebar';
import FloatingAffiliateButton from '@/components/FloatingAffiliateButton';
import FloatingDonateButton from '@/components/FloatingDonateButton';

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Hide main site layout components on these paths (Dashboards, HQ, and Portal Entry points)
  const isPortalView = pathname.startsWith('/hq') || 
                      pathname.includes('/dashboard') ||
                      (pathname.startsWith('/departments/') && (
                        pathname.includes('/login') || 
                        pathname.includes('/setup') || 
                        pathname.includes('/register')
                      ));

  if (isPortalView) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {children}
      </main>
      <SocialMediaSidebar />
      <FloatingAffiliateButton />
      <FloatingDonateButton />
      <Footer />
    </>
  );
}
