'use client';

import { Bell, BellOff, X } from 'lucide-react';
import { useState } from 'react';

interface Props {
  isRequesting: boolean;
  onAllow: () => Promise<boolean>;
  onDismiss: () => void;
}

export function HqNotificationPermissionBanner({ isRequesting, onAllow, onDismiss }: Props) {
  const [result, setResult] = useState<'idle' | 'denied'>('idle');

  const handleAllow = async () => {
    const granted = await onAllow();
    if (!granted) setResult('denied');
  };

  if (result === 'denied') {
    return (
      <div className="mx-4 lg:mx-8 mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
        <BellOff size={15} className="flex-shrink-0" />
        <p className="text-xs font-semibold flex-1">
          Notifications blocked. Enable them in your browser / OS settings and reload.
        </p>
        <button onClick={onDismiss} className="text-red-400/60 hover:text-red-400 transition-colors">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-4 lg:mx-8 mb-4 flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
      {/* Icon + text */}
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        <span className="w-8 h-8 flex-shrink-0 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Bell size={15} className="text-amber-400" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-300 leading-snug">Enable Push Notifications</p>
          <p className="text-xs text-amber-400/70 font-medium mt-0.5 leading-relaxed">
            Get instant alerts when transactions need your approval, even when the app is in the background.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 pl-11 sm:pl-0">
        <button
          onClick={handleAllow}
          disabled={isRequesting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-black text-xs font-black transition-all active:scale-95"
        >
          {isRequesting ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-black/30 border-t-black animate-spin" />
              Enabling…
            </>
          ) : (
            <>
              <Bell size={12} />
              Allow
            </>
          )}
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-2 rounded-xl text-amber-400/60 hover:text-amber-400 text-xs font-semibold transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
