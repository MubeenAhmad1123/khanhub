import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase-config'

export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  targetId?: string
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      user_id: userId,
      type,
      title,
      message,
      is_read: false,
      targetId: targetId || null,
      createdAt: serverTimestamp(),
    })
  } catch (e) {
    console.warn('Failed to create notification:', e)
  }
}
