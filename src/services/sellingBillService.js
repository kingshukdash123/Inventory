import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  serverTimestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateSellingBillSummary, calculateSellingLineItem } from '../utils/calculations';
import { SellingBill } from '../models/sellingBillModel';
import { getOrCreateDoctorByName, adjustDoctorBalances } from './doctorService';
import { getNextDoctorBillNumber } from './billSequenceService';

const COLLECTION_NAME = 'selling_bill';
const STOCK_COLLECTION = 'stock';

/**
 * Sync selling bill items to decrement from available stock using atomic batch
 * Optionally accepts an extraBatchOps callback to bundle bill doc operations into the same commit.
 */
export async function deductBillFromStock(sellingBill, extraBatchOps = null) {
  const batch = writeBatch(db);
  let hasUpdates = false;

  if (extraBatchOps && typeof extraBatchOps === 'function') {
    extraBatchOps(batch);
    hasUpdates = true;
  }

  // Group line items in case bill has multiple rows for the same medicine and batch
  const groupedItems = new Map();
  for (const item of (sellingBill.items || [])) {
    const medName = (item.itemName || '').trim().toUpperCase();
    const batchNo = (item.batchNo || '').trim().toUpperCase();
    const expiry = (item.expiryDate || '').trim();
    const key = `${medName}__${batchNo}__${expiry}`;
    if (!groupedItems.has(key)) {
      groupedItems.set(key, { ...item, quantity: Number(item.quantity) || 0 });
    } else {
      groupedItems.get(key).quantity += Number(item.quantity) || 0;
    }
  }

  const allStockSnap = await getDocs(collection(db, STOCK_COLLECTION));
  const allStockDocs = allStockSnap.docs;

  for (const item of groupedItems.values()) {
    const medName = (item.itemName || '').trim().toUpperCase();
    const batchNo = (item.batchNo || '').trim().toUpperCase();
    const expiry = (item.expiryDate || '').trim();

    const targetDoc = allStockDocs.find((d) => {
      const data = d.data();
      return (
        (data.medicineName || '').trim().toUpperCase() === medName &&
        (data.batchNo || '').trim().toUpperCase() === batchNo &&
        (!expiry || (data.expiryDate || '').trim() === expiry)
      );
    });

    if (targetDoc) {
      const currentAvailable = Number(targetDoc.data().availableQuantity) || 0;
      const newAvailable = Math.max(0, currentAvailable - item.quantity);
      batch.update(doc(db, STOCK_COLLECTION, targetDoc.id), {
        availableQuantity: newAvailable,
        updatedAt: serverTimestamp()
      });
      hasUpdates = true;
    }
  }

  if (hasUpdates) {
    await batch.commit();
  }
}

/**
 * Revert stock decrement (add sold items back to stock) using atomic batch
 * Optionally accepts an extraBatchOps callback to bundle bill doc operations into the same commit.
 */
export async function addBillBackToStock(sellingBill, extraBatchOps = null) {
  const batch = writeBatch(db);
  let hasUpdates = false;

  if (extraBatchOps && typeof extraBatchOps === 'function') {
    extraBatchOps(batch);
    hasUpdates = true;
  }

  const groupedItems = new Map();
  for (const item of (sellingBill.items || [])) {
    const medName = (item.itemName || '').trim().toUpperCase();
    const batchNo = (item.batchNo || '').trim().toUpperCase();
    const expiry = (item.expiryDate || '').trim();
    const key = `${medName}__${batchNo}__${expiry}`;
    if (!groupedItems.has(key)) {
      groupedItems.set(key, { ...item, quantity: Number(item.quantity) || 0 });
    } else {
      groupedItems.get(key).quantity += Number(item.quantity) || 0;
    }
  }

  const allStockSnap = await getDocs(collection(db, STOCK_COLLECTION));
  const allStockDocs = allStockSnap.docs;

  for (const item of groupedItems.values()) {
    const medName = (item.itemName || '').trim().toUpperCase();
    const batchNo = (item.batchNo || '').trim().toUpperCase();
    const expiry = (item.expiryDate || '').trim();

    const targetDoc = allStockDocs.find((d) => {
      const data = d.data();
      return (
        (data.medicineName || '').trim().toUpperCase() === medName &&
        (data.batchNo || '').trim().toUpperCase() === batchNo &&
        (!expiry || (data.expiryDate || '').trim() === expiry)
      );
    });

    if (targetDoc) {
      const currentAvailable = Number(targetDoc.data().availableQuantity) || 0;
      const newAvailable = currentAvailable + item.quantity;
      batch.update(doc(db, STOCK_COLLECTION, targetDoc.id), {
        availableQuantity: newAvailable,
        updatedAt: serverTimestamp()
      });
      hasUpdates = true;
    }
  }

  if (hasUpdates) {
    await batch.commit();
  }
}

