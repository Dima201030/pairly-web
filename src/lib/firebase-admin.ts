import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;

if (!getApps().length) {
  const keyPath = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH;
  if (keyPath) {
    app = initializeApp({
      credential: cert(keyPath),
    });
  } else {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!
    );
    app = initializeApp({
      credential: cert(serviceAccount as any),
    });
  }
} else {
  app = getApps()[0];
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
