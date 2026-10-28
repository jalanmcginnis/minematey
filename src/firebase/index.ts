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
const storage: FirebaseStorage = getStorage(app);

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
export * from './auth/use-user';

