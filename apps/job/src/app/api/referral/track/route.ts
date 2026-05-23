import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const { refCode, newUserId } = await req.json();

    if (!adminDb) {
      console.warn('⚠️ [API] adminDb not initialized. Skipping referral tracking.');
      return NextResponse.json({ success: false, error: 'admin_sdk_offline' });
    }

    if (!refCode || !newUserId) {
      return NextResponse.json({ success: false, error: 'missing_params' }, { status: 400 });
    }

    console.log(`[API] 🔗 Tracking referral: ${refCode} -> ${newUserId}`);

    // 1. Find the referrer by referralCode
    const usersRef = adminDb.collection('users');
    const q = await usersRef.where('referralCode', '==', refCode).limit(1).get();

    if (q.empty) {
      console.warn(`[API] ⚠️ Referrer not found for code: ${refCode}`);
      return NextResponse.json({ success: false, error: 'referrer_not_found' });
    }

    const referrerDoc = q.docs[0];
    const referrerId = referrerDoc.id;

    // 2. Perform atomic updates
    const batch = adminDb.batch();

    // DO NOT increment referralCount here.
    // Count only increments when referred user's first video is approved.
    // Just record the referral relationship on the new user.
    batch.update(usersRef.doc(newUserId), {
      referredBy: refCode,
      referredByUserId: referrerId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    console.log(`✅ [API] [Referral] Successfully tracked referral from ${referrerId} to ${newUserId}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ [API] [Referral] FAIL:', error);
    return NextResponse.json({ success: false, error: error.message || 'internal_error' }, { status: 500 });
  }
}
