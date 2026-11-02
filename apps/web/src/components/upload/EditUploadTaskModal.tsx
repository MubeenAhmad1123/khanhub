// apps/web/src/components/upload/EditUploadTaskModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Save, Loader2, Video, Image as ImageIcon,
  Building2, Share2, Plus, Edit3, Check
} from 'lucide-react';
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaTiktok,
  FaWhatsapp,
  FaGlobe
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { auth } from '@/lib/firebase';
import {
  UploadPlatformKey,
  ALL_PLATFORM_KEYS
} from '@/lib/upload/types';
import {
  CANONICAL_DEPARTMENTS,
  CanonicalDeptId
} from '@/lib/upload/departmentRegistry';
import {
  saveTaskRowOverride,
  addCustomUploadTaskRow
} from '@/lib/upload/uploadActions';
import { UploadCategoryRow } from './UploadCalendarMatrix';

interface EditUploadTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: UploadCategoryRow | null; // null if creating a new task
  month: string;
  onSaved: () => Promise<void> | void;
}

const PLATFORM_OPTIONS: Array<{
  key: UploadPlatformKey;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  activeBg: string;
  activeText: string;
  activeBorder: string;
  color: string;
}> = [
  {
    key: 'facebook',
    label: 'Facebook',
    icon: FaFacebook,
    activeBg: 'bg-blue-50',
    activeText: 'text-blue-800',
    activeBorder: 'border-blue-400',
    color: 'text-[#1877F2]'
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: FaInstagram,
    activeBg: 'bg-pink-50',
    activeText: 'text-pink-800',
    activeBorder: 'border-pink-400',
    color: 'text-[#E4405F]'
  },
  {
    key: 'youtube',
    label: 'YouTube',
    icon: FaYoutube,
    activeBg: 'bg-red-50',
    activeText: 'text-red-800',
    activeBorder: 'border-red-400',
    color: 'text-[#FF0000]'
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: FaTiktok,
    activeBg: 'bg-slate-100',
    activeText: 'text-slate-900',
    activeBorder: 'border-slate-500',
    color: 'text-black'
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: FaWhatsapp,
    activeBg: 'bg-emerald-50',
    activeText: 'text-emerald-800',
    activeBorder: 'border-emerald-400',
    color: 'text-[#25D366]'
  },
  {
    key: 'website',
    label: 'Website',
    icon: FaGlobe,
    activeBg: 'bg-cyan-50',
    activeText: 'text-cyan-800',
    activeBorder: 'border-cyan-400',
    color: 'text-[#0284C7]'
  }
];

