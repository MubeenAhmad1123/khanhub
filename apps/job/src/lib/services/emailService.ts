// ==========================================
// EMAIL SERVICE (Resend)
// ==========================================
// Send transactional emails using Resend API

import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const FROM_EMAIL = 'noreply@khanhub.com'; // Replace with your verified domain
const COMPANY_NAME = 'Khanhub Job Portal';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://jobkhanhub.vercel.app';

/**
 * Send welcome email to new job seeker
 * @param to - Recipient email
 * @param name - User's name
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: `Welcome to ${COMPANY_NAME}! 🎉`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #16a34a; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Welcome to ${COMPANY_NAME}!</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Thank you for registering with ${COMPANY_NAME}! We're excited to help you find your dream job in Pakistan.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              <strong>Next Steps:</strong>
            </p>
            
            <ol style="font-size: 16px; line-height: 1.8;">
              <li>Upload your payment screenshot (Rs. 1,000 registration fee)</li>
              <li>Wait for admin approval (usually within 24 hours)</li>
              <li>Complete your profile (CV, intro video, skills)</li>
              <li>Start applying to jobs!</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_URL}/auth/verify-payment" style="background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Upload Payment Screenshot
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
              Questions? Reply to this email or contact us at support@khanhub.com
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            © 2024 ${COMPANY_NAME}. All rights reserved.
          </div>
        </body>
        </html>
      `,
        });
        console.log('✅ Welcome email sent to:', to);
    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
    }
}

/**
 * Send payment approval email
 * @param to - Recipient email
 * @param name - User's name
 * @param type - Payment type (registration or premium)
 */
export async function sendPaymentApprovalEmail(
    to: string,
    name: string,
    type: 'registration' | 'premium'
): Promise<void> {
    try {
        const subject = type === 'registration'
            ? '✅ Payment Approved - Welcome to Khanhub!'
            : '✅ Premium Membership Activated!';

        const message = type === 'registration'
            ? 'Your registration payment has been approved! You can now access the job portal and apply to jobs.'
            : 'Your premium membership is now active! Enjoy unlimited applications and full job details for 100 jobs.';

        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #16a34a; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">🎉 Payment Approved!</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.6;">${message}</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_URL}/dashboard" style="background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Go to Dashboard
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
              Happy job hunting! 🚀
            </p>
          </div>
        </body>
        </html>
      `,
        });
        console.log('✅ Payment approval email sent to:', to);
    } catch (error) {
        console.error('❌ Error sending payment approval email:', error);
    }
}

/**
 * Send payment rejection email
 * @param to - Recipient email
 * @param name - User's name
 * @param reason - Rejection reason
 */
export async function sendPaymentRejectionEmail(
    to: string,
    name: string,
    reason: string
): Promise<void> {
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: '❌ Payment Verification Issue',
            html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Payment Not Approved</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Unfortunately, we couldn't verify your payment due to the following reason:
            </p>
            
            <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${reason}</p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Please upload a clear screenshot of your payment receipt and try again.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_URL}/auth/verify-payment" style="background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Upload New Screenshot
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
              Need help? Contact us at support@khanhub.com
            </p>
          </div>
        </body>
        </html>
      `,
        });
        console.log('✅ Payment rejection email sent to:', to);
    } catch (error) {
        console.error('❌ Error sending payment rejection email:', error);
    }
}

/**
 * Send application confirmation email to job seeker
 * @param to - Recipient email
 * @param name - User's name
 * @param jobTitle - Job title
 * @param companyName - Company name
 */
