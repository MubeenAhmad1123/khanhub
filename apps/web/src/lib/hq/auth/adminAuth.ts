import { initializeApp, getApps, cert, App } from 'firebase-admin/app';

/**
 * Centralized Firebase Admin SDK Initialization
 * This keeps service account handling on the server-side only.
 * Labels (ADMIN_APP_NAME) are just internal identifiers for the SDK.
 */

export function getAdminApp(department: string = 'universal'): App {
  const ADMIN_APP_NAME = `kh-${department}-admin`;
  const existingApp = getApps().find(app => app.name === ADMIN_APP_NAME);
  if (existingApp) return existingApp;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not defined in environment variables.');
  }

  try {
    const serviceAccount = JSON.parse(json);
    return initializeApp(
      { credential: cert(serviceAccount) },
      ADMIN_APP_NAME
    );
  } catch (error: any) {
    console.error(`Failed to initialize Firebase Admin for ${department}:`, error.message);
    throw error;
  }
}
