import { db } from './firebase/firebase-config'
import { 
  doc, 
  collection, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  updateDoc, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore'

/**
 * Like a video
 */
export async function likeVideo(userId: string, videoId: string, authorId: string) {
  const likeId = `${userId}_${videoId}`
  const likeRef = doc(db, 'likes', likeId)

  const snap = await getDoc(likeRef)
  if (snap.exists()) return

  // 1. Create like relationship
  await setDoc(likeRef, {
    userId,
    videoId,
    createdAt: serverTimestamp()
  })

  // 2. Increment counts on video and author
  await updateDoc(doc(db, 'videos', videoId), {
    likes: increment(1)
  })
  
  if (authorId) {
    await updateDoc(doc(db, 'users', authorId), {
      totalLikes: increment(1)
    })
  }
}

/**
 * Unlike a video
 */
export async function unlikeVideo(userId: string, videoId: string, authorId: string) {
  const likeId = `${userId}_${videoId}`
  const likeRef = doc(db, 'likes', likeId)

  const snap = await getDoc(likeRef)
  if (!snap.exists()) return

  // 1. Delete like relationship
  await deleteDoc(likeRef)

  // 2. Decrement counts
  await updateDoc(doc(db, 'videos', videoId), {
    likes: increment(-1)
  })

  if (authorId) {
    await updateDoc(doc(db, 'users', authorId), {
      totalLikes: increment(-1)
    })
  }
}

/**
 * Check if a user liked a video
 */
export async function checkIsLiked(userId: string, videoId: string) {
  if (!userId || !videoId) return false
  const likeId = `${userId}_${videoId}`
  const snap = await getDoc(doc(db, 'likes', likeId))
  return snap.exists()
}
