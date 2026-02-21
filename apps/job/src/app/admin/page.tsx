'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const router = useRouter();

    useEffect(() => {
        router.push('/admin/dashboard');
    }, [router]);

    return (
        <div className="flex items-center justify-center h-screen bg-slate-950 text-white font-black italic uppercase tracking-tighter">
            Redirecting to command center...
        </div>
    );
}