'use client';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SocialMediaSidebar from '@/components/SocialMediaSidebar';
import FloatingAffiliateButton from '@/components/FloatingAffiliateButton';
import FloatingDonateButton from '@/components/FloatingDonateButton';

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Hide main site layout components on these paths
  const isDepartmentDashboard = pathname.startsWith('/hq') || 
                               pathname.includes('/dashboard');

  if (isDepartmentDashboard) {
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
