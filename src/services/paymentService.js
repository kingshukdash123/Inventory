import {
  collection,
  getDocs,
  doc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DoctorPayment } from '../models/paymentModel';

const COLLECTION_NAME = 'payments';
const DOCTORS_COLLECTION = 'doctors';

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
 * Record a new payment and update the doctor's balances atomically in a single transaction
 */
export async function addPaymentToFirestore(paymentData) {
  const paymentAmount = Number(paymentData.amount) || 0;
  const paymentDocRef = doc(collection(db, COLLECTION_NAME));
  const doctorDocRef = paymentData.doctorId ? doc(db, DOCTORS_COLLECTION, paymentData.doctorId) : null;

  await runTransaction(db, async (transaction) => {
    let doctorData = null;
    if (doctorDocRef) {
      const doctorSnap = await transaction.get(doctorDocRef);
      if (doctorSnap.exists()) {
        doctorData = doctorSnap.data();
      }
    }

    // 1. Write the payment document
    const payment = new DoctorPayment({
      id: paymentDocRef.id,
      doctorId: paymentData.doctorId || '',
      doctorName: paymentData.doctorName || '',
      amount: paymentAmount,
      paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
      paymentMode: paymentData.paymentMode || 'Cash',
      notes: paymentData.notes || '',
      createdAt: serverTimestamp()
    });

    transaction.set(paymentDocRef, payment.toJson());

    // 2. Atomically adjust doctor's balances within the exact same transaction
    if (doctorDocRef && doctorData) {
      const purchasedAmount = Number(Number(doctorData.purchasedAmount || 0).toFixed(2));
      const paidAmount = Number((Number(doctorData.paidAmount || 0) + paymentAmount).toFixed(2));
      const dueAmount = Number((purchasedAmount - paidAmount).toFixed(2));

      transaction.update(doctorDocRef, {
        purchasedAmount,
        paidAmount,
        dueAmount,
        updatedAt: serverTimestamp()
      });
    }
  });

  return DoctorPayment.fromJson({
    id: paymentDocRef.id,
    ...paymentData,
    amount: paymentAmount,
    createdAt: new Date().toISOString()
  });
}

/**
 * Delete a payment and revert the doctor's balance atomically in a single transaction
 */
export async function deletePaymentFromFirestore(paymentId) {
  const paymentDocRef = doc(db, COLLECTION_NAME, paymentId);

  try {
    await runTransaction(db, async (transaction) => {
      const paymentSnap = await transaction.get(paymentDocRef);
      if (!paymentSnap.exists()) return;

      const paymentData = paymentSnap.data();
      const paymentAmount = Number(paymentData.amount) || 0;

      if (paymentData.doctorId) {
        const doctorDocRef = doc(db, DOCTORS_COLLECTION, paymentData.doctorId);
        const doctorSnap = await transaction.get(doctorDocRef);

        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();
          const purchasedAmount = Number(Number(doctorData.purchasedAmount || 0).toFixed(2));
          const paidAmount = Number((Number(doctorData.paidAmount || 0) - paymentAmount).toFixed(2));
          const dueAmount = Number((purchasedAmount - paidAmount).toFixed(2));

          transaction.update(doctorDocRef, {
            purchasedAmount,
            paidAmount,
            dueAmount,
            updatedAt: serverTimestamp()
          });
        }
      }

      transaction.delete(paymentDocRef);
    });

    return true;
  } catch (error) {
    console.error('Error deleting payment atomically from Firestore:', error);
    throw error;
  }
}
