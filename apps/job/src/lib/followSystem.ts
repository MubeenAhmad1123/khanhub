import { db } from './firebase/firebase-config'
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  writeBatch,
  increment, 
  serverTimestamp 
} from 'firebase/firestore'

/**
 * Follow a user
 */
export async function followUser(followerUid: string, targetUid: string) {
  if (followerUid === targetUid) return

  const batch = writeBatch(db);
  const followId = `${followerUid}_${targetUid}`
  const followRef = doc(db, 'follows', followId)

  // 1. Create follow relationship
  batch.set(followRef, {
    followerId: followerUid,
    targetId: targetUid,
    createdAt: serverTimestamp()
  })

  // 2. Increment counts on both users
  const followerRef = doc(db, 'users', followerUid);
  batch.update(followerRef, {
    followingCount: increment(1)
  })

  const targetRef = doc(db, 'users', targetUid);
  batch.update(targetRef, {
    followerCount: increment(1)
  })

  await batch.commit();
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerUid: string, targetUid: string) {
  const followId = `${followerUid}_${targetUid}`
  const followRef = doc(db, 'follows', followId)

  const snap = await getDoc(followRef)
  if (!snap.exists()) return

  const batch = writeBatch(db);

  // 1. Delete follow relationship
  batch.delete(followRef)

  // 2. Decrement counts
  const followerRef = doc(db, 'users', followerUid);
  batch.update(followerRef, {
    followingCount: increment(-1)
  })

  const targetRef = doc(db, 'users', targetUid);
  batch.update(targetRef, {
    followerCount: increment(-1)
  })

  await batch.commit();
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
