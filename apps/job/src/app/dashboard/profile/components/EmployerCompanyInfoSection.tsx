'use client';

import { useState } from 'react';
import { Building2, Save, MapPin, Globe, Users, Phone, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase/firebase-config';
import { doc, setDoc } from 'firebase/firestore';

interface EmployerCompanyInfoSectionProps {
    userData: any;
}

export default function EmployerCompanyInfoSection({ userData }: EmployerCompanyInfoSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        companyName: userData?.companyName || userData?.company?.name || '',
        industry: userData?.industry || '',
        companySize: userData?.companySize || '',
        location: userData?.location || '',
        website: userData?.website || '',
        whatsapp: userData?.whatsapp || '',
        establishedYear: userData?.establishedYear || '',
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            await setDoc(doc(db, 'users', userData.uid), {
                ...formData,
                updatedAt: new Date(),
            }, { merge: true });
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving company info:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-500/5 border border-slate-100 overflow-hidden">
            <div className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Company Profile</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Business Details</p>
                        </div>
                    </div>
                    <button
                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        disabled={loading}
                        className={cn(
                            "px-6 py-3 rounded-xl font-bold uppercase tracking-wide text-xs transition-all flex items-center gap-2",
                            isEditing
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                    >
                        {loading ? <Save className="w-4 h-4 animate-spin" /> : isEditing ? <Save className="w-4 h-4" /> : 'Edit Details'}
                    </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex justify-between">
                                Company Name
                                <span className="text-blue-600 font-medium normal-case tracking-normal" dir="rtl">کمپنی کا نام</span>
                            </label>
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={formData.companyName}
                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-900 disabled:opacity-60"
                                placeholder="Enter company name"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex justify-between">
                                Industry
                                <span className="text-blue-600 font-medium normal-case tracking-normal" dir="rtl">صنعت</span>
                            </label>
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={formData.industry}
                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-900 disabled:opacity-60"
                                placeholder="e.g. Technology, Healthcare"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex justify-between">
                                Company Size
                                <span className="text-blue-600 font-medium normal-case tracking-normal" dir="rtl">کمپنی کا سائز</span>
                            </label>
                            <select
                                disabled={!isEditing}
                                value={formData.companySize}
                                onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-900 disabled:opacity-60 appearance-none"
                            >
                                <option value="">Select size</option>
                                <option value="1-10">1-10 employees</option>
                                <option value="11-50">11-50 employees</option>
                                <option value="51-200">51-200 employees</option>
                                <option value="201-500">201-500 employees</option>
                                <option value="500+">500+ employees</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex justify-between">
                                Location
                                <span className="text-blue-600 font-medium normal-case tracking-normal" dir="rtl">مقام</span>
                            </label>
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-900 disabled:opacity-60"
                                placeholder="City, Country"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex justify-between">
                                Website
                                <span className="text-blue-600 font-medium normal-case tracking-normal" dir="rtl">ویب سائٹ</span>
                            </label>
                            <input
                                type="url"
                                disabled={!isEditing}
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-900 disabled:opacity-60"
                                placeholder="https://example.com"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex justify-between">
                                WhatsApp / Contact
                                <span className="text-blue-600 font-medium normal-case tracking-normal" dir="rtl">واٹس ایپ / رابطہ</span>
                            </label>
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={formData.whatsapp}
                                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-900 disabled:opacity-60"
                                placeholder="+92 ..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
