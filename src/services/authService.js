import { 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Helper to map Firebase Auth error codes to user-friendly messages
 */
export function formatAuthError(error) {
  if (!error) return 'An unexpected error occurred during authentication.';

  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact your administrator.';
    case 'auth/too-many-requests':
      return 'Access temporarily blocked due to repeated failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    default:
      return error.message || 'Failed to sign in. Please try again.';
  }
}

/**
 * Sign in using Firebase Authentication with Email and Password.
 */
export async function loginWithEmail(email, password) {
  if (!email || !password) {
    throw new Error('Please enter both your email address and password.');
  }

  const cleanEmail = email.trim();
  if (!cleanEmail) {
    throw new Error('Please enter a valid email address.');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    return userCredential.user;
  } catch (error) {
    console.error('Firebase Auth sign-in error:', error);
    throw new Error(formatAuthError(error), { cause: error });
  }
}

/**
 * Sign out current authenticated session from Firebase Auth.
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Firebase Auth sign-out error:', error);
    throw error;
  }
}
