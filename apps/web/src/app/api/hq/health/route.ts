import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    FIREBASE_SERVICE_ACCOUNT_JSON: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    FIREBASE_ADMIN_PROJECT_ID: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  };

  try {
    const { getAdminAuth } = await import('@/lib/firebaseAdmin');
    getAdminAuth();
    return NextResponse.json({ status: 'ok', checks });
  } catch (err: any) {
    return NextResponse.json({ 
      status: 'error', 
      checks,
      message: err?.message 
    }, { status: 500 });
  }
}
