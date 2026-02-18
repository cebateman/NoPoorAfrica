import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is configured
export const isFirebaseConfigured =
  !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your-api-key';

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

// Secondary app instance for admin user creation (avoids signing out the current admin)
const secondaryApp = isFirebaseConfigured
  ? initializeApp(firebaseConfig, 'SecondaryAuth')
  : null;

export const auth = app ? getAuth(app) : null;
export const secondaryAuth = secondaryApp ? getAuth(secondaryApp) : null;
export const db = app ? getFirestore(app) : null;
export default app;
