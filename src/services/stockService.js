import {
  collection,
  getDocs,
  doc,
  query,
  serverTimestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { StockItem } from '../models/stockItemModel';

const COLLECTION_NAME = 'stock';

/**
 * Fetch all stock items from Firestore
 */
export async function fetchStockItemsFromFirestore() {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot = await getDocs(q);
    const stockItems = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      stockItems.push(StockItem.fromJson({
        id: docSnap.id,
        ...data
      }));
    });
    stockItems.sort((a, b) =>
      (a.medicineName || '').localeCompare(b.medicineName || '', undefined, { sensitivity: 'base' })
    );
    return stockItems;
  } catch (error) {
    console.error('Error fetching stock items from Firestore:', error);
    return [];
  }
}

/**
 * Real-time listener for stock items
 */
export function subscribeStockItems(onUpdate) {
  const q = query(collection(db, COLLECTION_NAME));
  return onSnapshot(q, (querySnapshot) => {
    const stockItems = [];
    querySnapshot.forEach((docSnap) => {
      stockItems.push(StockItem.fromJson({
        id: docSnap.id,
        ...docSnap.data()
      }));
    });
    stockItems.sort((a, b) =>
      (a.medicineName || '').localeCompare(b.medicineName || '', undefined, { sensitivity: 'base' })
    );
    onUpdate(stockItems);
  }, (error) => {
    console.error('Error in stock items realtime subscription:', error);
    onUpdate([]);
  });
}

/**
 * Add a collection bill's items to stock atomically using writeBatch
 */
