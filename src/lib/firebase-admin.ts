import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let app: App;

if (!getApps().length) {
  let serviceAccount: Record<string, string>;

  const keyPath = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH;
  if (keyPath) {
    serviceAccount = JSON.parse(readFileSync(resolve(keyPath), 'utf-8'));
  } else {
    serviceAccount = JSON.parse(
      process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!
    );
  }

  app = initializeApp({
    credential: cert(serviceAccount as any),
  });
} else {
  app = getApps()[0];
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
