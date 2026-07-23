export interface CloudinaryUploadResult {
    url: string;           // Full HTTPS URL
    secureUrl: string;     // Secure HTTPS URL
    publicId: string;      // Cloudinary public ID
    width?: number;
    height?: number;
    duration?: number;     // Added for videos
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
 * Client-side helper to convert any image (JPEG, PNG, GIF, etc.) into WebP format
 */
async function convertImageToWebP(file: File): Promise<File> {
    if (file.type === 'image/webp') return file;
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(file);
                return;
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(file);
                    return;
                }
                const webpName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
                const webpFile = new File([blob], webpName, { type: 'image/webp' });
                resolve(webpFile);
            }, 'image/webp', 0.85);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };
        img.src = url;
    });
}

/**
 * Upload image, video, or document to Cloudinary
 */
export async function uploadToCloudinary(
    file: File,
    folder: string = 'Khan Hub/rehab',
    onProgress?: (progress: UploadProgress) => void,
    resourceType: 'image' | 'video' | 'auto' | 'raw' = 'auto'
): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error(
            'Cloudinary not configured. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local'
        );
    }

    let fileToUpload = file;

    // Determine actual resource type
    let actualType = resourceType;
    if (actualType === 'auto') {
        if (file.type.startsWith('video/')) {
            actualType = 'video';
        } else if (file.type.startsWith('image/')) {
            actualType = 'image';
            // Automatically convert any image to optimized WebP format
            try {
                fileToUpload = await convertImageToWebP(file);
            } catch (e) {
                console.warn('WebP conversion fallback to original file format:', e);
            }
        } else if (file.type === 'application/pdf') {
            actualType = 'image'; // PDF viewing works best as image resource layer
        } else {
            actualType = 'raw';
        }
    } else if (actualType === 'image' && file.type.startsWith('image/')) {
        try {
            fileToUpload = await convertImageToWebP(file);
        } catch (e) {
            console.warn('WebP conversion fallback:', e);
        }
    }

    try {
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);

        const timestamp = Date.now();
        const sanitizedName = fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_');
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

        return response.secureUrl;

    } catch (error: any) {
        console.error('Cloudinary upload error:', error);
        throw new Error(error.message || 'Failed to upload file. Please try again.');
    }
}
