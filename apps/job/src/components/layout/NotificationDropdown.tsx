'use client'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase/firebase-config'
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { Bell, Heart, Video, UserPlus, Star } from 'lucide-react'

interface Notification {
  id: string
  type: 'like' | 'follow' | 'video_approved' | 'video_rejected' | 'new_payment' | string
  title: string
  message: string
  isRead: boolean
  createdAt: any
  targetId?: string
}

const notifIcon = (type: string) => {
  if (type === 'like') return <Heart size={14} color="#FF0069" />
  if (type === 'follow') return <UserPlus size={14} color="#00C896" />
  if (type === 'video_approved') return <Video size={14} color="#00C896" />
  if (type === 'video_rejected') return <Video size={14} color="#FF3B30" />
  return <Bell size={14} color="#666" />
}

import { useRef } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'

export default function NotificationDropdown({ 
  isOpen, 
  onClose,
  triggerRef
}: { 
  isOpen: boolean
  onClose: () => void 
  triggerRef: React.RefObject<HTMLElement>
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [uid, setUid] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useClickOutside([dropdownRef, triggerRef], onClose, isOpen)

  useEffect(() => {
    const auth = getAuth()
    const unsub = onAuthStateChanged(auth, user => {
      setUid(user?.uid || null)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!uid) return

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    )

    const unsub = onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Notification[])
    }, err => {
      console.warn('Notifications error:', err.code)
    })

    return () => unsub()
  }, [uid])

  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true })
    } catch (e) {}
  }

  const markAllRead = async () => {
    notifications
      .filter(n => !n.isRead)
      .forEach(n => markRead(n.id))
  }

  if (!isOpen) return null

  return (
    <div 
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: '56px',
        right: '12px',
        width: '320px',
        maxWidth: 'calc(100vw - 24px)',
        background: '#FFFFFF',
        borderRadius: '16px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        zIndex: 9999,
        overflow: 'hidden',
        border: '1px solid #F0F0F0',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '14px 16px',
          borderBottom: '1px solid #F0F0F0',
        }}>
          <span style={{ fontWeight: 700, fontSize: '15px' }}>Notifications</span>
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllRead}
              style={{
                background: 'none', border: 'none',
                color: '#FF0069', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer'
              }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{
              padding: '40px 16px', textAlign: 'center',
              color: '#999', fontSize: '14px'
            }}>
              No notifications yet
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => markRead(notif.id)}
                style={{
                  display: 'flex', gap: '12px',
                  padding: '12px 16px', cursor: 'pointer',
                  background: notif.isRead ? '#fff' : '#FFF5F8',
                  borderBottom: '1px solid #F8F8F8',
                  transition: 'background 0.2s',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '32px', height: '32px',
                  borderRadius: '50%', background: '#F0F0F0',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  {notifIcon(notif.type)}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '13px', fontWeight: notif.isRead ? 400 : 600,
                    color: '#0A0A0A', margin: 0, lineHeight: 1.4,
                  }}>
                    {notif.title}
                  </p>
                  <p style={{
                    fontSize: '12px', color: '#888',
                    margin: '2px 0 0', lineHeight: 1.3,
                  }}>
                    {notif.message}
                  </p>
                </div>

                {/* Unread dot */}
                {!notif.isRead && (
                  <div style={{
                    width: '8px', height: '8px',
                    borderRadius: '50%', background: '#FF0069',
                    flexShrink: 0, marginTop: '4px',
                  }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
  )
}
