import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateSellingBillSummary, calculateSellingLineItem } from '../utils/calculations';
import { SellingBill } from '../models/sellingBillModel';
import { getOrCreateDoctorByName, adjustDoctorBalances } from './doctorService';

const COLLECTION_NAME = 'selling_bill';
const STOCK_COLLECTION = 'stock';

/**
 * Sync selling bill items to decrement from available stock
 */
export async function deductBillFromStock(sellingBill) {
  for (const item of sellingBill.items) {
    const medName = (item.itemName || '').trim().toUpperCase();
    const batch = (item.batchNo || '').trim().toUpperCase();
    const expiry = (item.expiryDate || '').trim();

    const q = query(
      collection(db, STOCK_COLLECTION),
      where('medicineName', '==', medName),
      where('batchNo', '==', batch),
      where('expiryDate', '==', expiry)
    );
    let querySnapshot = await getDocs(q);

    let targetDocId = null;
    let currentAvailable = 0;

    if (!querySnapshot.empty) {
      const stockDoc = querySnapshot.docs[0];
      targetDocId = stockDoc.id;
      currentAvailable = Number(stockDoc.data().availableQuantity) || 0;
    } else {
      // Case-insensitive fallback lookup across stock
      const allStockSnap = await getDocs(collection(db, STOCK_COLLECTION));
      const fallbackDoc = allStockSnap.docs.find((d) => {
        const data = d.data();
        return (
          (data.medicineName || '').trim().toUpperCase() === medName &&
          (data.batchNo || '').trim().toUpperCase() === batch
        );
      });
      if (fallbackDoc) {
        targetDocId = fallbackDoc.id;
        currentAvailable = Number(fallbackDoc.data().availableQuantity) || 0;
      }
    }

    if (targetDocId) {
      const newAvailable = Math.max(0, currentAvailable - item.quantity);
      await updateDoc(doc(db, STOCK_COLLECTION, targetDocId), {
        availableQuantity: newAvailable,
        updatedAt: serverTimestamp()
      });
    }
  }
}

/**
 * Revert stock decrement (add sold items back to stock)
 */
export async function addBillBackToStock(sellingBill) {
  for (const item of sellingBill.items) {
    const medName = (item.itemName || '').trim().toUpperCase();
    const batch = (item.batchNo || '').trim().toUpperCase();
    const expiry = (item.expiryDate || '').trim();

    const q = query(
      collection(db, STOCK_COLLECTION),
      where('medicineName', '==', medName),
      where('batchNo', '==', batch),
      where('expiryDate', '==', expiry)
    );
    let querySnapshot = await getDocs(q);

    let targetDocId = null;
    let currentAvailable = 0;

    if (!querySnapshot.empty) {
      const stockDoc = querySnapshot.docs[0];
      targetDocId = stockDoc.id;
      currentAvailable = Number(stockDoc.data().availableQuantity) || 0;
    } else {
      const allStockSnap = await getDocs(collection(db, STOCK_COLLECTION));
      const fallbackDoc = allStockSnap.docs.find((d) => {
        const data = d.data();
        return (
          (data.medicineName || '').trim().toUpperCase() === medName &&
          (data.batchNo || '').trim().toUpperCase() === batch
        );
      });
      if (fallbackDoc) {
        targetDocId = fallbackDoc.id;
        currentAvailable = Number(fallbackDoc.data().availableQuantity) || 0;
      }
    }

    if (targetDocId) {
      const newAvailable = currentAvailable + item.quantity;
      await updateDoc(doc(db, STOCK_COLLECTION, targetDocId), {
        availableQuantity: newAvailable,
        updatedAt: serverTimestamp()
      });
    }
  }
}

