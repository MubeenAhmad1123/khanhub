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
  ArrowLeft,
  Film,
  Play
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { DEPARTMENTS } from '@/data/departments';
import {
  PublicMediaItem,
  DashboardMediaStats,
  PublishPhotoInput,
  PublishVideoInput
} from '@/lib/media/types';
import {
  listMediaForDashboard,
  publishPhotos,
  publishVideo,
  updateMediaItem,
  setMediaVisibility,
  removeMediaItem
} from '@/lib/media/mediaActions';
import { extractYouTubeVideoId } from '@/lib/media/youtubeUtils';
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
    uploadedToday: 0,
    totalPhotos: 0,
    totalVideos: 0
  });
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedVisibility, setSelectedVisibility] = useState<'all' | 'visible' | 'hidden'>('all');
  const [selectedMediaType, setSelectedMediaType] = useState<'all' | 'photo' | 'video'>('all');

  // Add menu
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Photo Wizard modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [wizardDept, setWizardDept] = useState<string>('general');
  const [wizardDeptSearch, setWizardDeptSearch] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // YouTube Video modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoExtractedId, setVideoExtractedId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDept, setVideoDept] = useState('general');
  const [videoDeptSearch, setVideoDeptSearch] = useState('');
  const [videoDate, setVideoDate] = useState(getTodayInKarachi());
  const [isFetchingVideoInfo, setIsFetchingVideoInfo] = useState(false);
  const [isPublishingVideo, setIsPublishingVideo] = useState(false);
  const [videoPublishError, setVideoPublishError] = useState<string | null>(null);

  // Video preview player modal (on-site playback in dashboard)
  const [previewVideoItem, setPreviewVideoItem] = useState<PublicMediaItem | null>(null);

  // Item action modals
  const [editingItem, setEditingItem] = useState<PublicMediaItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('');
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
      setVideoDept(savedDept);
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

  // Lock body scroll and keep modals firmly positioned at top of viewport
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      isWizardOpen || isVideoModalOpen || previewVideoItem || editingItem || removingItem
    );
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isWizardOpen, isVideoModalOpen, previewVideoItem, editingItem, removingItem]);

  // Fetch dashboard list
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
          mediaType: selectedMediaType,
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
  }, [selectedDept, selectedMonth, selectedVisibility, selectedMediaType]);

  const canManageItems = useMemo(() => {
    const role = (currentUser?.role || '').toLowerCase();
    return role === 'admin' || role === 'manager' || role === 'superadmin';
  }, [currentUser]);

  // Handle YouTube URL changes with auto ID extraction & oEmbed title lookup
  const handleVideoUrlChange = async (url: string) => {
    setVideoUrl(url);
    setVideoPublishError(null);
    const videoId = extractYouTubeVideoId(url);
    setVideoExtractedId(videoId);

    if (videoId && (!videoTitle || videoTitle.trim() === '')) {
      try {
        setIsFetchingVideoInfo(true);
        const res = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.title) {
            setVideoTitle(data.title.slice(0, 140));
          }
        }
      } catch (err) {
        console.warn('Could not auto-fetch YouTube video title', err);
      } finally {
        setIsFetchingVideoInfo(false);
      }
    }
  };

  // Publish YouTube Video Action
  const handlePublishVideo = async () => {
    if (!videoExtractedId) {
      setVideoPublishError('Please enter a valid YouTube video link, shorts link, or video ID.');
      return;
    }
    const cleanTitle = videoTitle.trim();
    if (cleanTitle.length < 3 || cleanTitle.length > 140) {
      setVideoPublishError('Title must be between 3 and 140 characters.');
      return;
    }

    try {
      setIsPublishingVideo(true);
      setVideoPublishError(null);

      const idToken = await auth.currentUser?.getIdToken();
      const clientToken = `video_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const res = await publishVideo(
        {
          clientToken,
          title: cleanTitle,
          departmentSlug: videoDept,
          youtubeUrl: videoUrl,
          publishedDate: videoDate
        },
        idToken
      );

      if (!res.success) {
        throw new Error(res.error || 'Failed to publish video');
      }

      showToast('YouTube video published successfully!', 'success');
      setIsVideoModalOpen(false);
      setVideoUrl('');
      setVideoExtractedId(null);
      setVideoTitle('');
      setVideoDate(getTodayInKarachi());
      await loadDashboardData(true);
    } catch (err: any) {
      console.error('Video publish error', err);
      setVideoPublishError(err.message || 'Error publishing video');
    } finally {
      setIsPublishingVideo(false);
    }
  };

  // File handling for Photo Wizard Step 1
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

        setStagedPhotos((prev) => [
          ...prev,
          {
            id: clientToken,
            processed: optimized,
            title: initialTitle,
            publishedDate: todayKarachi,
            status: 'idle'
          }
        ]);
      } catch (err: any) {
        showToast(`Failed to process "${file.name}": ${err.message}`, 'error');
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const removeStagedPhoto = (id: string) => {
    setStagedPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const updateStagedPhoto = (id: string, updates: Partial<StagedPhoto>) => {
    setStagedPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  // Step 4: Upload and Publish batch of photos
  const startPublishing = async () => {
    setIsPublishing(true);
    localStorage.setItem('media_last_department', wizardDept);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const currentYearMonth = getTodayInKarachi().substring(0, 7);

      for (let i = 0; i < stagedPhotos.length; i++) {
        const photo = stagedPhotos[i];
        if (photo.status === 'done') continue;

        let cloudinaryRes = photo.cloudinaryResult;

        if (!cloudinaryRes) {
          updateStagedPhoto(photo.id, { status: 'uploading_cloudinary' });
          try {
            cloudinaryRes = await uploadMediaPhotoToCloudinary(
              photo.processed.file,
              wizardDept,
              currentYearMonth,
              (pct) => updateStagedPhoto(photo.id, { uploadProgress: pct })
            );
            updateStagedPhoto(photo.id, { cloudinaryResult: cloudinaryRes });
          } catch (uploadErr: any) {
            updateStagedPhoto(photo.id, {
              status: 'error',
              errorMessage: `Cloudinary upload failed: ${uploadErr.message}`
            });
            continue;
          }
        }

        updateStagedPhoto(photo.id, { status: 'publishing' });

        const photoInput: PublishPhotoInput = {
          clientToken: photo.id,
          title: photo.title,
          departmentSlug: wizardDept,
          imageUrl: cloudinaryRes.secureUrl,
          cloudinaryPublicId: cloudinaryRes.publicId,
          width: cloudinaryRes.width,
          height: cloudinaryRes.height,
          bytes: cloudinaryRes.bytes,
          publishedDate: photo.publishedDate
        };

        const publishRes = await publishPhotos({ photos: [photoInput] }, idToken);

        if (publishRes.success) {
          updateStagedPhoto(photo.id, { status: 'done', errorMessage: undefined });
        } else {
          updateStagedPhoto(photo.id, {
            status: 'error',
            errorMessage: publishRes.error || 'Server publishing failed'
          });
        }
      }

      await loadDashboardData(true);
      showToast('Publishing process finished.', 'success');
    } catch (err: any) {
      console.error('Batch publishing failed', err);
      showToast(err.message || 'Batch publishing failed', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const allPublished = stagedPhotos.length > 0 && stagedPhotos.every((p) => p.status === 'done');

  // Item Actions: Visibility
  const handleToggleVisibility = async (item: PublicMediaItem) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await setMediaVisibility({ id: item.id, visible: !item.visible }, idToken);
      if (res.success) {
        showToast(`Item is now ${!item.visible ? 'visible (Live)' : 'hidden'}.`, 'success');
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, visible: !item.visible } : i))
        );
        setStats((prev) => ({
          ...prev,
          visible: !item.visible ? prev.visible + 1 : prev.visible - 1,
          hidden: !item.visible ? prev.hidden - 1 : prev.hidden + 1
        }));
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update visibility', 'error');
    }
  };

  // Item Actions: Edit
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await updateMediaItem(
        {
          id: editingItem.id,
          title: editTitle.trim(),
          departmentSlug: editDept,
          publishedDate: editDate,
          youtubeUrl: editingItem.mediaType === 'video' ? editYoutubeUrl.trim() : undefined
        },
        idToken
      );

      if (res.success) {
        showToast('Media item updated successfully.', 'success');
        const deptObj = ALL_DEPARTMENTS.find((d) => d.slug === editDept);
        const newVideoId =
          editingItem.mediaType === 'video' && editYoutubeUrl
            ? extractYouTubeVideoId(editYoutubeUrl)
            : editingItem.youtubeVideoId;

        setItems((prev) =>
          prev.map((i) =>
            i.id === editingItem.id
              ? {
                  ...i,
                  title: editTitle.trim(),
                  departmentSlug: editDept,
                  departmentName: deptObj ? deptObj.name : i.departmentName,
                  publishedDate: editDate,
                  youtubeVideoId: newVideoId || i.youtubeVideoId,
                  imageUrl:
                    editingItem.mediaType === 'video' && newVideoId
                      ? `https://img.youtube.com/vi/${newVideoId}/hqdefault.jpg`
                      : i.imageUrl
                }
              : i
          )
        );
        setEditingItem(null);
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save changes', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Item Actions: Soft Delete
  const handleConfirmRemove = async () => {
    if (!removingItem) return;
    setIsRemoving(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await removeMediaItem({ id: removingItem.id, reason: removeReason }, idToken);

      if (res.success) {
        showToast('Media item removed from website.', 'success');
        setItems((prev) => prev.filter((i) => i.id !== removingItem.id));
        setStats((prev) => ({
          ...prev,
          total: prev.total - 1,
          visible: removingItem.visible ? prev.visible - 1 : prev.visible,
          hidden: !removingItem.visible ? prev.hidden - 1 : prev.hidden
        }));
        setRemovingItem(null);
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to remove media item', 'error');
    } finally {
      setIsRemoving(false);
    }
  };

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
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-cyan-100 text-cyan-800">
              <Camera size={12} />
              Photos & Videos
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Publish high-quality photos and official YouTube videos directly to the Khan Hub website galleries.
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
              {/* Photo Option */}
              <button
                type="button"
                onClick={() => {
                  setAddMenuOpen(false);
                  setIsWizardOpen(true);
                  setWizardStep(1);
                  setStagedPhotos([]);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-800 flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Camera size={16} className="text-cyan-600" />
                  Photo
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 font-semibold">Active</span>
              </button>

              {/* Video Option (YouTube) */}
              <button
                type="button"
                onClick={() => {
                  setAddMenuOpen(false);
                  setIsVideoModalOpen(true);
                  setVideoUrl('');
                  setVideoExtractedId(null);
                  setVideoTitle('');
                  setVideoDate(getTodayInKarachi());
                  setVideoPublishError(null);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-800 flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Film size={16} className="text-red-600" />
                  YouTube Video
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">Active</span>
              </button>

              {/* Blog post Option */}
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
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-black text-gray-900">{stats.total}</p>
            <span className="text-[11px] text-gray-400 font-medium">
              {stats.totalPhotos ?? 0} photos &bull; {stats.totalVideos ?? 0} videos
            </span>
          </div>
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
          {/* Media Type Filter */}
          <div className="w-full sm:w-40">
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={selectedMediaType}
              onChange={(e) => setSelectedMediaType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium text-gray-800 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            >
              <option value="all">All Types</option>
              <option value="photo">Photos Only</option>
              <option value="video">Videos Only</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="w-full sm:w-52">
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
          <div className="w-full sm:w-40">
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
            setSelectedMediaType('all');
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
            There are no photos or videos matching the selected filters. Use "+ Add Media" to upload content.
          </p>
          <div className="flex items-center justify-center gap-3">
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
            <button
              type="button"
              onClick={() => {
                setIsVideoModalOpen(true);
                setVideoUrl('');
                setVideoExtractedId(null);
                setVideoTitle('');
                setVideoDate(getTodayInKarachi());
              }}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-medium hover:bg-red-700"
            >
              Publish Video
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {items.map((item) => {
              const isVideo = item.mediaType === 'video';
              const thumbUrl = isVideo
                ? item.imageUrl || `https://img.youtube.com/vi/${item.youtubeVideoId}/hqdefault.jpg`
                : item.imageUrl.replace('/upload/', '/upload/w_600,q_auto/');

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col group"
                >
                  {/* Thumbnail / Video Preview Trigger */}
                  <div
                    className="relative aspect-[4/3] bg-zinc-900 overflow-hidden cursor-pointer"
                    onClick={() => {
                      if (isVideo) {
                        setPreviewVideoItem(item);
                      }
                    }}
                  >
                    <img
                      src={thumbUrl}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-95 group-hover:opacity-100"
                    />

                    {/* Center Play Button Overlay for Videos */}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/10 transition-colors">
                        <div className="w-11 h-11 rounded-full bg-red-600/95 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play size={20} className="fill-current translate-x-0.5" />
                        </div>
                      </div>
                    )}

                    {/* Visibility & Media Type Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-md ${
                          item.visible ? 'bg-emerald-500/90 text-white' : 'bg-zinc-800/90 text-zinc-200'
                        }`}
                      >
                        {item.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                        {item.visible ? 'Live' : 'Hidden'}
                      </span>

                      {isVideo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-600/90 text-white backdrop-blur-md">
                          <Film size={11} />
                          Video
                        </span>
                      )}
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
                      <div className="flex items-center gap-1">
                        {/* Play Video Modal */}
                        {isVideo && (
                          <button
                            type="button"
                            onClick={() => setPreviewVideoItem(item)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Play Video On Site"
                          >
                            <Play size={15} className="fill-current" />
                          </button>
                        )}

                        {/* View public page */}
                        <Link
                          href={
                            item.departmentSlug === 'general'
                              ? isVideo
                                ? '/media?type=videos'
                                : '/media'
                              : isVideo
                              ? `/media/${item.departmentSlug}?type=videos`
                              : `/media/${item.departmentSlug}`
                          }
                          target="_blank"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                          title="View on Public Website"
                        >
                          <ExternalLink size={15} />
                        </Link>
                      </div>

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
                              setEditYoutubeUrl(
                                item.externalUrl ||
                                  (item.youtubeVideoId ? `https://www.youtube.com/watch?v=${item.youtubeVideoId}` : '')
                              );
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
                            title={isVideo ? 'Remove Video' : 'Remove Photo'}
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
                <span>{isLoadingMore ? 'Loading more media...' : 'Load More Media'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* YOUTUBE VIDEO PUBLISHING MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start justify-center p-2.5 sm:p-4 pt-3 sm:pt-6 md:pt-10">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-gray-200 animate-fade-in flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] my-0">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Film size={18} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Publish YouTube Video</h3>
                  <p className="text-xs text-gray-500">Add YouTube video to public website media gallery</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isPublishingVideo) return;
                  setIsVideoModalOpen(false);
                }}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* YouTube URL input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  YouTube Link / URL <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/... or shorts link"
                    value={videoUrl}
                    onChange={(e) => handleVideoUrlChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                  {isFetchingVideoInfo && (
                    <div className="absolute right-3 top-2.5 text-red-500">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Supports standard watch links, youtu.be links, shorts, or direct 11-character video IDs.
                </p>
              </div>

              {/* Video Preview Box */}
              {videoExtractedId && (
                <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200/80 animate-fade-in flex flex-col sm:flex-row gap-3 items-center">
                  <div className="relative aspect-video w-full sm:w-44 bg-black rounded-xl overflow-hidden shrink-0">
                    <img
                      src={`https://img.youtube.com/vi/${videoExtractedId}/hqdefault.jpg`}
                      alt="YouTube Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow">
                        <Play size={14} className="fill-current translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 size={12} />
                      Video ID: {videoExtractedId}
                    </span>
                    <p className="text-xs text-gray-600 mt-1 font-medium line-clamp-2">
                      {videoTitle || 'Title will be displayed on the website card and video player.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Title input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Video Title <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-gray-400">{videoTitle.length}/140</span>
                </div>
                <input
                  type="text"
                  maxLength={140}
                  placeholder="Enter a descriptive title for this video..."
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              {/* Department selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Search department..."
                    value={videoDeptSearch}
                    onChange={(e) => setVideoDeptSearch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {ALL_DEPARTMENTS.filter((d) =>
                    d.name.toLowerCase().includes(videoDeptSearch.toLowerCase())
                  ).map((d) => (
                    <label
                      key={d.slug}
                      className={`px-3 py-2 flex items-center justify-between cursor-pointer text-xs hover:bg-red-50/50 ${
                        videoDept === d.slug ? 'bg-red-50 font-bold text-red-900' : 'text-gray-700'
                      }`}
                    >
                      <span>{d.name}</span>
                      <input
                        type="radio"
                        name="videoDept"
                        value={d.slug}
                        checked={videoDept === d.slug}
                        onChange={() => setVideoDept(d.slug)}
                        className="text-red-600 focus:ring-red-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Published Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Publication Date</label>
                <input
                  type="date"
                  max={getTodayInKarachi()}
                  value={videoDate}
                  onChange={(e) => setVideoDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              {/* Error Banner */}
              {videoPublishError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{videoPublishError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/50">
              <button
                type="button"
                disabled={isPublishingVideo}
                onClick={() => setIsVideoModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPublishingVideo || !videoExtractedId || videoTitle.trim().length < 3}
                onClick={handlePublishVideo}
                className="px-6 py-2 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
              >
                {isPublishingVideo ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Play size={15} className="fill-current" />
                    <span>Publish Video Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ON-SITE VIDEO PREVIEW MODAL (DASHBOARD) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {previewVideoItem && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-start justify-center p-2.5 sm:p-6 pt-3 sm:pt-8 md:pt-12 animate-fade-in"
          onClick={() => setPreviewVideoItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-4xl w-full flex flex-col rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl my-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between text-white bg-zinc-900/60 backdrop-blur-md">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                  {previewVideoItem.departmentName}
                </span>
                <span className="text-xs text-zinc-400">&bull; {previewVideoItem.publishedDate}</span>
              </div>

              <button
                type="button"
                onClick={() => setPreviewVideoItem(null)}
                className="p-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Embedded 16:9 Responsive Player */}
            <div className="relative aspect-video w-full bg-black">
              {previewVideoItem.youtubeVideoId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${previewVideoItem.youtubeVideoId}?autoplay=1&rel=0`}
                  title={previewVideoItem.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                  Video preview unavailable
                </div>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="p-4 sm:p-5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between gap-4 text-white">
              <h3 className="text-sm sm:text-base font-semibold leading-snug truncate" title={previewVideoItem.title}>
                {previewVideoItem.title}
              </h3>

              <a
                href={
                  previewVideoItem.externalUrl ||
                  `https://www.youtube.com/watch?v=${previewVideoItem.youtubeVideoId}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shrink-0"
              >
                <ExternalLink size={14} />
                <span>Watch on YouTube</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PHOTO WIZARD MODAL (Steps 1 to 4) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start justify-center p-2.5 sm:p-4 pt-3 sm:pt-6 md:pt-10">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-gray-200/80 animate-fade-in flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] my-0">
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
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Wizard Steps Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* STEP 1: Select or Drag & Drop Photos */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  {stagedPhotos.length === 0 ? (
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-3xl p-6 sm:p-10 text-center cursor-pointer transition-all ${
                        dragActive
                          ? 'border-cyan-500 bg-cyan-50/50'
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50/40'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleFilesSelected(e.target.files)}
                        className="hidden"
                      />
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-2.5 sm:mb-3">
                        <UploadCloud size={26} />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-gray-800">
                        Click to upload photos or drag and drop
                      </p>
                      <p className="text-[11px] sm:text-xs text-gray-500 mt-1">
                        JPG, PNG, or WebP only (up to 10 photos per batch). Files will be optimized automatically in WebP.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stagedPhotos.length < 10 && (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-cyan-300 hover:border-cyan-500 rounded-2xl p-3 sm:p-3.5 text-center cursor-pointer bg-cyan-50/40 hover:bg-cyan-50/80 transition-all flex items-center justify-center gap-2 text-cyan-700"
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handleFilesSelected(e.target.files)}
                            className="hidden"
                          />
                          <Plus size={16} />
                          <span className="text-xs sm:text-sm font-semibold">
                            Add more photos ({stagedPhotos.length}/10 selected)
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Selected Photos ({stagedPhotos.length}/10)
                        </span>
                        <button
                          type="button"
                          onClick={() => setStagedPhotos([])}
                          className="text-xs text-rose-600 font-semibold hover:underline"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {stagedPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-[4/3]"
                          >
                            <img
                              src={photo.processed.previewUrl}
                              alt="preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeStagedPhoto(photo.id);
                                }}
                                className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow"
                                title="Remove photo"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="absolute bottom-1.5 left-1.5 right-1.5">
                              <span className="block px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] truncate font-medium backdrop-blur-sm">
                                {(photo.processed.processedSize / 1024).toFixed(0)} KB (WebP)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Choose Department */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Select Department</h4>
                    <p className="text-xs text-gray-500">
                      All {stagedPhotos.length} photo(s) will be published under this department category.
                    </p>
                  </div>

                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search department..."
                      value={wizardDeptSearch}
                      onChange={(e) => setWizardDeptSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-2xl border border-gray-200 divide-y divide-gray-100">
                    {ALL_DEPARTMENTS.filter((d) =>
                      d.name.toLowerCase().includes(wizardDeptSearch.toLowerCase())
                    ).map((d) => (
                      <label
                        key={d.slug}
                        className={`px-4 py-3 flex items-center justify-between cursor-pointer text-xs sm:text-sm hover:bg-cyan-50/50 transition-colors ${
                          wizardDept === d.slug ? 'bg-cyan-50 font-bold text-cyan-900' : 'text-gray-700'
                        }`}
                      >
                        <span>{d.name}</span>
                        <input
                          type="radio"
                          name="wizardDept"
                          value={d.slug}
                          checked={wizardDept === d.slug}
                          onChange={() => setWizardDept(d.slug)}
                          className="text-cyan-600 focus:ring-cyan-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: Titles and Dates */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Photo Details</h4>
                    <p className="text-xs text-gray-500">
                      Provide a clear one-line title and date for each photo (required 3-140 chars).
                    </p>
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    {stagedPhotos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-4 items-start"
                      >
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-black shrink-0">
                          <img
                            src={photo.processed.previewUrl}
                            alt="preview"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 space-y-3 w-full">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-semibold text-gray-700">
                                Title #{index + 1} <span className="text-rose-500">*</span>
                              </label>
                              <span className="text-[10px] text-gray-400">{photo.title.length}/140</span>
                            </div>
                            <input
                              type="text"
                              maxLength={140}
                              placeholder="e.g. Free Eye Camp at Vehari Center"
                              value={photo.title}
                              onChange={(e) => updateStagedPhoto(photo.id, { title: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Publication Date
                            </label>
                            <input
                              type="date"
                              max={getTodayInKarachi()}
                              value={photo.publishedDate}
                              onChange={(e) => updateStagedPhoto(photo.id, { publishedDate: e.target.value })}
                              className="w-full sm:w-48 px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                            />
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
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Review & Publish</h4>
                    <p className="text-xs text-gray-500">
                      Publishing to department:{' '}
                      <strong className="text-cyan-700">
                        {ALL_DEPARTMENTS.find((d) => d.slug === wizardDept)?.name}
                      </strong>
                    </p>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {stagedPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="p-3 rounded-2xl border border-gray-200 flex items-center justify-between gap-3 bg-white"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0">
                            <img
                              src={photo.processed.previewUrl}
                              alt="thumb"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                              {photo.title}
                            </p>
                            <p className="text-[11px] text-gray-400">Date: {photo.publishedDate}</p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {photo.status === 'idle' && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-semibold">
                              Ready
                            </span>
                          )}
                          {photo.status === 'uploading_cloudinary' && (
                            <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 text-[11px] font-semibold flex items-center gap-1">
                              <Loader2 size={12} className="animate-spin" />
                              Uploading...
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start justify-center p-2.5 sm:p-4 pt-3 sm:pt-6 md:pt-10">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 animate-fade-in p-6 my-0 max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              Edit {editingItem.mediaType === 'video' ? 'Video' : 'Media Item'}
            </h3>

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

              {editingItem.mediaType === 'video' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">YouTube URL</label>
                  <input
                    type="url"
                    value={editYoutubeUrl}
                    onChange={(e) => setEditYoutubeUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
              )}

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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start justify-center p-2.5 sm:p-4 pt-3 sm:pt-6 md:pt-10">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 animate-fade-in p-6 my-0 max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Remove {removingItem.mediaType === 'video' ? 'Video' : 'Photo'}
            </h3>
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
                placeholder="e.g. Outdated video, requested by department head"
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
