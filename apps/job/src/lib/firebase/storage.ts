import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

/**
 * Upload a file to Firebase Storage
 */
export async function uploadFile(
    file: File,
    path: string
): Promise<string> {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
}

/**
 * Upload CV (PDF or DOCX)
 */
export async function uploadCV(
    userId: string,
    file: File
): Promise<string> {
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const path = `cvs/${userId}/cv_${timestamp}.${extension}`;
    return uploadFile(file, path);
}

/**
 * Upload intro video
 */
export async function uploadIntroVideo(
    userId: string,
    file: File | Blob
): Promise<string> {
    const timestamp = Date.now();
    const extension = file instanceof File ? file.name.split('.').pop() : 'webm';
    const path = `videos/${userId}/intro_${timestamp}.${extension}`;
    return uploadFile(file as File, path);
}

/**
 * Upload payment screenshot
 */
export async function uploadPaymentScreenshot(
    userId: string,
    file: File
): Promise<string> {
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const path = `payments/${userId}/payment_${timestamp}.${extension}`;
    return uploadFile(file, path);
}

/**
 * Upload company logo
 */
export async function uploadCompanyLogo(
    employerId: string,
    file: File
): Promise<string> {
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const path = `companies/${employerId}/logo_${timestamp}.${extension}`;
    return uploadFile(file, path);
}

/**
 * Upload profile picture
 */
export async function uploadProfilePicture(
    userId: string,
    file: File
): Promise<string> {
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const path = `avatars/${userId}/avatar_${timestamp}.${extension}`;
    return uploadFile(file, path);
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(url: string): Promise<void> {
    try {
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
    } catch (error) {
        console.error('Error deleting file:', error);
        // File might not exist, ignore error
    }
}

/**
 * Get file extension from URL
 */
export function getFileExtension(url: string): string | null {
    const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
    return match ? match[1] : null;
}

/**
 * Validate file type
 */
export function validateFileType(
    file: File,
    allowedTypes: string[]
): boolean {
    return allowedTypes.some(type => file.type.includes(type));
}

/**
 * Validate file size (in MB)
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
}

/**
 * Validate CV file
 */
export function validateCV(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['pdf', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (!validateFileType(file, allowedTypes)) {
        return { valid: false, error: 'Only PDF and DOCX files are allowed' };
    }

    if (!validateFileSize(file, 5)) {
        return { valid: false, error: 'File size must be less than 5MB' };
    }

    return { valid: true };
}

/**
 * Validate video file
 */
export function validateVideo(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

    if (!validateFileType(file, allowedTypes)) {
        return { valid: false, error: 'Only MP4, WebM, and MOV files are allowed' };
    }

    if (!validateFileSize(file, 50)) {
        return { valid: false, error: 'File size must be less than 50MB' };
    }

    return { valid: true };
}

/**
 * Validate image file
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!validateFileType(file, allowedTypes)) {
        return { valid: false, error: 'Only JPG, PNG, and WebP images are allowed' };
    }

    if (!validateFileSize(file, 5)) {
        return { valid: false, error: 'File size must be less than 5MB' };
    }

    return { valid: true };
}
