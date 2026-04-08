/** Allowed MIME types for proof uploads */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

/** Max proof file size: 5MB */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export interface ProofValidationResult {
  valid: boolean;
  error?: string;
}

export function validateProofFile(file: File): ProofValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WEBP, PDF.`,
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max allowed: 5 MB.`,
    };
  }
  return { valid: true };
}

/** Build proofMeta object to store alongside proofUrl in Firestore */
export function buildProofMeta(file: File, uploadedBy: string) {
  return {
    fileType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
  };
}
