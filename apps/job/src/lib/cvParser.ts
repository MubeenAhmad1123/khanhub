// CV Parser Service
// Extract text and parse CV data from PDF and DOCX files

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// ==================== TYPES ====================

export interface ParsedCVData {
    rawText: string;
    extractedData: {
        email?: string;
        phone?: string;
        skills: string[];
        experience: ParsedExperience[];
        education: ParsedEducation[];
        linkedin?: string;
        github?: string;
        portfolio?: string;
    };
    parseSuccess: boolean;
    errors: string[];
}

export interface ParsedExperience {
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
}

export interface ParsedEducation {
    degree: string;
    institution: string;
    year?: string;
    field?: string;
}

// ==================== MAIN PARSER FUNCTION ====================

/**
 * Parse CV file and extract data
 */
export const parseCV = async (file: File): Promise<ParsedCVData> => {
    try {
        // Extract text based on file type
        let rawText: string;

        if (file.type === 'application/pdf') {
            rawText = await extractTextFromPDF(file);
        } else if (
            file.type ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            rawText = await extractTextFromDOCX(file);
        } else {
            return {
                rawText: '',
                extractedData: {
                    skills: [],
                    experience: [],
                    education: [],
                },
                parseSuccess: false,
                errors: ['Unsupported file type'],
            };
        }

        // Parse the extracted text
        const extractedData = parseTextData(rawText);

        return {
            rawText,
            extractedData,
            parseSuccess: true,
            errors: [],
        };
    } catch (error: any) {
        console.error('CV parsing error:', error);
        return {
            rawText: '',
            extractedData: {
                skills: [],
                experience: [],
                education: [],
            },
            parseSuccess: false,
            errors: [error.message || 'Failed to parse CV'],
        };
    }
};

// ==================== TEXT EXTRACTION ====================

/**
 * Extract text from PDF file
 */
const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const data = await pdfParse(buffer);
        return data.text;
    } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error('Failed to extract text from PDF');
    }
};

/**
 * Extract text from DOCX file
 */
const extractTextFromDOCX = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (error) {
        console.error('DOCX extraction error:', error);
        throw new Error('Failed to extract text from DOCX');
    }
};

// ==================== DATA PARSING ====================

/**
 * Parse extracted text to find structured data
 */
const parseTextData = (text: string): ParsedCVData['extractedData'] => {
    return {
        email: extractEmail(text),
        phone: extractPhone(text),
        skills: extractSkills(text),
        experience: extractExperience(text),
        education: extractEducation(text),
        linkedin: extractLinkedIn(text),
        github: extractGitHub(text),
        portfolio: extractPortfolio(text),
    };
};

/**
 * Extract email address
 */
const extractEmail = (text: string): string | undefined => {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = text.match(emailRegex);
    return match ? match[0] : undefined;
};

/**
 * Extract phone number (Pakistani format)
 */
const extractPhone = (text: string): string | undefined => {
    // Match Pakistani phone numbers: +92, 0092, or 0 followed by 10 digits
    const phoneRegex = /(\+92|0092|0)\s?3[0-9]{2}\s?[0-9]{7}|\+92\s?[0-9]{10}/;
    const match = text.match(phoneRegex);
    if (match) {
        // Normalize phone number
        return match[0].replace(/\s/g, '');
    }
    return undefined;
};

/**
 * Extract skills from text
 */
const extractSkills = (text: string): string[] => {
    const skills: string[] = [];
    const lowerText = text.toLowerCase();

    // Common skill keywords
    const skillKeywords = [
        // Programming Languages
        'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby',
        'go', 'rust', 'swift', 'kotlin', 'scala', 'r', 'matlab',

        // Web Technologies
        'html', 'css', 'react', 'angular', 'vue', 'next.js', 'node.js', 'express',
        'django', 'flask', 'spring', 'laravel', 'asp.net', 'jquery',

        // Databases
        'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle', 'firebase',
        'dynamodb', 'cassandra', 'elasticsearch',

        // Cloud & DevOps
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
        'ci/cd', 'terraform', 'ansible',

        // Mobile
        'android', 'ios', 'react native', 'flutter', 'xamarin',

        // Design
        'figma', 'adobe xd', 'photoshop', 'illustrator', 'sketch', 'ui/ux',

        // Data Science & AI
        'machine learning', 'deep learning', 'data analysis', 'tensorflow',
        'pytorch', 'scikit-learn', 'pandas', 'numpy',

        // Other
        'agile', 'scrum', 'project management', 'leadership', 'communication',
        'problem solving', 'teamwork',
    ];

    skillKeywords.forEach((skill) => {
        if (lowerText.includes(skill)) {
            // Capitalize first letter of each word
            const capitalizedSkill = skill
                .split(' ')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            skills.push(capitalizedSkill);
        }
    });

    // Remove duplicates
    return Array.from(new Set(skills));
};

/**
 * Extract work experience
 */
