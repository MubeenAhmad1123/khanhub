import { db } from './firebase/firebase-config'
import { 
  doc, 
  getDoc, 
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore'

/**
 * Like a video
 */
export async function likeVideo(userId: string, videoId: string, authorId: string) {
  const batch = writeBatch(db);
  
  // 1. Update video document
  const videoRef = doc(db, 'videos', videoId);
  batch.update(videoRef, {
    likes: increment(1),
    likedBy: arrayUnion(userId)
  });

  // 2. Update user (liker) document
  const userRef = doc(db, 'users', userId);
  batch.update(userRef, {
    likedVideos: arrayUnion(videoId)
  });

  // 3. Update author document (if not self)
  if (authorId && authorId !== userId) {
    const authorRef = doc(db, 'users', authorId);
    batch.update(authorRef, {
      totalLikes: increment(1)
    });
  }

  await batch.commit();
}

/**
 * Unlike a video
 */
export async function unlikeVideo(userId: string, videoId: string, authorId: string) {
  const batch = writeBatch(db);

  // 1. Update video document
  const videoRef = doc(db, 'videos', videoId);
  batch.update(videoRef, {
    likes: increment(-1),
    likedBy: arrayRemove(userId)
  });

  // 2. Update user (liker) document
  const userRef = doc(db, 'users', userId);
  batch.update(userRef, {
    likedVideos: arrayRemove(videoId)
  });

  // 3. Update author document (if not self)
  if (authorId && authorId !== userId) {
    const authorRef = doc(db, 'users', authorId);
    batch.update(authorRef, {
      totalLikes: increment(-1)
    });
  }

  await batch.commit();
}

/**
 * Check if a user liked a video
 */
export async function checkIsLiked(userId: string, videoId: string) {
  if (!userId || !videoId) return false;
  const videoSnap = await getDoc(doc(db, 'videos', videoId));
  if (!videoSnap.exists()) return false;
  const data = videoSnap.data();
  return (data.likedBy || []).includes(userId);
}
