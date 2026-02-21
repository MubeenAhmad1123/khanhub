'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase-config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { writeActivityLog } from '@/hooks/useActivityLog';
import {
    Settings as SettingsIcon,
    Save,
    CreditCard,
    Globe,
    Shield,
    MessageSquare,
    Loader2,
    Lock,
    Eye,
    EyeOff,
    AlertTriangle
} from 'lucide-react';

export default function AdminSettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    const [settings, setSettings] = useState({
        bankName: '',
        accountTitle: '',
        accountNumber: '',
        videoUploadFee: 1000,
        connectionFee: 500,
        allowRegistrations: true,
        allowVideoUploads: true,
        maintenanceMode: false,
        assemblyAiKey: '',
        autoRejectOnAiFlag: false
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'config', 'platform');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings(prev => ({ ...prev, ...docSnap.data() }));
                }
            } catch (err) {
                console.error('Error loading settings:', err);
                toast('Failed to load settings', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [toast]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, 'config', 'platform'), {
                ...settings,
                updatedAt: serverTimestamp(),
                updatedBy: user?.uid
            });

            await writeActivityLog({
                admin_id: user?.uid || 'system',
                action_type: 'payment_approved', // Reusing for generic setting change for now or add 'settings_updated'
                target_id: 'platform_config',
                target_type: 'user', // generic
                note: `Updated platform settings and configurations.`
            });

            toast('Settings saved successfully', 'success');
        } catch (err) {
            console.error('Error saving settings:', err);
            toast('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-100 italic font-bold">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                LOADING CONFIGURATION...
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter">
                        <SettingsIcon className="w-8 h-8 text-blue-600" />
                        Platform Settings
                    </h1>
                    <p className="text-slate-500 font-bold">Global configurations for payments, security, and AI</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:bg-slate-300 uppercase italic tracking-tighter"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Payment Settings */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase italic">Bank & Fee Settings</h3>
                    </div>

                    <div className="space-y-4">
                        <InputGroup label="Bank Name" value={settings.bankName} onChange={(val) => setSettings({ ...settings, bankName: val })} placeholder="e.g. Meezan Bank" />
                        <InputGroup label="Account Title" value={settings.accountTitle} onChange={(val) => setSettings({ ...settings, accountTitle: val })} placeholder="e.g. Khan Hub PVT" />
                        <InputGroup label="Account Number" value={settings.accountNumber} onChange={(val) => setSettings({ ...settings, accountNumber: val })} placeholder="0000 0000 0000" />
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Video Fee (PKR)" type="number" value={settings.videoUploadFee.toString()} onChange={(val) => setSettings({ ...settings, videoUploadFee: parseInt(val) })} />
                            <InputGroup label="Connection Fee (PKR)" type="number" value={settings.connectionFee.toString()} onChange={(val) => setSettings({ ...settings, connectionFee: parseInt(val) })} />
                        </div>
                    </div>
                </div>

                {/* Platform Control */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                            <Globe className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase italic">Platform Controls</h3>
                    </div>

                    <div className="space-y-6">
                        <ToggleGroup
                            label="Allow New Registrations"
                            description="Disable to temporarily pause new user signups"
                            value={settings.allowRegistrations}
                            onChange={(val) => setSettings({ ...settings, allowRegistrations: val })}
                        />
                        <ToggleGroup
                            label="Allow Video Uploads"
                            description="Users won't be able to submit new videos"
                            value={settings.allowVideoUploads}
                            onChange={(val) => setSettings({ ...settings, allowVideoUploads: val })}
                        />
                        <div className="pt-4 border-t border-slate-100">
                            <ToggleGroup
                                label="Maintenance Mode"
                                description="Lock the entire platform for maintenance"
                                value={settings.maintenanceMode}
                                onChange={(val) => setSettings({ ...settings, maintenanceMode: val })}
                                danger
                            />
                        </div>
                    </div>
                </div>

                {/* AI & Integration Settings */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-purple-100 p-2 rounded-xl text-purple-600">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase italic">AI Transcription (AssemblyAI)</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AssemblyAI API Key</label>
                            <div className="relative">
                                <input
                                    type={showApiKey ? 'text' : 'password'}
                                    value={settings.assemblyAiKey}
                                    onChange={(e) => setSettings({ ...settings, assemblyAiKey: e.target.value })}
                                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <ToggleGroup
                            label="Auto-Reject AI Flags"
                            description="Automatically reject videos with AI-detected policy violations"
                            value={settings.autoRejectOnAiFlag}
                            onChange={(val) => setSettings({ ...settings, autoRejectOnAiFlag: val })}
                        />
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50 p-8 rounded-3xl border-2 border-dashed border-red-200 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-red-500 p-2 rounded-xl text-white">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-red-900 uppercase italic">Danger Zone</h3>
                    </div>

                    <p className="text-sm font-bold text-red-700 leading-snug">
                        Resetting the platform state or clearing activity logs is a destructive action. Proceed with extreme caution.
                    </p>

                    <button className="w-full px-6 py-4 bg-white border border-red-200 text-red-600 font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all text-xs uppercase italic tracking-widest flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" /> Reset Platform Data
                    </button>
                </div>
            </form>
        </div>
    );
}

function InputGroup({ label, value, onChange, placeholder = "", type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700"
            />
        </div>
    );
}

function ToggleGroup({ label, description, value, onChange, danger = false }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className={`text-sm font-black ${danger ? 'text-red-900' : 'text-slate-900'}`}>{label}</p>
                <p className="text-xs text-slate-500 font-medium">{description}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!value)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${value ? (danger ? 'bg-red-600' : 'bg-blue-600') : 'bg-slate-200'}`}
            >
                <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${value ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );
}
