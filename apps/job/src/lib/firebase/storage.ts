// Firebase Storage Helpers
// File upload and management utilities

import {
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
    StorageReference,
    UploadTask,
    UploadMetadata,
} from 'firebase/storage';
import { storage } from './firebase-config';

// ==================== FILE UPLOAD ====================

export interface UploadProgress {
    progress: number; // 0-100
    bytesTransferred: number;
    totalBytes: number;
    state: 'running' | 'paused' | 'success' | 'error';
}

export interface UploadResult {
    url: string;
    path: string;
    fileName: string;
    size: number;
    contentType: string;
}

/**
 * Upload a file to Firebase Storage
 */
export const uploadFile = async (
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
    try {
        const storageRef = ref(storage, path);
        const metadata: UploadMetadata = {
            contentType: file.type,
            customMetadata: {
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
            },
        };

        let uploadTask: UploadTask;

        if (onProgress) {
            // Use resumable upload with progress tracking
            uploadTask = uploadBytesResumable(storageRef, file, metadata);

            return new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress: UploadProgress = {
                            progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
                            bytesTransferred: snapshot.bytesTransferred,
                            totalBytes: snapshot.totalBytes,
                            state: snapshot.state as any,
                        };
                        onProgress(progress);
                    },
                    (error) => {
                        console.error('Upload error:', error);
                        reject(error);
                    },
                    async () => {
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve({
                            url,
                            path,
                            fileName: file.name,
                            size: file.size,
                            contentType: file.type,
                        });
                    }
                );
            });
        } else {
            // Simple upload without progress tracking
            await uploadBytes(storageRef, file, metadata);
            const url = await getDownloadURL(storageRef);

            return {
                url,
                path,
                fileName: file.name,
                size: file.size,
                contentType: file.type,
            };
        }
    } catch (error) {
        console.error('File upload error:', error);
        throw new Error('Failed to upload file. Please try again.');
    }
};

/**
 * Upload CV file
 */
export const uploadCV = async (
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
    const path = `users/${userId}/cv.${getFileExtension(file.name)}`;
    return uploadFile(file, path, onProgress);
};

/**
 * Upload intro video
 */
export const uploadVideo = async (
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
    const path = `users/${userId}/intro-video.${getFileExtension(file.name)}`;
    return uploadFile(file, path, onProgress);
};

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = async (
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
    const path = `users/${userId}/profile-photo.${getFileExtension(file.name)}`;
    return uploadFile(file, path, onProgress);
};

/**
 * Upload company logo
 */
export const uploadCompanyLogo = async (
    file: File,
    employerId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
    const path = `companies/${employerId}/logo.${getFileExtension(file.name)}`;
    return uploadFile(file, path, onProgress);
};

/**
 * Upload payment screenshot
 */
export const uploadPaymentScreenshot = async (
    file: File,
    paymentId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
    const path = `payments/${paymentId}/screenshot.${getFileExtension(file.name)}`;
    return uploadFile(file, path, onProgress);
};

// ==================== FILE DOWNLOAD ====================

/**
 * Get download URL for a file
 */
export const getFileURL = async (path: string): Promise<string> => {
    try {
        const storageRef = ref(storage, path);
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error('Get file URL error:', error);
        throw new Error('Failed to get file URL');
    }
};

// ==================== FILE DELETION ====================

/**
 * Delete a file from storage
 */
export const deleteFile = async (path: string): Promise<void> => {
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
    } catch (error) {
        console.error('Delete file error:', error);
        throw new Error('Failed to delete file');
    }
};

/**
 * Delete user's CV
 */
export const deleteCV = async (userId: string): Promise<void> => {
    const cvRef = ref(storage, `users/${userId}/cv.pdf`);
    await deleteObject(cvRef).catch(() => {
        // Try .docx extension
        const docxRef = ref(storage, `users/${userId}/cv.docx`);
        return deleteObject(docxRef);
    });
};

/**
 * Delete user's video
 */
