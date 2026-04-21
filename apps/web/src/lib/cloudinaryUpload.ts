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

    // Determine actual resource type
    let actualType = resourceType;
    if (actualType === 'auto') {
        if (file.type.startsWith('video/')) actualType = 'video';
        else if (file.type.startsWith('image/')) actualType = 'image';
        else if (file.type === 'application/pdf') actualType = 'image'; // PDF viewing works best as image resource layer
        else actualType = 'raw';
    }

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);

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

        return response.secureUrl;

    } catch (error: any) {
        console.error('Cloudinary upload error:', error);
        throw new Error(error.message || 'Failed to upload file. Please try again.');
    }
}
