// apps/web/src/app/departments/social-media/dashboard/admin/media/page.tsx
'use client';

import React, { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Camera,
  Plus,
  Filter,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronDown,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  Search,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { DEPARTMENTS } from '@/data/departments';
import {
  PublicMediaItem,
  DashboardMediaStats,
  PublishPhotoInput
} from '@/lib/media/types';
import {
  listMediaForDashboard,
  publishPhotos,
  updateMediaItem,
  setMediaVisibility,
  removeMediaItem
} from '@/lib/media/mediaActions';
import { getTodayInKarachi } from '@/lib/media/dateUtils';
import {
  ProcessedPhoto,
  convertAndOptimizeImage,
  uploadMediaPhotoToCloudinary,
  CloudinaryMediaResult
} from '@/lib/media/clientMediaUpload';

const ALL_DEPARTMENTS = [
  { slug: 'general', name: 'Khan Hub (General)' },
  ...DEPARTMENTS.map((d) => ({ slug: d.slug, name: d.name }))
];

interface StagedPhoto {
  id: string; // clientToken
  processed: ProcessedPhoto;
  title: string;
  publishedDate: string;
  status: 'idle' | 'uploading_cloudinary' | 'publishing' | 'done' | 'error';
  cloudinaryResult?: CloudinaryMediaResult;
  errorMessage?: string;
  uploadProgress?: number;
}

export default function MediaLibraryDashboardPage() {
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    role: string;
    displayName: string;
  } | null>(null);

  // Data state
  const [items, setItems] = useState<PublicMediaItem[]>([]);
  const [stats, setStats] = useState<DashboardMediaStats>({
    total: 0,
    visible: 0,
    hidden: 0,
    uploadedToday: 0
  });
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedVisibility, setSelectedVisibility] = useState<'all' | 'visible' | 'hidden'>('all');

  // Add menu
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Wizard modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [wizardDept, setWizardDept] = useState<string>('general');
  const [wizardDeptSearch, setWizardDeptSearch] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Item action modals
  const [editingItem, setEditingItem] = useState<PublicMediaItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [removingItem, setRemovingItem] = useState<PublicMediaItem | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Check user session
  useEffect(() => {
    const sessionStr = localStorage.getItem('media_session');
    if (sessionStr) {
      try {
        const parsed = JSON.parse(sessionStr);
        setCurrentUser(parsed);
      } catch (e) {
        console.error('Failed to parse media_session', e);
      }
    }

    // Load saved last department choice
    const savedDept = localStorage.getItem('media_last_department');
    if (savedDept && ALL_DEPARTMENTS.some((d) => d.slug === savedDept)) {
      setWizardDept(savedDept);
    }
  }, []);

  // Close Add Menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setAddMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial dashboard list
  const loadDashboardData = async (reset = true) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await listMediaForDashboard(
        {
          departmentSlug: selectedDept !== 'all' ? selectedDept : undefined,
          month: selectedMonth || undefined,
          visible: selectedVisibility,
          cursor: reset ? undefined : nextCursor,
          limit: 48
        },
        idToken
      );

      if (reset) {
        setItems(res.items);
      } else {
        setItems((prev) => [...prev, ...res.items]);
      }
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
      setStats(res.stats);
    } catch (err: any) {
      console.error('Failed to load dashboard media', err);
      showToast(err.message || 'Error loading media', 'error');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadDashboardData(true);
  }, [selectedDept, selectedMonth, selectedVisibility]);

  const canManageItems = useMemo(() => {
    const role = (currentUser?.role || '').toLowerCase();
    return role === 'admin' || role === 'manager' || role === 'superadmin';
  }, [currentUser]);

  // File handling for Step 1
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const remainingSlots = 10 - stagedPhotos.length;
    if (remainingSlots <= 0) {
      showToast('Maximum 10 photos allowed per batch.', 'error');
      return;
    }

    const filesToProcess = Array.from(fileList).slice(0, remainingSlots);
    const todayKarachi = getTodayInKarachi();

    for (const file of filesToProcess) {
      try {
        const optimized = await convertAndOptimizeImage(file);
        const clientToken = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const initialTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').slice(0, 100);

        setStagedPhotos((prev) => {
          if (prev.length >= 10) return prev;
          return [
            ...prev,
            {
              id: clientToken,
              processed: optimized,
              title: initialTitle.length >= 3 ? initialTitle : 'Khan Hub Activity',
              publishedDate: todayKarachi,
              status: 'idle'
            }
          ];
        });
      } catch (err: any) {
        showToast(err.message || `Error processing ${file.name}`, 'error');
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeStagedPhoto = (id: string) => {
    setStagedPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const updateStagedPhoto = (id: string, updates: Partial<StagedPhoto>) => {
    setStagedPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  // Publish workflow in Step 4
  const startPublishing = async () => {
    if (stagedPhotos.length === 0 || isPublishing) return;
    setIsPublishing(true);

    const todayKarachi = getTodayInKarachi();
    const [year, month] = todayKarachi.split('-');
    const yearMonth = `${year}-${month}`;

    const idToken = await auth.currentUser?.getIdToken();

    // 1. Upload each photo to Cloudinary if not already uploaded
    for (let i = 0; i < stagedPhotos.length; i++) {
      const photo = stagedPhotos[i];
      if (photo.status === 'done') continue;

      let cResult = photo.cloudinaryResult;

      if (!cResult) {
        updateStagedPhoto(photo.id, { status: 'uploading_cloudinary', errorMessage: undefined });
        try {
          cResult = await uploadMediaPhotoToCloudinary(
            photo.processed.file,
            wizardDept,
            yearMonth,
            (progress) => {
              updateStagedPhoto(photo.id, { uploadProgress: progress });
            }
          );
          updateStagedPhoto(photo.id, { cloudinaryResult: cResult });
        } catch (err: any) {
          updateStagedPhoto(photo.id, {
            status: 'error',
            errorMessage: err.message || 'Cloudinary upload failed'
          });
          continue;
        }
      }

      // 2. Call server action to publish
      updateStagedPhoto(photo.id, { status: 'publishing' });
      try {
        const payload: PublishPhotoInput = {
          clientToken: photo.id,
          title: photo.title,
          departmentSlug: wizardDept,
          imageUrl: cResult.secureUrl,
          cloudinaryPublicId: cResult.publicId,
          width: cResult.width,
          height: cResult.height,
          bytes: cResult.bytes,
          publishedDate: photo.publishedDate
        };

        const res = await publishPhotos({ photos: [payload] }, idToken);
        if (!res.success) {
          throw new Error(res.error || 'Server publishing failed');
        }

        updateStagedPhoto(photo.id, { status: 'done', errorMessage: undefined });
      } catch (err: any) {
        updateStagedPhoto(photo.id, {
          status: 'error',
          errorMessage: err.message || 'Publishing failed'
        });
      }
    }

    setIsPublishing(false);
    // Refresh dashboard data
    loadDashboardData(true);
  };

  // Edit action
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await updateMediaItem(
        {
          id: editingItem.id,
          title: editTitle,
          departmentSlug: editDept,
          publishedDate: editDate
        },
        idToken
      );

      if (!res.success) {
        throw new Error(res.error || 'Failed to update item');
      }

      showToast('Media item updated successfully');
      setEditingItem(null);
      loadDashboardData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Visibility toggle
  const handleToggleVisibility = async (item: PublicMediaItem) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const newVisible = !item.visible;
      const res = await setMediaVisibility({ id: item.id, visible: newVisible }, idToken);
      if (!res.success) {
        throw new Error(res.error || 'Failed to change visibility');
      }
      showToast(newVisible ? 'Item is now visible on website' : 'Item is hidden from website');
      loadDashboardData(true);
    } catch (err: any) {
      showToast(err.message || 'Error updating visibility', 'error');
    }
  };

  // Remove action
  const handleConfirmRemove = async () => {
    if (!removingItem) return;
    if (!removeReason.trim() || removeReason.trim().length < 3) {
      showToast('Please provide a reason (minimum 3 characters).', 'error');
      return;
    }

    setIsRemoving(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await removeMediaItem(
        { id: removingItem.id, reason: removeReason },
        idToken
      );

      if (!res.success) {
        throw new Error(res.error || 'Failed to remove item');
      }

      showToast('Item removed successfully');
      setRemovingItem(null);
      setRemoveReason('');
      loadDashboardData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to remove', 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  // Filtered departments for wizard search
  const filteredWizardDepts = useMemo(() => {
    if (!wizardDeptSearch.trim()) return ALL_DEPARTMENTS;
    const query = wizardDeptSearch.toLowerCase();
    return ALL_DEPARTMENTS.filter(
      (d) => d.name.toLowerCase().includes(query) || d.slug.toLowerCase().includes(query)
    );
  }, [wizardDeptSearch]);

  const allPublished = stagedPhotos.length > 0 && stagedPhotos.every((p) => p.status === 'done');

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600" />
          ) : (
            <AlertCircle size={18} className="text-rose-600" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Media Library</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-cyan-100 text-cyan-800">
              Photos Only
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Publish high-quality photos directly to the official Khan Hub website galleries.
          </p>
        </div>

        {/* Add Button Dropdown */}
        <div className="relative" ref={addMenuRef}>
          <button
            type="button"
            onClick={() => setAddMenuOpen(!addMenuOpen)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 text-white font-medium text-sm shadow-sm hover:bg-cyan-700 active:scale-[0.98] transition-all"
          >
            <Plus size={16} />
            <span>Add Media</span>
            <ChevronDown size={14} className={`transition-transform ${addMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {addMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-30 animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  setAddMenuOpen(false);
                  setIsWizardOpen(true);
                  setWizardStep(1);
                  setStagedPhotos([]);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-800 flex items-center justify-between"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Camera size={16} className="text-cyan-600" />
                  Photo
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 font-semibold">Active</span>
              </button>

              <div className="w-full px-4 py-2.5 text-left text-sm text-gray-400 cursor-not-allowed flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-xs">🎬</span>
                  Video
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold">
                  Coming soon
                </span>
              </div>

              <div className="w-full px-4 py-2.5 text-left text-sm text-gray-400 cursor-not-allowed flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-xs">📝</span>
                  Blog post
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold">
                  Coming soon
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Published</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Visible Live</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.visible}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Hidden</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.hidden}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-sm">
          <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wider">Uploaded Today</p>
          <p className="text-2xl font-black text-cyan-600 mt-1">{stats.uploadedToday}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-sm flex flex-col sm:flex-row flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Department Filter */}
          <div className="w-full sm:w-56">
            <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium text-gray-800 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            >
              <option value="all">All Departments</option>
              {ALL_DEPARTMENTS.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="w-full sm:w-44">
            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium text-gray-800 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>

          {/* Visibility Filter */}
          <div className="w-full sm:w-36">
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={selectedVisibility}
              onChange={(e) => setSelectedVisibility(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium text-gray-800 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            >
              <option value="all">All Status</option>
              <option value="visible">Visible Live</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedDept('all');
            setSelectedMonth('');
            setSelectedVisibility('all');
          }}
          className="text-xs text-gray-500 hover:text-cyan-600 font-medium py-2 self-end sm:self-center"
        >
          Reset Filters
        </button>
      </div>

      {/* Grid of Items */}
      {isLoading ? (
        <div className="py-24 text-center">
          <Loader2 size={32} className="animate-spin text-cyan-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading Media Library...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-4">
            <Camera size={32} />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">No media items found</h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-6">
            There are no photos matching the selected filters. Use "+ Add Media" to upload photos.
          </p>
          <button
            type="button"
            onClick={() => {
              setIsWizardOpen(true);
              setWizardStep(1);
              setStagedPhotos([]);
            }}
            className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs sm:text-sm font-medium hover:bg-cyan-700"
          >
            Upload Photo
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {items.map((item) => {
              // Create Cloudinary thumbnail URL (w_600, q_auto)
              const thumbUrl = item.imageUrl.replace('/upload/', '/upload/w_600,q_auto/');

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col group"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                    <img
                      src={thumbUrl}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Visibility badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-md ${
                          item.visible
                            ? 'bg-emerald-500/90 text-white'
                            : 'bg-zinc-800/90 text-zinc-200'
                        }`}
                      >
                        {item.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                        {item.visible ? 'Live' : 'Hidden'}
                      </span>
                    </div>

                    {/* Department badge */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-black/60 text-white backdrop-blur-md truncate max-w-full">
                        {item.departmentName}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug" title={item.title}>
                        {item.title}
                      </h4>
                      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                        <span>{item.publishedDate}</span>
                        <span className="truncate max-w-[120px]" title={item.uploadedByName}>
                          By: {item.uploadedByName || 'Staff'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-1 text-xs">
                      {/* View public page */}
                      <Link
                        href={item.departmentSlug === 'general' ? '/media' : `/media/${item.departmentSlug}`}
                        target="_blank"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                        title="View on Public Website"
                      >
                        <ExternalLink size={15} />
                      </Link>

                      {canManageItems && (
                        <div className="flex items-center gap-1">
                          {/* Toggle visibility */}
                          <button
                            type="button"
                            onClick={() => handleToggleVisibility(item)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title={item.visible ? 'Hide from Website' : 'Make Live on Website'}
                          >
                            {item.visible ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>

                          {/* Edit item */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setEditTitle(item.title);
                              setEditDept(item.departmentSlug);
                              setEditDate(item.publishedDate);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                            title="Edit Details"
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Remove item */}
                          <button
                            type="button"
                            onClick={() => {
                              setRemovingItem(item);
                              setRemoveReason('');
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove Photo"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4 pb-6">
              <button
                type="button"
                onClick={() => loadDashboardData(false)}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoadingMore ? <Loader2 size={16} className="animate-spin text-cyan-600" /> : <RefreshCw size={14} />}
                <span>{isLoadingMore ? 'Loading more photos...' : 'Load More Photos'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PHOTO WIZARD MODAL (Steps 1 to 4) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-gray-200/80 animate-fade-in flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Upload Photos</h3>
                <p className="text-xs text-gray-500">Step {wizardStep} of 4</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isPublishing) return;
                  setIsWizardOpen(false);
                }}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper progress */}
            <div className="px-6 pt-3 pb-2 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                <span className={wizardStep === 1 ? 'text-cyan-600' : wizardStep > 1 ? 'text-emerald-600' : ''}>
                  1. Select Photos
                </span>
                <span className={wizardStep === 2 ? 'text-cyan-600' : wizardStep > 2 ? 'text-emerald-600' : ''}>
                  2. Department
                </span>
                <span className={wizardStep === 3 ? 'text-cyan-600' : wizardStep > 3 ? 'text-emerald-600' : ''}>
                  3. Details
                </span>
                <span className={wizardStep === 4 ? 'text-cyan-600' : ''}>
                  4. Review & Publish
                </span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-cyan-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(wizardStep / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* STEP 1: Select / Drag & Drop Photos */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      handleFilesSelected(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                      dragActive
                        ? 'border-cyan-500 bg-cyan-50/50'
                        : 'border-gray-200 hover:border-cyan-400 hover:bg-gray-50/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFilesSelected(e.target.files)}
                    />
                    <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-3">
                      <UploadCloud size={28} />
                    </div>
                    <p className="text-sm font-bold text-gray-800">
                      Click to choose or drag & drop photos here
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG, or WebP only (Max 10 photos). Each photo is automatically optimized to WebP (&le;1.5 MB).
                    </p>
                  </div>

                  {/* Staged photos list */}
                  {stagedPhotos.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Ready for Upload ({stagedPhotos.length}/10)
                        </span>
                        <button
                          type="button"
                          onClick={() => setStagedPhotos([])}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {stagedPhotos.map((photo) => {
                          const origKb = Math.round(photo.processed.originalSize / 1024);
                          const webpKb = Math.round(photo.processed.processedSize / 1024);
                          return (
                            <div
                              key={photo.id}
                              className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group p-2 flex flex-col justify-between"
                            >
                              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-black/5 relative mb-2">
                                <img
                                  src={photo.processed.previewUrl}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeStagedPhoto(photo.id);
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors"
                                  title="Remove photo"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                              <div className="text-[11px] text-gray-600 leading-tight">
                                <p className="truncate font-medium">{photo.processed.originalName}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {origKb} KB &rarr;{' '}
                                  <span className="text-emerald-600 font-semibold">{webpKb} KB WebP</span>
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Choose Department */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Target Department Gallery
                    </label>
                    <p className="text-xs text-gray-500">
                      Select which department gallery these photos will be published to. This department applies to the
                      entire batch.
                    </p>
                  </div>

                  {/* Search box */}
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search departments..."
                      value={wizardDeptSearch}
                      onChange={(e) => setWizardDeptSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>

                  {/* Department selection list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {filteredWizardDepts.map((dept) => {
                      const isSelected = wizardDept === dept.slug;
                      return (
                        <button
                          key={dept.slug}
                          type="button"
                          onClick={() => {
                            setWizardDept(dept.slug);
                            localStorage.setItem('media_last_department', dept.slug);
                          }}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? 'border-cyan-500 bg-cyan-50 text-cyan-900 font-bold'
                              : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <span className="text-xs sm:text-sm">{dept.name}</span>
                          {isSelected && <CheckCircle2 size={16} className="text-cyan-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: Titles & Dates */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Photo Titles & Dates</h4>
                    <p className="text-xs text-gray-500">
                      Provide a clear, one-line title (3-140 chars) and publication date for each photo.
                    </p>
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    {stagedPhotos.map((photo, idx) => (
                      <div
                        key={photo.id}
                        className="p-3.5 rounded-2xl border border-gray-200/80 bg-gray-50/50 flex flex-col sm:flex-row gap-3 items-start sm:items-center"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/5 flex-shrink-0 relative">
                          <img
                            src={photo.processed.previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 w-full space-y-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                              Title #{idx + 1} (Max 140)
                            </label>
                            <input
                              type="text"
                              maxLength={140}
                              value={photo.title}
                              onChange={(e) => updateStagedPhoto(photo.id, { title: e.target.value })}
                              placeholder="e.g. Students in modern computer laboratory"
                              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                                Publication Date (PKT)
                              </label>
                              <input
                                type="date"
                                max={getTodayInKarachi()}
                                value={photo.publishedDate}
                                onChange={(e) => updateStagedPhoto(photo.id, { publishedDate: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: Review and Publish */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="bg-cyan-50/70 rounded-2xl p-4 border border-cyan-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-cyan-800">Target Department</span>
                      <p className="text-sm font-bold text-cyan-950">
                        {ALL_DEPARTMENTS.find((d) => d.slug === wizardDept)?.name || wizardDept}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-200/80 text-cyan-900">
                      {stagedPhotos.length} {stagedPhotos.length === 1 ? 'Photo' : 'Photos'}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {stagedPhotos.map((photo, idx) => (
                      <div
                        key={photo.id}
                        className="p-3 rounded-xl border border-gray-200 bg-white flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={photo.processed.previewUrl}
                            alt="Thumb"
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate">{photo.title}</p>
                            <p className="text-[11px] text-gray-500">{photo.publishedDate}</p>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {photo.status === 'idle' && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-semibold">
                              Ready
                            </span>
                          )}
                          {photo.status === 'uploading_cloudinary' && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold flex items-center gap-1">
                              <Loader2 size={12} className="animate-spin" />
                              Uploading {photo.uploadProgress ? `${photo.uploadProgress}%` : ''}
                            </span>
                          )}
                          {photo.status === 'publishing' && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-semibold flex items-center gap-1">
                              <Loader2 size={12} className="animate-spin" />
                              Publishing...
                            </span>
                          )}
                          {photo.status === 'done' && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              Published
                            </span>
                          )}
                          {photo.status === 'error' && (
                            <div className="text-right">
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-semibold flex items-center gap-1">
                                <AlertCircle size={12} />
                                Failed
                              </span>
                              {photo.errorMessage && (
                                <p className="text-[10px] text-rose-600 mt-0.5 max-w-[140px] truncate" title={photo.errorMessage}>
                                  {photo.errorMessage}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {allPublished && (
                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-center animate-fade-in">
                      <CheckCircle2 size={28} className="text-emerald-600 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-emerald-900">All photos published successfully!</h4>
                      <p className="text-xs text-emerald-700 mt-1">
                        They are now live in the website gallery and cached for high performance.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              {wizardStep > 1 && !allPublished && (
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
              )}

              {wizardStep === 1 && <div />}

              {wizardStep < 4 && (
                <button
                  type="button"
                  disabled={
                    (wizardStep === 1 && stagedPhotos.length === 0) ||
                    (wizardStep === 3 && stagedPhotos.some((p) => p.title.trim().length < 3))
                  }
                  onClick={() => setWizardStep((prev) => (prev + 1) as any)}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 text-white text-xs sm:text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  Continue
                  <ArrowRight size={14} />
                </button>
              )}

              {wizardStep === 4 && (
                <div>
                  {allPublished ? (
                    <button
                      type="button"
                      onClick={() => setIsWizardOpen(false)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700"
                    >
                      Done
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPublishing}
                      onClick={startPublishing}
                      className="px-6 py-2.5 rounded-xl bg-cyan-600 text-white text-xs sm:text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <UploadCloud size={16} />
                          Publish Photos Now
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* EDIT MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 animate-fade-in p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">Edit Media Item</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  maxLength={140}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                <select
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                >
                  {ALL_DEPARTMENTS.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Publication Date</label>
                <input
                  type="date"
                  max={getTodayInKarachi()}
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit || editTitle.trim().length < 3}
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingEdit && <Loader2 size={14} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* REMOVE MODAL (Soft delete with required reason) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {removingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 animate-fade-in p-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Remove Photo</h3>
            <p className="text-xs text-gray-500 mb-4">
              This will remove <strong className="text-gray-800">"{removingItem.title}"</strong> from the live public
              website. A permanent audit log will be created.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason for Removal <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Outdated photograph, requested by department head"
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isRemoving}
                onClick={() => setRemovingItem(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRemoving || removeReason.trim().length < 3}
                onClick={handleConfirmRemove}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isRemoving && <Loader2 size={14} className="animate-spin" />}
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
