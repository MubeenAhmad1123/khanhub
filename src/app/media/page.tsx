'use client';
// src/app/media/page.tsx

import { useState } from 'react';
import { PageHero }  from '@/components/ui';

// ── Placeholder media data ──
// Replace these with real URLs from Firebase Storage or YouTube.

const VIDEOS = [
  { id: 1, title: 'Medical Center — Free Health Camp 2024',        category: 'healthcare', department: 'Medical Center',        thumbnail: '', youtubeId: 'placeholder' },
  { id: 2, title: 'Education Center — Graduation Ceremony',        category: 'education',  department: 'Education Center',     thumbnail: '', youtubeId: 'placeholder' },
  { id: 3, title: 'Sukoon Center — Mental Health Awareness Day',   category: 'welfare',    department: 'Sukoon Center',        thumbnail: '', youtubeId: 'placeholder' },
  { id: 4, title: 'Skills Center — IT Training Program Launch',    category: 'education',  department: 'Skills Center',       thumbnail: '', youtubeId: 'placeholder' },
  { id: 5, title: 'Job Center — Employment Fair Highlights',       category: 'services',   department: 'Job Center',          thumbnail: '', youtubeId: 'placeholder' },
  { id: 6, title: 'Welfare — Ration Distribution Drive',           category: 'welfare',    department: 'Welfare Organization', thumbnail: '', youtubeId: 'placeholder' },
  { id: 7, title: 'Prosthetics — Life-Changing Moment',            category: 'healthcare', department: 'Prosthetic Services', thumbnail: '', youtubeId: 'placeholder' },
  { id: 8, title: 'Transport — Behind the Scenes',                 category: 'services',   department: 'Transport Services',  thumbnail: '', youtubeId: 'placeholder' },
  { id: 9, title: 'Digital Marketing — Brand Story',               category: 'digital',    department: 'Digital Marketing',   thumbnail: '', youtubeId: 'placeholder' },
  { id: 10, title: 'Rehabilitation — Recovery Journey',            category: 'healthcare', department: 'Rehabilitation',      thumbnail: '', youtubeId: 'placeholder' },
  { id: 11, title: 'Institute of Health Sciences — Orientation',   category: 'education',  department: 'Health Sciences',     thumbnail: '', youtubeId: 'placeholder' },
  { id: 12, title: 'Travel & Tours — Healing Trip Documentary',    category: 'services',   department: 'Travel & Tours',      thumbnail: '', youtubeId: 'placeholder' },
];

const CATEGORIES = ['All', 'Healthcare', 'Education', 'Welfare', 'Services', 'Digital'];

export default function MediaPage() {
  const [activeTab, setActiveTab]       = useState<'videos' | 'photos' | 'events'>('videos');
  const [activeCategory, setCategory]   = useState('All');

  const filteredVideos = activeCategory === 'All'
    ? VIDEOS
    : VIDEOS.filter((v) => v.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <>
      <PageHero
        badge="Media"
        title="Our Stories"
        subtitle="See the real impact behind every program — videos, photos, and events from across Khan Hub."
      />

      <section className="section">
        <div className="section-inner">

          {/* Tab Switcher */}
          <div className="flex justify-center gap-1 mb-8">
            {(['videos', 'photos', 'events'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border ${
                  activeTab === tab
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                }`}>
                {tab === 'videos' ? '🎬' : tab === 'photos' ? '📷' : '🎪'} {tab}
              </button>
            ))}
          </div>

          {/* ── VIDEOS TAB ── */}
          {activeTab === 'videos' && (
            <>
              {/* Category Filter */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                      activeCategory === cat
                        ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                        : 'bg-neutral-900 border-neutral-700 text-neutral-500 hover:border-neutral-600'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Video Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((video) => (
                  <div key={video.id} className="card group overflow-hidden">
                    {/* Thumbnail placeholder */}
                    <div className="relative aspect-video bg-neutral-800 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
                      <div className="relative z-10 w-14 h-14 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center group-hover:bg-primary-500/40 transition-all">
                        <svg className="w-6 h-6 text-primary-400 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    {/* Info */}
                    <span className="text-xs text-primary-500 font-semibold">{video.department}</span>
                    <h4 className="font-display font-semibold text-white text-sm mt-0.5 group-hover:text-primary-400 transition-colors">{video.title}</h4>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── PHOTOS TAB ── */}
          {activeTab === 'photos' && (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">📷</div>
              <h3 className="font-display font-semibold text-white text-lg">Photo Gallery</h3>
              <p className="text-neutral-500 text-sm mt-2">Photos will be loaded from Firebase Storage. Placeholder for now.</p>
            </div>
          )}

          {/* ── EVENTS TAB ── */}
          {activeTab === 'events' && (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">🎪</div>
              <h3 className="font-display font-semibold text-white text-lg">Events & Highlights</h3>
              <p className="text-neutral-500 text-sm mt-2">Upcoming and past events will be listed here.</p>
            </div>
          )}

        </div>
      </section>
    </>
  );
}
