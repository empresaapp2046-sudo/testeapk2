// @ts-nocheck

import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Default config (fallback)
const defaultFirebaseConfig = {
  apiKey: "AIzaSyD_nAje7KPYtn7oc-Gd7VHx1Tx2KDbAavM",
  authDomain: "audiovisprobr.firebaseapp.com",
  databaseURL: "https://audiovisprobr-default-rtdb.firebaseio.com",
  projectId: "audiovisprobr",
  storageBucket: "audiovisprobr.firebasestorage.app",
  messagingSenderId: "142016302742",
  appId: "1:142016302742:web:0f2a84425097c20040fcb7",
  measurementId: "G-F8SJ5567CY"
};

// Function to initialize or re-initialize Firebase
export const initializeFirebase = (config = defaultFirebaseConfig) => {
  const appName = "[DEFAULT]";
  let app;
  
  if (getApps().length > 0) {
    app = getApp(appName);
  } else {
    app = initializeApp(config);
  }

  const db = getFirestore(app);
  const auth = getAuth(app);
  
  // Secondary app for user management
  let secondaryApp;
  try {
    secondaryApp = getApp("Secondary");
  } catch (e) {
    secondaryApp = initializeApp(config, "Secondary");
  }
  const secondaryAuth = getAuth(secondaryApp);

  if (typeof window !== 'undefined') {
    isSupported().then(supported => {
      if (supported) getAnalytics(app);
    });
  }

  return { app, db, auth, secondaryAuth };
};

// Initial export with default config
const { db, auth, secondaryAuth } = initializeFirebase();
export { db, auth, secondaryAuth };
