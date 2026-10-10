import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DoctorPayment } from '../models/paymentModel';
import { adjustDoctorBalances } from './doctorService';

const COLLECTION_NAME = 'payments';

/**
 * Fetch all payments sorted by creation date descending
 */
export async function fetchPaymentsFromFirestore() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const payments = [];
    querySnapshot.forEach((docSnap) => {
      payments.push(DoctorPayment.fromJson({
        id: docSnap.id,
        ...docSnap.data()
      }));
    });
    return payments;
  } catch (error) {
    console.error('Error fetching payments from Firestore:', error);
    return [];
  }
}

/**
 * Real-time listener for payments
 */
export function subscribePayments(onUpdate) {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (querySnapshot) => {
    const payments = [];
    querySnapshot.forEach((docSnap) => {
      payments.push(DoctorPayment.fromJson({
        id: docSnap.id,
        ...docSnap.data()
      }));
    });
    onUpdate(payments);
  }, (error) => {
    console.error('Error in payments realtime subscription:', error);
    onUpdate([]);
  });
}

/**
 * Record a new payment and update the doctor's balances atomically
 */
export async function addPaymentToFirestore(paymentData) {
  const payment = new DoctorPayment({
    doctorId: paymentData.doctorId,
    doctorName: paymentData.doctorName,
    amount: Number(paymentData.amount) || 0,
    paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
    paymentMode: paymentData.paymentMode || 'Cash',
    notes: paymentData.notes || '',
    createdAt: serverTimestamp()
  });

  const docRef = await addDoc(collection(db, COLLECTION_NAME), payment.toJson());
  
  if (payment.doctorId) {
    // Increment paidAmount by payment.amount
    await adjustDoctorBalances(payment.doctorId, 0, payment.amount);
  }

  return DoctorPayment.fromJson({
    id: docRef.id,
    ...payment.toJson(),
    createdAt: new Date().toISOString()
  });
}

/**
 * Delete a payment, revert the doctor's paid balance, and remove the transaction
 */
export async function deletePaymentFromFirestore(paymentId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, paymentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const payment = DoctorPayment.fromJson({
        id: docSnap.id,
        ...docSnap.data()
      });

      if (payment.doctorId) {
        // Revert paidAmount by subtracting the payment.amount
        await adjustDoctorBalances(payment.doctorId, 0, -payment.amount);
      }
    }

    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting payment from Firestore:', error);
    throw error;
  }
}
