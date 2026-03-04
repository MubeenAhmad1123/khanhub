export interface ParsedCV {
    name?: string;
    email?: string;
    phone?: string;
    skills?: string[];
    experience?: any[];
    education?: any[];
}

export const parseCV = async (file: File): Promise<ParsedCV> => {
    // Placeholder implementation
    console.log('CV parsing requested for:', file.name);
    return {
        skills: [],
        experience: [],
        education: []
    };
};

export const parseResume = parseCV;

export const extractSkills = (text: string): string[] => {
    return [];
};
