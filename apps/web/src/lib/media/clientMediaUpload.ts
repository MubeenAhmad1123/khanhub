// apps/web/src/lib/media/clientMediaUpload.ts

export interface ProcessedPhoto {
  file: File;
  previewUrl: string;
  originalName: string;
  originalSize: number; // in bytes
  processedSize: number; // in bytes
  width: number;
  height: number;
}

export interface CloudinaryMediaResult {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

const MAX_LONGEST_EDGE = 2000;
const MAX_FILE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB

/**
 * Validates file type. Accepts JPG, PNG, WebP only.
 * Rejects GIF, SVG, PDF, video, and other formats with descriptive error.
 */
export function validateImageFileType(file: File): void {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (file.type.startsWith('video/')) {
    throw new Error(`"${file.name}" is a video. Video publishing is coming soon.`);
  }
  if (file.type === 'image/gif' || ext === 'gif') {
    throw new Error(`"${file.name}" is a GIF. Only JPG, PNG, and WebP photos are supported.`);
  }
  if (file.type === 'image/svg+xml' || ext === 'svg') {
    throw new Error(`"${file.name}" is an SVG vector. Only photographic images (JPG, PNG, WebP) are supported.`);
  }
  if (file.type === 'application/pdf' || ext === 'pdf') {
    throw new Error(`"${file.name}" is a PDF document. Please upload images only.`);
  }
  if (!validTypes.includes(file.type) && !['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
    throw new Error(`"${file.name}" is not supported. Please upload JPG, PNG, or WebP images.`);
  }
}

/**
 * Client-side browser conversion to WebP with edge capping (max 2000px) and file size capping (max 1.5MB)
 */
export async function convertAndOptimizeImage(file: File): Promise<ProcessedPhoto> {
  validateImageFileType(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let targetWidth = img.width;
      let targetHeight = img.height;

      // Cap longest edge at 2000px
      if (targetWidth > MAX_LONGEST_EDGE || targetHeight > MAX_LONGEST_EDGE) {
        if (targetWidth >= targetHeight) {
          targetHeight = Math.round((targetHeight / targetWidth) * MAX_LONGEST_EDGE);
          targetWidth = MAX_LONGEST_EDGE;
        } else {
          targetWidth = Math.round((targetWidth / targetHeight) * MAX_LONGEST_EDGE);
          targetHeight = MAX_LONGEST_EDGE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create 2D canvas context'));
        return;
      }

      // Draw image onto canvas
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Attempt to encode at 0.85, then reduce quality if file exceeds 1.5 MB
      const qualities = [0.85, 0.75, 0.65, 0.5];

      const tryEncode = (index: number) => {
        const quality = qualities[index] || 0.5;
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob conversion failed'));
              return;
            }

            if (blob.size > MAX_FILE_BYTES && index < qualities.length - 1) {
              // Try next lower quality tier
              tryEncode(index + 1);
              return;
            }

            const cleanBase = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
            const webpName = `${cleanBase}.webp`;
            const webpFile = new File([blob], webpName, { type: 'image/webp' });
            const previewUrl = URL.createObjectURL(blob);

            resolve({
              file: webpFile,
              previewUrl,
              originalName: file.name,
              originalSize: file.size,
              processedSize: blob.size,
              width: targetWidth,
              height: targetHeight
            });
          },
          'image/webp',
          quality
        );
      };

      tryEncode(0);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image "${file.name}" for optimization.`));
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads a WebP image to Cloudinary in the structured folder:
 * Khan Hub/media/{departmentSlug}/{YYYY-MM}
 */
export async function uploadMediaPhotoToCloudinary(
  file: File,
  departmentSlug: string,
  yearMonth: string,
  onProgress?: (percent: number) => void
): Promise<CloudinaryMediaResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dhshtdrjp';
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'auto-filled';

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary environment configuration missing');
  }

  const folder = `Khan Hub/media/${departmentSlug}/${yearMonth}`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 7);
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  formData.append('public_id', `${timestamp}_${randomStr}_${sanitizedName}`);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve({
            secureUrl: result.secure_url || result.url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            format: result.format || 'webp'
          });
        } catch (e: any) {
          reject(new Error(`Invalid response from Cloudinary: ${e.message}`));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.error?.message || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Cloudinary upload network error. Please check your internet connection.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted.'));
    });

    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
}

