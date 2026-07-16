import { initializeApp, cert, getApps, App, ServiceAccount } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';

/**
 * Firebase Admin SDK — used to deliver push notifications directly through FCM
 * (no Expo push service / Expo account required).
 *
 * The service-account key is loaded from, in order:
 *   1. FIREBASE_SERVICE_ACCOUNT env var (full JSON string)
 *   2. backend/fcm-service-account.json (gitignored)
 *
 * If neither is present, messaging() returns null and push sends are skipped
 * gracefully (the app still works; it just won't ring).
 */
let app: App | null = null;

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw && raw.trim().startsWith('{')) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  const filePath = path.resolve(__dirname, '../../fcm-service-account.json');
  if (fs.existsSync(filePath)) {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { /* fall through */ }
  }
  return null;
}

function getApp(): App | null {
  if (app) return app;
  if (getApps().length) { app = getApps()[0]; return app; }
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.warn('[FCM] No service-account key found — push notifications disabled.');
    return null;
  }
  app = initializeApp({ credential: cert(serviceAccount) });
  console.log('[FCM] Firebase Admin initialized.');
  return app;
}

/** Returns the Messaging instance, or null if FCM isn't configured. */
export function fcmMessaging(): Messaging | null {
  const a = getApp();
  return a ? getMessaging(a) : null;
}
