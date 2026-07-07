'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: {
    role: string;
  };
}

export default function DynamicRoleRedirect({ params }: PageProps) {
  const router = useRouter();

  useEffect(() => {
    if (!params.role) return;
    
    // Decode parameter just in case (e.g. "contract%20staff" -> "contract staff")
    const decodedRole = decodeURIComponent(params.role).toLowerCase().trim();
    
    // Define staff varieties
    const isStaff = 
      decodedRole === 'staff' || 
      decodedRole.includes('staff') || 
      decodedRole.includes('contract') || 
      decodedRole.includes('internee');

    if (isStaff) {
      // Redirect them straight to /staff dashboard
      router.replace('/departments/welfare/dashboard/staff');
    } else if (decodedRole === 'donor') {
      router.replace('/departments/welfare/dashboard/donor');
    } else {
      // If unknown, fallback to the department's home page to recalculate 
      // correctly from their LocalStorage welfare_session object.
      router.replace('/departments/welfare');
    }
  }, [params.role, router]);

  return (
    <div className="min-h-screen bg-[#FCFBF8] flex items-center justify-center p-8 font-bold text-black">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="animate-spin h-12 w-12 border-4 border-black border-t-transparent rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
        <p className="text-xs uppercase tracking-widest font-black mt-4">Synchronizing Dashboard Node...</p>
      </div>
    </div>
  );
}
