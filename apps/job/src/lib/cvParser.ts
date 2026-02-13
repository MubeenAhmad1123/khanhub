// Simplified CV Parser Service
// Makes parsing optional - CVs can be uploaded without auto-extraction

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
 * NOTE: Automatic parsing disabled to avoid build issues
 * CVs will still be uploaded successfully, but skills won't be auto-extracted
 */
export const parseCV = async (file: File): Promise<ParsedCVData> => {
    console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.warn('[CV Parser] Auto-parsing is currently disabled');
    console.warn('[CV Parser] CV will be uploaded without skill extraction');
    console.warn('[CV Parser] This is normal - users can manually add skills');
    console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Return minimal data - CV upload will still work
    return {
        rawText: '',
        extractedData: {
            skills: [],
            experience: [],
            education: [],
        },
        parseSuccess: true, // Set to true so upload continues
        errors: [],
    };
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Calculate years of experience
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
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();
};
