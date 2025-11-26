// Firebase konfiguration
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'demo-app-id',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://aktivitus-admin-default-rtdb.europe-west1.firebasedatabase.app',
};

// Firebase-konfiguration loggas inte av säkerhetsskäl

// Initialize Firebase
let app: FirebaseApp;
let db: Database;
let auth: Auth;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    
    // Firebase-initialisering loggas inte av säkerhetsskäl
  } else {
    app = getApps()[0];
    db = getDatabase(app);
    auth = getAuth(app);
  }
} catch (error) {
  // Logga inte felmeddelanden som kan avslöja databasinformation
  throw error;
}

export { app, db, auth };

