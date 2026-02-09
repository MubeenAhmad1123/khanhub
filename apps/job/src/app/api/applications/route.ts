// ==========================================
// API ROUTE: /api/applications (FIXED IMPORTS)
// ==========================================
// Handle job application submissions

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/firebase-config'; // ✅ Fixed path
import { collection, addDoc, doc, getDoc, updateDoc, increment, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { COLLECTIONS, ApplicationStatus } from '@/types/DATABASE_SCHEMA'; // ✅ Fixed path
import { SubmitApplicationSchema } from '@/lib/validations'; // ✅ Updated path
import { calculateMatchScore } from '@/lib/services/matchingAlgorithm'; // ✅ Fixed path
import { awardPointsForJobApplication } from '@/lib/services/pointsSystem'; // ✅ Fixed path
import { sendApplicationConfirmationEmail } from '@/lib/services/emailService'; // ✅ Fixed path

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
        const jobSeeker = { id: jobSeekerDoc.id, ...jobSeekerDoc.data() };

        // 2. Check if payment is approved
        if (!jobSeeker.paymentApproved) {
            return NextResponse.json(
                { error: 'Payment not approved. Please complete payment verification.' },
                { status: 403 }
            );
        }

        // 3. Check application quota
        if (!jobSeeker.isPremium && jobSeeker.applicationCount >= jobSeeker.applicationQuota) {
            return NextResponse.json(
                { error: 'Application limit reached. Please upgrade to premium.' },
                { status: 403 }
            );
        }

        // 4. Fetch job details
        const jobDoc = await getDoc(doc(db, COLLECTIONS.JOBS, jobId));
        if (!jobDoc.exists()) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        const job = { id: jobDoc.id, ...jobDoc.data() };

        // 5. Check if already applied
        const existingApplicationQuery = query(
            collection(db, COLLECTIONS.APPLICATIONS),
            where('jobId', '==', jobId),
            where('jobSeekerId', '==', userId)
        );
        const existingApplications = await getDocs(existingApplicationQuery);
        if (!existingApplications.empty) {
            return NextResponse.json(
                { error: 'You have already applied to this job' },
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

            applicantName: jobSeeker.fullName,
            applicantEmail: jobSeeker.email,
            applicantPhone: jobSeeker.phoneNumber || '',
            applicantCvUrl: jobSeeker.cvUrl || '',
            applicantVideoUrl: jobSeeker.videoUrl || '',

            coverLetter: coverLetter || '',
            matchScore,
            status: ApplicationStatus.SUBMITTED,

            appliedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        const applicationRef = await addDoc(collection(db, COLLECTIONS.APPLICATIONS), applicationData);

        // 8. Update job application count
        await updateDoc(doc(db, COLLECTIONS.JOBS, jobId), {
            applicationCount: increment(1),
        });

        // 9. Update user application count
        await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
            applicationCount: increment(1),
        });

        // 10. Award points
        await awardPointsForJobApplication(userId);

        // 11. Send confirmation email
        await sendApplicationConfirmationEmail(
            jobSeeker.email,
            jobSeeker.fullName,
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
            ...doc.data(),
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