export async function addBillToStock(collectionBill) {
  const batch = writeBatch(db);

  // Group items by unique composite key in case the bill has duplicate entries for the same batch
  const groupedItems = new Map();
  for (const item of (collectionBill.items || [])) {
    const medName = (item.itemName || '').trim();
    const batchNo = (item.batchNo || '').trim();
    const expiry = (item.expiryDate || '').trim();
    const key = `${medName.toUpperCase()}__${batchNo.toUpperCase()}__${expiry}`;

    if (!groupedItems.has(key)) {
      groupedItems.set(key, { ...item, quantity: Number(item.quantity) || 0 });
    } else {
      const existing = groupedItems.get(key);
      existing.quantity += Number(item.quantity) || 0;
      // Use latest prices
      existing.mrp = item.mrp;
      existing.nettRate = item.nettRate;
      existing.doctorRate = item.doctorRate;
      existing.doctorDisc = item.doctorDisc;
      existing.discount = item.discount;
      existing.cgstPercent = item.cgstPercent;
      existing.sgstPercent = item.sgstPercent;
    }
  }

  // Pre-fetch all current stock for accurate batch preparation
  const allStockSnap = await getDocs(collection(db, COLLECTION_NAME));
  const allStockDocs = allStockSnap.docs;

  for (const item of groupedItems.values()) {
    const medName = (item.itemName || '').trim().toUpperCase();
    const batchNo = (item.batchNo || '').trim().toUpperCase();
    const expiry = (item.expiryDate || '').trim();

    const existingDoc = allStockDocs.find(d => {
      const data = d.data();
      return (
        (data.medicineName || '').trim().toUpperCase() === medName &&
        (data.batchNo || '').trim().toUpperCase() === batchNo &&
        (data.expiryDate || '').trim() === expiry
      );
    });

    if (existingDoc) {
      const stockData = existingDoc.data();
      const existingItem = StockItem.fromJson({ id: existingDoc.id, ...stockData });
      
      const newReceivedQty = existingItem.receivedQuantity + item.quantity;
      const newAvailableQty = existingItem.availableQuantity + item.quantity;

      const updatedItem = new StockItem({
        id: existingItem.id,
        medicineName: existingItem.medicineName || item.itemName,
        batchNo: existingItem.batchNo || item.batchNo,
        expiryDate: existingItem.expiryDate || item.expiryDate,
        supplierName: collectionBill.supplierName,
        mrp: item.mrp,
        purchaseRate: item.nettRate,
        doctorRate: item.doctorRate,
        doctorDisc: item.doctorDisc,
        discount: item.discount,
        cgstPercent: item.cgstPercent,
        sgstPercent: item.sgstPercent,
        receivedQuantity: newReceivedQty,
        availableQuantity: newAvailableQty,
        createdAt: existingItem.createdAt,
        updatedAt: serverTimestamp()
      });

      const payload = updatedItem.toJson();
      delete payload.createdAt;
      batch.update(doc(db, COLLECTION_NAME, existingItem.id), payload);
    } else {
      const newDocRef = doc(collection(db, COLLECTION_NAME));
      const newItem = new StockItem({
        id: newDocRef.id,
        medicineName: item.itemName,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate,
        supplierName: collectionBill.supplierName,
        mrp: item.mrp,
        purchaseRate: item.nettRate,
        doctorRate: item.doctorRate,
        doctorDisc: item.doctorDisc,
        discount: item.discount,
        cgstPercent: item.cgstPercent,
        sgstPercent: item.sgstPercent,
        receivedQuantity: item.quantity,
        availableQuantity: item.quantity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      batch.set(newDocRef, newItem.toJson());
    }
  }

  // Mark bill as added to stock within the exact same atomic batch!
  if (collectionBill.id) {
    batch.update(doc(db, 'collection_bill', collectionBill.id), {
      addedToStock: true
    });
  }

  await batch.commit();
}

/**
 * Remove a collection bill's items from stock atomically using writeBatch
 */
export async function removeBillFromStock(collectionBill) {
  const batch = writeBatch(db);
  let hasChanges = false;

  const groupedItems = new Map();
  for (const item of (collectionBill.items || [])) {
    const medName = (item.itemName || '').trim();
    const batchNo = (item.batchNo || '').trim();
    const expiry = (item.expiryDate || '').trim();
    const key = `${medName.toUpperCase()}__${batchNo.toUpperCase()}__${expiry}`;

    if (!groupedItems.has(key)) {
      groupedItems.set(key, { ...item, quantity: Number(item.quantity) || 0 });
    } else {
      groupedItems.get(key).quantity += Number(item.quantity) || 0;
    }
  }

  const allStockSnap = await getDocs(collection(db, COLLECTION_NAME));
  const allStockDocs = allStockSnap.docs;

  for (const item of groupedItems.values()) {
    const medName = (item.itemName || '').trim().toUpperCase();
    const batchNo = (item.batchNo || '').trim().toUpperCase();
    const expiry = (item.expiryDate || '').trim();

    const existingDoc = allStockDocs.find(d => {
      const data = d.data();
      return (
        (data.medicineName || '').trim().toUpperCase() === medName &&
        (data.batchNo || '').trim().toUpperCase() === batchNo &&
        (data.expiryDate || '').trim() === expiry
      );
    });

    if (existingDoc) {
      const stockData = existingDoc.data();
      const existingItem = StockItem.fromJson({ id: existingDoc.id, ...stockData });
      
      const newReceivedQty = Math.max(0, existingItem.receivedQuantity - item.quantity);
      const newAvailableQty = Math.max(0, existingItem.availableQuantity - item.quantity);

      if (newReceivedQty <= 0 && newAvailableQty <= 0) {
        batch.delete(doc(db, COLLECTION_NAME, existingItem.id));
      } else {
        const updatedItem = new StockItem({
          id: existingItem.id,
          medicineName: existingItem.medicineName,
          batchNo: existingItem.batchNo,
          expiryDate: existingItem.expiryDate,
          supplierName: existingItem.supplierName,
          mrp: existingItem.mrp,
          purchaseRate: existingItem.purchaseRate,
          doctorRate: existingItem.doctorRate,
          doctorDisc: existingItem.doctorDisc,
          discount: existingItem.discount,
          cgstPercent: existingItem.cgstPercent,
          sgstPercent: existingItem.sgstPercent,
          receivedQuantity: newReceivedQty,
          availableQuantity: newAvailableQty,
          createdAt: existingItem.createdAt,
          updatedAt: serverTimestamp()
        });

        const payload = updatedItem.toJson();
        delete payload.createdAt;
        batch.update(doc(db, COLLECTION_NAME, existingItem.id), payload);
      }
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await batch.commit();
  }
}
