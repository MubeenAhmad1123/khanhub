// ==========================================
// API ROUTE: /api/applications (FIXED IMPORTS)
// ==========================================
// Handle job application submissions

import { NextRequest, NextResponse } from 'next/server';
import { db, collection, addDoc, doc, getDoc, updateDoc, increment, Timestamp, query, where, getDocs } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/types/DATABASE_SCHEMA';
import { SubmitApplicationSchema } from '@/lib/validations';
import { calculateMatchScore } from '@/lib/services/matchingAlgorithm';
import { awardPointsForJobApplication } from '@/lib/services/pointsSystem';
import { sendApplicationConfirmationEmail } from '@/lib/services/emailService';
import { User, isJobSeeker } from '@/types/user';
import { Job } from '@/types/job';

/**
 * POST /api/applications
 * Submit a new job application
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Get user ID from request (assumes middleware adds this)
        const userId = request.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Validate request body
        const validation = SubmitApplicationSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { jobId, coverLetter } = validation.data;

        // 1. Fetch job seeker profile
        const jobSeekerDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
        if (!jobSeekerDoc.exists()) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Use unknown as intermediate to satisfy strict TS
        const data = jobSeekerDoc.data() || {};
        const baseUser = {
            uid: jobSeekerDoc.id,
            email: data.email || '',
            displayName: data.displayName || '',
            role: data.role || 'job_seeker',
            paymentStatus: data.paymentStatus || 'pending',
            isPremium: data.isPremium || false,
            applicationsUsed: data.applicationsUsed || 0,
            premiumJobsViewed: data.premiumJobsViewed || 0,
            points: data.points || 0,
            pointsHistory: data.pointsHistory || [],
            createdAt: data.createdAt || Timestamp.now(),
            updatedAt: data.updatedAt || Timestamp.now(),
            isActive: data.isActive !== undefined ? data.isActive : true,
            isFeatured: data.isFeatured || false,
            isBanned: data.isBanned || false,
            onboardingCompleted: data.onboardingCompleted || false,
            ...data
        } as unknown as User;

        if (!isJobSeeker(baseUser)) {
            return NextResponse.json({ error: 'Only job seekers can apply' }, { status: 403 });
        }

        const jobSeeker = baseUser;

        // 2. Check if payment is approved
        if (jobSeeker.paymentStatus !== 'approved') {
            return NextResponse.json(
                { error: 'Payment not approved' },
                { status: 403 }
            );
        }

        // 3. Check application quota
        const applicationsUsed = (jobSeeker as any).applicationsUsed || 0;
        if (!jobSeeker.isPremium && applicationsUsed >= 10) {
            return NextResponse.json(
                { error: 'Application limit reached' },
                { status: 403 }
            );
        }

        // 4. Fetch job details
        const jobDoc = await getDoc(doc(db, COLLECTIONS.JOBS, jobId));
        if (!jobDoc.exists()) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        const rawJobData = { id: jobDoc.id, ...jobDoc.data() };
        const job = rawJobData as unknown as Job;

        // 5. Check if already applied
        const existingApplicationQuery = query(
            collection(db, COLLECTIONS.APPLICATIONS),
            where('jobId', '==', jobId),
            where('jobSeekerId', '==', userId)
        );
        const existingApplications = await getDocs(existingApplicationQuery);
        if (!existingApplications.empty) {
            return NextResponse.json(
                { error: 'You have already applied' },
                { status: 400 }
            );
        }

        // 6. Calculate match score
        const matchScore = calculateMatchScore(jobSeeker, job);

        // 7. Create application document
        const applicationData = {
            jobId,
            jobTitle: job.title,
            jobSeekerId: userId,
            employerId: job.employerId,
            companyName: job.companyName,

            applicantName: jobSeeker.displayName,
            applicantEmail: jobSeeker.email,
            applicantPhone: jobSeeker.profile.phone || '',
            applicantCvUrl: jobSeeker.profile.cvUrl || '',
            applicantVideoUrl: jobSeeker.profile.videoUrl || null,

            coverLetter: coverLetter || '',
            matchScore,
            status: 'applied',

            appliedAt: Timestamp.now(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        const applicationRef = await addDoc(collection(db, COLLECTIONS.APPLICATIONS), applicationData);

        // 8. Update job application count
        await updateDoc(doc(db, COLLECTIONS.JOBS, jobId), {
            applicantCount: increment(1),
        });

        // 9. Update user application count
        await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
            applicationsUsed: increment(1),
        });

        // 10. Award points
        await awardPointsForJobApplication(userId);

        // 11. Send confirmation email
        await sendApplicationConfirmationEmail(
            jobSeeker.email,
            jobSeeker.displayName,
            job.title,
            job.companyName
        );

        return NextResponse.json({
            success: true,
            applicationId: applicationRef.id,
            message: 'Application submitted successfully',
        });
    } catch (error) {
        console.error('Error submitting application:', error);
        return NextResponse.json(
            { error: 'Failed to submit application' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/applications?userId=xxx
 * Get all applications for a user (job seeker or employer)
 */
export async function GET(request: NextRequest) {
    try {
        const userId = request.nextUrl.searchParams.get('userId');
        const userType = request.nextUrl.searchParams.get('userType'); // 'job_seeker' or 'employer'

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        let applicationsQuery;
        if (userType === 'employer') {
            applicationsQuery = query(
                collection(db, COLLECTIONS.APPLICATIONS),
                where('employerId', '==', userId)
            );
        } else {
            applicationsQuery = query(
                collection(db, COLLECTIONS.APPLICATIONS),
                where('jobSeekerId', '==', userId)
            );
        }

        const applicationsSnapshot = await getDocs(applicationsQuery);
        const applications = applicationsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as any),
        }));

        return NextResponse.json({ applications });
    } catch (error) {
        console.error('Error fetching applications:', error);
        return NextResponse.json(
            { error: 'Failed to fetch applications' },
            { status: 500 }
        );
    }
}