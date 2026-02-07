import { Resend } from 'resend';

// Initialize Resend only if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = 'Khanhub Jobs <noreply@khanhub.com>';

// Helper to check if email service is available
const isEmailServiceAvailable = () => {
    if (!resend) {
        console.warn('⚠️ Email service not configured. Add RESEND_API_KEY to .env.local to enable emails.');
        return false;
    }
    return true;
};

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
    to: string,
    name: string
): Promise<void> {
    if (!isEmailServiceAvailable()) return;

    await resend!.emails.send({
        from: FROM_EMAIL,
        to,
        subject: 'Welcome to Khanhub Jobs!',
        html: `
            <h2>Welcome to Khanhub Jobs, ${name}!</h2>
            <p>Thank you for joining Pakistan's premier job placement platform.</p>
            <p>Your next steps:</p>
            <ol>
                <li>Complete your payment verification (Rs. 1,000)</li>
                <li>Upload your CV and record an intro video</li>
                <li>Start browsing and applying to jobs</li>
            </ol>
            <p>Best regards,<br>Khanhub Team</p>
        `,
    });
}

/**
 * Send payment approval email
 */
export async function sendPaymentApprovalEmail(
    to: string,
    name: string,
    amount: number
): Promise<void> {
    await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: 'Payment Approved - Khanhub Jobs',
        html: `
            <h2>Payment Approved!</h2>
            <p>Hi ${name},</p>
            <p>Your payment of <strong>Rs. ${amount.toLocaleString()}</strong> has been approved.</p>
            <p>You can now access all features of your account.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background:#22c55e;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Go to Dashboard</a></p>
            <p>Best regards,<br>Khanhub Team</p>
        `,
    });
}

/**
 * Send payment rejection email
 */
export async function sendPaymentRejectionEmail(
    to: string,
    name: string,
    reason: string
): Promise<void> {
    await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: 'Payment Verification Issue - Khanhub Jobs',
        html: `
            <h2>Payment Not Approved</h2>
            <p>Hi ${name},</p>
            <p>Unfortunately, we could not verify your payment for the following reason:</p>
            <p><strong>${reason}</strong></p>
            <p>Please upload a clear screenshot of your payment transaction and try again.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-payment" style="background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Upload Payment Proof</a></p>
            <p>If you have questions, please contact our support team.</p>
            <p>Best regards,<br>Khanhub Team</p>
        `,
    });
}

/**
 * Send application confirmation email
 */
export async function sendApplicationConfirmationEmail(
    to: string,
    name: string,
    jobTitle: string,
    companyName: string
): Promise<void> {
    await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: `Application Submitted - ${jobTitle}`,
        html: `
            <h2>Application Submitted Successfully!</h2>
            <p>Hi ${name},</p>
            <p>Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been submitted.</p>
            <p>The employer will review your application and contact you if you're shortlisted.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/applications" style="background:#22c55e;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Track Application</a></p>
            <p>Good luck!</p>
            <p>Best regards,<br>Khanhub Team</p>
        `,
    });
}

/**
 * Send application status update email
 */
export async function sendApplicationStatusEmail(
    to: string,
    name: string,
    jobTitle: string,
    status: string
): Promise<void> {
    const statusMessages = {
        viewed: 'The employer has viewed your application.',
        shortlisted: 'Congratulations! You have been shortlisted for this position.',
        interview: 'You have been scheduled for an interview!',
        rejected: 'Unfortunately, your application was not selected this time.',
        hired: 'Congratulations! You have been selected for this position!',
    };

    await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: `Application Update - ${jobTitle}`,
        html: `
            <h2>Application Status Update</h2>
            <p>Hi ${name},</p>
            <p>Your application for <strong>${jobTitle}</strong> has been updated:</p>
            <p><strong>${statusMessages[status as keyof typeof statusMessages] || status}</strong></p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/applications" style="background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">View Details</a></p>
            <p>Best regards,<br>Khanhub Team</p>
        `,
    });
}

/**
 * Send premium expiry reminder
 */
export async function sendPremiumExpiryReminder(
    to: string,
    name: string,
    expiryDate: Date
): Promise<void> {
    const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: 'Premium Membership Expiring Soon - Khanhub Jobs',
        html: `
            <h2>Premium Membership Expiring</h2>
            <p>Hi ${name},</p>
            <p>Your premium membership will expire in <strong>${daysRemaining} days</strong> on ${expiryDate.toLocaleDateString()}.</p>
            <p>Renew now to continue enjoying unlimited job applications and full contact details.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/premium" style="background:#f97316;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Renew Premium</a></p>
            <p>Best regards,<br>Khanhub Team</p>
        `,
    });
}

/**
 * Send commission payment reminder to employer
 */
export async function sendCommissionReminderEmail(
    to: string,
    employerName: string,
    candidateName: string,
    jobTitle: string,
    commissionAmount: number
): Promise<void> {
    await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: 'Placement Commission Due - Khanhub Jobs',
        html: `
            <h2>Placement Commission Payment Due</h2>
            <p>Hi ${employerName},</p>
            <p>This is a reminder that the placement commission for <strong>${candidateName}</strong> (${jobTitle}) is now due.</p>
            <p>Commission Amount: <strong>Rs. ${commissionAmount.toLocaleString()}</strong></p>
            <p>Please process the payment at your earliest convenience.</p>
            <p>If you have already paid, please disregard this message.</p>
            <p>Best regards,<br>Khanhub Team</p>
        `,
    });
}

/**
 * Send job approval notification to employer
 */
export async function sendJobApprovalEmail(
    to: string,
    employerName: string,
    jobTitle: string,
    approved: boolean
): Promise<void> {
    await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: approved ? 'Job Posted Successfully' : 'Job Posting Needs Revision',
        html: approved
            ? `
                <h2>Job Posting Approved!</h2>
                <p>Hi ${employerName},</p>
                <p>Your job posting for <strong>${jobTitle}</strong> has been approved and is now live.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/employer/jobs" style="background:#22c55e;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">View Job Posting</a></p>
                <p>Best regards,<br>Khanhub Team</p>
            `
            : `
                <h2>Job Posting Needs Revision</h2>
                <p>Hi ${employerName},</p>
                <p>Your job posting for <strong>${jobTitle}</strong> requires some changes before it can be published.</p>
                <p>Please review and resubmit your job posting.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/employer/jobs" style="background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Edit Job Posting</a></p>
                <p>Best regards,<br>Khanhub Team</p>
            `,
    });
}
