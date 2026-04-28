import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    FIREBASE_ADMIN_PROJECT_ID: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  };
  
  const allOk = Object.values(checks).every(Boolean);
  
  if (!allOk) {
    return NextResponse.json({ 
      status: 'error', 
      checks,
      message: 'Missing Firebase Admin environment variables'
    }, { status: 500 });
  }
  
  // Try to actually initialize
  try {
    const { getAdminAuth } = await import('@/lib/firebaseAdmin');
    getAdminAuth(); // Will throw if env vars are wrong
    return NextResponse.json({ status: 'ok', checks });
  } catch (err: any) {
    return NextResponse.json({ 
      status: 'error', 
      checks,
      message: err?.message 
    }, { status: 500 });
  }
}