const extractExperience = (text: string): ParsedExperience[] => {
    const experiences: ParsedExperience[] = [];

    // Look for patterns like "Software Engineer at Google" or "2020-2022"
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check if line contains job title keywords
        const jobTitleKeywords = [
            'engineer', 'developer', 'designer', 'manager', 'analyst',
            'consultant', 'specialist', 'coordinator', 'director', 'lead',
            'senior', 'junior', 'intern',
        ];

        const hasJobTitle = jobTitleKeywords.some((keyword) =>
            line.toLowerCase().includes(keyword)
        );

        if (hasJobTitle && line.length < 100) {
            // Likely a job title line
            const experience: ParsedExperience = {
                title: line,
                company: '',
            };

            // Try to extract company from next line or same line
            if (line.includes(' at ')) {
                const parts = line.split(' at ');
                experience.title = parts[0].trim();
                experience.company = parts[1].trim();
            } else if (i + 1 < lines.length) {
                experience.company = lines[i + 1].trim();
            }

            // Try to extract dates
            const dateMatch = line.match(/(\d{4})\s?-\s?(\d{4}|present)/i);
            if (dateMatch) {
                experience.startDate = dateMatch[1];
                experience.endDate = dateMatch[2].toLowerCase() === 'present'
                    ? 'Present'
                    : dateMatch[2];
            }

            if (experience.title && experience.company) {
                experiences.push(experience);
            }
        }
    }

    return experiences.slice(0, 5); // Limit to 5 experiences
};

/**
 * Extract education
 */
const extractEducation = (text: string): ParsedEducation[] => {
    const education: ParsedEducation[] = [];

    const degreeKeywords = [
        "bachelor's", 'bachelors', 'bs', 'ba', 'bsc', 'bba', 'btech',
        "master's", 'masters', 'ms', 'ma', 'msc', 'mba', 'mtech',
        'phd', 'doctorate', 'diploma', 'associate',
    ];

    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim().toLowerCase();

        const hasDegree = degreeKeywords.some((keyword) =>
            line.includes(keyword)
        );

        if (hasDegree && line.length < 150) {
            const edu: ParsedEducation = {
                degree: lines[i].trim(),
                institution: '',
            };

            // Try to extract institution from next line
            if (i + 1 < lines.length) {
                edu.institution = lines[i + 1].trim();
            }

            // Try to extract year
            const yearMatch = line.match(/(\d{4})/);
            if (yearMatch) {
                edu.year = yearMatch[1];
            }

            if (edu.degree && edu.institution) {
                education.push(edu);
            }
        }
    }

    return education.slice(0, 3); // Limit to 3 education entries
};

/**
 * Extract LinkedIn URL
 */
const extractLinkedIn = (text: string): string | undefined => {
    const linkedinRegex = /linkedin\.com\/in\/[\w-]+/i;
    const match = text.match(linkedinRegex);
    return match ? `https://${match[0]}` : undefined;
};

/**
 * Extract GitHub URL
 */
const extractGitHub = (text: string): string | undefined => {
    const githubRegex = /github\.com\/[\w-]+/i;
    const match = text.match(githubRegex);
    return match ? `https://${match[0]}` : undefined;
};

/**
 * Extract portfolio URL
 */
const extractPortfolio = (text: string): string | undefined => {
    // Look for URLs that might be portfolios
    const urlRegex = /https?:\/\/[\w.-]+\.[\w]{2,}\/?\S*/gi;
    const matches = text.match(urlRegex);

    if (matches) {
        // Filter out common social media and exclude LinkedIn/GitHub
        const portfolio = matches.find(
            (url) =>
                !url.includes('linkedin.com') &&
                !url.includes('github.com') &&
                !url.includes('facebook.com') &&
                !url.includes('twitter.com') &&
                !url.includes('instagram.com')
        );
        portfolio;
    }

    return undefined;
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Calculate years of experience from text
 */
export const calculateYearsOfExperience = (
    experiences: ParsedExperience[]
): number => {
    let totalMonths = 0;

    experiences.forEach((exp) => {
        if (exp.startDate && exp.endDate) {
            const start = parseInt(exp.startDate);
            const end =
                exp.endDate.toLowerCase() === 'present'
                    ? new Date().getFullYear()
                    : parseInt(exp.endDate);

            if (!isNaN(start) && !isNaN(end)) {
                totalMonths += (end - start) * 12;
            }
        }
    });

    return Math.round(totalMonths / 12);
};

/**
 * Get highest degree level
 */
export const getHighestDegree = (education: ParsedEducation[]): string => {
    const degreeLevels = {
        phd: 5,
        doctorate: 5,
        masters: 4,
        master: 4,
        mba: 4,
        bachelors: 3,
        bachelor: 3,
        diploma: 2,
        associate: 1,
    };

    let highestLevel = 0;
    let highestDegree = '';

    education.forEach((edu) => {
        const degreeLower = edu.degree.toLowerCase();
        Object.entries(degreeLevels).forEach(([key, level]) => {
            if (degreeLower.includes(key) && level > highestLevel) {
                highestLevel = level;
                highestDegree = edu.degree;
            }
        });
    });

    return highestDegree || 'Not specified';
};

/**
 * Clean and format text
 */
export const cleanText = (text: string): string => {
    return text
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
        .trim();
};