export async function addSellingBillToFirestore(sellingBillData) {
  // Get or create doctor by name
  let doctor = null;
  if (sellingBillData.doctorName) {
    doctor = await getOrCreateDoctorByName(sellingBillData.doctorName, sellingBillData.doctorPhone);
  }
  const doctorId = sellingBillData.doctorId || (doctor ? doctor.id : '');
  const prevDue = doctor ? doctor.dueAmount : 0;

  const formattedItems = (sellingBillData.items || []).map(calculateSellingLineItem);
  const fixedDiscount = Number(sellingBillData.fixedDiscount) || 0;
  const summary = calculateSellingBillSummary(formattedItems, prevDue, fixedDiscount);
  const isDraft = !!sellingBillData.isDraft;

  const sellingBill = new SellingBill({
    billNo: sellingBillData.billNo || `SB-${Date.now().toString().slice(-6)}`,
    doctorId: doctorId,
    doctorName: sellingBillData.doctorName || 'Unknown Doctor',
    doctorPhone: sellingBillData.doctorPhone || '',
    invoiceDate: sellingBillData.invoiceDate || new Date().toISOString().split('T')[0],
    notes: sellingBillData.notes || '',
    items: formattedItems,
    summary: summary,
    createdAt: serverTimestamp(),
    isDraft: isDraft,
    stockSynced: false
  });

  const docRef = await addDoc(collection(db, COLLECTION_NAME), sellingBill.toJson());
  sellingBill.id = docRef.id;

  if (!isDraft) {
    await deductBillFromStock(sellingBill);
    if (doctorId) {
      const billNet = Math.max(0, summary.totalAmount - summary.fixedDiscount);
      await adjustDoctorBalances(doctorId, billNet, 0);
    }
    await updateDoc(doc(db, COLLECTION_NAME, docRef.id), {
      stockSynced: true
    });
    sellingBill.stockSynced = true;
  }

  return SellingBill.fromJson({
    id: docRef.id,
    ...sellingBill.toJson(),
    createdAt: new Date().toISOString()
  });
}

export async function updateSellingBillInFirestore(sellingBillId, sellingBillData) {
  const isDraft = !!sellingBillData.isDraft;

  const docRef = doc(db, COLLECTION_NAME, sellingBillId);
  const oldDocSnap = await getDoc(docRef);

  let oldBill = null;
  if (oldDocSnap.exists()) {
    oldBill = SellingBill.fromJson({ id: sellingBillId, ...oldDocSnap.data() });
  }

  // Get doctor details
  const doctor = await getOrCreateDoctorByName(sellingBillData.doctorName, sellingBillData.doctorPhone);
  const doctorId = doctor ? doctor.id : '';

  // If the doctor name did not change, subtract old bill amount to calculate true previous dues
  let prevDue = doctor ? doctor.dueAmount : 0;
  if (oldBill && !oldBill.isDraft && oldBill.doctorId === doctorId) {
    const oldBillNet = Math.max(0, oldBill.summary.totalAmount - (oldBill.summary.fixedDiscount || 0));
    prevDue = Math.max(0, prevDue - oldBillNet);
  }

  const formattedItems = (sellingBillData.items || []).map(calculateSellingLineItem);
  const fixedDiscount = Number(sellingBillData.fixedDiscount) || 0;
  const summary = calculateSellingBillSummary(formattedItems, prevDue, fixedDiscount);

  const sellingBill = new SellingBill({
    id: sellingBillId,
    billNo: sellingBillData.billNo,
    doctorId: doctorId,
    doctorName: sellingBillData.doctorName,
    doctorPhone: sellingBillData.doctorPhone || '',
    invoiceDate: sellingBillData.invoiceDate,
    notes: sellingBillData.notes || '',
    items: formattedItems,
    summary: summary,
    isDraft: isDraft,
    stockSynced: false
  });

  // Revert old published bill stock & doctor totals
  if (oldBill && !oldBill.isDraft && oldBill.stockSynced) {
    await addBillBackToStock(oldBill);
    if (oldBill.doctorId) {
      const oldBillNet = Math.max(0, oldBill.summary.totalAmount - (oldBill.summary.fixedDiscount || 0));
      await adjustDoctorBalances(oldBill.doctorId, -oldBillNet, 0);
    }
  }

  // Apply new published bill stock & doctor totals
  if (!isDraft) {
    await deductBillFromStock(sellingBill);
    if (doctorId) {
      const newBillNet = Math.max(0, summary.totalAmount - summary.fixedDiscount);
      await adjustDoctorBalances(doctorId, newBillNet, 0);
    }
    sellingBill.stockSynced = true;
  }

  const payload = sellingBill.toJson();
  delete payload.createdAt;

  await updateDoc(docRef, payload);

  return SellingBill.fromJson({
    id: sellingBillId,
    ...payload,
    createdAt: sellingBillData.createdAt || new Date().toISOString()
  });
}

