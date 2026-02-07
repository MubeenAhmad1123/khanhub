import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export interface ExtractedData {
    name?: string;
    email?: string;
    phone?: string;
    skills: string[];
    experience: Array<{
        title: string;
        company: string;
        startDate?: string;
        endDate?: string;
        description?: string;
    }>;
    education: Array<{
        degree: string;
        institution: string;
        year?: string;
    }>;
    rawText: string;
}

/**
 * Parse PDF resume
 */
export async function parsePDF(file: File): Promise<ExtractedData> {
    const arrayBuffer = await file.arrayBuffer();
    const data = await pdf(Buffer.from(arrayBuffer));
    return extractDataFromText(data.text);
}

/**
 * Parse DOCX resume
 */
export async function parseDOCX(file: File): Promise<ExtractedData> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return extractDataFromText(result.value);
}

/**
 * Extract structured data from resume text
 */
function extractDataFromText(text: string): ExtractedData {
    const extractedData: ExtractedData = {
        skills: [],
        experience: [],
        education: [],
        rawText: text,
    };

    // Extract email
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const emailMatch = text.match(emailRegex);
    if (emailMatch && emailMatch.length > 0) {
        extractedData.email = emailMatch[0];
    }

    // Extract phone (Pakistan format)
    const phoneRegex = /(\+92|0)?3\d{9}|(\+92|0)?(\d{2,3})[-\s]?\d{7,8}/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch && phoneMatch.length > 0) {
        extractedData.phone = phoneMatch[0];
    }

    // Extract name (usually first line or after "CV" or "Resume")
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
        // Simple heuristic: first line that's not too long and has title case
        for (const line of lines.slice(0, 5)) {
            const trimmed = line.trim();
            if (trimmed.length > 5 && trimmed.length < 50 && /^[A-Z]/.test(trimmed)) {
                extractedData.name = trimmed;
                break;
            }
        }
    }

    // Extract skills - look for common skill keywords
    const skillKeywords = [
        'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C++', 'SQL',
        'HTML', 'CSS', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes',
        'Git', 'Agile', 'Scrum', 'Leadership', 'Management', 'Communication',
        'Microsoft Office', 'Excel', 'PowerPoint', 'Photoshop', 'Marketing',
        'Sales', 'Customer Service', 'Nursing', 'Patient Care', 'Medical Equipment',
    ];

    const textLower = text.toLowerCase();
    extractedData.skills = skillKeywords.filter(skill =>
        textLower.includes(skill.toLowerCase())
    );

    // Extract experience - look for common job title patterns
    const jobTitlePatterns = [
        /(?:Software|Senior|Junior|Lead)\s+(?:Engineer|Developer|Designer|Manager|Analyst)/gi,
        /(?:Project|Product|Marketing|Sales)\s+Manager/gi,
        /(?:Nurse|Doctor|Medical Officer|Staff Nurse)/gi,
        /(?:Accountant|Financial Analyst|HR Manager)/gi,
    ];

    jobTitlePatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(match => {
                extractedData.experience.push({
                    title: match,
                    company: 'Unknown', // Hard to extract company names reliably
                });
            });
        }
    });

    // Extract education - look for degree keywords
    const degreeKeywords = [
        'MBBS', 'B.Sc', 'BSc', 'M.Sc', 'MSc', 'Bachelor', 'Master', 'PhD',
        'B.Tech', 'M.Tech', 'BBA', 'MBA', 'B.Com', 'M.Com',
    ];

    degreeKeywords.forEach(degree => {
        const regex = new RegExp(degree + '.*?(?:from|in|at)\\s+([^\\n]{10,50})', 'gi');
        const matches = text.match(regex);
        if (matches) {
            matches.forEach(match => {
                extractedData.education.push({
                    degree: degree,
                    institution: match.substring(degree.length).trim(),
                });
            });
        }
    });

    return extractedData;
}

/**
 * Parse resume file (auto-detect PDF or DOCX)
 */
export async function parseResume(file: File): Promise<ExtractedData> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
        return parsePDF(file);
    } else if (extension === 'docx') {
        return parseDOCX(file);
    } else {
        throw new Error('Unsupported file format. Please upload PDF or DOCX.');
    }
}