export async function sendApplicationConfirmationEmail(
    to: string,
    name: string,
    jobTitle: string,
    companyName: string
): Promise<void> {
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: `Application Submitted: ${jobTitle}`,
            html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Application Submitted! ✅</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been successfully submitted.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              The employer will review your application and contact you if you're a good fit.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_URL}/dashboard/applications" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Track Application
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
              Good luck! 🍀
            </p>
          </div>
        </body>
        </html>
      `,
        });
        console.log('✅ Application confirmation email sent to:', to);
    } catch (error) {
        console.error('❌ Error sending application confirmation email:', error);
    }
}

/**
 * Send application status update email
 * @param to - Recipient email
 * @param name - User's name
 * @param jobTitle - Job title
 * @param status - New application status
 */
export async function sendApplicationStatusEmail(
    to: string,
    name: string,
    jobTitle: string,
    status: string
): Promise<void> {
    try {
        const statusMessages: { [key: string]: { subject: string; message: string; color: string } } = {
            shortlisted: {
                subject: '🎉 You\'ve been shortlisted!',
                message: 'Congratulations! Your application has been shortlisted. The employer may contact you soon.',
                color: '#16a34a',
            },
            interview: {
                subject: '📅 Interview Scheduled',
                message: 'Great news! You\'ve been invited for an interview. Check your dashboard for details.',
                color: '#2563eb',
            },
            rejected: {
                subject: 'Application Update',
                message: 'Thank you for your interest. Unfortunately, you were not selected for this position. Keep applying!',
                color: '#6b7280',
            },
            hired: {
                subject: '🎊 Congratulations! You\'re hired!',
                message: 'Amazing news! You\'ve been hired for this position. The employer will contact you with next steps.',
                color: '#16a34a',
            },
        };

        const statusInfo = statusMessages[status] || {
            subject: 'Application Status Update',
            message: `Your application status has been updated to: ${status}`,
            color: '#2563eb',
        };

        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: statusInfo.subject,
            html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${statusInfo.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">${statusInfo.subject}</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              ${statusInfo.message}
            </p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              <strong>Job:</strong> ${jobTitle}
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_URL}/dashboard/applications" style="background-color: ${statusInfo.color}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Details
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
        });
        console.log('✅ Application status email sent to:', to);
    } catch (error) {
        console.error('❌ Error sending application status email:', error);
    }
}

/**
 * Send job approval email to employer
 * @param to - Recipient email
 * @param companyName - Company name
 * @param jobTitle - Job title
 */
export async function sendJobApprovalEmail(
    to: string,
    companyName: string,
    jobTitle: string
): Promise<void> {
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: `✅ Job Approved: ${jobTitle}`,
            html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #16a34a; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Job Posting Approved! 🎉</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${companyName}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Your job posting for <strong>${jobTitle}</strong> has been approved and is now live!
            </p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Candidates can now view and apply to your job. You'll receive notifications when applications come in.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_URL}/employer/dashboard" style="background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Dashboard
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
        });
        console.log('✅ Job approval email sent to:', to);
    } catch (error) {
        console.error('❌ Error sending job approval email:', error);
    }
}

/**
 * Send premium expiry reminder (7 days before)
 * @param to - Recipient email
 * @param name - User's name
 * @param expiryDate - Expiry date string
 */
export async function sendPremiumExpiryReminder(
    to: string,
    name: string,
    expiryDate: string
): Promise<void> {
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: '⏰ Premium Membership Expiring Soon',
            html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ea580c; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Premium Expiring Soon ⏰</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Your premium membership will expire on <strong>${expiryDate}</strong>.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Renew now to continue enjoying unlimited applications and full job details!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_URL}/dashboard/premium" style="background-color: #ea580c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Renew Premium
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
        });
        console.log('✅ Premium expiry reminder sent to:', to);
    } catch (error) {
        console.error('❌ Error sending premium expiry reminder:', error);
    }
}

/**
 * Send commission payment reminder to admin
 * @param adminEmail - Admin email
 * @param candidateName - Candidate name
 * @param companyName - Company name
 * @param commissionAmount - Commission amount
 */
export async function sendCommissionReminderEmail(
    adminEmail: string,
    candidateName: string,
    companyName: string,
    commissionAmount: number
): Promise<void> {
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: adminEmail,
            subject: `💰 Commission Pending: Rs. ${commissionAmount.toLocaleString()}`,
            html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #16a34a; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">💰 Commission Collection Reminder</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; line-height: 1.6;"><strong>Placement Details:</strong></p>
            
            <ul style="font-size: 16px; line-height: 1.8;">
              <li><strong>Candidate:</strong> ${candidateName}</li>
              <li><strong>Company:</strong> ${companyName}</li>
              <li><strong>Commission Amount:</strong> Rs. ${commissionAmount.toLocaleString()}</li>
            </ul>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Please follow up with the candidate to collect the commission payment.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_URL}/admin/placements" style="background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Placements
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
        });
        console.log('✅ Commission reminder email sent to admin');
    } catch (error) {
        console.error('❌ Error sending commission reminder email:', error);
    }
}