import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Type-safe config object
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  appId: string;
}

// Verify environment variables
const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  throw new Error(
    `Firebase configuration error: Missing ${missingVars.join(', ')}. ` +
    'Please check your environment variables.'
  );
}

// Create Firebase configuration
const firebaseConfig: FirebaseConfig = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: `${requiredEnvVars.projectId}.firebaseapp.com`,
  projectId: requiredEnvVars.projectId,
  storageBucket: `${requiredEnvVars.projectId}.appspot.com`,
  appId: requiredEnvVars.appId,
};

// Initialize Firebase with error handling
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw new Error('Failed to initialize Firebase. Please try again later.');
}

export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Google sign-in successful');
    return result.user;
  } catch (error: any) {
    console.error("Error during Google sign-in:", error);

    // Provide user-friendly error messages
    if (error.code === 'auth/invalid-api-key') {
      throw new Error('Authentication service is temporarily unavailable. Please try again later.');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked. Please allow popups for this site and try again.');
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled. Please try again.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection and try again.');
    }

    throw new Error('Failed to sign in with Google. Please try again later.');
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log('Sign-out successful');
  } catch (error) {
    console.error("Error signing out:", error);
    throw new Error('Failed to sign out. Please try again later.');
  }
};