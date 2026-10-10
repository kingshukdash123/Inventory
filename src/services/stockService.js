import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  onSnapshot
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
 * Add a collection bill's items to stock
 */
export async function addBillToStock(collectionBill) {
  // Loop through bill items
  for (const item of collectionBill.items) {
    // Unique Key check: medicineName + batchNo + expiryDate
    const q = query(
      collection(db, COLLECTION_NAME),
      where('medicineName', '==', item.itemName),
      where('batchNo', '==', item.batchNo),
      where('expiryDate', '==', item.expiryDate)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // StockItem exists: update quantities and latest prices
      const stockDoc = querySnapshot.docs[0];
      const stockData = stockDoc.data();
      const existingItem = StockItem.fromJson({ id: stockDoc.id, ...stockData });
      
      const newReceivedQty = existingItem.receivedQuantity + item.quantity;
      const newAvailableQty = existingItem.availableQuantity + item.quantity;
      
      const updatedItem = new StockItem({
        id: existingItem.id,
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
        receivedQuantity: newReceivedQty,
        availableQuantity: newAvailableQty,
        createdAt: existingItem.createdAt,
        updatedAt: serverTimestamp()
      });
      
      const payload = updatedItem.toJson();
      delete payload.createdAt; // Do not overwrite createdAt
      
      await updateDoc(doc(db, COLLECTION_NAME, existingItem.id), payload);
    } else {
      // StockItem doesn't exist: create new stock item
      const newItem = new StockItem({
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
      
      await addDoc(collection(db, COLLECTION_NAME), newItem.toJson());
    }
  }
  
  // Mark bill as added to stock
  await updateDoc(doc(db, 'collection_bill', collectionBill.id), {
    addedToStock: true
  });
}

/**
 * Remove a collection bill's items from stock
 */
export async function removeBillFromStock(collectionBill) {
  for (const item of collectionBill.items) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('medicineName', '==', item.itemName),
      where('batchNo', '==', item.batchNo),
      where('expiryDate', '==', item.expiryDate)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const stockDoc = querySnapshot.docs[0];
      const stockData = stockDoc.data();
      const existingItem = StockItem.fromJson({ id: stockDoc.id, ...stockData });
      
      const newReceivedQty = Math.max(0, existingItem.receivedQuantity - item.quantity);
      const newAvailableQty = Math.max(0, existingItem.availableQuantity - item.quantity);
      
      if (newReceivedQty <= 0 && newAvailableQty <= 0) {
        // Delete stock item entirely if no quantity remains
        await deleteDoc(doc(db, COLLECTION_NAME, existingItem.id));
      } else {
        // Update stock item with decremented quantities
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
        
        await updateDoc(doc(db, COLLECTION_NAME, existingItem.id), payload);
      }
    }
  }
}
