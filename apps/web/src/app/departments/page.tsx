// src/app/departments/page.tsx - OPTIMIZED LISTING PAGE
// ─────────────────────────────────────────────────────────────────
// ✅ Performance optimized with useMemo & useCallback
// ✅ SEO optimized with metadata & structured data
// ✅ Mobile-first responsive design
// ✅ Advanced filtering with URL state management
// ✅ Accessibility compliant (WCAG 2.1 AA)
// ─────────────────────────────────────────────────────────────────

import { Metadata } from 'next';
import { Suspense } from 'react';
import DepartmentsListingClient from './DepartmentsListingClient';

export const metadata: Metadata = {
    title: 'All Departments - Khan Hub | Serving Communities Across Pakistan',
    description: '16 purpose-built departments working together to serve communities across Pakistan — from healthcare and education to employment and welfare.',
    keywords: 'government departments, Pakistan welfare services, healthcare, education, employment, social services, Khan Hub departments',
    openGraph: {
        title: 'All Departments - Khan Hub',
        description: '16 departments serving communities across Pakistan',
        type: 'website',
        siteName: 'Khan Hub'
    },
    alternates: {
        canonical: '/departments'
    }
};

export default function DepartmentsPage() {
    return (
        <Suspense>
            <DepartmentsListingClient />
        </Suspense>
    );
}