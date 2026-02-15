// Cloudinary Upload Utility - For Payment Screenshots & Images
// Alternative to Firebase Storage

/**
 * Upload image to Cloudinary (client-side upload)
 * 
 * Setup Instructions:
 * 1. Sign up at https://cloudinary.com (free tier: 25GB storage, 25GB bandwidth/month)
 * 2. Get your cloud name from Dashboard
 * 3. Enable unsigned uploads:
 *    - Go to Settings > Upload
 *    - Scroll to "Upload presets"
 *    - Click "Add upload preset"
 *    - Set Mode: "Unsigned"
 *    - Set Folder: "khanhub_payments" (optional)
 *    - Save and copy the preset name
 * 4. Add to .env.local:
 *    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
 */

export interface CloudinaryUploadResult {
    url: string;           // Full HTTPS URL
    secureUrl: string;     // Secure HTTPS URL
    publicId: string;      // Cloudinary public ID
    width: number;
    height: number;
    format: string;        // jpg, png, etc.
    resourceType: string;  // image, video, etc.
    bytes: number;
    createdAt: string;
}

export interface UploadProgress {
    loaded: number;    // Bytes uploaded
    total: number;     // Total bytes
    percentage: number; // 0-100
}

/**
 * Upload image to Cloudinary
 */
export async function uploadToCloudinary(
    file: File,
    folder: string = 'payments',
    onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error(
            'Cloudinary not configured. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local'
        );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload JPG, PNG, or WebP');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        throw new Error('File size must be less than 10MB');
    }

    try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);

        // Add timestamp to filename to make it unique
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        formData.append('public_id', fileName.replace(/\.[^/.]+$/, '')); // Remove extension

        // Upload to Cloudinary
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

        const response = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Track upload progress
            if (onProgress) {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        onProgress({
                            loaded: event.loaded,
                            total: event.total,
                            percentage: Math.round((event.loaded / event.total) * 100),
                        });
                    }
                });
            }

            // Handle response
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const result = JSON.parse(xhr.responseText);
                    resolve({
                        url: result.url,
                        secureUrl: result.secure_url,
                        publicId: result.public_id,
                        width: result.width,
                        height: result.height,
                        format: result.format,
                        resourceType: result.resource_type,
                        bytes: result.bytes,
                        createdAt: result.created_at,
                    });
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed. Please check your internet connection.'));
            });

            xhr.addEventListener('abort', () => {
                reject(new Error('Upload cancelled.'));
            });

            xhr.open('POST', uploadUrl);
            xhr.send(formData);
        });

        console.log('✅ Image uploaded to Cloudinary:', response.secureUrl);
        return response;

    } catch (error: any) {
        console.error('❌ Cloudinary upload error:', error);
        throw new Error(error.message || 'Failed to upload image. Please try again.');
    }
}

/**
 * Upload payment screenshot specifically
 */
export async function uploadPaymentScreenshot(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
    // Use dedicated payments folder
    const folder = `khanhub/payments/${userId}`;
    return uploadToCloudinary(file, folder, onProgress);
}

/**
 * Upload CV
 */
export async function uploadCV(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary not configured');
    }

    // Validate file type
    const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload PDF or DOCX');
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `khanhub/cvs/${userId}`);
    formData.append('resource_type', 'auto'); // Let Cloudinary decide (image for PDF, raw for DOCX)

    // Using 'auto' allows PDFs to be treated as images (better for viewing)
    // while DOCX files remain as raw assets.
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Cloudinary CV Upload Error:', errorData);
        throw new Error(errorData?.error?.message || 'Failed to upload CV');
    }

    const result = await response.json();
    return result.secure_url;
}

/**
 * Upload profile photo
 */
export async function uploadProfilePhoto(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
    const folder = `khanhub/profiles/${userId}`;
    return uploadToCloudinary(file, folder, onProgress);
}

/**
 * Upload company logo
 */
export async function uploadCompanyLogo(
    file: File,
    employerId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
    const folder = `khanhub/logos/${employerId}`;
    return uploadToCloudinary(file, folder, onProgress);
}

/**
 * Get optimized image URL from Cloudinary
 * Useful for thumbnails and responsive images
 */
export function getOptimizedImageUrl(
    publicId: string,
    options: {
        width?: number;
        height?: number;
        quality?: number;
        format?: 'auto' | 'jpg' | 'png' | 'webp';
    } = {}
): string {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    if (!cloudName) {
        throw new Error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not configured');
    }

    const transformations: string[] = [];

    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.format) transformations.push(`f_${options.format}`);

    const transformation = transformations.length > 0
        ? transformations.join(',') + '/'
        : '';

    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}${publicId}`;
}

/**
 * Delete image from Cloudinary
 * Note: This requires server-side API with authentication
 * For now, we'll just let Cloudinary's auto-cleanup handle old images
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
    // This needs to be done server-side with Cloudinary SDK
    // For security, you cannot delete from client-side
    console.warn('Delete operation should be done server-side');
    throw new Error('Delete operation not supported from client-side');
}

// ==================== CONSTANTS ====================

export const CLOUDINARY_FOLDERS = {
    PAYMENTS: 'khanhub/payments',
    CVS: 'khanhub/cvs',
    PROFILES: 'khanhub/profiles',
    LOGOS: 'khanhub/logos',
    VIDEOS: 'khanhub/videos',
} as const;

export const MAX_FILE_SIZES = {
    IMAGE: 10, // MB
    CV: 5,     // MB
    VIDEO: 50, // MB
} as const;

export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;