'use client';

import { useEffect, useState } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/fcm';
import { toast } from 'react-hot-toast';
import { Bell, BellOff, X } from 'lucide-react';

interface NotificationRegisterProps {
  userId: string;
  userName?: string;
}

export default function NotificationRegister({ userId, userName }: NotificationRegisterProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Show prompt after 3 seconds if permission is default and not previously dismissed
      if (Notification.permission === 'default') {
        const dismissed = localStorage.getItem('fcm_prompt_dismissed');
        if (!dismissed) {
          const timer = setTimeout(() => {
            setShowPrompt(true);
          }, 3000);
          return () => clearTimeout(timer);
        }
      }
    } else {
      setPermission('denied');
    }
  }, []);

  useEffect(() => {
    // Listen for foreground messages
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[FCM] Foreground message received:', payload);
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-[2rem] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-2 border-black p-4`}>
          <div className="flex-1 w-0 p-2">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="w-10 h-10 bg-teal-500 rounded-2xl flex items-center justify-center text-white">
                  <Bell size={20} />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                  {payload.notification?.title || payload.data?.title || 'Notification'}
                </p>
                <p className="mt-1 text-[11px] font-bold text-gray-500 leading-tight">
                  {payload.notification?.body || payload.data?.body || ''}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-100 pl-4 ml-2">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg flex items-center justify-center text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ), { duration: 6000 });
    });

    return () => unsubscribe();
  }, []);

  const handleRequest = async () => {
    const token = await requestNotificationPermission(userId);
    setPermission(Notification.permission);
    setShowPrompt(false);
    if (token) {
      toast.success('Notifications enabled! You will receive important updates here.');
    } else if (Notification.permission === 'denied') {
      toast.error('Notifications were blocked. Please enable them in browser settings for important alerts.');
    }
  };

  if (!showPrompt || permission === 'granted') return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right-8 duration-500">
      <div className="bg-white rounded-[2.5rem] border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Bell className="animate-bounce" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-gray-900">Enable Smart Alerts?</h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 leading-relaxed">
              Don't miss test reminders, duty updates, and critical announcements.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleRequest}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
              >
                Enable
              </button>
              <button
                onClick={() => {
                  setShowPrompt(false);
                  localStorage.setItem('fcm_prompt_dismissed', 'true');
                }}
                className="px-4 py-2 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
