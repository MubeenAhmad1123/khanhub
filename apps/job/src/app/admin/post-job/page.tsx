'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { uploadCompanyLogo } from '@/lib/services/cloudinaryUpload';
import { Briefcase, MapPin, DollarSign, Phone, FileText, Upload, Loader2, CheckCircle, Shield, Clock } from 'lucide-react';
import CitySearch from '@/components/forms/CitySearch';

export default function AdminPostJobPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [formData, setFormData] = useState({
        title: '',
        company: 'KhanHub Official',
        city: '',
        salary: '',
        phone: '',
        description: '',
        experience: 'Fresh',
    });

    const [logo, setLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/admin/login');
            } else if (user.role !== 'admin') {
                router.push('/');
            }
        }
    }, [user, authLoading, router]);

    if (authLoading || !user || user.role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-indigo-50">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-indigo-800 font-medium">Verifying Admin privileges...</p>
                </div>
            </div>
        );
    }


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

        if (!formData.title.trim() || !formData.company.trim() || !formData.phone.trim()) {
            alert('Please fill required fields: Job Title, Company, Phone');
            return;
        }

        try {
            setLoading(true);
            setUploadProgress(20);

            let logoUrl = '';
            if (logo) {
                setUploadProgress(40);
                try {
                    const result = await uploadCompanyLogo(logo, user.uid, (progress) => {
                        setUploadProgress(40 + (progress.percentage * 0.3));
                    });
                    logoUrl = result.secureUrl;
                } catch (error) {
                    console.error('Logo upload failed:', error);
                }
            }

            setUploadProgress(70);

            const jobData = {
                title: formData.title.trim(),
                company: formData.company.trim(),
                location: formData.city || 'Not specified',
                salary: formData.salary.trim() || 'Negotiable',
                phone: formData.phone.trim(),
                description: formData.description.trim() || 'No description provided',
                companyLogo: logoUrl || '',
                employerId: user.uid,
                employerEmail: user.email || '',
                experienceLevel: formData.experience.toLowerCase().includes('fresh') ? 'entry' : 'mid',
                experience: formData.experience,
                employmentType: 'full-time',
                category: 'Other',
                views: 0,
                applicationsCount: 0,
                createdAt: serverTimestamp(),
                postedAt: new Date().toISOString(),
                // ⭐ ADMIN DIFFERENTIATOR
                postedByRole: 'admin',
                isOfficial: true,
            };

            await addDoc(collection(db, 'jobs'), jobData);
            setUploadProgress(100);
            alert('✅ Official Job Posted Successfully!');
            router.push('/admin/jobs');

        } catch (error: any) {
            console.error('Error posting admin job:', error);
            alert('Failed to post job: ' + error.message);
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-900 rounded-full mb-4 shadow-lg border-2 border-indigo-200">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-indigo-950 mb-2">
                        Post Official Job
                    </h1>
                    <p className="text-lg text-indigo-700 font-medium">
                        Admin Job Posting Portal
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-indigo-100">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="text-center pb-6 border-b border-indigo-100">
                            <label className="block text-sm font-bold text-indigo-900 mb-3">
                                Company Logo (Optional)
                            </label>
                            <div className="flex flex-col items-center gap-4">
                                {logoPreview ? (
                                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-md">
                                        <Image src={logoPreview} alt="Logo" width={100} height={100} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => { setLogo(null); setLogoPreview(''); }} className="absolute top-0 right-0 bg-red-500 text-white p-1 text-xs">✕</button>
                                    </div>
                                ) : (
                                    <label className="w-24 h-24 border-2 border-dashed border-indigo-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                                        <Upload className="w-6 h-6 text-indigo-300" />
                                        <span className="text-xs text-indigo-400 mt-1 font-bold">Upload</span>
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-indigo-950 mb-2 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-indigo-600" />
                                Job Title *
                            </label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="e.g., Senior Developer, Manager" className="w-full text-lg px-4 py-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-indigo-950 mb-2">Company Name *</label>
                            <input type="text" name="company" value={formData.company} onChange={handleChange} required className="w-full text-lg px-4 py-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-indigo-950 mb-2 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-indigo-600" /> City
                                </label>
                                <CitySearch
                                    value={formData.city}
                                    onChange={(val) => setFormData(prev => ({ ...prev, city: val }))}
                                    placeholder="Search or add city (e.g. Vehari)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-indigo-950 mb-2 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-indigo-600" /> Salary
                                </label>
                                <input type="text" name="salary" value={formData.salary} onChange={handleChange} placeholder="e.g., 50k - 80k" className="w-full text-lg px-4 py-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-indigo-950 mb-2 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-600" /> Experience
                                </label>
                                <select name="experience" value={formData.experience} onChange={handleChange} className="w-full text-lg px-4 py-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all">
                                    <option value="Fresh">Fresh / No Experience</option>
                                    <option value="Less than 1 Year">Less than 1 Year</option>
                                    <option value="1-2 Years">1-2 Years</option>
                                    <option value="2-3 Years">2-3 Years</option>
                                    <option value="3-5 Years">3-5 Years</option>
                                    <option value="5+ Years">5+ Years</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-indigo-950 mb-2 flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-indigo-600" /> Phone / WhatsApp *
                                </label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="03001234567" className="w-full text-lg px-4 py-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-indigo-950 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-600" /> Job Details
                            </label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows={4} placeholder="About the role..." className="w-full text-lg px-4 py-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none" />
                        </div>

                        {loading && uploadProgress > 0 && (
                            <div className="bg-indigo-50 rounded-xl p-4">
                                <div className="flex justify-between text-sm text-indigo-700 mb-2 font-bold">
                                    <span>Processing Official Post...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-indigo-200 rounded-full h-2">
                                    <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </div>
                        )}

                        <div className="bg-indigo-900/5 border-l-4 border-indigo-600 p-4 rounded-lg flex items-start gap-3">
                            <Shield className="w-5 h-5 text-indigo-600 mt-0.5" />
                            <div className="text-sm">
                                <p className="text-indigo-950 font-black uppercase tracking-tight">Official Admin Posting</p>
                                <p className="text-indigo-700 mt-1 font-medium">This job will be tagged as an official KhanHub recommendation.</p>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button type="button" onClick={() => router.back()} disabled={loading} className="flex-1 px-6 py-4 border-2 border-indigo-200 rounded-xl font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 transition-all">Cancel</button>
                            <button type="submit" disabled={loading} className="flex-1 bg-indigo-900 text-white px-6 py-4 rounded-xl font-black hover:bg-black disabled:bg-gray-400 transition-all shadow-lg flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Shield className="w-5 h-5" /> Post Job</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}