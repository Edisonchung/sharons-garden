// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // ✅ Import storage


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Validate required config
const requiredConfig = ['apiKey', 'authDomain', 'projectId'];
for (const key of requiredConfig) {
  if (!firebaseConfig[key]) {
    throw new Error(`Missing required Firebase config: ${key}`);
  }
}


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // ✅ Export storage
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider for better reliability
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Enable offline persistence and improve reliability
if (typeof window !== 'undefined') {
  // Only run in browser environment
  import('firebase/firestore').then(({ enableNetwork, disableNetwork }) => {
    // Enable network retry
    enableNetwork(db).catch(console.warn);
  });
}

// Log configuration for debugging (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase initialized with config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hasApiKey: !!firebaseConfig.apiKey
  });
}

export default app;