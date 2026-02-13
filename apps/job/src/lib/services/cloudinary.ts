// Cloudinary Service for Video Uploads
// Handles video upload to Cloudinary and returns secure URL

export interface CloudinaryUploadResult {
    secure_url: string;
    public_id: string;
    resource_type: string;
    format: string;
    bytes: number;
    duration?: number;
}

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

/**
 * Upload video to Cloudinary
 * @param file Video file to upload
 * @param onProgress Progress callback
 * @returns Cloudinary upload result with secure URL
 */
export async function uploadVideoToCloudinary(
    file: File,
    onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
    // Validate environment variables
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    console.log('[Cloudinary Debug] Starting upload - Cloud Name:', cloudName ? 'SET ✓' : 'MISSING ✗');

    if (!cloudName) {
        console.error('[Cloudinary Error] NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set in .env.local');
        throw new Error('Missing Cloudinary configuration. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in environment variables.');
    }

    // Validate file
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

    console.log('[Cloudinary Debug] File details:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        allowed: ALLOWED_TYPES.includes(file.type)
    });

    if (!ALLOWED_TYPES.includes(file.type)) {
        console.error('[Cloudinary Error] Invalid file type:', file.type);
        throw new Error(`Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
    }

    if (file.size > MAX_SIZE) {
        console.error('[Cloudinary Error] File too large:', file.size);
        throw new Error(`File size too large. Maximum size: ${MAX_SIZE / 1024 / 1024}MB`);
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'job_portal_videos');
    formData.append('folder', 'job-portal/intro-videos');

    console.log('[Cloudinary Debug] Uploading to:', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
    console.log('[Cloudinary Debug] Upload preset: job_portal_videos');

    // Upload with progress tracking
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        if (onProgress) {
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = {
                        loaded: event.loaded,
                        total: event.total,
                        percentage: Math.round((event.loaded / event.total) * 100),
                    };
                    console.log(`[Cloudinary Debug] Upload progress: ${progress.percentage}%`);
                    onProgress(progress);
                }
            });
        }

        // Handle completion
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                console.log('[Cloudinary Debug] Upload successful:', {
                    url: response.secure_url,
                    public_id: response.public_id,
                    size: `${(response.bytes / 1024 / 1024).toFixed(2)} MB`
                });
                resolve(response as CloudinaryUploadResult);
            } else {
                console.error('[Cloudinary Error] Upload failed:', {
                    status: xhr.status,
                    response: xhr.responseText
                });
                reject(new Error(`Upload failed with status ${xhr.status}`));
            }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
            console.error('[Cloudinary Error] Network error during upload');
            reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
            console.error('[Cloudinary Error] Upload cancelled');
            reject(new Error('Upload cancelled'));
        });

        // Send request
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
        xhr.send(formData);
    });
}

/**
 * Delete video from Cloudinary
 * @param publicId Public ID of the video to delete
 */
export async function deleteVideoFromCloudinary(publicId: string): Promise<void> {
    // Note: Deletion requires server-side signature for security
    // This should be implemented as an API route
    console.warn('Video deletion should be implemented server-side for security');

    // For now, we'll just remove the reference from Firebase
    // The video will remain in Cloudinary but not be accessible
}

/**
 * Get video thumbnail URL from Cloudinary
 * @param publicId Public ID of the video
 * @param cloudName Cloudinary cloud name
 */
export function getVideoThumbnail(publicId: string, cloudName: string): string {
    return `https://res.cloudinary.com/${cloudName}/video/upload/so_0/${publicId}.jpg`;
}
