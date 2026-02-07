import { NextResponse } from 'next/server';
import { getApprovedJobs } from '@/lib/firebase/firestore';

export async function GET() {
    try {
        const jobs = await getApprovedJobs();
        return NextResponse.json({ success: true, data: jobs });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    // Placeholder for job creation
    return NextResponse.json({ success: true, message: 'Job creation endpoint' });
}
