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
  const isDepartmentDashboard = pathname.startsWith('/departments/rehab/') || 
                               pathname.startsWith('/departments/spims/') ||
                               pathname.startsWith('/departments/welfare/') ||
                               pathname.startsWith('/departments/job-center/') ||
                               pathname.startsWith('/departments/hospital/') ||
                               pathname.startsWith('/departments/sukoon/') ||
                               pathname.startsWith('/departments/it/') ||
                               pathname.startsWith('/hq/');

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
