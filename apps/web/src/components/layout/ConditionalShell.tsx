// apps/web/src/components/layout/ConditionalShell.tsx
'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SocialMediaSidebar from '@/components/SocialMediaSidebar';
import FloatingAffiliateButton from '@/components/FloatingAffiliateButton';
import FloatingDonateButton from '@/components/FloatingDonateButton';

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Safety patch for third-party browser extensions (e.g., YoinkUI, Grammarly)
    // that manipulate text/DOM nodes outside React's Virtual DOM tree,
    // preventing uncaught NotFoundError: Failed to execute 'removeChild' on 'Node'.
    if (typeof window !== 'undefined') {
      const originalRemoveChild = Node.prototype.removeChild;
      Node.prototype.removeChild = function <T extends Node>(child: T): T {
        if (child.parentNode !== this) {
          if (console) {
            console.warn('[DOM Safety] Prevented invalid removeChild from extension/DOM mutation:', child, this);
          }
          return child;
        }
        return originalRemoveChild.call(this, child) as T;
      };

      const originalInsertBefore = Node.prototype.insertBefore;
      Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
        if (referenceNode && referenceNode.parentNode !== this) {
          if (console) {
            console.warn('[DOM Safety] Prevented invalid insertBefore from extension/DOM mutation:', referenceNode, this);
          }
          return newNode;
        }
        return originalInsertBefore.call(this, newNode, referenceNode) as T;
      };
    }
  }, []);

  const pathname = usePathname();
  // Hide main site layout components on these paths (Dashboards, HQ, Developer console, and Portal Entry points)
  const isPortalView = pathname.startsWith('/hq') || 
                      pathname.includes('/dashboard') ||
                      pathname.startsWith('/developer') ||
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
