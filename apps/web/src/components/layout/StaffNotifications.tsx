'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, Calendar, Target, Info, Check } from 'lucide-react';
import { 
  collection, query, where, orderBy, limit, 
  onSnapshot, doc, updateDoc, writeBatch, getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn, formatDateDMY } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'meeting' | 'task' | 'info';
  isRead: boolean;
  createdAt: any;
  dept?: string;
}

interface StaffNotificationsProps {
  uid: string;
  dept: string;
}

export default function StaffNotifications({ uid, dept }: StaffNotificationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const glassStyle = "bg-white/70 backdrop-blur-xl border border-white shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff]";

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, 'staff_notifications'),
      where('recipientId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Notification[];
      
      setNotifications(docs);
      setUnreadCount(docs.filter(n => !n.isRead).length);
    }, (error) => {
      console.error("Notifications subscription error:", error);
    });

    return () => unsubscribe();
  }, [uid]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'staff_notifications', id), { isRead: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead);
      if (unread.length === 0) return;

      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'staff_notifications', n.id), { isRead: true });
      });
      await batch.commit();
      toast.success('All marked as read');
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Calendar className="text-blue-500" size={16} />;
      case 'task': return <Target className="text-orange-500" size={16} />;
      default: return <Info className="text-slate-400" size={16} />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-3 rounded-2xl transition-all active:scale-95 relative",
          isOpen ? "bg-orange-600 text-white shadow-lg" : "bg-white/50 border border-white text-slate-600 hover:bg-white"
        )}
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/5" 
            onClick={() => setIsOpen(false)} 
          />
          <div className={cn(
            "absolute right-0 mt-4 w-[320px] md:w-[400px] rounded-[2.5rem] z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300",
            glassStyle
          )}>
            <div className="p-6 border-b border-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Notifications</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Updates • {unreadCount} Unread</p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllRead}
                    className="p-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                    title="Mark all as read"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="max-h-[450px] overflow-y-auto no-scrollbar">
              {notifications.length > 0 ? (
                <div className="divide-y divide-white/50">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => !notif.isRead && markAsRead(notif.id)}
                      className={cn(
                        "p-5 flex gap-4 transition-colors cursor-pointer group",
                        !notif.isRead ? "bg-orange-50/30" : "hover:bg-slate-50/50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                        !notif.isRead ? "bg-white" : "bg-slate-100/50"
                      )}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={cn(
                            "text-sm font-black truncate",
                            !notif.isRead ? "text-slate-900" : "text-slate-500"
                          )}>
                            {notif.title}
                          </h4>
                          <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                            {notif.createdAt?.toDate ? formatDateDMY(notif.createdAt.toDate()) : 'Recently'}
                          </span>
                        </div>
                        <p className={cn(
                          "text-xs mt-1 leading-relaxed line-clamp-2",
                          !notif.isRead ? "text-slate-600" : "text-slate-400"
                        )}>
                          {notif.body}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center opacity-30">
                  <Bell size={40} className="mx-auto mb-4 text-slate-400" />
                  <p className="text-xs font-black uppercase tracking-[0.2em]">All Caught Up!</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-white/50 border-t border-white">
               <p className="text-[9px] font-black text-center text-slate-400 uppercase tracking-widest">End of Notifications</p>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
