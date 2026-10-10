import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SellerDetails } from '../models/settingsModel';

const COLLECTION_NAME = 'settings';
const DOCUMENT_ID = 'store_profile';

/**
 * Fetch seller details from Firestore
 */
export async function fetchSellerDetailsFromFirestore() {
  try {
    const docRef = doc(db, COLLECTION_NAME, DOCUMENT_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return SellerDetails.fromJson(docSnap.data());
    }
    return null;
  } catch (error) {
    console.error('Error fetching seller details from Firestore:', error);
    return null;
  }
}

/**
 * Save seller details to Firestore
 */
export async function saveSellerDetailsToFirestore(details) {
  try {
    const docRef = doc(db, COLLECTION_NAME, DOCUMENT_ID);
    const sellerDetails = new SellerDetails({
      name: details.name.toUpperCase().trim(),
      address: details.address.trim(),
      gstin: details.gstin.toUpperCase().trim(),
      contact: details.contact.trim(),
      updatedAt: serverTimestamp()
    });

    await setDoc(docRef, sellerDetails.toJson());
    return sellerDetails;
  } catch (error) {
    console.error('Error saving seller details to Firestore:', error);
    throw error;
  }
}
