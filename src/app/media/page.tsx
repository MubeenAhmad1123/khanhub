// src/app/media/page.tsx
// ============================================================================
// MEDIA PAGE - Videos, photos, and events gallery
// Optimized for SEO, mobile responsiveness, and code maintainability
// ============================================================================

'use client';

import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import type { Metadata } from 'next';
import { PageHero } from '@/components/ui';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
type MediaTab = 'videos' | 'photos' | 'events';

type VideoCategory = 'healthcare' | 'education' | 'welfare' | 'services' | 'digital';

type Video = {
  id: number;
  title: string;
  category: VideoCategory;
  department: string;
  youtubeId: string;
  duration: string;
  highlight: string;
};

type Photo = {
  id: number;
  title: string;
  caption: string;
  category: string;
};

// ============================================================================
// DATA CONSTANTS
// ============================================================================
const VIDEOS: readonly Video[] = [
  {
    id: 1,
    title: 'Medical Center — Free Health Camp 2024',
    category: 'healthcare',
    department: 'Medical Center',
    youtubeId: 'placeholder',
    duration: '3:45',
    highlight: 'Free consultations, lab tests, and medicines for low-income families.',
  },
  {
    id: 2,
    title: 'Education Center — Graduation Ceremony',
    category: 'education',
    department: 'Education Center',
    youtubeId: 'placeholder',
    duration: '2:30',
    highlight: 'Celebrating students who completed scholarship and skills programs.',
  },
  {
    id: 3,
    title: 'Sukoon Center — Mental Health Awareness Day',
    category: 'welfare',
    department: 'Sukoon Center',
    youtubeId: 'placeholder',
    duration: '4:10',
    highlight: 'Workshops on stress, trauma, and emotional wellbeing for the community.',
  },
  {
    id: 4,
    title: 'Skills Center — IT Training Program Launch',
    category: 'education',
    department: 'Skills Center',
    youtubeId: 'placeholder',
    duration: '3:05',
    highlight: 'Launch of a new IT program designed for youth employment.',
  },
  {
    id: 5,
    title: 'Job Center — Employment Fair Highlights',
    category: 'services',
    department: 'Job Center',
    youtubeId: 'placeholder',
    duration: '5:20',
    highlight: 'Employers, interviews, and real job offers in one place.',
  },
  {
    id: 6,
    title: 'Welfare — Ration Distribution Drive',
    category: 'welfare',
    department: 'Welfare Organization',
    youtubeId: 'placeholder',
    duration: '2:55',
    highlight: 'Monthly ration packages for families affected by inflation.',
  },
  {
    id: 7,
    title: 'Prosthetics — Life-Changing Moment',
    category: 'healthcare',
    department: 'Prosthetic Services',
    youtubeId: 'placeholder',
    duration: '4:45',
    highlight: 'Behind the scenes of fitting a new prosthetic limb.',
  },
  {
    id: 8,
    title: 'Transport — Behind the Scenes',
    category: 'services',
    department: 'Transport Services',
    youtubeId: 'placeholder',
    duration: '3:15',
    highlight: 'How emergency and patient transport works 24/7.',
  },
  {
    id: 9,
    title: 'Digital Marketing — Brand Story',
    category: 'digital',
    department: 'Digital Marketing',
    youtubeId: 'placeholder',
    duration: '2:40',
    highlight: 'Building awareness so more people can access help on time.',
  },
  {
  id: 10,
  title: 'Rehabilitation — Recovery Journey',
  category: 'healthcare',
  department: 'Rehabilitation',
  youtubeId: 'placeholder',
  duration: '3:55',
  highlight: "A patient's story from injury to recovery with rehab support.",
},

  {
    id: 11,
    title: 'Institute of Health Sciences — Orientation',
    category: 'education',
    department: 'Health Sciences',
    youtubeId: 'placeholder',
    duration: '3:10',
    highlight: 'Orientation for new batches joining health science programs.',
  },
  {
    id: 12,
    title: 'Travel & Tours — Healing Trip Documentary',
    category: 'services',
    department: 'Travel & Tours',
    youtubeId: 'placeholder',
    duration: '5:00',
    highlight: 'A healing trip for patients and families needing a mental break.',
  },
] as const;

const CATEGORIES = ['All', 'Healthcare', 'Education', 'Welfare', 'Services', 'Digital'] as const;

