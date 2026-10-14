import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const USERS_COLLECTION = 'users';

/**
 * Check if at least one user exists in the Firestore 'users' collection.
 * Useful to detect initial system setup.
 */
export async function checkAnyUserExists() {
  try {
    const q = query(collection(db, USERS_COLLECTION), limit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking existing users:', error);
    return false;
  }
}

/**
 * Authenticate a user by matching userId/username and plain text password
 * against the 'users' collection in Firestore.
 */
export async function loginWithCredentials(userIdOrUsername, password) {
  if (!userIdOrUsername || !password) {
    throw new Error('Please enter both User ID/Username and password.');
  }

  const cleanInput = userIdOrUsername.trim();
  const lowerInput = cleanInput.toLowerCase();

  // 1. First attempt: check direct doc ID (either clean or lowercase)
  try {
    let userDocRef = doc(db, USERS_COLLECTION, cleanInput);
    let docSnap = await getDoc(userDocRef);

    if (!docSnap.exists() && cleanInput !== lowerInput) {
      userDocRef = doc(db, USERS_COLLECTION, lowerInput);
      docSnap = await getDoc(userDocRef);
    }

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.password === password) {
        return {
          id: docSnap.id,
          userId: data.userId || data.username || docSnap.id,
          username: data.username || data.userId || docSnap.id,
          role: data.role || 'user',
          createdAt: data.createdAt?.toDate?.() || null
        };
      } else {
        throw new Error('Incorrect password. Please try again.');
      }
    }
  } catch (err) {
    if (err.message === 'Incorrect password. Please try again.') {
      throw err;
    }
    // Continue to fallback search below
  }

  // 2. Fallback attempt: query by 'userId' or 'username' fields in collection
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    
    // Check where userId == cleanInput
    let q = query(usersRef, where('userId', '==', cleanInput), limit(1));
    let snap = await getDocs(q);

    // If not found, check where username == cleanInput
    if (snap.empty) {
      q = query(usersRef, where('username', '==', cleanInput), limit(1));
      snap = await getDocs(q);
    }

    // If still not found and case differs, try lowercase matching
    if (snap.empty && cleanInput !== lowerInput) {
      q = query(usersRef, where('userId', '==', lowerInput), limit(1));
      snap = await getDocs(q);
      if (snap.empty) {
        q = query(usersRef, where('username', '==', lowerInput), limit(1));
        snap = await getDocs(q);
      }
    }

    if (!snap.empty) {
      const userDoc = snap.docs[0];
      const data = userDoc.data();
      if (data.password === password) {
        return {
          id: userDoc.id,
          userId: data.userId || data.username || userDoc.id,
          username: data.username || data.userId || userDoc.id,
          role: data.role || 'user',
          createdAt: data.createdAt?.toDate?.() || null
        };
      } else {
        throw new Error('Incorrect password. Please try again.');
      }
    }
  } catch (err) {
    if (err.message === 'Incorrect password. Please try again.') {
      throw err;
    }
    console.error('Error during fallback user query:', err);
  }

  throw new Error('User not found. Please verify your credentials or create an account.');
}

/**
 * Register/add a new user document in Firestore 'users' collection.
 * Stores userId and password as requested.
 */
export async function registerNewUser(userId, password, role = 'admin') {
  if (!userId || !password) {
    throw new Error('User ID and password are required.');
  }

  const cleanUserId = userId.trim();
  if (cleanUserId.length < 3) {
    throw new Error('User ID must be at least 3 characters long.');
  }

  if (password.length < 4) {
    throw new Error('Password must be at least 4 characters long.');
  }

  // Check if doc with this ID already exists
  const docRef = doc(db, USERS_COLLECTION, cleanUserId);
  const existing = await getDoc(docRef);
  if (existing.exists()) {
    throw new Error(`User "${cleanUserId}" already exists. Please choose a different ID or log in.`);
  }

  // Also verify query fallback
  const q = query(collection(db, USERS_COLLECTION), where('userId', '==', cleanUserId), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error(`User "${cleanUserId}" already exists.`);
  }

  const userData = {
    userId: cleanUserId,
    username: cleanUserId,
    password: password, // stored directly as requested
    role: role,
    createdAt: serverTimestamp()
  };

  await setDoc(docRef, userData);

  return {
    id: cleanUserId,
    userId: cleanUserId,
    username: cleanUserId,
    role: role,
    createdAt: new Date()
  };
}
