'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { uploadCV, validateCV } from '@/lib/firebase/storage';
import { parseResume } from '@/lib/services/cvParser';
import { updateUserProfile } from '@/lib/firebase/auth';
import { awardPoints, POINTS_CONFIG } from '@/lib/services/pointsSystem';

export default function CVUploadPage() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [error, setError] = useState('');
    const [extractedData, setExtractedData] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const validation = validateCV(selectedFile);
        if (!validation.valid) {
            setError(validation.error || 'Invalid file');
            return;
        }

        setFile(selectedFile);
        setError('');
    };

    const handleParse = async () => {
        if (!file) return;

        setParsing(true);
        setError('');

        try {
            const data = await parseResume(file);
            setExtractedData(data);
            setParsing(false);
        } catch (err) {
            setError('Failed to parse CV. Please try again.');
            setParsing(false);
        }
    };

    const handleUpload = async () => {
        if (!file || !user) return;

        setUploading(true);
        setError('');

        try {
            // Upload CV to Firebase Storage
            const cvUrl = await uploadCV(user.uid, file);

            // Update user profile with CV URL
            await updateUserProfile(user.uid, {
                profile: {
                    ...profile?.profile,
                    cvUrl,
                    // Auto-fill extracted data
                    email: extractedData?.email || profile?.email,
                    phone: extractedData?.phone || profile?.profile?.phone,
                    skills: extractedData?.skills || profile?.profile?.skills || [],
                    experience: extractedData?.experience || profile?.profile?.experience || [],
                    education: extractedData?.education || profile?.profile?.education || [],
                },
            });

            // Award points
            await awardPoints(user.uid, 'CV_UPLOADED', 'CV uploaded successfully');

            setUploading(false);
            router.push('/dashboard');
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload CV. Please try again.');
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-jobs-neutral py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-jobs-dark mb-2">Upload Your CV</h1>
                    <p className="text-jobs-dark/60">
                        Upload your resume and we'll automatically extract your information
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                    {/* Upload Section */}
                    {!file && (
                        <label className="block cursor-pointer">
                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-jobs-primary hover:bg-jobs-primary/5 transition-all">
                                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                <p className="text-sm font-bold text-jobs-dark mb-1">
                                    Click to upload or drag and drop
                                </p>
                                <p className="text-xs text-jobs-dark/50">
                                    PDF or DOCX (max. 5MB)
                                </p>
                                <input
                                    type="file"
                                    accept=".pdf,.docx"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        </label>
                    )}

                    {/* File Selected */}
                    {file && !extractedData && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-center gap-4">
                                <FileText className="h-10 w-10 text-blue-600" />
                                <div className="flex-1">
                                    <div className="font-bold text-jobs-dark">{file.name}</div>
                                    <div className="text-sm text-jobs-dark/60">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFile(null)}
                                    className="text-red-600 hover:bg-red-50 p-2 rounded-full transition"
                                >
                                    <XCircle className="h-6 w-6" />
                                </button>
                            </div>

                            <button
                                onClick={handleParse}
                                disabled={parsing}
                                className="w-full bg-jobs-primary text-white py-4 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {parsing ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Parsing CV...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="h-5 w-5" />
                                        Parse CV
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Extracted Data Preview */}
                    {extractedData && (
                        <div className="space-y-6">
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                                <div>
                                    <div className="font-bold text-green-900">CV Parsed Successfully!</div>
                                    <div className="text-sm text-green-700">Review the extracted information below</div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
                                <h3 className="font-black text-jobs-dark mb-4">Extracted Information</h3>

                                {extractedData.name && (
                                    <div>
                                        <div className="text-xs font-bold text-jobs-dark/60 mb-1">Name</div>
                                        <div className="text-jobs-dark">{extractedData.name}</div>
                                    </div>
                                )}

                                {extractedData.email && (
                                    <div>
                                        <div className="text-xs font-bold text-jobs-dark/60 mb-1">Email</div>
                                        <div className="text-jobs-dark">{extractedData.email}</div>
                                    </div>
                                )}

                                {extractedData.phone && (
                                    <div>
                                        <div className="text-xs font-bold text-jobs-dark/60 mb-1">Phone</div>
                                        <div className="text-jobs-dark">{extractedData.phone}</div>
                                    </div>
                                )}

                                {extractedData.skills.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-jobs-dark/60 mb-2">Skills ({extractedData.skills.length})</div>
                                        <div className="flex flex-wrap gap-2">
                                            {extractedData.skills.map((skill: string, index: number) => (
                                                <span key={index} className="px-3 py-1 bg-jobs-primary/10 text-jobs-primary text-xs font-bold rounded-full">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {extractedData.experience.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-jobs-dark/60 mb-2">Experience ({extractedData.experience.length})</div>
                                        <div className="space-y-2">
                                            {extractedData.experience.slice(0, 3).map((exp: any, index: number) => (
                                                <div key={index} className="bg-white p-3 rounded-xl">
                                                    <div className="font-bold text-jobs-dark">{exp.title}</div>
                                                    <div className="text-sm text-jobs-dark/60">{exp.company}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {extractedData.education.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-jobs-dark/60 mb-2">Education ({extractedData.education.length})</div>
                                        <div className="space-y-2">
                                            {extractedData.education.map((edu: any, index: number) => (
                                                <div key={index} className="bg-white p-3 rounded-xl">
                                                    <div className="font-bold text-jobs-dark">{edu.degree}</div>
                                                    <div className="text-sm text-jobs-dark/60">{edu.institution}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> This information will be added to your profile. You can edit it later from your dashboard.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        setFile(null);
                                        setExtractedData(null);
                                    }}
                                    className="flex-1 bg-gray-200 text-jobs-dark py-4 rounded-xl font-bold hover:bg-gray-300 transition"
                                >
                                    Upload Different CV
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="flex-1 bg-jobs-accent text-white py-4 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-5 w-5" />
                                            Save & Continue
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}
                </div>

                <div className="mt-8 bg-yellow-50 p-6 rounded-2xl border border-yellow-100">
                    <h3 className="font-black text-yellow-900 mb-3">💡 Tips for Best Results</h3>
                    <ul className="space-y-2 text-sm text-yellow-800">
                        <li>✓ Use a well-formatted PDF or DOCX file</li>
                        <li>✓ Include clear sections for education, experience, and skills</li>
                        <li>✓ Make sure contact information is visible</li>
                        <li>✓ Review extracted data before saving</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
