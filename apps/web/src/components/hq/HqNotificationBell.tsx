'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { markHqNotificationRead, markAllHqNotificationsRead, subscribeHqNotifications } from '@/lib/hqNotifications';
import type { HqNotification } from '@/lib/hqNotifications';
import type { HqSession } from '@/types/hq';

interface Props {
  session: HqSession;
}

const TYPE_ICON: Record<string, string> = {
  tx_forwarded: '📤',
  tx_approved: '✅',
  tx_rejected: '❌',
  reconciliation_flagged: '⚠️',
  salary_approved: '💰',
};

export function HqNotificationBell({ session }: Props) {
  const [notifications, setNotifications] = useState<HqNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Real-time Firestore listener
  useEffect(() => {
    if (!session?.customId) return;
    const unsub = subscribeHqNotifications(session.customId, setNotifications);
    return () => unsub();
  }, [session.customId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: string) => {
    await markHqNotificationRead(id);
    // Optimistic UI update (listener will also update, but this is instant)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleMarkAllRead = async () => {
    await markAllHqNotificationsRead(session.customId);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="relative" ref={ref}>
      <button
        id="hq-notification-bell"
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all duration-200 active:scale-95"
        aria-label="Notifications"
      >
        <Bell size={16} className="text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center animate-in zoom-in duration-200">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 md:w-96 bg-gray-900 border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <h3 className="text-white font-black text-xs uppercase tracking-widest">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => { void handleMarkAllRead(); }}
                  className="text-amber-500 hover:text-amber-400 transition-colors"
                  title="Mark all read"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-400 transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell className="text-gray-700 mx-auto mb-3" size={24} />
                <p className="text-gray-600 font-black text-[10px] uppercase tracking-widest">All caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && n.id && void handleMarkRead(n.id)}
                    className={`flex items-start gap-3 px-5 py-4 transition-colors cursor-pointer ${
                      !n.isRead ? 'bg-amber-500/5 hover:bg-amber-500/8' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${n.isRead ? 'text-gray-400' : 'text-white'}`}>{n.title}</p>
                      <p className="text-gray-600 text-[10px] font-medium mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-gray-700 text-[9px] font-black uppercase tracking-widest mt-1">
                        {formatDate(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
