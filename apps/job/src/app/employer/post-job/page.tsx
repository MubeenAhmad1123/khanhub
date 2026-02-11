'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { uploadCompanyLogo } from '@/lib/services/cloudinaryUpload';
import { Briefcase, MapPin, DollarSign, Phone, FileText, Upload, Loader2, CheckCircle } from 'lucide-react';

export default function SimpleJobPostPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [formData, setFormData] = useState({
        title: '',
        company: '',
        city: '',
        salary: '',
        phone: '',
        description: '',
    });

    const [logo, setLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login?redirect=/employer/post-job');
        }
    }, [user, authLoading, router]);

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-teal-50">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-teal-800 font-medium">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // Pakistan cities
    const cities = [
        'Karachi',
        'Lahore',
        'Islamabad',
        'Rawalpindi',
        'Faisalabad',
        'Multan',
        'Peshawar',
        'Quetta',
        'Sialkot',
        'Gujranwala',
        'Hyderabad',
        'Sargodha',
        'Remote / Online',
    ];

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('Image must be less than 5MB');
                return;
            }
            setLogo(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('براہ کرم لاگ ان کریں / Please login first');
            router.push('/auth/login');
            return;
        }

        if (user.role === 'employer' && user.paymentStatus !== 'approved') {
            alert('Please complete registration payment to post jobs.\n\nجاب پوسٹ کرنے کے لیے رجسٹریشن فیس ادا کریں۔');
            router.push('/auth/verify-payment');
            return;
        }

        // Simple validation
        if (!formData.title.trim() || !formData.company.trim() || !formData.phone.trim()) {
            alert('Please fill required fields: Job Title, Company, Phone');
            return;
        }

        try {
            setLoading(true);
            setUploadProgress(20);

            let logoUrl = '';

            // Upload logo if provided
            if (logo) {
                setUploadProgress(40);
                try {
                    const result = await uploadCompanyLogo(logo, user.uid, (progress) => {
                        setUploadProgress(40 + (progress.percentage * 0.3));
                    });
                    logoUrl = result.secureUrl;
                } catch (error) {
                    console.error('Logo upload failed:', error);
                    // Continue without logo
                }
            }

            setUploadProgress(70);

            // Create job posting - SAME STRUCTURE AS YOUR EXISTING JOBS
            const jobData = {
                // Basic Info
                title: formData.title.trim(),
                company: formData.company.trim(),
                location: formData.city || 'Not specified',

                // Salary
                salary: formData.salary.trim() || 'Negotiable',

                // Contact
                phone: formData.phone.trim(),

                // Description
                description: formData.description.trim() || 'No description provided',

                // Logo
                companyLogo: logoUrl || '',

                // Auto-filled fields
                employerId: user.uid,
                employerEmail: user.email || '',

                // ⭐ IMPORTANT: Status for admin approval
                status: 'active', // Changed to 'active' for immediate visibility (was 'pending')
                // status: 'pending', // Uncomment to require admin approval

                // Type defaults
                type: 'full-time',
                employmentType: 'full-time',
                experienceLevel: 'entry',
                category: 'Other',

                // Stats
                views: 0,
                applicationsCount: 0,

                // Timestamps
                createdAt: serverTimestamp(),
                postedAt: new Date().toISOString(),
            };

            console.log('Posting job:', jobData);

            const docRef = await addDoc(collection(db, 'jobs'), jobData);
            console.log('Job posted with ID:', docRef.id);

            setUploadProgress(100);

            alert('✅ Job submitted for approval! Admin will review it soon.\n\nجاب منظوری کے لیے بھیج دی گئی!');
            router.push('/employer/jobs');

        } catch (error: any) {
            console.error('Error posting job:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);

            let errorMsg = 'Failed to post job. ';

            if (error.code === 'permission-denied') {
                errorMsg += 'Permission denied. Please make sure you are logged in as an employer.';
            } else if (error.code === 'unauthenticated') {
                errorMsg += 'Please login again.';
            } else if (error.message) {
                errorMsg += error.message;
            }

            alert(errorMsg);
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-full mb-4">
                        <Briefcase className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
                        Post a Job
                    </h1>
                    <p className="text-lg text-gray-600">
                        جاب پوسٹ کریں - صرف 1 منٹ میں
                    </p>
                    <p className="text-sm text-teal-600 font-medium mt-2">
                        ⚡ Super Fast & Easy - Only 6 Fields
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Company Logo (Optional) */}
                        <div className="text-center pb-6 border-b border-gray-200">
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                کمپنی لوگو (اختیاری) / Company Logo (Optional)
                            </label>
                            <div className="flex flex-col items-center gap-4">
                                {logoPreview ? (
                                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-teal-500">
                                        <Image
                                            src={logoPreview}
                                            alt="Logo"
                                            width={100}
                                            height={100}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLogo(null);
                                                setLogoPreview('');
                                            }}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-1 text-xs"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-all">
                                        <Upload className="w-6 h-6 text-gray-400" />
                                        <span className="text-xs text-gray-500 mt-1">Upload</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* 1. Job Title */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-teal-600" />
                                Job Title * / جاب کا نام
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                placeholder="e.g., Waiter, Shop Helper, Driver, Cook"
                                className="w-full text-lg px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                            />
                        </div>

                        {/* 2. Company Name */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                                Company / Shop Name * / کمپنی / دکان کا نام
                            </label>
                            <input
                                type="text"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                required
                                placeholder="e.g., ABC Restaurant, XYZ Shop"
                                className="w-full text-lg px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                            />
                        </div>

                        {/* 3. City */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-teal-600" />
                                City / شہر
                            </label>
                            <select
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full text-lg px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                            >
                                <option value="">Select City / شہر منتخب کریں</option>
                                {cities.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>

                        {/* 4. Salary */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-teal-600" />
                                Salary (PKR) / تنخواہ
                            </label>
                            <input
                                type="text"
                                name="salary"
                                value={formData.salary}
                                onChange={handleChange}
                                placeholder="e.g., 30,000 or 25,000-35,000 or Negotiable"
                                className="w-full text-lg px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                اگر آپ کو معلوم نہیں تو "Negotiable" لکھیں
                            </p>
                        </div>

                        {/* 5. Phone / WhatsApp */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-teal-600" />
                                Phone / WhatsApp * / فون نمبر
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                placeholder="03001234567"
                                className="w-full text-lg px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Job seekers will contact you on this number
                            </p>
                        </div>

                        {/* 6. Description */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-teal-600" />
                                Job Details (Optional) / تفصیلات
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                placeholder="What will the person do? Any requirements? Working hours?"
                                className="w-full text-lg px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all resize-none"
                            />
                        </div>

                        {/* Progress Bar */}
                        {loading && uploadProgress > 0 && (
                            <div className="bg-teal-50 rounded-xl p-4">
                                <div className="flex justify-between text-sm text-teal-700 mb-2 font-medium">
                                    <span>Uploading...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-teal-200 rounded-full h-2">
                                    <div
                                        className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Info Banner */}
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    <CheckCircle className="w-5 h-5 text-blue-500" />
                                </div>
                                <div className="text-sm">
                                    <p className="text-blue-900 font-medium">
                                        Your job will be reviewed by admin before going live
                                    </p>
                                    <p className="text-blue-700 mt-1">
                                        آپ کی جاب ایڈمن کی منظوری کے بعد لائیو ہوگی
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                disabled={loading}
                                className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all"
                            >
                                Cancel / منسوخ
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-4 rounded-xl font-bold hover:from-teal-700 hover:to-teal-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Posting...
                                    </>
                                ) : (
                                    <>
                                        <Briefcase className="w-5 h-5" />
                                        Submit for Approval
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Required Fields Note */}
                        <p className="text-center text-xs text-gray-500">
                            * = Required fields / ضروری خانے
                        </p>
                    </form>
                </div>

                {/* Help Text */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Need help? Contact: <span className="font-bold text-teal-600">support@khanhub.com</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        مدد چاہیے؟ رابطہ کریں
                    </p>
                </div>
            </div>
        </div>
    );
}