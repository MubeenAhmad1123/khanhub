'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaSession } from '@/hooks/social-media/useMediaSession';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp
} from 'firebase/firestore';
import {
  Share2, Loader2, Sparkles, Plus, Check, X, Edit, Trash2, HelpCircle,
  AlertCircle, MessageSquare, Flame, BarChart2, Radio, Globe, Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MediaCampaignsManagement() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useMediaSession();

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State for creating/editing
  const [form, setForm] = useState({
    title: '',
    description: '',
    platform: 'YouTube',
    target: '',
    status: 'active'
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || !['admin', 'manager', 'superadmin'].includes(user.role)) {
      router.push('/departments/social-media/login');
    }
  }, [sessionLoading, user, router]);

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'media_campaigns'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCampaigns(list);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadCampaigns();
    }
  }, [user]);

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and Description are required');
      return;
    }

    try {
      setActionLoading(true);
      if (editingId) {
        // Update existing campaign
        await updateDoc(doc(db, 'media_campaigns', editingId), {
          ...form,
          updatedAt: Timestamp.now()
        });
        toast.success('Campaign updated successfully!');
      } else {
        // Create new campaign
        await addDoc(collection(db, 'media_campaigns'), {
          ...form,
          createdAt: Timestamp.now(),
          createdBy: user?.displayName || 'Admin'
        });
        toast.success('New campaign launched!');
      }

      setForm({ title: '', description: '', platform: 'YouTube', target: '', status: 'active' });
      setEditingId(null);
      loadCampaigns();
    } catch (error: any) {
      toast.error('Operation failed: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (camp: any) => {
    setForm({
      title: camp.title || '',
      description: camp.description || '',
      platform: camp.platform || 'YouTube',
      target: camp.target || '',
      status: camp.status || 'active'
    });
    setEditingId(camp.id);
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign permanently?')) return;

    try {
      setActionLoading(true);
      await deleteDoc(doc(db, 'media_campaigns', campaignId));
      toast.success('Campaign removed from database');
      loadCampaigns();
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">Loading Grid...</p>
        </div>
      </div>
    );
  }

  const glassStyle = "bg-white/70 dark:bg-black/20 backdrop-blur-xl border border-gray-200/50 dark:border-white/5 shadow-sm";

  return (
    <div className="space-y-10">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-indigo-500/20">
            Social Branding Hub
          </span>
          <h1 className="text-3xl md:text-5xl font-[1000] text-gray-900 dark:text-white tracking-tighter mt-4 uppercase">
            Branding <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-400">Campaigns</span>
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-semibold mt-2 leading-relaxed">
            Create, manage, and scale marketing initiatives across multi-channel distribution grids.
          </p>
        </div>
      </div>

      {/* Grid splits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Creator Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`p-8 rounded-[2rem] ${glassStyle} space-y-6`}>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {editingId ? 'Edit Campaign Node' : 'Launch Campaign'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {editingId ? 'Modify configuration parameters for this broadcast campaign.' : 'Input parameters to broadcast branding alignment to creators.'}
              </p>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">Campaign title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Summer Wellness Vlog Series"
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-2xl text-xs font-bold text-gray-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">Scope & details</label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe content goals, guidelines, and key assets..."
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-2xl text-xs font-bold text-gray-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">Platform</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                  >
                    <option value="YouTube">YouTube</option>
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Facebook">Facebook</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="General">General / All</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">Target Audience / Reach</label>
                  <input
                    type="text"
                    required
                    value={form.target}
                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                    placeholder="e.g. 50k Views"
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-2xl text-xs font-bold text-gray-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                >
                  <option value="active">Active / Broadcasting</option>
                  <option value="planned">Planned / In Draft</option>
                  <option value="completed">Completed / Archived</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ title: '', description: '', platform: 'YouTube', target: '', status: 'active' });
                      setEditingId(null);
                    }}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Flame size={14} className="animate-pulse" />}
                  {editingId ? 'Update Node' : 'Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Active Grid Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`p-8 rounded-[2.5rem] ${glassStyle} space-y-6`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Grids</h2>
                <p className="text-xs text-slate-400 mt-1">Live distribution campaigns logged on Khan Hub</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-500 text-[10px] font-black uppercase border border-cyan-500/20">
                {campaigns.length} Total
              </span>
            </div>

            {campaigns.length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-3xl">
                <Radio className="w-12 h-12 text-slate-300 mb-4 animate-pulse" />
                <p className="text-sm font-black text-gray-900 dark:text-white uppercase">No Broadcasts</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Create branding campaigns to align staff tasks and achieve corporate social goals.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar">
                {campaigns.map((camp) => (
                  <div key={camp.id} className="p-6 bg-slate-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl space-y-4 hover:border-indigo-500/20 transition-all">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase truncate max-w-[280px]">{camp.title}</h3>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">
                          Platform: <strong className="text-indigo-500">{camp.platform}</strong> • Target: <strong className="text-cyan-500">{camp.target}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(camp)}
                          className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-500 border border-indigo-500/10 transition-all active:scale-95"
                          title="Edit Campaign"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(camp.id)}
                          className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-500 border border-rose-500/10 transition-all active:scale-95"
                          title="Delete Campaign"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-white dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                      {camp.description}
                    </p>

                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 pt-2 border-t border-gray-100 dark:border-white/5">
                      <span className="flex items-center gap-1.5"><Globe size={12} className="text-cyan-400" /> Launched by {camp.createdBy || 'HQ Admin'}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black tracking-wider ${
                        camp.status === 'active' ? 'bg-emerald-100 text-emerald-600 border border-emerald-500/10' :
                        camp.status === 'planned' ? 'bg-amber-100 text-amber-600 border border-amber-500/10' :
                        'bg-gray-100 text-gray-500 border border-gray-500/10'
                      }`}>
                        {camp.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
