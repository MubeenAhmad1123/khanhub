'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { parseCV } from '@/lib/cvParser';

export default function CVUploadPage() {
    const router = useRouter();
    const { user, updateProfile } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB');
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file || !user) return;

        setUploading(true);
        setError(null);

        try {
            // 1. Parse CV locally to extract skills/experience
            const parsedData = await parseCV(file);

            // 2. Upload file to Cloudinary
            const { uploadCV } = await import('@/lib/services/cloudinaryUpload');
            const cvUrl = await uploadCV(file, user.uid);

            await updateProfile({
                profile: {
                    ...user.profile,
                    cvUrl,
                    cvFileName: file.name,
                    cvUploadedAt: new Date(),
                    skills: parsedData.extractedData.skills,
                }
            } as any);

            // 3. Award points for CV upload
            try {
                const { awardPointsForCV } = await import('@/lib/services/pointsSystem');
                await awardPointsForCV(user.uid);
            } catch (pErr) {
                console.error('Failed to award points for CV:', pErr);
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard/profile');
            }, 2000);
        } catch (err: any) {
            console.error('CV upload error:', err);
            setError(err.message || 'Failed to upload and parse CV');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-2xl mx-auto px-4">
                <Link
                    href="/dashboard/profile"
                    className="inline-flex items-center text-teal-600 hover:text-teal-700 font-medium mb-6"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Profile
                </Link>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload className="h-8 w-8 text-teal-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Upload Your CV</h1>
                        <p className="text-gray-600 mt-2">
                            We'll automatically extract your skills and experience to boost your profile
                        </p>
                    </div>

                    {success ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-green-900">CV Uploaded Successfully!</h3>
                            <p className="text-green-700 mt-2">Redirecting you back to your profile...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-teal-400 transition-colors">
                                <input
                                    type="file"
                                    id="cv-upload"
                                    className="hidden"
                                    accept=".pdf,.docx"
                                    onChange={handleFileChange}
                                />
                                <label htmlFor="cv-upload" className="cursor-pointer">
                                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <span className="block text-gray-900 font-medium">
                                        {file ? file.name : 'Click to select or drag and drop'}
                                    </span>
                                    <span className="block text-sm text-gray-500 mt-1">
                                        PDF or DOCX (Max 5MB)
                                    </span>
                                </label>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                                    <AlertCircle className="h-5 w-5" />
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}

                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Processing CV...
                                    </>
                                ) : (
                                    'Upload & Analyze'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}