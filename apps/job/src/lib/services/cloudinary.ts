// Cloudinary Service for Video Uploads

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

export async function uploadVideoToCloudinary(
    file: File,
    onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    if (!cloudName) {
        throw new Error('Missing Cloudinary configuration. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in environment variables.');
    }

    const MAX_SIZE = 30 * 1024 * 1024;
    const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error(`Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
    }

    if (file.size > MAX_SIZE) {
        throw new Error(`File size too large. Maximum size: ${MAX_SIZE / 1024 / 1024}MB`);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'auto-filled'); // Must be an Unsigned preset

    // NOTE: Do NOT add eager, eager_async, or transformation params.
    // Unsigned presets only allow: upload_preset, callback, public_id,
    // folder, asset_folder, tags. Adding other params causes a 400 error.
    // HLS streaming is handled via getHlsUrl() URL transformation at play
    // time — no eager server-side processing is needed or allowed here.

    return new Promise((resolve, reject) => {
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
                const response = JSON.parse(xhr.responseText);
                resolve(response as CloudinaryUploadResult);
            } else {
                const err = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                reject(new Error(err.error?.message || `Upload failed with status ${xhr.status}`));
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
        xhr.send(formData);
    });
}

export async function deleteVideoFromCloudinary(publicId: string): Promise<void> {
    console.warn('Video deletion should be implemented server-side for security');
}

export function getVideoThumbnail(publicId: string, cloudName: string): string {
    return `https://res.cloudinary.com/${cloudName}/video/upload/so_0/${publicId}.jpg`;
}

// Applies Cloudinary on-the-fly transformation for compressed delivery
export const getOptimizedVideoUrl = (url: string): string => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', '/upload/q_auto,f_auto,vc_auto,br_1m/');
};

// Converts a Cloudinary video URL to HLS (.m3u8) using sp_auto transformation.
// This works WITHOUT eager processing — Cloudinary generates HLS on first request
// and caches it. No signed upload or eager params required.
export const getHlsUrl = (url: string): string => {
    if (!url?.includes('cloudinary.com')) return url;
    return url
        .replace('/upload/', '/upload/sp_auto/')
        .replace(/\.(mp4|mov|webm|avi|mkv)$/i, '.m3u8');
};
