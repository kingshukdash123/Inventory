import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const SETTINGS_COLLECTION = 'settings';
const COUNTER_DOC_ID = 'doctor_bill_counter';
const DEFAULT_BASELINE = 1000; // Sequence starts at 1001 (1000 + 1)

/**
 * Initialize counter document in Firestore if it doesn't already exist.
 * If there is no doctor_bill_counter document, create it with baseline 1000.
 */
export async function initializeDoctorBillCounterIfNeeded() {
  const counterRef = doc(db, SETTINGS_COLLECTION, COUNTER_DOC_ID);
  const snap = await getDoc(counterRef);

  if (!snap.exists()) {
    await setDoc(counterRef, {
      lastBillNumber: DEFAULT_BASELINE,
      startingNumber: 1001,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return DEFAULT_BASELINE;
  }

  return Number(snap.data().lastBillNumber) || DEFAULT_BASELINE;
}

/**
 * Atomically claim and return the next sequential doctor bill number.
 * Concurrency-safe via Firestore runTransaction.
 * If doctor_bill_counter does not exist, initialize and return 1001.
 * Otherwise, increment lastBillNumber and return the next number.
 */
export async function getNextDoctorBillNumber() {
  const counterRef = doc(db, SETTINGS_COLLECTION, COUNTER_DOC_ID);

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    let lastNumber = DEFAULT_BASELINE;

    if (snap.exists()) {
      const data = snap.data();
      lastNumber = Number(data.lastBillNumber) || DEFAULT_BASELINE;
    }

    const nextNumber = Math.max(DEFAULT_BASELINE, lastNumber) + 1;

    transaction.set(
      counterRef,
      {
        lastBillNumber: nextNumber,
        startingNumber: 1001,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    return String(nextNumber);
  });
}

/**
 * Peek at the upcoming next doctor bill number without incrementing it.
 * Used for UI preview in AddSellingBillModal.
 * If document does not exist, returns '1001'.
 * Otherwise returns String(lastBillNumber + 1).
 */
export async function peekNextDoctorBillNumber() {
  try {
    const counterRef = doc(db, SETTINGS_COLLECTION, COUNTER_DOC_ID);
    const snap = await getDoc(counterRef);

    if (snap.exists()) {
      const lastNumber = Number(snap.data().lastBillNumber) || DEFAULT_BASELINE;
      return String(Math.max(DEFAULT_BASELINE, lastNumber) + 1);
    }

    return '1001';
  } catch (error) {
    console.error('Error peeking next doctor bill number:', error);
    return '1001';
  }
}
