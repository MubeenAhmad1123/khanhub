'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { CATEGORY_CONFIG, CategoryKey } from '@/lib/categories';
import { ArrowLeft, Check, Save, AlertCircle, Loader2 } from 'lucide-react';

export default function EditVideoCategoryPage() {
    const router = useRouter();
    const params = useParams();
    const videoId = params.id as string;

    const [video, setVideo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [newCategory, setNewCategory] = useState<CategoryKey | ''>('');
    const [newRole, setNewRole] = useState<string>('');
    const [newSubNiche, setNewSubNiche] = useState<string>('');

    useEffect(() => {
        const fetchVideo = async () => {
            if (!videoId) return;
            try {
                const docSnap = await getDoc(doc(db, 'videos', videoId));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setVideo(data);
                    setNewCategory(data.category as CategoryKey || '');
                    setNewRole(data.userRole || '');
                    setNewSubNiche(data.subNiche || '');
                } else {
                    setError('Video not found');
                }
            } catch (err) {
                console.error('Error fetching video:', err);
                setError('Failed to load video details');
            } finally {
                setLoading(false);
            }
        };
        fetchVideo();
    }, [videoId]);

    const handleCategoryChange = (cat: CategoryKey) => {
        setNewCategory(cat);
        // Reset role and sub-niche when category changes
        setNewRole('');
        setNewSubNiche('');
    };

    const handleSave = async () => {
        if (!videoId || !newCategory) return;
        setSaving(true);
        setError(null);

        try {
            await updateDoc(doc(db, 'videos', videoId), {
                category: newCategory,
                userRole: newRole,
                subNiche: newSubNiche,
                updatedAt: serverTimestamp(),
            });
            router.back();
        } catch (err: any) {
            console.error('Save failed:', err);
            setError(err.message || 'Failed to update category');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" color="#FF0069" size={32} />
            </div>
        );
    }

    if (error && !video) {
        return (
            <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: 20, textAlign: 'center' }}>
                <AlertCircle size={48} color="#FF0069" style={{ marginBottom: 16 }} />
                <p>{error}</p>
                <button onClick={() => router.back()} style={{ marginTop: 20, color: '#FF0069' }}>Go Back</button>
            </div>
        );
    }

    const availableRoles = newCategory ? CATEGORY_CONFIG[newCategory as CategoryKey]?.roles || {} : {};

    return (
        <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '24px' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <button 
                    onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', color: '#888', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 24 }}
                >
                    <ArrowLeft size={20} /> Back to Admin
                </button>

                <h1 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Edit Video Category</h1>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 32 }}>Move video to a different category or update roles.</p>

                {video && (
                    <div style={{ background: '#111', borderRadius: 16, padding: 20, border: '1px solid #222', marginBottom: 32 }}>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                            <video 
                                src={video.videoUrl || video.cloudinaryUrl} 
                                style={{ width: 100, height: 160, objectFit: 'cover', borderRadius: 8, background: '#000' }}
                            />
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{video.title || 'Untitled Video'}</h3>
                                <p style={{ fontSize: 12, color: '#666' }}>Current: {video.category} / {video.userRole}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {/* Category Selector */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 12, textTransform: 'uppercase' }}>Select Category</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                        <button
                                            key={key}
                                            onClick={() => handleCategoryChange(key as CategoryKey)}
                                            style={{
                                                padding: '12px', borderRadius: 12, background: newCategory === key ? '#FF0069' : '#1A1A1A',
                                                border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: 8
                                            }}
                                        >
                                            <span>{config.emoji}</span>
                                            <span>{config.label}</span>
                                            {newCategory === key && <Check size={14} style={{ marginLeft: 'auto' }} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Role Selector */}
                            {newCategory && (
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 12, textTransform: 'uppercase' }}>Select Role</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                        {Object.entries(availableRoles).map(([rKey, rVal]) => (
                                            <button
                                                key={rKey}
                                                onClick={() => setNewRole(rKey)}
                                                style={{
                                                    padding: '8px 16px', borderRadius: 99, background: newRole === rKey ? '#7638FA' : '#1A1A1A',
                                                    border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                                }}
                                            >
                                                {rVal.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div style={{ color: '#FF0069', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertCircle size={14} /> {error}
                                </div>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={saving || !newCategory}
                                style={{
                                    width: '100%', padding: '16px', background: '#FF0069', color: '#fff',
                                    borderRadius: 12, fontWeight: 800, fontSize: 16, border: 'none',
                                    cursor: (saving || !newCategory) ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                    marginTop: 10, transition: 'all 0.2s', opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Update Video</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}
