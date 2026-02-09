// Email Service - FIXED VERSION (No crashes without API key)
// Handles all email notifications via Resend API

// ==================== SAFE RESEND INITIALIZATION ====================
// This prevents crashes when RESEND_API_KEY is not configured

let resend: any = null;
let emailsEnabled = false;

try {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey && apiKey !== 're_123' && apiKey.startsWith('re_')) {
    // Only initialize if we have a valid API key
    const { Resend } = require('resend');
    resend = new Resend(apiKey);
    emailsEnabled = true;
    console.log('✅ Email service initialized with Resend API');
  } else {
    console.warn('⚠️ RESEND_API_KEY not configured - emails will be logged to console only');
  }
} catch (error) {
  console.warn('⚠️ Failed to initialize email service - emails will be logged to console only:', error);
}

// ==================== EMAIL TEMPLATES ====================

const APP_NAME = 'Khanhub Jobs';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';
const FROM_EMAIL = 'noreply@khanhub.com'; // Change to your verified domain

// ==================== HELPER FUNCTIONS ====================

/**
 * Safe email sender - logs if Resend not configured
 */
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!emailsEnabled || !resend) {
    console.log('\n📧 EMAIL (Not sent - No API key):');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML:', html.substring(0, 200) + '...');
    return; // Don't throw error, just log
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    // Don't throw - just log the error
  }
}

/**
 * Get base email template
 */
function getEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0D9488 0%, #14B8A6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #0D9488; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🚀 ${APP_NAME}</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
    `;
}

// ==================== PAYMENT EMAILS ====================

/**
 * Send payment approval email
 */
export async function sendPaymentApprovalEmail(
  userEmail: string,
  userName: string,
  paymentType: 'registration' | 'premium'
): Promise<void> {
  const subject = paymentType === 'registration'
    ? '✅ Registration Payment Approved - Welcome to Khanhub Jobs!'
    : '✅ Premium Subscription Activated!';

  const message = paymentType === 'registration'
    ? `
            <h2 style="color: #0D9488;">🎉 Welcome Aboard, ${userName}!</h2>
            <p>Great news! Your registration payment of <strong>Rs. 1,000</strong> has been verified and approved.</p>
            
            <p><strong>Your account is now fully activated!</strong></p>
            
            <p>You can now:</p>
            <ul>
                <li>✅ Apply to unlimited jobs</li>
                <li>✅ Upload your CV and intro video</li>
                <li>✅ Track your applications</li>
                <li>✅ Get matched with top employers</li>
            </ul>
            
            <a href="${APP_URL}/dashboard" class="button">Go to Dashboard</a>
            
            <p>Ready to start your job search? Browse our latest opportunities now!</p>
            
            <p>Best of luck,<br>The Khanhub Jobs Team</p>
        `
    : `
            <h2 style="color: #0D9488;">🌟 Premium Activated, ${userName}!</h2>
            <p>Your premium subscription payment has been approved.</p>
            
            <p><strong>Premium Benefits Active:</strong></p>
            <ul>
                <li>⭐ Unlimited job applications</li>
                <li>🔓 Access to premium job listings</li>
                <li>📊 Advanced analytics</li>
                <li>💬 Priority support</li>
            </ul>
            
            <a href="${APP_URL}/dashboard/premium" class="button">Explore Premium Features</a>
            
            <p>Your subscription is valid for 30 days from today.</p>
            
            <p>Thank you,<br>The Khanhub Jobs Team</p>
        `;

  const html = getEmailTemplate(message);
  await sendEmail(userEmail, subject, html);
}

/**
 * Send payment rejection email
 */
export async function sendPaymentRejectionEmail(
  userEmail: string,
  userName: string,
  rejectionReason: string
): Promise<void> {
  const subject = '❌ Payment Verification Issue';

  const message = `
        <h2 style="color: #DC2626;">Payment Not Approved</h2>
        <p>Dear ${userName},</p>
        
        <p>Unfortunately, we were unable to verify your payment submission.</p>
        
        <p><strong>Reason:</strong></p>
        <div style="background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
            ${rejectionReason}
        </div>
        
        <p><strong>Next Steps:</strong></p>
        <ol>
            <li>Please review the rejection reason above</li>
            <li>Ensure your payment screenshot is clear and shows all transaction details</li>
            <li>Resubmit your payment with a corrected screenshot</li>
        </ol>
        
        <a href="${APP_URL}/auth/verify-payment" class="button">Resubmit Payment</a>
        
        <p>If you believe this is an error or need assistance, please contact our support team.</p>
        
        <p>Best regards,<br>The Khanhub Jobs Team</p>
    `;

  const html = getEmailTemplate(message);
  await sendEmail(userEmail, subject, html);
}

/**
 * Send payment submission confirmation email
 */
export async function sendPaymentSubmittedEmail({
  to,
  userName,
  amount,
  transactionId,
  paymentId,
}: {
  to: string;
  userName: string;
  amount: number;
  transactionId: string;
  paymentId: string;
}): Promise<void> {
  const subject = '💳 Payment Received & Under Review';

  const message = `
        <h2 style="color: #0D9488;">Payment Submitted Successfully</h2>
        <p>Dear ${userName},</p>
        
        <p>We've received your payment submission and it is now being reviewed by our team.</p>
        
        <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Payment Summary:</strong></p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li><strong>Amount:</strong> Rs. ${amount.toLocaleString()}</li>
                <li><strong>Transaction ID:</strong> ${transactionId}</li>
                <li><strong>Reference ID:</strong> ${paymentId}</li>
                <li><strong>Status:</strong> Pending Verification</li>
            </ul>
        </div>
        
        <p>Verification usually takes <strong>1-2 hours</strong> during business hours. You'll receive another email once your payment is approved.</p>
        
        <p><strong>What's Next?</strong></p>
        <p>Once approved, your account will be fully activated, and you can start applying for jobs immediately.</p>
        
        <a href="${APP_URL}/dashboard" class="button">Go to Dashboard</a>
        
        <p>If you have any questions, please reply to this email or contact support.</p>
        
        <p>Best regards,<br>The Khanhub Jobs Team</p>
    `;

  const html = getEmailTemplate(message);
  await sendEmail(to, subject, html);
}


// ==================== JOB APPROVAL EMAILS ====================

/**
 * Send job approval email to employer
 */
export async function sendJobApprovalEmail(
  employerEmail: string,
  employerName: string,
  jobTitle: string
): Promise<void> {
  const subject = `✅ Job Posting Approved: ${jobTitle}`;

  const message = `
        <h2 style="color: #0D9488;">🎉 Job Posting Approved!</h2>
        <p>Dear ${employerName},</p>
        
        <p>Great news! Your job posting has been approved and is now live on Khanhub Jobs.</p>
        
        <p><strong>Job Title:</strong> ${jobTitle}</p>
        
        <p><strong>Your job is now visible to:</strong></p>
        <ul>
            <li>✅ All registered job seekers</li>
            <li>✅ Search engines (for better reach)</li>
            <li>✅ Our matching algorithm</li>
        </ul>
        
        <a href="${APP_URL}/employer/jobs" class="button">View Your Jobs</a>
        
        <p>You'll receive notifications when candidates apply. You can manage applications from your employer dashboard.</p>
        
        <p>Best regards,<br>The Khanhub Jobs Team</p>
    `;

  const html = getEmailTemplate(message);
  await sendEmail(employerEmail, subject, html);
}

/**
 * Send job rejection email to employer
 */
export async function sendJobRejectionEmail(
  employerEmail: string,
  employerName: string,
  jobTitle: string,
  rejectionReason: string
): Promise<void> {
  const subject = `❌ Job Posting Not Approved: ${jobTitle}`;

  const message = `
        <h2 style="color: #DC2626;">Job Posting Requires Changes</h2>
        <p>Dear ${employerName},</p>
        
        <p>We've reviewed your job posting for <strong>${jobTitle}</strong>. Unfortunately, we cannot approve it at this time.</p>
        
        <p><strong>Reason for rejection:</strong></p>
        <div style="background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
            ${rejectionReason}
        </div>
        
        <p><strong>Next Steps:</strong></p>
        <ol>
            <li>Review the feedback above</li>
            <li>Edit your job posting to address the issues</li>
            <li>Resubmit for approval</li>
        </ol>
        
        <a href="${APP_URL}/employer/jobs" class="button">Edit Job Posting</a>
        
        <p>If you have questions about our job posting guidelines, please don't hesitate to reach out.</p>
        
        <p>Best regards,<br>The Khanhub Jobs Team</p>
    `;

  const html = getEmailTemplate(message);
  await sendEmail(employerEmail, subject, html);
}

// ==================== APPLICATION EMAILS ====================

/**
 * Send application confirmation email to job seeker
 */
export async function sendApplicationConfirmationEmail(
  applicantEmail: string,
  applicantName: string,
  jobTitle: string,
  companyName: string
): Promise<void> {
  const subject = `✅ Application Submitted: ${jobTitle} at ${companyName}`;

  const message = `
        <h2 style="color: #0D9488;">Application Submitted Successfully!</h2>
        <p>Dear ${applicantName},</p>
        
        <p>Your application has been successfully submitted.</p>
        
        <p><strong>Job Details:</strong></p>
        <ul>
            <li><strong>Position:</strong> ${jobTitle}</li>
            <li><strong>Company:</strong> ${companyName}</li>
            <li><strong>Submitted:</strong> ${new Date().toLocaleDateString('en-PK')}</li>
        </ul>
        
        <p>The employer will review your application and get back to you if your profile matches their requirements.</p>
        
        <a href="${APP_URL}/dashboard/applications" class="button">Track Your Applications</a>
        
        <p>In the meantime, explore more opportunities on Khanhub Jobs!</p>
        
        <p>Best of luck,<br>The Khanhub Jobs Team</p>
    `;

  const html = getEmailTemplate(message);
  await sendEmail(applicantEmail, subject, html);
}

/**
 * Send new application alert to employer
 */
export async function sendNewApplicationAlertEmail(
  employerEmail: string,
  employerName: string,
  applicantName: string,
  jobTitle: string,
  applicationUrl: string
): Promise<void> {
  const subject = `🔔 New Application: ${jobTitle}`;

  const message = `
        <h2 style="color: #0D9488;">You Have a New Application!</h2>
        <p>Dear ${employerName},</p>
        
        <p><strong>${applicantName}</strong> has applied for your job posting: <strong>${jobTitle}</strong></p>
        
        <p>Review their profile and CV to see if they're a good match for your position.</p>
        
        <a href="${applicationUrl}" class="button">Review Application</a>
        
        <p>Don't forget to respond to applicants promptly to maintain a good employer rating!</p>
        
        <p>Best regards,<br>The Khanhub Jobs Team</p>
    `;

  const html = getEmailTemplate(message);
  await sendEmail(employerEmail, subject, html);
}

// ==================== EXPORTS ====================

export {
  sendEmail,
  emailsEnabled,
};