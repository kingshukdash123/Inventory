import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Doctor } from '../models/doctorModel';

const COLLECTION_NAME = 'doctors';

/**
 * Fetch all doctors sorted by name
 */
export async function fetchDoctorsFromFirestore() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    const doctors = [];
    querySnapshot.forEach((docSnap) => {
      doctors.push(Doctor.fromJson({
        id: docSnap.id,
        ...docSnap.data()
      }));
    });
    return doctors;
  } catch (error) {
    console.error('Error fetching doctors from Firestore:', error);
    return [];
  }
}

/**
 * Real-time listener for doctors
 */
export function subscribeDoctors(onUpdate) {
  const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
  return onSnapshot(q, (querySnapshot) => {
    const doctors = [];
    querySnapshot.forEach((docSnap) => {
      doctors.push(Doctor.fromJson({
        id: docSnap.id,
        ...docSnap.data()
      }));
    });
    onUpdate(doctors);
  }, (error) => {
    console.error('Error in doctors realtime subscription:', error);
    onUpdate([]);
  });
}

/**
 * Get a doctor by name (case-insensitive) or create a new one if not exists
 */
export async function getOrCreateDoctorByName(name, phone = '') {
  if (!name || !name.trim()) return null;
  const normalizedName = name.trim().toUpperCase();

  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('name', '==', normalizedName),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const existingData = docSnap.data();
      if (phone && phone.trim() && !existingData.phone) {
        await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
          phone: phone.trim(),
          updatedAt: serverTimestamp()
        });
        existingData.phone = phone.trim();
      }
      return Doctor.fromJson({
        id: docSnap.id,
        ...existingData
      });
    } else {
      // Create new doctor
      const newDoctor = new Doctor({
        name: normalizedName,
        phone: (phone || '').trim(),
        purchasedAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newDoctor.toJson());
      return Doctor.fromJson({
        id: docRef.id,
        ...newDoctor.toJson(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error in getOrCreateDoctorByName:', error);
    throw error;
  }
}

/**
 * Atomically adjust a doctor's balances using a transaction
 */
export async function adjustDoctorBalances(doctorId, purchasedDiff, paidDiff) {
  if (!doctorId) return;
  const docRef = doc(db, COLLECTION_NAME, doctorId);

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Doctor with ID ${doctorId} does not exist.`);
      }

      const data = docSnap.data();
      const purchasedAmount = Number((Number(data.purchasedAmount || 0) + purchasedDiff).toFixed(2));
      const paidAmount = Number((Number(data.paidAmount || 0) + paidDiff).toFixed(2));
      const dueAmount = Number((purchasedAmount - paidAmount).toFixed(2));

      transaction.update(docRef, {
        purchasedAmount,
        paidAmount,
        dueAmount,
        updatedAt: serverTimestamp()
      });
    });
    return true;
  } catch (error) {
    console.error('Failed to adjust doctor balances:', error);
    throw error;
  }
}
