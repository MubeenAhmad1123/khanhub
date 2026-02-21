/**
 * Mock CV Parser Service
 * (The actual parsing was removed during cleanup, using a fallback for now)
 */
export async function parseResume(file: File): Promise<{ skills: string[] }> {
    console.log('Mock parsing resume:', file.name);
    return {
        skills: [] // Returns empty skills for now
    };
}
