// apps/web/src/components/media/MediaClientView.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Camera,
  Calendar,
  Film,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  ExternalLink,
  Building2,
  Play
} from 'lucide-react';
import { PublicMediaItem, PublicMediaListResult } from '@/lib/media/types';
import { loadMorePublicMedia } from '@/lib/media/mediaQueries';
import MediaEventsContent from './MediaEventsContent';
import { DEPARTMENTS } from '@/data/departments';

type TabType = 'photos' | 'events' | 'videos' | 'others';

interface DepartmentOption {
  slug: string;
  name: string;
}

const ALL_DEPARTMENT_OPTIONS: DepartmentOption[] = [
  { slug: 'all', name: 'All Departments' },
  { slug: 'general', name: 'Khan Hub (General)' },
  ...DEPARTMENTS.map((d) => ({ slug: d.slug, name: d.name }))
];

interface MediaClientViewProps {
  initialResult: PublicMediaListResult;
  currentDeptSlug?: string;
  departmentName?: string;
  totalPhotosOverall: number;
  totalVideosOverall?: number;
}

export default function MediaClientView({
  initialResult,
  currentDeptSlug = 'all',
  departmentName,
  totalPhotosOverall,
  totalVideosOverall = 0
}: MediaClientViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Tab selection: default to 'photos', but if 0 photos and videos overall, default to 'events'
  const urlTab = searchParams.get('type') as TabType | null;
  const initialTab: TabType =
    urlTab && ['photos', 'events', 'videos', 'others'].includes(urlTab)
      ? urlTab
      : totalPhotosOverall > 0 || totalVideosOverall > 0
      ? 'photos'
      : 'events';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Sync tab with URL
  useEffect(() => {
    if (urlTab && ['photos', 'events', 'videos', 'others'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Department navigation
  const handleDeptChange = (newSlug: string) => {
    const targetPath = newSlug === 'all' ? '/media' : `/media/${newSlug}`;
    const params = new URLSearchParams(searchParams.toString());
    if (activeTab) params.set('type', activeTab);
    router.push(`${targetPath}?${params.toString()}`);
  };

  // Media items state & pagination
  const [items, setItems] = useState<PublicMediaItem[]>(initialResult.items);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialResult.nextCursor);
  const [hasMore, setHasMore] = useState<boolean>(initialResult.hasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Separate Photos and Videos
  const photoItems = useMemo(
    () => items.filter((item) => item.mediaType === 'photo' || !item.mediaType),
    [items]
  );
  const videoItems = useMemo(
    () => items.filter((item) => item.mediaType === 'video'),
    [items]
  );

  // Update items if initialResult changes (e.g. on navigation)
  useEffect(() => {
    setItems(initialResult.items);
    setNextCursor(initialResult.nextCursor);
    setHasMore(initialResult.hasMore);
  }, [initialResult]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const res = await loadMorePublicMedia({
        departmentSlug: currentDeptSlug !== 'all' ? currentDeptSlug : undefined,
        cursor: nextCursor,
        limit: 24
      });

      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error('Failed to load more media items', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Photo Lightbox modal state
  const [photoLightboxIndex, setPhotoLightboxIndex] = useState<number | null>(null);

  const activePhotoItem = useMemo(() => {
    if (photoLightboxIndex === null || photoLightboxIndex < 0 || photoLightboxIndex >= photoItems.length) {
      return null;
    }
    return photoItems[photoLightboxIndex];
  }, [photoLightboxIndex, photoItems]);

  const handleOpenPhotoLightbox = (index: number) => {
    setPhotoLightboxIndex(index);
  };

  const handleClosePhotoLightbox = useCallback(() => {
    setPhotoLightboxIndex(null);
  }, []);

  const handleNextPhoto = useCallback(() => {
    if (photoItems.length === 0) return;
    setPhotoLightboxIndex((prev) => (prev !== null ? (prev + 1) % photoItems.length : 0));
  }, [photoItems.length]);

  const handlePrevPhoto = useCallback(() => {
    if (photoItems.length === 0) return;
    setPhotoLightboxIndex((prev) => (prev !== null ? (prev - 1 + photoItems.length) % photoItems.length : 0));
  }, [photoItems.length]);

  // Video Player modal state (plays directly on our website!)
  const [videoModalIndex, setVideoModalIndex] = useState<number | null>(null);

  const activeVideoItem = useMemo(() => {
    if (videoModalIndex === null || videoModalIndex < 0 || videoModalIndex >= videoItems.length) {
      return null;
    }
    return videoItems[videoModalIndex];
  }, [videoModalIndex, videoItems]);

  const handleOpenVideoModal = (index: number) => {
    setVideoModalIndex(index);
  };

  const handleCloseVideoModal = useCallback(() => {
    setVideoModalIndex(null);
  }, []);

  const handleNextVideo = useCallback(() => {
    if (videoItems.length === 0) return;
    setVideoModalIndex((prev) => (prev !== null ? (prev + 1) % videoItems.length : 0));
  }, [videoItems.length]);

  const handlePrevVideo = useCallback(() => {
    if (videoItems.length === 0) return;
    setVideoModalIndex((prev) => (prev !== null ? (prev - 1 + videoItems.length) % videoItems.length : 0));
  }, [videoItems.length]);

  // Keyboard navigation for Lightboxes
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (photoLightboxIndex !== null) handleClosePhotoLightbox();
        if (videoModalIndex !== null) handleCloseVideoModal();
      } else if (e.key === 'ArrowRight') {
        if (photoLightboxIndex !== null) handleNextPhoto();
        if (videoModalIndex !== null) handleNextVideo();
      } else if (e.key === 'ArrowLeft') {
        if (photoLightboxIndex !== null) handlePrevPhoto();
        if (videoModalIndex !== null) handlePrevVideo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    photoLightboxIndex,
    videoModalIndex,
    handleClosePhotoLightbox,
    handleCloseVideoModal,
    handleNextPhoto,
    handlePrevPhoto,
    handleNextVideo,
    handlePrevVideo
  ]);

  return (
    <div className="section-inner relative">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP TABS: Photos | Events | Videos | Others */}
      {/* ───────────────────────────────────────────────────────────── */}
      <nav aria-label="Media Tabs" className="mb-8">
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => handleTabChange('photos')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all shadow-sm ${
              activeTab === 'photos'
                ? 'bg-cyan-600 text-white shadow-cyan-600/20'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Camera size={16} />
            <span>Photos</span>
            {(photoItems.length > 0 || totalPhotosOverall > 0) && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  activeTab === 'photos' ? 'bg-cyan-700 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {photoItems.length > 0 ? photoItems.length : totalPhotosOverall}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('events')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all shadow-sm ${
              activeTab === 'events'
                ? 'bg-cyan-600 text-white shadow-cyan-600/20'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Calendar size={16} />
            <span>Events</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('videos')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all shadow-sm ${
              activeTab === 'videos'
                ? 'bg-cyan-600 text-white shadow-cyan-600/20'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Film size={16} />
            <span>Videos</span>
            {(videoItems.length > 0 || totalVideosOverall > 0) && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  activeTab === 'videos' ? 'bg-cyan-700 text-white' : 'bg-red-50 text-red-600 border border-red-100'
                }`}
              >
                {videoItems.length > 0 ? videoItems.length : totalVideosOverall}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('others')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all shadow-sm ${
              activeTab === 'others'
                ? 'bg-cyan-600 text-white shadow-cyan-600/20'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <FolderOpen size={16} />
            <span>Others</span>
          </button>
        </div>
      </nav>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SECOND FILTER: Department Chips (Hidden on Events tab) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab !== 'events' && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={14} className="text-cyan-600" />
              Filter by Department
            </span>
            {currentDeptSlug !== 'all' && (
              <button
                type="button"
                onClick={() => handleDeptChange('all')}
                className="text-xs text-cyan-600 font-semibold hover:underline"
              >
                Show All Departments
              </button>
            )}
          </div>

          {/* Department Chips container */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
            {ALL_DEPARTMENT_OPTIONS.map((dept) => {
              const isSelected =
                (dept.slug === 'all' && (!currentDeptSlug || currentDeptSlug === 'all')) ||
                currentDeptSlug === dept.slug;

              return (
                <button
                  key={dept.slug}
                  type="button"
                  onClick={() => handleDeptChange(dept.slug)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-cyan-600 border-cyan-600 text-white shadow-sm'
                      : 'bg-white border-gray-200/80 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {dept.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. TAB CONTENTS */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* A. PHOTOS TAB */}
      {activeTab === 'photos' && (
        <div>
          {photoItems.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-gray-200/80 shadow-sm max-w-lg mx-auto p-8">
              <div className="w-16 h-16 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-4">
                <Camera size={32} />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {currentDeptSlug !== 'all'
                  ? `No photos published for ${departmentName || currentDeptSlug}`
                  : 'No photos currently published'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-6">
                Photographs from activities and events will appear here once published by department staff.
              </p>
              {currentDeptSlug !== 'all' && (
                <button
                  type="button"
                  onClick={() => handleDeptChange('all')}
                  className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-700"
                >
                  View All Departments
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Responsive Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {photoItems.map((item, index) => {
                  // Thumbnail URL with Cloudinary transformation: w_600, q_auto
                  const thumbUrl = item.imageUrl.replace('/upload/', '/upload/w_600,q_auto/');

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenPhotoLightbox(index)}
                      className="group cursor-pointer bg-white rounded-2xl border border-gray-200/70 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenPhotoLightbox(index);
                        }
                      }}
                    >
                      {/* Image container with fixed aspect ratio to eliminate layout shift */}
                      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                        <img
                          src={thumbUrl}
                          alt={item.title}
                          loading="lazy"
                          width={item.width || 600}
                          height={item.height || 450}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Department chip overlay */}
                        <div className="absolute bottom-2 left-2 right-2">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-black/60 text-white backdrop-blur-md truncate max-w-full">
                            {item.departmentName}
                          </span>
                        </div>
                      </div>

                      {/* Content details */}
                      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                        <h4
                          className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-cyan-600 transition-colors"
                          title={item.title}
                        >
                          {item.title}
                        </h4>
                        <div className="mt-2 text-[11px] text-gray-500 flex items-center justify-between">
                          <span>{item.publishedDate}</span>
                          <span className="text-cyan-600 font-semibold group-hover:underline">View</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  >
                    {isLoadingMore && <Loader2 size={16} className="animate-spin text-cyan-600" />}
                    <span>{isLoadingMore ? 'Loading more photos...' : 'Load More Photos'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* B. EVENTS TAB (Existing Events Content Unchanged) */}
      {activeTab === 'events' && (
        <div>
          <MediaEventsContent />
        </div>
      )}

      {/* C. VIDEOS TAB (Plays directly on our site via embedded modal player!) */}
      {activeTab === 'videos' && (
        <div>
          {videoItems.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-gray-200/80 shadow-sm max-w-lg mx-auto p-8">
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl">
                🎬
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {currentDeptSlug !== 'all'
                  ? `No videos published for ${departmentName || currentDeptSlug}`
                  : 'No videos currently published'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-6">
                Official YouTube videos, documentaries, and patient testimonials will appear here once published.
              </p>
              {currentDeptSlug !== 'all' && (
                <button
                  type="button"
                  onClick={() => handleDeptChange('all')}
                  className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-700"
                >
                  View All Departments
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Responsive Video Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {videoItems.map((video, vIndex) => {
                  const thumb =
                    video.imageUrl ||
                    (video.youtubeVideoId
                      ? `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg`
                      : '/images/placeholder-video.webp');

                  return (
                    <div
                      key={video.id}
                      onClick={() => handleOpenVideoModal(vIndex)}
                      className="group cursor-pointer bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenVideoModal(vIndex);
                        }
                      }}
                    >
                      {/* 16:9 Thumbnail with Center Play Overlay */}
                      <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                        <img
                          src={thumb}
                          alt={video.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-95 group-hover:opacity-100"
                        />

                        {/* Subtle dark gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Center Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-600/95 text-white flex items-center justify-center shadow-xl transform group-hover:scale-115 group-hover:bg-red-600 transition-all">
                            <Play size={24} className="fill-current translate-x-0.5" />
                          </div>
                        </div>

                        {/* Top YouTube Badge */}
                        <div className="absolute top-2.5 right-2.5">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/80 text-white backdrop-blur-md border border-white/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            YouTube
                          </span>
                        </div>

                        {/* Bottom Department Chip */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5">
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-black/70 text-white backdrop-blur-md truncate max-w-full">
                            {video.departmentName}
                          </span>
                        </div>
                      </div>

                      {/* Video Details */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <h4
                          className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-cyan-600 transition-colors"
                          title={video.title}
                        >
                          {video.title}
                        </h4>
                        <div className="mt-3 text-[11px] text-gray-500 flex items-center justify-between">
                          <span>{video.publishedDate}</span>
                          <span className="text-cyan-600 font-bold inline-flex items-center gap-1 group-hover:underline">
                            Watch Video &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  >
                    {isLoadingMore && <Loader2 size={16} className="animate-spin text-cyan-600" />}
                    <span>{isLoadingMore ? 'Loading more videos...' : 'Load More Videos'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* D. OTHERS TAB (Media Kits & Publications) */}
      {activeTab === 'others' && (
        <div className="text-center py-20 sm:py-24 max-w-md mx-auto px-4 bg-white rounded-3xl border border-gray-200/80 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-4 text-2xl">
            📁
          </div>
          <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-2">Media Kits & Publications</h3>
          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-4">
            Official press kits, high-resolution logos, and downloadable reports will appear in this section.
          </p>
          <span className="inline-block px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 text-xs font-semibold">
            Coming Soon
          </span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. PHOTO LIGHTBOX MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activePhotoItem && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          onClick={handleClosePhotoLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={activePhotoItem.title}
        >
          <div
            className="relative max-w-5xl w-full max-h-[95vh] flex flex-col rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="px-5 py-3 border-b border-zinc-800/80 flex items-center justify-between text-white bg-zinc-900/60 backdrop-blur-md">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400">
                  {activePhotoItem.departmentName}
                </span>
                <span className="text-xs text-zinc-400">&bull; {activePhotoItem.publishedDate}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClosePhotoLightbox}
                  className="p-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main Image View */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] max-h-[70vh] p-2">
              <img
                src={activePhotoItem.imageUrl.replace('/upload/', '/upload/w_1600,q_auto/')}
                alt={activePhotoItem.title}
                className="max-h-full max-w-full object-contain rounded-lg"
              />

              {/* Prev Button */}
              {photoItems.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevPhoto}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all border border-white/10"
                  title="Previous photo (Left arrow)"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {/* Next Button */}
              {photoItems.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextPhoto}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all border border-white/10"
                  title="Next photo (Right arrow)"
                >
                  <ChevronRight size={22} />
                </button>
              )}
            </div>

            {/* Bottom Caption */}
            <div className="p-4 sm:p-5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-white gap-4">
              <p className="text-sm sm:text-base font-semibold leading-snug">{activePhotoItem.title}</p>
              {photoItems.length > 1 && photoLightboxIndex !== null && (
                <span className="text-xs text-zinc-400 whitespace-nowrap">
                  {photoLightboxIndex + 1} / {photoItems.length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. ON-SITE EMBEDDED YOUTUBE VIDEO PLAYER MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeVideoItem && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          onClick={handleCloseVideoModal}
          role="dialog"
          aria-modal="true"
          aria-label={activeVideoItem.title}
        >
          <div
            className="relative max-w-4xl w-full max-h-[95vh] flex flex-col rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="px-5 py-3 border-b border-zinc-800/80 flex items-center justify-between text-white bg-zinc-900/60 backdrop-blur-md">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                  {activeVideoItem.departmentName}
                </span>
                <span className="text-xs text-zinc-400">&bull; {activeVideoItem.publishedDate}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseVideoModal}
                  className="p-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Embedded 16:9 Responsive YouTube Player */}
            <div className="relative aspect-video w-full bg-black">
              {activeVideoItem.youtubeVideoId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeVideoItem.youtubeVideoId}?autoplay=1&rel=0`}
                  title={activeVideoItem.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  Video preview unavailable
                </div>
              )}
            </div>

            {/* Bottom Controls & YouTube External Link */}
            <div className="p-4 sm:p-5 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-semibold leading-snug truncate" title={activeVideoItem.title}>
                  {activeVideoItem.title}
                </h3>
                {videoItems.length > 1 && videoModalIndex !== null && (
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Video {videoModalIndex + 1} of {videoItems.length}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {/* Previous Video */}
                {videoItems.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevVideo}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                    title="Previous video"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}

                {/* Next Video */}
                {videoItems.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNextVideo}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                    title="Next video"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}

                {/* Watch on YouTube button (Direct external link) */}
                <a
                  href={
                    activeVideoItem.externalUrl ||
                    `https://www.youtube.com/watch?v=${activeVideoItem.youtubeVideoId}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <ExternalLink size={14} />
                  <span>Watch on YouTube</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
