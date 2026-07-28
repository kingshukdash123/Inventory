import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateBillSummary, calculateLineItem } from '../utils/calculations';
import { CollectionBill } from '../models/collectionBillModel';
import { removeBillFromStock } from './stockService';

const COLLECTION_NAME = 'collection_bill';
const DRAFT_STORAGE_KEY = 'inventory_draft_collection_bills_local';

/**
 * ==========================================
 * DRAFT BILLS (LocalStorage Only - Excluded from Official Analytics)
 * ==========================================
 */
export function getDraftCollectionBillsFromLocalStorage() {
  try {
    const data = localStorage.getItem(DRAFT_STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : [];
    return parsed.map(item => CollectionBill.fromJson(item));
  } catch (err) {
    console.error('Error reading draft collection bills from localStorage:', err);
    return [];
  }
}

export function saveDraftCollectionBillsToLocalStorage(draftCollectionBills) {
  try {
    const serialized = draftCollectionBills.map(b => {
      const obj = b instanceof CollectionBill ? b.toJson() : b;
      return { ...obj, id: b.id };
    });
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(serialized));
  } catch (err) {
    console.error('Error saving draft collection bills to localStorage:', err);
  }
}

export function saveSingleDraftCollectionBill(collectionBillData, existingId = null) {
  const formattedItems = (collectionBillData.items || []).map(calculateLineItem);
  const summary = calculateBillSummary(formattedItems);
  const currentDrafts = getDraftCollectionBillsFromLocalStorage();

  const id = existingId || collectionBillData.id || `draft-${Date.now()}`;

  const draftCollectionBill = new CollectionBill({
    id,
    billNo: collectionBillData.billNo || `DRAFT-${Date.now().toString().slice(-6)}`,
    supplierName: collectionBillData.supplierName || 'Draft Supplier',
    invoiceDate: collectionBillData.invoiceDate || new Date().toISOString().split('T')[0],
    notes: collectionBillData.notes || '',
    items: formattedItems,
    summary: summary,
    createdAt: collectionBillData.createdAt || new Date().toISOString(),
    isDraft: true
  });

  let updatedDrafts;
  if (existingId && currentDrafts.some(b => b.id === existingId)) {
    updatedDrafts = currentDrafts.map(b => (b.id === existingId ? draftCollectionBill : b));
  } else {
    updatedDrafts = [draftCollectionBill, ...currentDrafts.filter(b => b.id !== id)];
  }

  saveDraftCollectionBillsToLocalStorage(updatedDrafts);
  return draftCollectionBill;
}

export function deleteDraftCollectionBillFromLocalStorage(draftId) {
  const drafts = getDraftCollectionBillsFromLocalStorage();
  const filtered = drafts.filter(b => b.id !== draftId);
  saveDraftCollectionBillsToLocalStorage(filtered);
  return filtered;
}

/**
 * Publish a Draft Bill from LocalStorage into Official Firebase Firestore
 */
export async function publishDraftCollectionBillToFirestore(draftCollectionBill) {
  const cleanCollectionBill = draftCollectionBill instanceof CollectionBill ? draftCollectionBill : CollectionBill.fromJson(draftCollectionBill);

  // Transform to official collection bill
  const publishedCollectionBill = new CollectionBill({
    billNo: cleanCollectionBill.billNo.startsWith('DRAFT-') ? cleanCollectionBill.billNo.replace('DRAFT-', 'INV-') : cleanCollectionBill.billNo,
    supplierName: cleanCollectionBill.supplierName,
    invoiceDate: cleanCollectionBill.invoiceDate,
    notes: cleanCollectionBill.notes || '',
    items: cleanCollectionBill.items || [],
    summary: cleanCollectionBill.summary || calculateBillSummary(cleanCollectionBill.items),
    createdAt: serverTimestamp(),
    isDraft: false
  });

  // Push to firebase using toJson
  const docRef = await addDoc(collection(db, COLLECTION_NAME), publishedCollectionBill.toJson());

  // Clean up from local draft list
  deleteDraftCollectionBillFromLocalStorage(cleanCollectionBill.id);

  return CollectionBill.fromJson({
    id: docRef.id,
    ...publishedCollectionBill.toJson(),
    createdAt: new Date().toISOString()
  });
}

/**
 * ==========================================
 * OFFICIAL BILLS (Firebase Firestore - Contributes to Analytics)
 * ==========================================
 */
export async function addCollectionBillToFirestore(collectionBillData) {
  const formattedItems = (collectionBillData.items || []).map(calculateLineItem);
  const summary = calculateBillSummary(formattedItems);

  const collectionBill = new CollectionBill({
    billNo: collectionBillData.billNo || `INV-${Date.now().toString().slice(-6)}`,
    supplierName: collectionBillData.supplierName || 'Unknown Supplier',
    invoiceDate: collectionBillData.invoiceDate || new Date().toISOString().split('T')[0],
    notes: collectionBillData.notes || '',
    items: formattedItems,
    summary: summary,
    createdAt: serverTimestamp(),
    isDraft: false
  });

  // Push to Firestore using toJson
  const docRef = await addDoc(collection(db, COLLECTION_NAME), collectionBill.toJson());

  return CollectionBill.fromJson({
    id: docRef.id,
    ...collectionBill.toJson(),
    createdAt: new Date().toISOString()
  });
}

export async function updateCollectionBillInFirestore(collectionBillId, collectionBillData) {
  const formattedItems = (collectionBillData.items || []).map(calculateLineItem);
  const summary = calculateBillSummary(formattedItems);

  const collectionBill = new CollectionBill({
    id: collectionBillId,
    billNo: collectionBillData.billNo,
    supplierName: collectionBillData.supplierName,
    invoiceDate: collectionBillData.invoiceDate,
    notes: collectionBillData.notes || '',
    items: formattedItems,
    summary: summary,
    isDraft: false,
    addedToStock: false // Always reset to false on edit/update
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

export async function fetchCollectionBillsFromFirestore() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const collectionBills = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Fetch data using fromJson model wrapper
      collectionBills.push(CollectionBill.fromJson({
        id: docSnap.id,
        ...data
      }));
    });
    return collectionBills;
  } catch (error) {
    console.error('Firestore fetch error:', error);
    return [];
  }
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