export async function publishDraftSellingBillToFirestore(draftSellingBill) {
  const docRef = doc(db, COLLECTION_NAME, draftSellingBill.id);

  // Fetch doctor details
  const doctor = await getOrCreateDoctorByName(draftSellingBill.doctorName, draftSellingBill.doctorPhone);
  const doctorId = doctor ? doctor.id : '';
  const prevDue = doctor ? doctor.dueAmount : 0;

  const formattedItems = (draftSellingBill.items || []).map(calculateSellingLineItem);
  const fixedDiscount = Number(draftSellingBill.summary?.fixedDiscount || draftSellingBill.fixedDiscount) || 0;
  const summary = calculateSellingBillSummary(formattedItems, prevDue, fixedDiscount);

  const publishedBill = new SellingBill({
    id: draftSellingBill.id,
    billNo: draftSellingBill.billNo.startsWith('DRAFT-') ? draftSellingBill.billNo.replace('DRAFT-', 'SB-') : draftSellingBill.billNo,
    doctorId: doctorId,
    doctorName: draftSellingBill.doctorName,
    doctorPhone: draftSellingBill.doctorPhone || '',
    invoiceDate: draftSellingBill.invoiceDate,
    notes: draftSellingBill.notes || '',
    items: formattedItems,
    summary: summary,
    isDraft: false,
    stockSynced: false
  });

  await deductBillFromStock(publishedBill);
  if (doctorId) {
    const billNet = Math.max(0, summary.totalAmount - summary.fixedDiscount);
    await adjustDoctorBalances(doctorId, billNet, 0);
  }
  publishedBill.stockSynced = true;

  const payload = publishedBill.toJson();
  delete payload.createdAt;

  await updateDoc(docRef, payload);

  return SellingBill.fromJson({
    id: draftSellingBill.id,
    ...payload,
    createdAt: draftSellingBill.createdAt || new Date().toISOString()
  });
}

const getBillTime = (bill) => {
  if (bill.createdAt) {
    if (typeof bill.createdAt?.toDate === 'function') return bill.createdAt.toDate().getTime();
    if (typeof bill.createdAt === 'string') {
      const t = new Date(bill.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    if (bill.createdAt instanceof Date) return bill.createdAt.getTime();
  }
  if (bill.invoiceDate) {
    const t = new Date(bill.invoiceDate).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
};

export async function fetchSellingBillsFromFirestore() {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot = await getDocs(q);
    const sellingBills = [];
    querySnapshot.forEach((docSnap) => {
      sellingBills.push(SellingBill.fromJson({
        id: docSnap.id,
        ...docSnap.data()
      }));
    });
    sellingBills.sort((a, b) => getBillTime(b) - getBillTime(a));
    return sellingBills;
  } catch (error) {
    console.error('Error fetching selling bills:', error);
    return [];
  }
}

/**
 * Real-time listener for selling bills
 */
export function subscribeSellingBills(onUpdate) {
  const q = query(collection(db, COLLECTION_NAME));
  return onSnapshot(q, (querySnapshot) => {
    const sellingBills = [];
    querySnapshot.forEach((docSnap) => {
      sellingBills.push(SellingBill.fromJson({
        id: docSnap.id,
        ...docSnap.data()
      }));
    });
    sellingBills.sort((a, b) => getBillTime(b) - getBillTime(a));
    onUpdate(sellingBills);
  }, (error) => {
    console.error('Error in selling bills realtime subscription:', error);
    onUpdate([]);
  });
}

export async function deleteSellingBillFromFirestore(sellingBillId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, sellingBillId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const oldBill = SellingBill.fromJson({ id: docSnap.id, ...data });

      if (!oldBill.isDraft && oldBill.stockSynced) {
        await addBillBackToStock(oldBill);
        if (oldBill.doctorId) {
          const oldBillNet = Math.max(0, oldBill.summary.totalAmount - (oldBill.summary.fixedDiscount || 0));
          await adjustDoctorBalances(oldBill.doctorId, -oldBillNet, 0);
        }
      }
    }
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting selling bill:', error);
    throw error;
  }
}