export const deleteVideo = async (userId: string): Promise<void> => {
    const videoRef = ref(storage, `users/${userId}/intro-video.mp4`);
    await deleteObject(videoRef).catch(() => {
        // Try .webm extension
        const webmRef = ref(storage, `users/${userId}/intro-video.webm`);
        return deleteObject(webmRef);
    });
};

/**
 * Delete all user files
 */
export const deleteAllUserFiles = async (userId: string): Promise<void> => {
    try {
        const userFolderRef = ref(storage, `users/${userId}`);
        const fileList = await listAll(userFolderRef);

        const deletePromises = fileList.items.map((item) => deleteObject(item));
        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Delete all user files error:', error);
        throw new Error('Failed to delete user files');
    }
};

// ==================== VALIDATION ====================

/**
 * Validate file type
 */
export const isValidFileType = (
    file: File,
    allowedTypes: string[]
): boolean => {
    return allowedTypes.includes(file.type);
};

/**
 * Validate file size
 */
export const isValidFileSize = (file: File, maxSizeInMB: number): boolean => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
};

/**
 * Validate CV file
 */
export const isValidCV = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10; // 10MB

    if (!isValidFileType(file, allowedTypes)) {
        return {
            valid: false,
            error: 'Invalid file type. Only PDF and DOCX files are allowed.',
        };
    }

    if (!isValidFileSize(file, maxSize)) {
        return {
            valid: false,
            error: `File size must be less than ${maxSize}MB.`,
        };
    }

    return { valid: true };
};

/**
 * Validate video file
 */
export const isValidVideo = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const maxSize = 50; // 50MB

    if (!isValidFileType(file, allowedTypes)) {
        return {
            valid: false,
            error: 'Invalid file type. Only MP4, WebM, and MOV files are allowed.',
        };
    }

    if (!isValidFileSize(file, maxSize)) {
        return {
            valid: false,
            error: `File size must be less than ${maxSize}MB.`,
        };
    }

    return { valid: true };
};

/**
 * Validate image file
 */
export const isValidImage = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5; // 5MB

    if (!isValidFileType(file, allowedTypes)) {
        return {
            valid: false,
            error: 'Invalid file type. Only JPEG, PNG, and WebP files are allowed.',
        };
    }

    if (!isValidFileSize(file, maxSize)) {
        return {
            valid: false,
            error: `File size must be less than ${maxSize}MB.`,
        };
    }

    return { valid: true };
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Get file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Generate unique filename
 */
export const generateUniqueFilename = (originalName: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const extension = getFileExtension(originalName);
    return `${timestamp}-${random}.${extension}`;
};

/**
 * Get file type category
 */
export const getFileCategory = (contentType: string): string => {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('video/')) return 'video';
    if (contentType.includes('pdf')) return 'pdf';
    if (contentType.includes('word')) return 'document';
    return 'other';
};

// ==================== CONSTANTS ====================

export const FILE_TYPES = {
    CV: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
    IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    SCREENSHOT: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
} as const;

export const MAX_FILE_SIZES = {
    CV: 10, // MB
    VIDEO: 50, // MB
    IMAGE: 5, // MB
    SCREENSHOT: 5, // MB
} as const;

export const STORAGE_PATHS = {
    USERS: 'users',
    COMPANIES: 'companies',
    PAYMENTS: 'payments',
    TEMP: 'temp',
} as const;

// ==================== ERROR MESSAGES ====================

export const STORAGE_ERROR_MESSAGES = {
    'storage/unauthorized': 'You are not authorized to upload this file.',
    'storage/canceled': 'File upload was canceled.',
    'storage/unknown': 'An unknown error occurred. Please try again.',
    'storage/object-not-found': 'File not found.',
    'storage/bucket-not-found': 'Storage bucket not found.',
    'storage/quota-exceeded': 'Storage quota exceeded.',
    'storage/unauthenticated': 'Please sign in to upload files.',
    'storage/retry-limit-exceeded': 'Upload failed. Please try again later.',
};

export const getStorageErrorMessage = (errorCode: string): string => {
    return (
        STORAGE_ERROR_MESSAGES[errorCode as keyof typeof STORAGE_ERROR_MESSAGES] ||
        'Failed to upload file. Please try again.'
    );
};