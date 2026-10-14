import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateBillSummary, calculateLineItem } from '../utils/calculations';
import { CollectionBill } from '../models/collectionBillModel';
import { addBillToStock, removeBillFromStock } from './stockService';

const COLLECTION_NAME = 'collection_bill';

/**
 * ==========================================
 * OFFICIAL & DRAFT BILLS (Firebase Firestore)
 * ==========================================
 */

export async function addCollectionBillToFirestore(collectionBillData) {
  const formattedItems = (collectionBillData.items || []).map(calculateLineItem);
  const summary = calculateBillSummary(formattedItems);
  const isDraft = !!collectionBillData.isDraft;

  const collectionBill = new CollectionBill({
    billNo: collectionBillData.billNo || `INV-${Date.now().toString().slice(-6)}`,
    supplierName: collectionBillData.supplierName || 'Unknown Supplier',
    invoiceDate: collectionBillData.invoiceDate || new Date().toISOString().split('T')[0],
    notes: collectionBillData.notes || '',
    items: formattedItems,
    summary: summary,
    createdAt: serverTimestamp(),
    isDraft: isDraft,
    addedToStock: false
  });

  // Push to Firestore using toJson
  const docRef = await addDoc(collection(db, COLLECTION_NAME), collectionBill.toJson());
  collectionBill.id = docRef.id;

  if (!isDraft) {
    await addBillToStock(collectionBill);
    collectionBill.addedToStock = true;
  }

  return CollectionBill.fromJson({
    id: docRef.id,
    ...collectionBill.toJson(),
    createdAt: new Date().toISOString()
  });
}

export async function updateCollectionBillInFirestore(collectionBillId, collectionBillData) {
  const formattedItems = (collectionBillData.items || []).map(calculateLineItem);
  const summary = calculateBillSummary(formattedItems);
  const isDraft = !!collectionBillData.isDraft;

  const collectionBill = new CollectionBill({
    id: collectionBillId,
    billNo: collectionBillData.billNo,
    supplierName: collectionBillData.supplierName,
    invoiceDate: collectionBillData.invoiceDate,
    notes: collectionBillData.notes || '',
    items: formattedItems,
    summary: summary,
    isDraft: isDraft,
    addedToStock: false // Will be set below if not draft
  });

  const docRef = doc(db, COLLECTION_NAME, collectionBillId);

  // Revert old stock if the original bill was already synced
  const oldDocSnap = await getDoc(docRef);
  if (oldDocSnap.exists()) {
    const oldData = oldDocSnap.data();
    if (oldData.addedToStock) {
      const oldBill = CollectionBill.fromJson({ id: collectionBillId, ...oldData });
      await removeBillFromStock(oldBill);
    }
  }

  if (!isDraft) {
    await addBillToStock(collectionBill);
    collectionBill.addedToStock = true;
  }

  // Build clean payload for update
  const payload = collectionBill.toJson();
  delete payload.createdAt; // Prevent overwriting original createdAt on update

  await updateDoc(docRef, payload);

  return CollectionBill.fromJson({
    id: collectionBillId,
    ...payload,
    createdAt: collectionBillData.createdAt || new Date().toISOString()
  });
}

/**
 * Publish a Draft Bill directly in Firestore
 */
export async function publishDraftCollectionBillToFirestore(draftCollectionBill) {
  const docRef = doc(db, COLLECTION_NAME, draftCollectionBill.id);

  const formattedItems = (draftCollectionBill.items || []).map(calculateLineItem);
  const summary = calculateBillSummary(formattedItems);

  const publishedCollectionBill = new CollectionBill({
    id: draftCollectionBill.id,
    billNo: draftCollectionBill.billNo.startsWith('DRAFT-') ? draftCollectionBill.billNo.replace('DRAFT-', 'INV-') : draftCollectionBill.billNo,
    supplierName: draftCollectionBill.supplierName,
    invoiceDate: draftCollectionBill.invoiceDate,
    notes: draftCollectionBill.notes || '',
    items: formattedItems,
    summary: summary,
    isDraft: false,
    addedToStock: false // Will be set below
  });

  // Add to stock
  await addBillToStock(publishedCollectionBill);
  publishedCollectionBill.addedToStock = true;

  const payload = publishedCollectionBill.toJson();
  delete payload.createdAt; // Prevent overwriting original createdAt on update

  await updateDoc(docRef, payload);

  return CollectionBill.fromJson({
    id: draftCollectionBill.id,
    ...payload,
    createdAt: draftCollectionBill.createdAt || new Date().toISOString()
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

export async function fetchCollectionBillsFromFirestore() {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot = await getDocs(q);
    const collectionBills = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      collectionBills.push(CollectionBill.fromJson({
        id: docSnap.id,
        ...data
      }));
    });
    collectionBills.sort(compareBillsByInvoiceDateDesc);
    return collectionBills;
  } catch (error) {
    console.error('Firestore fetch error:', error);
    return [];
  }
}

/**
 * Real-time listener for collection bills
 */
export function subscribeCollectionBills(onUpdate) {
  const q = query(collection(db, COLLECTION_NAME));
  return onSnapshot(q, (querySnapshot) => {
    const collectionBills = [];
    querySnapshot.forEach((docSnap) => {
      collectionBills.push(CollectionBill.fromJson({
        id: docSnap.id,
        ...docSnap.data()
      }));
    });
    collectionBills.sort(compareBillsByInvoiceDateDesc);
    onUpdate(collectionBills);
  }, (error) => {
    console.error('Error in collection bills realtime subscription:', error);
    onUpdate([]);
  });
}

export async function deleteCollectionBillFromFirestore(collectionBillId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, collectionBillId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.addedToStock) {
        const bill = CollectionBill.fromJson({ id: docSnap.id, ...data });
        await removeBillFromStock(bill);
      }
    }
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting collection bill from Firestore:', error);
    throw error;
  }
}
