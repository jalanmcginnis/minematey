'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

const STORAGE_BUCKET_PATTERN = /^[a-z0-9][a-z0-9.\-]*\.(appspot\.com|firebasestorage\.app)$/i;

function resolveStorageBucket(bucket: string | undefined): string {
  const normalized = (bucket || '').trim().replace(/^gs:\/\//, '');
  if (!STORAGE_BUCKET_PATTERN.test(normalized)) {
    console.error(
      'Firebase storageBucket is missing or not in <project>.appspot.com / <project>.firebasestorage.app form:',
      normalized || '(empty)',
    );
  }
  return normalized;
}

const storageBucketName = resolveStorageBucket(firebaseConfig.storageBucket);

const globalForFirebase = globalThis as unknown as {
  __mineMateyDb?: Firestore;
};

// Ensure FirebaseApp is only initialized once across hot reloads
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const firebaseApp: FirebaseApp = app;

// Safeguard Firestore initialization against Next.js/React fast refresh cycles
let db: Firestore;
if (globalForFirebase.__mineMateyDb) {
  db = globalForFirebase.__mineMateyDb;
} else {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    console.error('Firestore already initialized, reusing existing instance:', error);
    db = getFirestore(app);
  }
  if (typeof window !== 'undefined') {
    globalForFirebase.__mineMateyDb = db;
  }
}

const firestore: Firestore = db;
const auth: Auth = getAuth(app);
const storage: FirebaseStorage = storageBucketName
  ? getStorage(app, `gs://${storageBucketName}`)
  : getStorage(app);

/**
 * Returns the initialized Firebase services.
 * This function returns the already-initialized singleton instances.
 */
export function initializeFirebase() {
  return {
    app,
    firebaseApp,
    db,
    firestore,
    auth,
    storage,
  };
}

export { app, firebaseApp, db, firestore, auth, storage };

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