const PHOTOS: readonly Photo[] = [
  {
    id: 1,
    title: 'Free Health Camp',
    caption: 'Doctors and volunteers serving patients at the community health camp.',
    category: 'Healthcare',
  },
  {
    id: 2,
    title: 'Graduation Day',
    caption: 'Students completing scholarship and skill programs.',
    category: 'Education',
  },
  {
    id: 3,
    title: 'Ration Distribution',
    caption: 'Essential food packages for families in need.',
    category: 'Welfare',
  },
  {
    id: 4,
    title: 'Rehabilitation Session',
    caption: 'Physiotherapy in action at the rehabilitation center.',
    category: 'Healthcare',
  },
  {
    id: 5,
    title: 'Skills Training Lab',
    caption: 'Youth learning digital skills for better jobs.',
    category: 'Education',
  },
  {
    id: 6,
    title: 'Community Awareness Event',
    caption: 'Mental health awareness and support circle.',
    category: 'Welfare',
  },
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const getCategoryDescription = (category: VideoCategory): string => {
  const descriptions: Record<VideoCategory, string> = {
    healthcare: 'Healthcare & clinical services',
    education: 'Education & skills',
    welfare: 'Social welfare & support',
    services: 'Support services',
    digital: 'Digital & awareness',
  };
  return descriptions[category];
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function MediaPage() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const [activeTab, setActiveTab] = useState<MediaTab>('videos');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);
  
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const photoContainerRef = useRef<HTMLDivElement | null>(null);

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================
  const filteredVideos = useMemo(
    () =>
      activeCategory === 'All'
        ? VIDEOS
        : VIDEOS.filter(
            (v) => v.category.toLowerCase() === activeCategory.toLowerCase()
          ),
    [activeCategory]
  );

  const selectedVideoIndex = useMemo(
    () =>
      selectedVideoId == null
        ? -1
        : filteredVideos.findIndex((v) => v.id === selectedVideoId),
    [filteredVideos, selectedVideoId]
  );

  const selectedVideo =
    selectedVideoIndex >= 0 && selectedVideoIndex < filteredVideos.length
      ? filteredVideos[selectedVideoIndex]
      : null;

  const selectedPhotoIndex = useMemo(
    () =>
      selectedPhotoId == null
        ? -1
        : PHOTOS.findIndex((p) => p.id === selectedPhotoId),
    [selectedPhotoId]
  );

  const selectedPhoto =
    selectedPhotoIndex >= 0 && selectedPhotoIndex < PHOTOS.length
      ? PHOTOS[selectedPhotoIndex]
      : null;

  // ============================================================================
  // EVENT HANDLERS - Memoized with useCallback
  // ============================================================================
  const openVideo = useCallback((id: number) => setSelectedVideoId(id), []);
  const closeVideoModal = useCallback(() => setSelectedVideoId(null), []);

  const openPhoto = useCallback((id: number) => setSelectedPhotoId(id), []);
  const closePhotoModal = useCallback(() => setSelectedPhotoId(null), []);

  const goNextVideo = useCallback(() => {
    if (!filteredVideos.length) return;
    if (selectedVideoIndex === -1) {
      setSelectedVideoId(filteredVideos[0].id);
      return;
    }
    const nextIndex = (selectedVideoIndex + 1) % filteredVideos.length;
    setSelectedVideoId(filteredVideos[nextIndex].id);
  }, [filteredVideos, selectedVideoIndex]);

  const goPrevVideo = useCallback(() => {
    if (!filteredVideos.length) return;
    if (selectedVideoIndex === -1) {
      setSelectedVideoId(filteredVideos[0].id);
      return;
    }
    const prevIndex =
      (selectedVideoIndex - 1 + filteredVideos.length) % filteredVideos.length;
    setSelectedVideoId(filteredVideos[prevIndex].id);
  }, [filteredVideos, selectedVideoIndex]);

  const goNextPhoto = useCallback(() => {
    if (!PHOTOS.length) return;
    if (selectedPhotoIndex === -1) {
      setSelectedPhotoId(PHOTOS[0].id);
      return;
    }
    const nextIndex = (selectedPhotoIndex + 1) % PHOTOS.length;
    setSelectedPhotoId(PHOTOS[nextIndex].id);
  }, [selectedPhotoIndex]);

  const goPrevPhoto = useCallback(() => {
    if (!PHOTOS.length) return;
    if (selectedPhotoIndex === -1) {
      setSelectedPhotoId(PHOTOS[0].id);
      return;
    }
    const prevIndex =
      (selectedPhotoIndex - 1 + PHOTOS.length) % PHOTOS.length;
    setSelectedPhotoId(PHOTOS[prevIndex].id);
  }, [selectedPhotoIndex]);

  const handleVideoFullscreen = useCallback(() => {
    const el = videoContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  const handlePhotoFullscreen = useCallback(() => {
    const el = photoContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  // ============================================================================
  // KEYBOARD NAVIGATION
  // ============================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Video modal navigation
      if (selectedVideoId !== null) {
        if (e.key === 'Escape') {
          closeVideoModal();
        } else if (e.key === 'ArrowRight') {
          goNextVideo();
        } else if (e.key === 'ArrowLeft') {
          goPrevVideo();
        }
      }
      // Photo modal navigation
      if (selectedPhotoId !== null) {
        if (e.key === 'Escape') {
          closePhotoModal();
        } else if (e.key === 'ArrowRight') {
          goNextPhoto();
        } else if (e.key === 'ArrowLeft') {
          goPrevPhoto();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVideoId, selectedPhotoId, closeVideoModal, closePhotoModal, goNextVideo, goPrevVideo, goNextPhoto, goPrevPhoto]);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <>
      {/* Semantic HTML: article element for main content */}
      <article itemScope itemType="https://schema.org/MediaGallery">
        {/* Hero Section */}
        <PageHero
          badge="Media Gallery"
          title="Our Stories in Action"
          subtitle="Watch real stories from our clinics, institutes, and welfare centers — told through the people we serve."
        />

        {/* Main Media Section */}
        <section className="section bg-gradient-light" aria-labelledby="media-heading">
          <div className="section-inner relative">
            {/* Decorative background elements */}
            <div className="pointer-events-none absolute -top-20 -right-16 h-40 w-40 rounded-full bg-gradient-brand opacity-20 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-gradient-success opacity-20 blur-3xl" aria-hidden="true" />

            <div className="relative">
              <h2 id="media-heading" className="sr-only">Khan Hub Media Gallery</h2>

              {/* Tab Navigation - Mobile Optimized */}
              <nav aria-label="Media gallery tabs" className="mb-8 sm:mb-10">
                <div className="flex justify-center gap-2 sm:gap-3">
                  {(['videos', 'photos', 'events'] as const).map((tab) => {
                    const labels = {
                      videos: { emoji: '🎬', text: 'Videos' },
                      photos: { emoji: '📷', text: 'Photos' },
                      events: { emoji: '🎪', text: 'Events' },
                    };
                    const label = labels[tab];
                    const isActive = activeTab === tab;
                    
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider px-4 sm:px-5 py-2 sm:py-2.5 transition-all border min-h-[44px] ${
                          isActive
                            ? 'bg-gradient-brand text-white border-primary-600 shadow-primary-md'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary-300 hover:text-primary-600'
                        }`}
                        aria-pressed={isActive}
                        aria-label={`View ${label.text}`}
                      >
                        <span aria-hidden="true">{label.emoji}</span>
                        <span className="hidden sm:inline">{label.text}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>

              {/* Videos Tab Content */}
              {activeTab === 'videos' && (
                <div>
                  <h3 className="sr-only">Video Gallery</h3>
                  
                  {/* Category Filter - Mobile Optimized */}
                  <nav aria-label="Video categories filter" className="mb-6 sm:mb-8">
                    <div className="flex flex-wrap justify-center gap-2">
                      {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`inline-flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 transition-all border min-h-[36px] sm:min-h-[40px] ${
                              isActive
                                ? 'bg-primary-500 text-white border-primary-500 shadow-primary-sm'
                                : 'bg-white border-neutral-200 text-neutral-700 hover:border-primary-300 hover:text-primary-600'
                            }`}
                            aria-pressed={isActive}
                            aria-label={`Filter by ${cat}`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </nav>

                  {/* Video Grid - Responsive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                    {filteredVideos.map((video, index) => (
                      <article
                        key={video.id}
                        className="animate-fade-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                        itemScope
                        itemType="https://schema.org/VideoObject"
                      >
                        <button
                          onClick={() => openVideo(video.id)}
                          className="w-full text-left group"
                          aria-label={`Play video: ${video.title}`}
                        >
                          <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-neutral-sm hover:shadow-primary-md hover:-translate-y-1 transition-all duration-300">
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-success-50 opacity-90" />
                            <div className="relative p-3 sm:p-4 pb-4 sm:pb-5">
                              {/* Video Thumbnail */}
                              <div className="relative aspect-video rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-900 to-neutral-900" />
                                <div className="relative z-10 flex items-center justify-center">
                                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 border border-primary-300 flex items-center justify-center group-hover:bg-primary-500/30 transition-all">
                                    <svg
                                      className="w-6 h-6 sm:w-7 sm:h-7 text-primary-50 ml-0.5"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                      aria-hidden="true"
                                    >
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                </div>
                                {/* Duration Badge */}
                                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] sm:text-xs text-white font-medium">
                                  ⏱ {video.duration}
                                </div>
                              </div>

                              {/* Video Info */}
                              <span className="text-[11px] sm:text-xs font-semibold text-success-700 uppercase tracking-wide">
                                {video.department}
                              </span>
                              <h4 className="font-display font-semibold text-sm sm:text-base mt-1 text-neutral-900 group-hover:text-primary-600 transition-colors line-clamp-2" itemProp="name">
                                {video.title}
                              </h4>
                              <p className="text-[11px] sm:text-xs text-neutral-700 mt-1.5 sm:mt-2 line-clamp-2" itemProp="description">
                                {video.highlight}
                              </p>
                              
                              {/* Hidden metadata for SEO */}
                              <meta itemProp="duration" content={`PT${video.duration.replace(':', 'M')}S`} />
                              <meta itemProp="thumbnailUrl" content={`https://khanhub.com.pk/thumbnails/${video.youtubeId}.jpg`} />
                            </div>
                          </div>
                        </button>
                      </article>
                    ))}
                  </div>

                  {/* Empty State */}
                  {filteredVideos.length === 0 && (
                    <div className="text-center py-16 sm:py-20">
                      <div className="text-4xl sm:text-5xl mb-4" aria-hidden="true">🎬</div>
                      <h3 className="font-display font-semibold text-neutral-900 text-base sm:text-lg mb-2">
                        No videos found
                      </h3>
                      <p className="text-neutral-600 text-sm">
                        Try selecting a different category
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Photos Tab Content */}
              {activeTab === 'photos' && (
                <div className="space-y-6 sm:space-y-8">
                  <div className="text-center max-w-xl mx-auto px-4">
                    <div className="text-3xl sm:text-4xl mb-3" aria-hidden="true">📷</div>
                    <h3 className="font-display font-semibold text-neutral-900 text-base sm:text-lg md:text-xl">
                      Photo Gallery
                    </h3>
                    <p className="text-neutral-700 text-sm sm:text-base mt-2">
                      A visual snapshot from medical camps, rehabilitation, education programs, and
                      community welfare activities.
                    </p>
                  </div>

                  {/* Photo Grid - Responsive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                    {PHOTOS.map((photo, index) => (
                      <article
                        key={photo.id}
                        className="animate-fade-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                        itemScope
                        itemType="https://schema.org/Photograph"
                      >
                        <button
                          onClick={() => openPhoto(photo.id)}
                          className="w-full text-left group"
                          aria-label={`View photo: ${photo.title}`}
                        >
                          <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-neutral-sm hover:shadow-primary-md hover:-translate-y-1 transition-all duration-300">
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-success-50 opacity-90" />
                            <div className="relative p-3 sm:p-4 pb-4 sm:pb-5">
                              {/* Photo Placeholder */}
                              <div className="relative aspect-video rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-50" />
                                <div className="relative z-10 flex items-center justify-center text-3xl sm:text-4xl" aria-hidden="true">
                                  🏥
                                </div>
                              </div>
                              
                              {/* Photo Info */}
                              <span className="text-[11px] sm:text-xs font-semibold text-primary-700 uppercase tracking-wide">
                                {photo.category}
                              </span>
                              <h4 className="font-display font-semibold text-sm sm:text-base mt-1 text-neutral-900 group-hover:text-primary-600 transition-colors line-clamp-2" itemProp="name">
                                {photo.title}
                              </h4>
                              <p className="text-[11px] sm:text-xs text-neutral-700 mt-1.5 sm:mt-2 line-clamp-2" itemProp="caption">
                                {photo.caption}
                              </p>
                            </div>
                          </div>
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* Events Tab Content */}
              {activeTab === 'events' && (
                <div className="text-center py-20 sm:py-24 md:py-28 max-w-xl mx-auto px-4">
                  <div className="text-4xl sm:text-5xl mb-4 sm:mb-5" aria-hidden="true">🎪</div>
                  <h3 className="font-display font-semibold text-neutral-900 text-base sm:text-lg md:text-xl mb-3">
                    Events & Highlights
                  </h3>
                  <p className="text-neutral-700 text-sm sm:text-base leading-relaxed">
                    Media coverage, conferences, and on-ground activities will appear here with
                    replays, recaps, and key takeaways.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'MediaGallery',
              name: 'Khan Hub Media Gallery',
              description: 'Videos and photos from Khan Hub healthcare, education, and welfare programs',
              url: 'https://khanhub.com.pk/media',
              image: 'https://khanhub.com.pk/og-media.jpg',
            }),
          }}
        />
      </article>

      {/* ============================================================================ */}
      {/* VIDEO MODAL - Mobile Optimized */}
      {/* ============================================================================ */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeVideoModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-modal-title"
        >
          <div 
            className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl animate-fade-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Accent */}
            <div className="h-1 w-full bg-gradient-to-r from-primary-500 to-success-500" aria-hidden="true" />

            <div className="p-4 sm:p-6 lg:p-8 max-h-[90vh] overflow-y-auto">
              {/* Header - Mobile Responsive */}
              <div className="flex justify-between items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-success-50 text-success-700 border border-success-100">
                      {selectedVideo.department}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100">
                      {selectedVideo.category.toUpperCase()}
                    </span>
                  </div>
                  <h3 id="video-modal-title" className="font-display font-semibold text-neutral-900 text-base sm:text-lg md:text-xl leading-tight">
                    {selectedVideo.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-neutral-600 mt-1.5 sm:mt-2">
                    ⏱ {selectedVideo.duration} · Khan Hub Media
                  </p>
                </div>

                <button
                  onClick={closeVideoModal}
                  className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 text-base sm:text-lg font-bold transition-colors"
                  aria-label="Close video modal"
                >
                  ✕
                </button>
              </div>

              {/* Content Grid - Responsive Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] gap-4 sm:gap-6 items-start">
                {/* Video Player Area */}
                <div className="relative">
                  <div
                    ref={videoContainerRef}
                    className="relative aspect-video rounded-xl overflow-hidden border-2 border-neutral-200 bg-black"
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-900 via-neutral-900 to-success-900">
                      <button 
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 border-2 border-primary-300 flex items-center justify-center text-primary-50 hover:bg-primary-500/30 transition-all"
                        aria-label="Play video"
                      >
                        <svg
                          className="w-7 h-7 sm:w-9 sm:h-9 ml-1"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    </div>

                    {/* Navigation Buttons */}
                    <button
                      onClick={(e) => { e.stopPropagation(); goPrevVideo(); }}
                      className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/80 border border-white/40 text-white text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1 transition-all"
                      aria-label="Previous video"
                    >
                      ◀
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); goNextVideo(); }}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/80 border border-white/40 text-white text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1 transition-all"
                      aria-label="Next video"
                    >
                      ▶
                    </button>
                  </div>

                  {/* Video Tags - Mobile Responsive */}
                  <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 text-[10px] sm:text-[11px]">
                    <span className="px-2 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                      🎥 Patient & program stories
                    </span>
                    <span className="px-2 py-1 rounded-full bg-success-50 text-success-700 border border-success-100">
                      ✅ Real impact visuals
                    </span>
                    <span className="px-2 py-1 rounded-full bg-neutral-50 text-neutral-700 border border-neutral-200">
                      🔊 Voice-over & subtitles (planned)
                    </span>
                  </div>
                </div>

                {/* Video Details Sidebar */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5 space-y-3 sm:space-y-4">
                  <div>
                    <h4 className="font-display font-semibold text-neutral-900 text-sm sm:text-base mb-2">
                      Why this story matters
                    </h4>
                    <p className="text-neutral-800 text-xs sm:text-sm leading-relaxed">
                      {selectedVideo.highlight}
                    </p>
                  </div>

                  <div className="border-t border-neutral-200 my-3 sm:my-4" />

                  <div className="space-y-2 text-xs sm:text-sm text-neutral-700">
                    <p>
                      <span className="font-semibold">📍 Location:</span> Khan Hub{' '}
                      {selectedVideo.department}
                    </p>
                    <p>
                      <span className="font-semibold">🕒 Recorded during:</span> Program activity
                      (camp, session, or event)
                    </p>
                    <p>
                      <span className="font-semibold">🔁 Program type:</span>{' '}
                      {getCategoryDescription(selectedVideo.category)}
                    </p>
                  </div>

                  <div className="border-t border-neutral-200 my-3 sm:my-4" />

                  {/* Action Buttons - Mobile Responsive */}
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                    <button
                      onClick={handleVideoFullscreen}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 sm:py-3 shadow-primary-sm transition-all min-h-[44px]"
                    >
                      ⛶ Fullscreen
                    </button>
                    <button className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white border-2 border-primary-500 text-primary-600 hover:bg-primary-50 text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 sm:py-3 transition-all min-h-[44px]">
                      🔗 View on YouTube
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* PHOTO MODAL - Mobile Optimized */}
      {/* ============================================================================ */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closePhotoModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="photo-modal-title"
        >
          <div 
            className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl animate-fade-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Accent */}
            <div className="h-1 w-full bg-gradient-to-r from-primary-500 to-success-500" aria-hidden="true" />
            
            <div className="p-4 sm:p-6 lg:p-8 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex-1 min-w-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100">
                    {selectedPhoto.category}
                  </span>
                  <h3 id="photo-modal-title" className="font-display font-semibold text-neutral-900 text-base sm:text-lg md:text-xl mt-2">
                    {selectedPhoto.title}
                  </h3>
                </div>
                <button
                  onClick={closePhotoModal}
                  className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 text-base sm:text-lg font-bold transition-colors"
                  aria-label="Close photo modal"
                >
                  ✕
                </button>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] gap-4 sm:gap-6 items-start">
                {/* Photo Area */}
                <div className="relative">
                  <div
                    ref={photoContainerRef}
                    className="relative aspect-video rounded-xl overflow-hidden border-2 border-neutral-200 bg-black"
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-50">
                      <div className="text-4xl sm:text-5xl md:text-6xl" aria-hidden="true">🏥</div>
                    </div>

                    {/* Navigation Buttons */}
                    <button
                      onClick={(e) => { e.stopPropagation(); goPrevPhoto(); }}
                      className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/80 border border-white/40 text-white text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1 transition-all"
                      aria-label="Previous photo"
                    >
                      ◀
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); goNextPhoto(); }}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/80 border border-white/40 text-white text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1 transition-all"
                      aria-label="Next photo"
                    >
                      ▶
                    </button>
                  </div>

                  {/* Photo Tags */}
                  <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 text-[10px] sm:text-[11px]">
                    <span className="px-2 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                      🏥 Hospital & centers
                    </span>
                    <span className="px-2 py-1 rounded-full bg-success-50 text-success-700 border border-success-100">
                      🤝 Community programs
                    </span>
                  </div>
                </div>

                {/* Photo Details */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5 space-y-3 sm:space-y-4">
                  <div>
                    <h4 className="font-display font-semibold text-neutral-900 text-sm sm:text-base mb-2">
                      About this moment
                    </h4>
                    <p className="text-neutral-800 text-xs sm:text-sm leading-relaxed">
                      {selectedPhoto.caption}
                    </p>
                  </div>

                  <div className="border-t border-neutral-200 my-3 sm:my-4" />

                  <div className="space-y-2 text-xs sm:text-sm text-neutral-700">
                    <p>
                      <span className="font-semibold">📍 Captured at:</span> Khan Hub{' '}
                      {selectedPhoto.category} program
                    </p>
                    <p>
                      <span className="font-semibold">🎞 Type:</span> On-ground activity & patient
                      support
                    </p>
                  </div>

                  <div className="border-t border-neutral-200 my-3 sm:my-4" />

                  <button
                    onClick={handlePhotoFullscreen}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 sm:py-3 shadow-primary-sm transition-all min-h-[44px]"
                  >
                    ⛶ View full image
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}