'use client';

// src/app/media/page.tsx

import { useMemo, useRef, useState } from 'react';
import { PageHero } from '@/components/ui';

type MediaTab = 'videos' | 'photos' | 'events';

const VIDEOS = [
  {
    id: 1,
    title: 'Medical Center — Free Health Camp 2024',
    category: 'healthcare',
    department: 'Medical Center',
    youtubeId: 'placeholder',
    duration: '3:45',
    highlight: 'Free consultations, lab tests, and medicines for low‑income families.',
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
    highlight: 'A patient’s story from injury to recovery with rehab support.',
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
];

const CATEGORIES = ['All', 'Healthcare', 'Education', 'Welfare', 'Services', 'Digital'];

const PHOTOS = [
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
];

export default function MediaPage() {
  const [activeTab, setActiveTab] = useState<MediaTab>('videos');
  const [activeCategory, setCategory] = useState('All');
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const photoContainerRef = useRef<HTMLDivElement | null>(null);

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

  const openVideo = (id: number) => setSelectedVideoId(id);
  const closeVideoModal = () => setSelectedVideoId(null);

  const openPhoto = (id: number) => setSelectedPhotoId(id);
  const closePhotoModal = () => setSelectedPhotoId(null);

  const goNextVideo = () => {
    if (!filteredVideos.length) return;
    if (selectedVideoIndex === -1) {
      setSelectedVideoId(filteredVideos[0].id);
      return;
    }
    const nextIndex = (selectedVideoIndex + 1) % filteredVideos.length;
    setSelectedVideoId(filteredVideos[nextIndex].id);
  };

  const goPrevVideo = () => {
    if (!filteredVideos.length) return;
    if (selectedVideoIndex === -1) {
      setSelectedVideoId(filteredVideos[0].id);
      return;
    }
    const prevIndex =
      (selectedVideoIndex - 1 + filteredVideos.length) % filteredVideos.length;
    setSelectedVideoId(filteredVideos[prevIndex].id);
  };

  const goNextPhoto = () => {
    if (!PHOTOS.length) return;
    if (selectedPhotoIndex === -1) {
      setSelectedPhotoId(PHOTOS[0].id);
      return;
    }
    const nextIndex = (selectedPhotoIndex + 1) % PHOTOS.length;
    setSelectedPhotoId(PHOTOS[nextIndex].id);
  };

  const goPrevPhoto = () => {
    if (!PHOTOS.length) return;
    if (selectedPhotoIndex === -1) {
      setSelectedPhotoId(PHOTOS[0].id);
      return;
    }
    const prevIndex =
      (selectedPhotoIndex - 1 + PHOTOS.length) % PHOTOS.length;
    setSelectedPhotoId(PHOTOS[prevIndex].id);
  };

  const handleVideoFullscreen = () => {
    const el = videoContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  };

  const handlePhotoFullscreen = () => {
    const el = photoContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  };

  return (
    <>
      <PageHero
        badge="Media"
        title="Our Stories"
        subtitle="Watch real stories from our clinics, institutes, and welfare centers — told through the people we serve."
      />

      <section className="section bg-gradient-light">
        <div className="section-inner relative">
          <div className="pointer-events-none absolute -top-20 -right-16 h-40 w-40 rounded-full bg-gradient-brand opacity-20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-gradient-success opacity-20 blur-3xl" />

          <div className="relative">
            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-10">
              {(['videos', 'photos', 'events'] as const).map((tab) => {
                const label =
                  tab === 'videos' ? '🎬 Videos' : tab === 'photos' ? '📷 Photos' : '🎪 Events';
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`inline-flex items-center justify-center gap-1 rounded-full text-xs font-semibold uppercase tracking-wider px-5 py-2 transition-all border ${
                      isActive
                        ? 'bg-gradient-brand text-white border-primary-600 shadow-primary-md'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary-300 hover:text-primary-600'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Videos */}
            {activeTab === 'videos' && (
              <>
                {/* Category filter */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {CATEGORIES.map((cat) => {
                    const isActive = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`inline-flex items-center justify-center rounded-full text-xs font-semibold px-3.5 py-1.5 transition-all border ${
                          isActive
                            ? 'bg-primary-500 text-white border-primary-500 shadow-primary-sm'
                            : 'bg-white border-neutral-200 text-neutral-700 hover:border-primary-300 hover:text-primary-600'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVideos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => openVideo(video.id)}
                      className="text-left group"
                    >
                      <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-neutral-sm hover:shadow-primary-md hover:-translate-y-1 transition-all duration-300">
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-success-50 opacity-90" />
                        <div className="relative p-3 pb-4">
                          <div className="relative aspect-video rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-900 to-neutral-900" />
                            <div className="relative z-10 flex items-center justify-center">
                              <div className="w-16 h-16 rounded-full bg-white/10 border border-primary-300 flex items-center justify-center group-hover:bg-primary-500/30 transition-all">
                                <svg
                                  className="w-7 h-7 text-primary-50 ml-0.5"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white">
                              ⏱ {video.duration}
                            </div>
                          </div>

                          <span className="text-[11px] font-semibold text-success-700 uppercase tracking-wide">
                            {video.department}
                          </span>
                          <h4 className="font-display font-semibold text-sm mt-0.5 text-neutral-900 group-hover:text-primary-600 transition-colors">
                            {video.title}
                          </h4>
                          <p className="text-[11px] text-neutral-700 mt-1 line-clamp-2">
                            {video.highlight}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Photos */}
            {activeTab === 'photos' && (
              <div className="space-y-6">
                <div className="text-center max-w-xl mx-auto">
                  <div className="text-4xl mb-2">📷</div>
                  <h3 className="font-display font-semibold text-neutral-900 text-lg">
                    Photo Gallery
                  </h3>
                  <p className="text-neutral-700 text-sm mt-1">
                    A visual snapshot from medical camps, rehabilitation, education programs, and
                    community welfare activities.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PHOTOS.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => openPhoto(photo.id)}
                      className="text-left group"
                    >
                      <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-neutral-sm hover:shadow-primary-md hover:-translate-y-1 transition-all duration-300">
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-success-50 opacity-90" />
                        <div className="relative p-3 pb-4">
                          <div className="relative aspect-video rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-50" />
                            <div className="relative z-10 flex items-center justify-center text-3xl">
                              🏥
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-primary-700 uppercase tracking-wide">
                            {photo.category}
                          </span>
                          <h4 className="font-display font-semibold text-sm mt-0.5 text-neutral-900 group-hover:text-primary-600 transition-colors">
                            {photo.title}
                          </h4>
                          <p className="text-[11px] text-neutral-700 mt-1 line-clamp-2">
                            {photo.caption}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Events */}
            {activeTab === 'events' && (
              <div className="text-center py-24 max-w-xl mx-auto">
                <div className="text-5xl mb-4">🎪</div>
                <h3 className="font-display font-semibold text-neutral-900 text-lg">
                  Events & Highlights
                </h3>
                <p className="text-neutral-700 text-sm mt-2">
                  Media coverage, conferences, and on‑ground activities will appear here with
                  replays, recaps, and key takeaways.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* VIDEO MODAL */}
      {selectedVideo && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl mx-4 rounded-2xl bg-white shadow-neutral-lg animate-fade-up">
            <div className="h-1 w-full bg-gradient-to-r from-primary-500 to-success-500 rounded-t-2xl" />

            <div className="p-4 sm:p-6 lg:p-7">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <div className="inline-flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-50 text-success-700 border border-success-100">
                      {selectedVideo.department}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-50 text-primary-700 border border-primary-100">
                      {selectedVideo.category.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-neutral-900 text-base sm:text-lg">
                    {selectedVideo.title}
                  </h3>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    ⏱ {selectedVideo.duration} · Khan Hub Media
                  </p>
                </div>

                <button
                  onClick={closeVideoModal}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Media + details layout */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] gap-4 lg:gap-6 items-start">
                {/* Media side with fixed overlay arrows */}
                <div className="relative">
                  <div
                    ref={videoContainerRef}
                    className="relative aspect-video rounded-xl overflow-hidden border border-neutral-200 bg-black"
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-900 via-neutral-900 to-success-900">
                      <button className="w-16 h-16 rounded-full bg-white/10 border border-primary-300 flex items-center justify-center text-primary-50 hover:bg-primary-500/30 transition-all">
                        <svg
                          className="w-7 h-7 ml-0.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    </div>

                    {/* Prev / Next centered on left/right border */}
                    <button
                      onClick={goPrevVideo}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 hover:bg-black/80 border border-white/40 text-white text-xs px-2.5 py-1.5 flex items-center gap-1"
                    >
                      ◀
                    </button>
                    <button
                      onClick={goNextVideo}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 hover:bg-black/80 border border-white/40 text-white text-xs px-2.5 py-1.5 flex items-center gap-1"
                    >
                      ▶
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                      🎥 Patient & program stories
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-success-50 text-success-700 border border-success-100">
                      ✅ Real impact visuals
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-neutral-50 text-neutral-700 border border-neutral-200">
                      🔊 Voice‑over & subtitles (planned)
                    </span>
                  </div>
                </div>

                {/* Right column: description & controls */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                  <div>
                    <h4 className="font-display font-semibold text-neutral-900 text-sm mb-1">
                      Why this story matters
                    </h4>
                    <p className="text-neutral-800 text-xs leading-relaxed">
                      {selectedVideo.highlight}
                    </p>
                  </div>

                  <div className="divider my-2" />

                  <div className="space-y-1 text-xs text-neutral-700">
                    <p>
                      📍 <span className="font-semibold">Location:</span> Khan Hub{' '}
                      {selectedVideo.department}
                    </p>
                    <p>
                      🕒 <span className="font-semibold">Recorded during:</span> Program activity
                      (camp, session, or event)
                    </p>
                    <p>
                      🔁 <span className="font-semibold">Program type:</span>{' '}
                      {selectedVideo.category === 'healthcare'
                        ? 'Healthcare & clinical services'
                        : selectedVideo.category === 'education'
                        ? 'Education & skills'
                        : selectedVideo.category === 'welfare'
                        ? 'Social welfare & support'
                        : selectedVideo.category === 'services'
                        ? 'Support services'
                        : 'Digital & awareness'}
                    </p>
                  </div>

                  <div className="divider my-2" />

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleVideoFullscreen}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold px-4 py-2 shadow-primary-sm transition-all"
                    >
                      ⛶ Fullscreen
                    </button>
                    <button className="inline-flex items-center gap-1 rounded-lg bg-white border border-primary-500 text-primary-600 hover:bg-primary-50 text-xs font-semibold px-4 py-2 transition-all">
                      🔗 View on YouTube
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl mx-4 rounded-2xl bg-white shadow-neutral-lg animate-fade-up">
            <div className="h-1 w-full bg-gradient-to-r from-primary-500 to-success-500 rounded-t-2xl" />
            <div className="p-4 sm:p-6 lg:p-7">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-50 text-primary-700 border border-primary-100">
                    {selectedPhoto.category}
                  </span>
                  <h3 className="font-display font-semibold text-neutral-900 text-base sm:text-lg mt-2">
                    {selectedPhoto.title}
                  </h3>
                </div>
                <button
                  onClick={closePhotoModal}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] gap-4 lg:gap-6 items-start">
                {/* Image area same style as video */}
                <div className="relative">
                  <div
                    ref={photoContainerRef}
                    className="relative aspect-video rounded-xl overflow-hidden border border-neutral-200 bg-black"
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-50">
                      <div className="text-5xl">🏥</div>
                    </div>

                    {/* Prev / Next arrows on sides */}
                    <button
                      onClick={goPrevPhoto}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 hover:bg-black/80 border border-white/40 text-white text-xs px-2.5 py-1.5 flex items-center gap-1"
                    >
                      ◀
                    </button>
                    <button
                      onClick={goNextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 hover:bg-black/80 border border-white/40 text-white text-xs px-2.5 py-1.5 flex items-center gap-1"
                    >
                      ▶
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                      🏥 Hospital & centers
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-success-50 text-success-700 border border-success-100">
                      🤝 Community programs
                    </span>
                  </div>
                </div>

                {/* Description + fullscreen */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                  <div>
                    <h4 className="font-display font-semibold text-neutral-900 text-sm mb-1">
                      About this moment
                    </h4>
                    <p className="text-neutral-800 text-xs leading-relaxed">
                      {selectedPhoto.caption}
                    </p>
                  </div>

                  <div className="divider my-2" />

                  <div className="space-y-1 text-xs text-neutral-700">
                    <p>
                      📍 <span className="font-semibold">Captured at:</span> Khan Hub{' '}
                      {selectedPhoto.category} program
                    </p>
                    <p>
                      🎞 <span className="font-semibold">Type:</span> On‑ground activity & patient
                      support
                    </p>
                  </div>

                  <div className="divider my-2" />

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handlePhotoFullscreen}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold px-4 py-2 shadow-primary-sm transition-all"
                    >
                      ⛶ View full image
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
