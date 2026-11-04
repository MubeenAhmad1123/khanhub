// apps/web/src/components/media/MediaEventsContent.tsx
import React from 'react';

export default function MediaEventsContent() {
  return (
    <div className="text-center py-20 sm:py-24 md:py-28 max-w-xl mx-auto px-4">
      <div className="text-4xl sm:text-5xl mb-4 sm:mb-5" aria-hidden="true">
        🎪
      </div>
      <h3 className="font-display font-semibold text-neutral-900 text-base sm:text-lg md:text-xl mb-3">
        Events & Highlights
      </h3>
      <p className="text-neutral-700 text-sm sm:text-base leading-relaxed">
        Media coverage, conferences, and on-ground activities will appear here with
        replays, recaps, and key takeaways.
      </p>
    </div>
  );
}
