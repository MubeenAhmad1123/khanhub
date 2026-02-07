import { z } from 'zod';

export const jobSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    category: z.string(),
    type: z.enum(['full-time', 'part-time', 'contract', 'internship']),
    locationType: z.enum(['on-site', 'remote', 'hybrid']),
    experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']),
    location: z.string(),
    city: z.string(),
    province: z.string(),
    salary: z.object({
        min: z.number().min(0),
        max: z.number().min(0),
        currency: z.string().default('PKR'),
        period: z.string().default('monthly'),
    }).optional(),
    requirements: z.array(z.string()).min(1, 'At least one requirement is required'),
});

export const applicationSchema = z.object({
    jobId: z.string(),
    candidateId: z.string(),
    resumeUrl: z.string().url(),
    coverLetter: z.string().optional(),
});
