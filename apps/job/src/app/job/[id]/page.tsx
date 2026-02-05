'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import JobDetail from '@/components/jobs/JobDetail';
import { getJobById } from '@/lib/data/job';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function JobDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const job = getJobById(id);

    if (!job) {
        notFound();
    }

    return <JobDetail job={job} />;
}