export async function addSellingBillToFirestore(sellingBillData) {
  // Get or create doctor by name
  let doctor = null;
  if (sellingBillData.doctorName) {
    doctor = await getOrCreateDoctorByName(
      sellingBillData.doctorName,
      sellingBillData.doctorPhone,
      sellingBillData.doctorAddress,
      sellingBillData.doctorTaxId,
      sellingBillData.doctorDlNo
    );
  }
  const doctorId = sellingBillData.doctorId || (doctor ? doctor.id : '');

  const zeroQtyItem = (sellingBillData.items || []).find(i => !i.quantity || Number(i.quantity) <= 0);
  if (zeroQtyItem) {
    throw new Error(
      zeroQtyItem.itemName && zeroQtyItem.itemName.trim()
        ? `Quantity for "${zeroQtyItem.itemName}" must not be 0.`
        : 'Product quantity must not be 0.'
    );
  }

  const formattedItems = (sellingBillData.items || []).map(calculateSellingLineItem);
  const fixedDiscount = Number(sellingBillData.fixedDiscount) || 0;
  const summary = calculateSellingBillSummary(formattedItems, fixedDiscount);
  const isDraft = !!sellingBillData.isDraft;

  const billDocRef = doc(collection(db, COLLECTION_NAME));

  // Determine sequential bill number (starting at 1001)
  let assignedBillNo = sellingBillData.billNo ? String(sellingBillData.billNo).trim() : '';
  if (!assignedBillNo || assignedBillNo.startsWith('#') || assignedBillNo.toUpperCase() === 'AUTO') {
    assignedBillNo = await getNextDoctorBillNumber();
  }

  const sellingBill = new SellingBill({
    id: billDocRef.id,
    billNo: assignedBillNo,
    doctorId: doctorId,
    doctorName: sellingBillData.doctorName || 'Unknown Doctor',
    doctorPhone: sellingBillData.doctorPhone || '',
    doctorAddress: sellingBillData.doctorAddress || (doctor ? doctor.address : '') || '',
    doctorTaxId: sellingBillData.doctorTaxId || (doctor ? doctor.taxId : '') || '',
    doctorDlNo: sellingBillData.doctorDlNo || (doctor ? doctor.dlNo : '') || '',
    invoiceDate: sellingBillData.invoiceDate || new Date().toISOString().split('T')[0],
    notes: sellingBillData.notes || '',
    items: formattedItems,
    summary: summary,
    createdAt: serverTimestamp(),
    isDraft: isDraft,
    stockSynced: false
  });

  if (!isDraft) {
    sellingBill.stockSynced = true;
    // Commit the selling bill document and all stock deductions in the exact same atomic writeBatch
    await deductBillFromStock(sellingBill, (batch) => {
      batch.set(billDocRef, sellingBill.toJson());
    });

    if (doctorId) {
      const billNet = Math.max(0, summary.totalAmount - (summary.fixedDiscount || 0));
      await adjustDoctorBalances(doctorId, billNet, 0);
    }
  } else {
    await setDoc(billDocRef, sellingBill.toJson());
  }

  return SellingBill.fromJson({
    id: billDocRef.id,
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
  const doctor = await getOrCreateDoctorByName(
    sellingBillData.doctorName,
    sellingBillData.doctorPhone,
    sellingBillData.doctorAddress,
    sellingBillData.doctorTaxId,
    sellingBillData.doctorDlNo
  );
  const doctorId = doctor ? doctor.id : '';

  const zeroQtyItem = (sellingBillData.items || []).find(i => !i.quantity || Number(i.quantity) <= 0);
  if (zeroQtyItem) {
    throw new Error(
      zeroQtyItem.itemName && zeroQtyItem.itemName.trim()
        ? `Quantity for "${zeroQtyItem.itemName}" must not be 0.`
        : 'Product quantity must not be 0.'
    );
  }

  const formattedItems = (sellingBillData.items || []).map(calculateSellingLineItem);
  const fixedDiscount = Number(sellingBillData.fixedDiscount) || 0;
  const summary = calculateSellingBillSummary(formattedItems, fixedDiscount);

  const sellingBill = new SellingBill({
    id: sellingBillId,
    billNo: (oldBill && oldBill.billNo) ? oldBill.billNo : (sellingBillData.billNo || ''),
    doctorId: doctorId,
    doctorName: sellingBillData.doctorName,
    doctorPhone: sellingBillData.doctorPhone || '',
    doctorAddress: sellingBillData.doctorAddress || (doctor ? doctor.address : '') || '',
    doctorTaxId: sellingBillData.doctorTaxId || (doctor ? doctor.taxId : '') || '',
    doctorDlNo: sellingBillData.doctorDlNo || (doctor ? doctor.dlNo : '') || '',
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

  const payload = sellingBill.toJson();
  delete payload.createdAt;

  // Apply new published bill stock & doctor totals
  if (!isDraft) {
    sellingBill.stockSynced = true;
    payload.stockSynced = true;
    // Commit stock deduction and bill doc update in the same atomic writeBatch
    await deductBillFromStock(sellingBill, (batch) => {
      batch.update(docRef, payload);
    });

    if (doctorId) {
      const newBillNet = Math.max(0, summary.totalAmount - (summary.fixedDiscount || 0));
      await adjustDoctorBalances(doctorId, newBillNet, 0);
    }
  } else {
    await updateDoc(docRef, payload);
  }

  return SellingBill.fromJson({
    id: sellingBillId,
    ...payload,
    createdAt: sellingBillData.createdAt || new Date().toISOString()
  });
}

export async function publishDraftSellingBillToFirestore(draftSellingBill) {
  const docRef = doc(db, COLLECTION_NAME, draftSellingBill.id);

  // Fetch doctor details
  const doctor = await getOrCreateDoctorByName(
    draftSellingBill.doctorName,
    draftSellingBill.doctorPhone,
    draftSellingBill.doctorAddress,
    draftSellingBill.doctorTaxId,
    draftSellingBill.doctorDlNo
  );
  const doctorId = doctor ? doctor.id : '';

  const zeroQtyItem = (draftSellingBill.items || []).find(i => !i.quantity || Number(i.quantity) <= 0);
  if (zeroQtyItem) {
    throw new Error(
      zeroQtyItem.itemName && zeroQtyItem.itemName.trim()
        ? `Quantity for "${zeroQtyItem.itemName}" must not be 0.`
        : 'Product quantity must not be 0.'
    );
  }

  const formattedItems = (draftSellingBill.items || []).map(calculateSellingLineItem);
  const fixedDiscount = Number(draftSellingBill.summary?.fixedDiscount || draftSellingBill.fixedDiscount) || 0;
  const summary = calculateSellingBillSummary(formattedItems, fixedDiscount);

  const publishedBill = new SellingBill({
    id: draftSellingBill.id,
    billNo: draftSellingBill.billNo,
    doctorId: doctorId,
    doctorName: draftSellingBill.doctorName,
    doctorPhone: draftSellingBill.doctorPhone || '',
    doctorAddress: draftSellingBill.doctorAddress || (doctor ? doctor.address : '') || '',
    doctorTaxId: draftSellingBill.doctorTaxId || (doctor ? doctor.taxId : '') || '',
    doctorDlNo: draftSellingBill.doctorDlNo || (doctor ? doctor.dlNo : '') || '',
    invoiceDate: draftSellingBill.invoiceDate,
    notes: draftSellingBill.notes || '',
    items: formattedItems,
    summary: summary,
    isDraft: false,
    stockSynced: true
  });

  const payload = publishedBill.toJson();
  delete payload.createdAt;

  // Commit published status update and stock deduction together atomically
  await deductBillFromStock(publishedBill, (batch) => {
    batch.update(docRef, payload);
  });

  if (doctorId) {
    const billNet = Math.max(0, summary.totalAmount - (summary.fixedDiscount || 0));
    await adjustDoctorBalances(doctorId, billNet, 0);
  }

  return SellingBill.fromJson({
    id: draftSellingBill.id,
    ...payload,
    createdAt: draftSellingBill.createdAt || new Date().toISOString()
  });
}

const getInvoiceDateTimestamp = (bill) => {
  if (bill.invoiceDate) {
    const t = new Date(bill.invoiceDate).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
};

const getCreatedAtTimestamp = (bill) => {
  if (bill.createdAt) {
    if (typeof bill.createdAt?.toDate === 'function') return bill.createdAt.toDate().getTime();
    if (typeof bill.createdAt === 'string') {
      const t = new Date(bill.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    if (bill.createdAt instanceof Date) return bill.createdAt.getTime();
  }
  return 0;
};

const compareBillsByInvoiceDateDesc = (a, b) => {
  const dateA = getInvoiceDateTimestamp(a);
  const dateB = getInvoiceDateTimestamp(b);
  if (dateA !== dateB) {
    return dateB - dateA;
  }
  return getCreatedAtTimestamp(b) - getCreatedAtTimestamp(a);
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
    sellingBills.sort(compareBillsByInvoiceDateDesc);
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
    sellingBills.sort(compareBillsByInvoiceDateDesc);
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
        // Stock replenishment and bill deletion in the exact same atomic writeBatch
        await addBillBackToStock(oldBill, (batch) => {
          batch.delete(docRef);
        });

        if (oldBill.doctorId) {
          const oldBillNet = Math.max(0, oldBill.summary.totalAmount - (oldBill.summary.fixedDiscount || 0));
          await adjustDoctorBalances(oldBill.doctorId, -oldBillNet, 0);
        }
      } else {
        await deleteDoc(docRef);
      }
    }
    return true;
  } catch (error) {
    console.error('Error deleting selling bill:', error);
    throw error;
  }
}
