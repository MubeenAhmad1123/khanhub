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
 * Follow a user
 */
export async function followUser(followerUid: string, targetUid: string) {
  if (followerUid === targetUid) return

  const followId = `${followerUid}_${targetUid}`
  const followRef = doc(db, 'follows', followId)

  // 1. Create follow relationship
  await setDoc(followRef, {
    followerId: followerUid,
    targetId: targetUid,
    createdAt: serverTimestamp()
  })

  // 2. Increment counts on both users
  await updateDoc(doc(db, 'users', followerUid), {
    followingCount: increment(1)
  })
  await updateDoc(doc(db, 'users', targetUid), {
    followersCount: increment(1)
  })
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerUid: string, targetUid: string) {
  const followId = `${followerUid}_${targetUid}`
  const followRef = doc(db, 'follows', followId)

  const snap = await getDoc(followRef)
  if (!snap.exists()) return

  // 1. Delete follow relationship
  await deleteDoc(followRef)

  // 2. Decrement counts
  await updateDoc(doc(db, 'users', followerUid), {
    followingCount: increment(-1)
  })
  await updateDoc(doc(db, 'users', targetUid), {
    followersCount: increment(-1)
  })
}

/**
 * Check if a user is following another
 */
export async function checkIsFollowing(followerUid: string, targetUid: string) {
  if (!followerUid || !targetUid) return false
  const followId = `${followerUid}_${targetUid}`
  const snap = await getDoc(doc(db, 'follows', followId))
  return snap.exists()
}
