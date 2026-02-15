// src/app/media/page.tsx
// ============================================================================
// MEDIA PAGE - Videos, photos, and events gallery
// Optimized for SEO, mobile responsiveness, and code maintainability
// ============================================================================

'use client';

import { useMemo, useRef, useState, useCallback, useEffect, memo } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/ui';
import { cn } from '@/lib/utils';

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
    youtubeId: '6NLggVF0y5g',
    duration: '0:41',
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
    title: 'Travel & Tours — Foreign Job Opportunities',
    category: 'services',
    department: 'Travel & Tours',
    youtubeId: '4hO88pju3CM',
    duration: '1:17',
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

const cardClass =
  'relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm hover:shadow-xl hover:shadow-primary-500/10 hover:border-primary-300 transition-all duration-500 hover:-translate-y-1.5 group';
const cardOverlayClass =
  'pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50/10 via-white/50 to-success-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500';

// ============================================================================
// SUB-COMPONENTS - Memoized for performance
// ============================================================================

const VideoCard = memo(({ video, index, onClick }: { video: Video, index: number, onClick: (id: number) => void }) => {
  const thumbnailUrl = video.youtubeId === 'placeholder'
    ? null
    : `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;

  return (
    <article
      className="animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
      itemScope
      itemType="https://schema.org/VideoObject"
    >
      <button
        onClick={() => onClick(video.id)}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-2xl"
        aria-label={`Play video: ${video.title}`}
      >
        <div className={cardClass}>
          <div className={cardOverlayClass} />
          <div className="relative p-3 sm:p-4 pb-4 sm:pb-5">
            {/* Video Thumbnail */}
            <div className="relative aspect-video rounded-lg overflow-hidden mb-3 flex items-center justify-center bg-neutral-900 group">
              {thumbnailUrl ? (
                <>
                  <img
                    src={thumbnailUrl}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-900 to-neutral-900 opacity-60" />
              )}

              <div className="relative z-10 flex items-center justify-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center group-hover:bg-primary-500/40 group-hover:scale-110 transition-all duration-300 backdrop-blur-sm shadow-xl">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white font-medium backdrop-blur-sm z-10">
                ⏱ {video.duration}
              </div>
            </div>

            <span className="text-[10px] sm:text-xs font-bold text-success-600 uppercase tracking-widest">
              {video.department}
            </span>
            <h4 className="font-display font-bold text-sm sm:text-base mt-1 text-neutral-900 group-hover:text-primary-600 transition-colors line-clamp-2">
              {video.title}
            </h4>
            <p className="text-[11px] sm:text-xs text-neutral-600 mt-2 line-clamp-2 leading-relaxed">
              {video.highlight}
            </p>
          </div>
        </div>
      </button>
    </article>
  );
});
VideoCard.displayName = 'VideoCard';

const PhotoCard = memo(({ photo, index, onClick }: { photo: Photo, index: number, onClick: (id: number) => void }) => (
  <article
    className="animate-fade-up"
    style={{ animationDelay: `${index * 50}ms` }}
    itemScope
    itemType="https://schema.org/Photograph"
  >
    <button
      onClick={() => onClick(photo.id)}
      className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-2xl"
      aria-label={`View photo: ${photo.title}`}
    >
      <div className={cardClass}>
        <div className={cardOverlayClass} />
        <div className="relative p-3 sm:p-4 pb-4 sm:pb-5">
          <div className="relative aspect-square sm:aspect-video rounded-lg overflow-hidden mb-3 flex items-center justify-center bg-neutral-100 group-hover:scale-[1.02] transition-transform duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-50" />
            <div className="relative z-10 flex items-center justify-center text-3xl sm:text-4xl filter grayscale group-hover:grayscale-0 transition-all duration-500" aria-hidden="true">
              🏥
            </div>
          </div>

          <span className="text-[10px] sm:text-xs font-bold text-primary-600 uppercase tracking-widest">
            {photo.category}
          </span>
          <h4 className="font-display font-bold text-sm sm:text-base mt-1 text-neutral-900 group-hover:text-primary-600 transition-colors line-clamp-2">
            {photo.title}
          </h4>
          <p className="text-[11px] sm:text-xs text-neutral-600 mt-2 line-clamp-2 leading-relaxed">
            {photo.caption}
          </p>
        </div>
      </div>
    </button>
  </article>
));
PhotoCard.displayName = 'PhotoCard';

const VideoModal = memo(({
  video,
  onClose,
  onNext,
  onPrev,
  onFullscreen,
  containerRef
}: {
  video: Video,
  onClose: () => void,
  onNext: () => void,
  onPrev: () => void,
  onFullscreen: () => void,
  containerRef: React.RefObject<HTMLDivElement>
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="video-modal-title"
  >
    <div
      className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl animate-fade-up overflow-hidden max-h-[95vh] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-primary-500 via-primary-600 to-success-500" aria-hidden="true" />

      <div className="p-5 sm:p-8 lg:p-10 overflow-y-auto">
        <div className="flex justify-between items-start gap-4 mb-6 sm:mb-8">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-success-50 text-success-700 border border-success-100 uppercase tracking-widest">
                {video.department}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-primary-50 text-primary-700 border border-primary-100 uppercase tracking-widest">
                {video.category}
              </span>
            </div>
            <h3 id="video-modal-title" className="font-display font-bold text-neutral-900 text-lg sm:text-2xl md:text-3xl leading-tight">
              {video.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-all hover:scale-110 active:scale-95"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr,1.2fr] gap-6 lg:gap-10 items-start">
          <div className="space-y-4">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl group/modal" ref={containerRef}>
              {video.youtubeId !== 'placeholder' ? (
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-neutral-950 to-success-900 opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-white hover:bg-primary-500/40 hover:scale-110 transition-all duration-300 backdrop-blur-md shadow-2xl ring-4 ring-white/10">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 ml-1.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  </div>
                </>
              )}

              <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover/modal:opacity-100 transition-all border border-white/10 z-20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover/modal:opacity-100 transition-all border border-white/10 z-20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {["High Definition", "Sign Language (Planned)", "English Subtitles"].map(tag => (
                <span key={tag} className="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-600 text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-neutral-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-neutral-50 to-neutral-100/50 border border-neutral-200/60 shadow-inner">
              <h4 className="font-display font-bold text-neutral-900 text-sm sm:text-base mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                Featured Highlight
              </h4>
              <p className="text-neutral-700 text-sm sm:text-base leading-relaxed italic">
                "{video.highlight}"
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="space-y-1">
                <span className="text-neutral-500 font-bold uppercase tracking-widest text-[9px]">📍 Location</span>
                <p className="font-bold text-neutral-900">Khan Hub {video.department}</p>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-500 font-bold uppercase tracking-widest text-[9px]">⏱ Duration</span>
                <p className="font-bold text-neutral-900">{video.duration} Minutes</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={onFullscreen} className="btn-primary w-full justify-center">⛶ Fullscreen</button>
              <button className="btn-secondary w-full justify-center bg-white border-2 border-primary-500 text-primary-600 hover:bg-primary-50 font-bold">🔗 Share Story</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
));
VideoModal.displayName = 'VideoModal';

const PhotoModal = memo(({
  photo,
  onClose,
  onNext,
  onPrev,
  onFullscreen,
  containerRef
}: {
  photo: Photo,
  onClose: () => void,
  onNext: () => void,
  onPrev: () => void,
  onFullscreen: () => void,
  containerRef: React.RefObject<HTMLDivElement>
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="photo-modal-title"
  >
    <div
      className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl animate-fade-up overflow-hidden max-h-[95vh] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-success-500 via-success-600 to-primary-500" aria-hidden="true" />

      <div className="p-5 sm:p-8 lg:p-10 overflow-y-auto">
        <div className="flex justify-between items-start gap-4 mb-6 sm:mb-8">
          <div className="flex-1 min-w-0">
            <span className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-primary-50 text-primary-700 border border-primary-100 uppercase tracking-widest">
              {photo.category}
            </span>
            <h3 id="photo-modal-title" className="font-display font-bold text-neutral-900 text-lg sm:text-2xl md:text-3xl mt-2 leading-tight">
              {photo.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-all hover:scale-110 active:scale-95"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr,1.2fr] gap-6 lg:gap-10 items-start">
          <div className="space-y-4">
            <div className="relative aspect-square sm:aspect-video rounded-2xl overflow-hidden bg-neutral-100 shadow-2xl group/modal" ref={containerRef}>
              <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center text-5xl sm:text-7xl">🏥</div>
              <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/40 hover:bg-white/80 text-neutral-900 flex items-center justify-center backdrop-blur-md opacity-0 group-hover/modal:opacity-100 transition-all border border-black/5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/40 hover:bg-white/80 text-neutral-900 flex items-center justify-center backdrop-blur-md opacity-0 group-hover/modal:opacity-100 transition-all border border-black/5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-neutral-50 to-neutral-100/50 border border-neutral-200/60 shadow-inner">
              <h4 className="font-display font-bold text-neutral-900 text-sm sm:text-base mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                Context
              </h4>
              <p className="text-neutral-700 text-sm sm:text-base leading-relaxed">
                {photo.caption}
              </p>
            </div>

            <button onClick={onFullscreen} className="btn-primary w-full justify-center">⛶ View Full Image</button>
          </div>
        </div>
      </div>
    </div>
  </div>
));
PhotoModal.displayName = 'PhotoModal';

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
      document.exitFullscreen().catch(() => { });
    } else {
      el.requestFullscreen().catch(() => { });
    }
  }, []);

  const handlePhotoFullscreen = useCallback(() => {
    const el = photoContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    } else {
      el.requestFullscreen().catch(() => { });
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
      <article itemScope itemType="https://schema.org/MediaGallery" className="overflow-x-hidden">
        {/* Hero Section - Cinematic Background version */}
        <PageHero
          backgroundImage="/images/media-hero.webp"
          badge="Media Gallery"
          title="Our Stories in Action"
          subtitle="Watch real stories from our clinics, institutes, and welfare centers — told through the people we serve."
          cta={
            <Link href="#media-heading" className="btn-success">
              📽️ Browse Gallery
            </Link>
          }
        >
          <Link href="/donate" className="btn-secondary bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20">
            💝 Support Our Work
          </Link>
        </PageHero>

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
                <div className="flex justify-center gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0 px-4 sm:px-0 scrollbar-hide">
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
                        className={cn(
                          "inline-flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider px-5 sm:px-8 py-2.5 sm:py-3.5 transition-all duration-300 border-2 whitespace-nowrap",
                          isActive
                            ? "bg-neutral-900 border-neutral-900 text-white shadow-xl shadow-neutral-900/10 scale-105"
                            : "bg-white border-neutral-100 text-neutral-600 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50/30"
                        )}
                        aria-pressed={isActive}
                      >
                        <span aria-hidden="true">{label.emoji}</span>
                        <span>{label.text}</span>
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
                  <nav aria-label="Video categories filter" className="mb-8 sm:mb-10">
                    <div className="flex flex-wrap justify-center gap-2 px-2">
                      {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                              "inline-flex items-center justify-center rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 sm:px-5 py-2 transition-all duration-300 border-2",
                              isActive
                                ? "bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20"
                                : "bg-white border-neutral-100 text-neutral-500 hover:border-primary-200 hover:text-primary-600"
                            )}
                            aria-pressed={isActive}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </nav>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 sm:gap-8">
                    {filteredVideos.map((video, index) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        index={index}
                        onClick={openVideo}
                      />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 sm:gap-8">
                    {PHOTOS.map((photo, index) => (
                      <PhotoCard
                        key={photo.id}
                        photo={photo}
                        index={index}
                        onClick={openPhoto}
                      />
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

      {/* Modals */}
      {selectedVideo && (
        <VideoModal
          video={selectedVideo}
          onClose={closeVideoModal}
          onNext={goNextVideo}
          onPrev={goPrevVideo}
          onFullscreen={handleVideoFullscreen}
          containerRef={videoContainerRef}
        />
      )}

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={closePhotoModal}
          onNext={goNextPhoto}
          onPrev={goPrevPhoto}
          onFullscreen={handlePhotoFullscreen}
          containerRef={photoContainerRef}
        />
      )}
    </>
  );
}