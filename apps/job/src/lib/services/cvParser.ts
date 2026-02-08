// ==========================================
// CV PARSER SERVICE
// ==========================================
// Extract text from PDF and DOCX files and parse relevant information

import pdf from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Parsed CV data structure
 */
export interface ParsedCVData {
    email?: string;
    phone?: string;
    skills: string[];
    rawText: string;
}

/**
 * Extract text from PDF file
 * @param file - File object or Buffer
 * @returns Extracted text
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        const data = await pdf(buffer);
        return data.text;
    } catch (error) {
        console.error('❌ Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

/**
 * Extract text from DOCX file
 * @param buffer - File buffer
 * @returns Extracted text
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
    try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } catch (error) {
        console.error('❌ Error extracting text from DOCX:', error);
        throw new Error('Failed to extract text from DOCX');
    }
}

/**
 * Extract email from text using regex
 * @param text - Text to search
 * @returns Email address or undefined
 */
function extractEmail(text: string): string | undefined {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = text.match(emailRegex);
    return match ? match[0] : undefined;
}

/**
 * Extract Pakistani phone number from text using regex
 * @param text - Text to search
 * @returns Phone number or undefined
 */
function extractPhone(text: string): string | undefined {
    // Pakistani phone patterns:
    // +92 300 1234567
    // 0300 1234567
    // 03001234567
    const phoneRegex = /(\+92|0)?[\s-]?3[0-9]{2}[\s-]?[0-9]{7}/;
    const match = text.match(phoneRegex);
    return match ? match[0].replace(/[\s-]/g, '') : undefined;
}

/**
 * Extract skills from text using common keywords
 * @param text - Text to search
 * @returns Array of skills
 */
function extractSkills(text: string): string[] {
    const commonSkills = [
        // Programming Languages
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',

        // Web Technologies
        'HTML', 'CSS', 'React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'Laravel',
        'Tailwind CSS', 'Bootstrap', 'jQuery', 'Redux', 'GraphQL', 'REST API',

        // Mobile Development
        'React Native', 'Flutter', 'iOS', 'Android', 'Xamarin',

        // Databases
        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Firebase', 'Firestore', 'SQL', 'NoSQL', 'DynamoDB',

        // Cloud & DevOps
        'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'Git', 'GitHub', 'GitLab',

        // Tools & Frameworks
        'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Sketch', 'InVision',
        'Jira', 'Trello', 'Slack', 'Asana',

        // Data Science & AI
        'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn',
        'Data Analysis', 'Data Visualization', 'Tableau', 'Power BI',

        // Business & Soft Skills
        'Project Management', 'Agile', 'Scrum', 'Team Leadership', 'Communication', 'Problem Solving',
        'Time Management', 'Critical Thinking', 'Collaboration',

        // Healthcare (Pakistan-specific)
        'Nursing', 'Patient Care', 'Medical Coding', 'Pharmacy', 'Surgery', 'Radiology',

        // Other
        'MS Office', 'Excel', 'PowerPoint', 'Word', 'Google Workspace', 'SEO', 'SEM', 'Digital Marketing',
        'Content Writing', 'Copywriting', 'Social Media Marketing', 'Accounting', 'Bookkeeping',
    ];

    const textLower = text.toLowerCase();
    const foundSkills: string[] = [];

    for (const skill of commonSkills) {
        const skillLower = skill.toLowerCase();
        // Check if skill appears as a whole word (with word boundaries)
        const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(textLower)) {
            foundSkills.push(skill);
        }
    }

    // Remove duplicates and return
    return Array.from(new Set(foundSkills));
}

/**
 * Parse CV file and extract relevant information
 * @param file - File object (PDF or DOCX)
 * @returns Parsed CV data
 */
export async function parseCV(file: File): Promise<ParsedCVData> {
    try {
        // Convert File to Buffer (for server-side processing)
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let text = '';

        // Extract text based on file type
        if (file.type === 'application/pdf') {
            text = await extractTextFromPDF(buffer);
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword'
        ) {
            text = await extractTextFromDOCX(buffer);
        } else {
            throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
        }

        // Parse information from text
        const email = extractEmail(text);
        const phone = extractPhone(text);
        const skills = extractSkills(text);

        return {
            email,
            phone,
            skills,
            rawText: text,
        };
    } catch (error) {
        console.error('❌ Error parsing CV:', error);
        throw error;
    }
}

/**
 * Parse CV from buffer (for API routes)
 * @param buffer - File buffer
 * @param fileType - MIME type of the file
 * @returns Parsed CV data
 */
export async function parseCVFromBuffer(buffer: Buffer, fileType: string): Promise<ParsedCVData> {
    try {
        let text = '';

        // Extract text based on file type
        if (fileType === 'application/pdf') {
            text = await extractTextFromPDF(buffer);
        } else if (
            fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            fileType === 'application/msword'
        ) {
            text = await extractTextFromDOCX(buffer);
        } else {
            throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
        }

        // Parse information from text
        const email = extractEmail(text);
        const phone = extractPhone(text);
        const skills = extractSkills(text);

        return {
            email,
            phone,
            skills,
            rawText: text,
        };
    } catch (error) {
        console.error('❌ Error parsing CV from buffer:', error);
        throw error;
    }
}