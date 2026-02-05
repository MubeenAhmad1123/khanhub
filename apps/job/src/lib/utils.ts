// Job Portal Utility Functions

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format salary in Pakistani Rupees
 */
export function formatSalary(amount: number, period: 'month' | 'year' = 'month'): string {
    const formatted = new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);

    return `${formatted}/${period === 'month' ? 'mo' : 'yr'}`;
}

/**
 * Format salary range
 */
export function formatSalaryRange(min: number, max: number, period: 'month' | 'year' = 'month'): string {
    const minFormatted = formatSalary(min, period);
    const maxFormatted = formatSalary(max, period);
    return `${minFormatted} - ${maxFormatted}`;
}

/**
 * Get days remaining until deadline
 */
export function getDaysRemaining(deadline: Date): number {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format deadline text
 */
export function formatDeadline(deadline: Date): string {
    const days = getDaysRemaining(deadline);

    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `${days} days left`;
    if (days <= 30) return `${Math.ceil(days / 7)} weeks left`;
    return new Date(deadline).toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Format posted date
 */
export function formatPostedDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return date.toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Get job type badge color
 */
export function getJobTypeBadge(type: string): string {
    const badges: Record<string, string> = {
        'full-time': 'bg-blue-100 text-blue-800',
        'part-time': 'bg-green-100 text-green-800',
        'contract': 'bg-purple-100 text-purple-800',
        'internship': 'bg-orange-100 text-orange-800',
        'remote': 'bg-indigo-100 text-indigo-800',
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
}

/**
 * Get experience level label
 */
export function getExperienceLevelLabel(level: string): string {
    const labels: Record<string, string> = {
        entry: 'Entry Level',
        mid: 'Mid Level',
        senior: 'Senior Level',
        executive: 'Executive',
    };
    return labels[level] || level;
}

/**
 * Get category label
 */
export function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
        healthcare: 'Healthcare',
        it: 'IT & Software',
        engineering: 'Engineering',
        sales: 'Sales',
        marketing: 'Marketing',
        finance: 'Finance',
        education: 'Education',
        hospitality: 'Hospitality',
        manufacturing: 'Manufacturing',
        construction: 'Construction',
        logistics: 'Logistics & Transport',
        'customer-service': 'Customer Service',
    };
    return labels[category] || category;
}

/**
 * Truncate text
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
}

/**
 * Generate job slug
 */
export function generateJobSlug(title: string, companyName: string): string {
    const titleSlug = title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

    const companySlug = companyName.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

    return `${titleSlug}-at-${companySlug}`;
}

/**
 * Validate Pakistani phone
 */
export function validatePakistaniPhone(phone: string): boolean {
    const regex = /^(\+92|0)?3\d{9}$/;
    return regex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Format Pakistani phone
 */
export function formatPakistaniPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('92')) {
        return `+${cleaned}`;
    }
    if (cleaned.startsWith('0')) {
        return `+92${cleaned.slice(1)}`;
    }
    return `+92${cleaned}`;
}

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Get WhatsApp link for job application
 */
export function getJobWhatsAppLink(jobTitle: string, companyName: string): string {
    const message = `Hi, I'm interested in applying for the ${jobTitle} position at ${companyName}. Could you please provide more details?`;
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/923006395220?text=${encodedMessage}`;
}

/**
 * Calculate application deadline urgency
 */
export function getDeadlineUrgency(deadline: Date): 'urgent' | 'moderate' | 'normal' {
    const days = getDaysRemaining(deadline);
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'moderate';
    return 'normal';
}

/**
 * Get application status color
 */
export function getApplicationStatusColor(status: string): string {
    const colors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        reviewed: 'bg-blue-100 text-blue-800',
        shortlisted: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
        accepted: 'bg-green-600 text-white',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Format company size
 */
export function formatCompanySize(size: string): string {
    return size.replace('-', ' - ') + ' employees';
}