export function EditUploadTaskModal({
  isOpen,
  onClose,
  task,
  month,
  onSaved
}: EditUploadTaskModalProps) {
  const isEditing = !!task;

  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<'video' | 'graphic'>('graphic');
  const [departmentId, setDepartmentId] = useState<CanonicalDeptId | ''>('hospital');
  const [enabledPlatforms, setEnabledPlatforms] = useState<UploadPlatformKey[]>(ALL_PLATFORM_KEYS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.name || '');
      const isVideo =
        task.type === 'video' ||
        task.name.toLowerCase().includes('video') ||
        task.name.toLowerCase().includes('reel');
      setContentType(isVideo ? 'video' : 'graphic');
      setDepartmentId((task.departmentId as CanonicalDeptId) || 'hospital');
      setEnabledPlatforms(task.enabledPlatforms || ALL_PLATFORM_KEYS);
    } else {
      setTitle('');
      setContentType('graphic');
      setDepartmentId('hospital');
      setEnabledPlatforms(ALL_PLATFORM_KEYS);
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const togglePlatform = (p: UploadPlatformKey) => {
    setEnabledPlatforms((prev) => {
      if (prev.includes(p)) {
        if (prev.length <= 1) {
          toast.error('At least one platform target must remain active.');
          return prev;
        }
        return prev.filter((k) => k !== p);
      } else {
        return [...prev, p];
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error('Task title cannot be empty.');
      return;
    }
    if (enabledPlatforms.length === 0) {
      toast.error('Please select at least one social target.');
      return;
    }

    try {
      setSaving(true);
      const idToken = await auth.currentUser?.getIdToken();

      if (isEditing && task) {
        const res = await saveTaskRowOverride(
          {
            rowId: task.id,
            month,
            title: cleanTitle,
            originalTitle: task.name,
            contentType: contentType === 'video' ? 'video' : 'image',
            departmentId: departmentId || null,
            enabledPlatforms
          },
          idToken
        );

        if (res.success) {
          toast.success(`Task "${cleanTitle}" updated successfully!`);
          await onSaved();
          onClose();
        } else {
          toast.error(res.error || 'Failed to save task overrides.');
        }
      } else {
        const res = await addCustomUploadTaskRow(
          {
            month,
            name: cleanTitle,
            type: contentType,
            departmentId: departmentId || null,
            enabledPlatforms
          },
          idToken
        );

        if (res.success) {
          toast.success(`New task "${cleanTitle}" added to Upload Sheet!`);
          await onSaved();
          onClose();
        } else {
          toast.error(res.error || 'Failed to add custom upload task.');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 print:hidden">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              {isEditing ? <Edit3 size={16} /> : <Plus size={16} />}
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-tight">
                {isEditing ? 'Edit Upload Task Row' : 'Add New Upload Task'}
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                Configure task title, media type tag, and active target platforms
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Task Title */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Task Title / Channel Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Medical Center Graphics Post, Rehab Awareness Video..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold text-gray-900"
            />
          </div>

          {/* Media Type Tag (Graphic vs Video) */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Media Type Tag <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setContentType('graphic')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-bold text-xs transition cursor-pointer ${
                  contentType === 'graphic'
                    ? 'bg-purple-50 border-purple-400 text-purple-900 ring-2 ring-purple-200 font-black'
                    : 'bg-white border-gray-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ImageIcon size={15} className="text-purple-600" />
                <span>Graphic Post</span>
                {contentType === 'graphic' && <Check size={14} className="text-purple-600 ml-auto" />}
              </button>

              <button
                type="button"
                onClick={() => setContentType('video')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-bold text-xs transition cursor-pointer ${
                  contentType === 'video'
                    ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-200 font-black'
                    : 'bg-white border-gray-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Video size={15} className="text-blue-600" />
                <span>Video Production</span>
                {contentType === 'video' && <Check size={14} className="text-blue-600 ml-auto" />}
              </button>
            </div>
          </div>

          {/* Department Tag */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Department Tag
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value as CanonicalDeptId)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white focus:outline-none text-xs font-bold text-gray-900 cursor-pointer"
            >
              {Object.values(CANONICAL_DEPARTMENTS).map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active Target Platforms (Platform Tags) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Active Social Target Platforms ({enabledPlatforms.length}/6)
              </label>
              <button
                type="button"
                onClick={() =>
                  setEnabledPlatforms(
                    enabledPlatforms.length === ALL_PLATFORM_KEYS.length
                      ? ['facebook', 'instagram']
                      : ALL_PLATFORM_KEYS
                  )
                }
                className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                {enabledPlatforms.length === ALL_PLATFORM_KEYS.length ? 'Select Main Only' : 'Select All'}
              </button>
            </div>
            <p className="text-[10.5px] text-slate-400 mb-2">
              Each checked social target will create a streamlined row in the Upload Matrix. Unchecked networks are omitted.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PLATFORM_OPTIONS.map((p) => {
                const isSelected = enabledPlatforms.includes(p.key);
                const IconComponent = p.icon;

                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => togglePlatform(p.key)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? `${p.activeBg} ${p.activeBorder} ${p.activeText} shadow-xs font-black`
                        : 'bg-slate-50 border-gray-200 text-slate-400 hover:bg-slate-100 opacity-60'
                    }`}
                  >
                    <IconComponent size={14} className={isSelected ? p.color : 'text-slate-400'} />
                    <span className="flex-1 text-left">{p.label}</span>
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={10} className="stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isEditing ? 'Save Changes' : 'Create Task Row'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
