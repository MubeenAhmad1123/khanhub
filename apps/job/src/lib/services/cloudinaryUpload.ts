// Cloudinary Upload Utility - For Payment Screenshots, Images & Videos

export interface CloudinaryUploadResult {
    url: string;
    secureUrl: string;
    publicId: string;
    width?: number;
    height?: number;
    duration?: number;
    format: string;
    resourceType: string;
    bytes: number;
    createdAt: string;
}

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

export async function uploadToCloudinary(
    file: File,
    folder: string = 'payments',
    onProgress?: (progress: UploadProgress) => void,
    resourceType: 'image' | 'video' | 'auto' = 'auto'
): Promise<CloudinaryUploadResult> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error(
            'Cloudinary not configured. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local'
        );
    }

    const actualType = resourceType === 'auto'
        ? (file.type.startsWith('video/') ? 'video' : 'image')
        : resourceType;

    if (actualType === 'image') {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Invalid file type. Please upload JPG, PNG, or WebP');
        }
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('Image size must be less than 10MB');
        }
    } else if (actualType === 'video') {
        const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Invalid video type. Please upload MP4, WebM, or MOV');
        }
        if (file.size > 30 * 1024 * 1024) {
            throw new Error('Video size must be less than 30MB');
        }
    }

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);

        // NOTE: Do NOT add eager, eager_async, or transformation params here.
        // Unsigned presets only allow: upload_preset, callback, public_id,
        // folder, asset_folder, tags. HLS is handled via getHlsUrl() URL
        // transformation at play time — no server-side processing needed.

        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${timestamp}_${sanitizedName}`;
        formData.append('public_id', fileName);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${actualType}/upload`;

        const response = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

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

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const result = JSON.parse(xhr.responseText);
                    resolve({
                        url: result.url || result.secure_url,
                        secureUrl: result.secure_url || result.url,
                        publicId: result.public_id,
                        width: result.width,
                        height: result.height,
                        duration: result.duration,
                        format: result.format,
                        resourceType: result.resource_type,
                        bytes: result.bytes,
                        createdAt: result.created_at,
                    });
                } else {
                    const errorResponse = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                    reject(new Error(errorResponse.error?.message || `Upload failed with status ${xhr.status}`));
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

        return response;

    } catch (error: any) {
        throw new Error(error.message || 'Failed to upload. Please try again.');
    }
}

export async function uploadPaymentScreenshot(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
    const folder = `khanhub/payments/${userId}`;
    return uploadToCloudinary(file, folder, onProgress);
}

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

    const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload PDF or DOCX');
    }
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `khanhub/cvs/${userId}`);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    const response = await fetch(uploadUrl, { method: 'POST', body: formData });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || 'Failed to upload CV');
    }

    const result = await response.json();
    return result.secure_url;
}

export async function uploadProfilePhoto(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
    return uploadToCloudinary(file, `khanhub/profiles/${userId}`, onProgress);
}

export async function uploadCompanyLogo(
    file: File,
    employerId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
    return uploadToCloudinary(file, `khanhub/logos/${employerId}`, onProgress);
}

export function getOptimizedImageUrl(
    publicId: string,
    options: { width?: number; height?: number; quality?: number; format?: 'auto' | 'jpg' | 'png' | 'webp' } = {}
): string {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) throw new Error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not configured');

    const transformations: string[] = [];
    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.format) transformations.push(`f_${options.format}`);

    const transformation = transformations.length > 0 ? transformations.join(',') + '/' : '';
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}${publicId}`;
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
    console.warn('Delete operation should be done server-side');
    throw new Error('Delete operation not supported from client-side');
}

export const CLOUDINARY_FOLDERS = {
    PAYMENTS: 'khanhub/payments',
    CVS: 'khanhub/cvs',
    PROFILES: 'khanhub/profiles',
    LOGOS: 'khanhub/logos',
    VIDEOS: 'khanhub/videos',
} as const;

export const MAX_FILE_SIZES = { IMAGE: 10, CV: 5, VIDEO: 30 } as const;

export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;