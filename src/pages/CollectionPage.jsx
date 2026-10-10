import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import CollectionBillsList from '../components/CollectionBillsList';
import AddCollectionBillModal from '../components/AddCollectionBillModal';
import CollectionBillDetailModal from '../components/CollectionBillDetailModal';
import { useDialog } from '../context/DialogContext';

import { 
  addCollectionBillToFirestore, 
  updateCollectionBillInFirestore,
  fetchCollectionBillsFromFirestore,
  deleteCollectionBillFromFirestore,
  publishDraftCollectionBillToFirestore,
  subscribeCollectionBills
} from '../services/collectionBillService';
import { addBillToStock } from '../services/stockService';

export default function CollectionPage({ searchQuery }) {
  const [officialCollectionBills, setOfficialCollectionBills] = useState([]);
  const [draftCollectionBills, setDraftCollectionBills] = useState([]);
  const [selectedCollectionBill, setSelectedCollectionBill] = useState(null);
  const [collectionBillToEdit, setCollectionBillToEdit] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { triggerAlert, triggerConfirm } = useDialog();

  // Load data on mount: parallel initial load to show skeleton, followed by real-time sync
  useEffect(() => {
    async function initData() {
      try {
        setIsFetching(true);
        const bills = await fetchCollectionBillsFromFirestore();
        setOfficialCollectionBills(bills.filter(b => !b.isDraft));
        setDraftCollectionBills(bills.filter(b => b.isDraft));
      } catch (error) {
        console.error('Error on initial collection page load:', error);
      } finally {
        setIsFetching(false);
      }
    }

    initData();

    const unsubscribe = subscribeCollectionBills((bills) => {
      setOfficialCollectionBills(bills.filter(b => !b.isDraft));
      setDraftCollectionBills(bills.filter(b => b.isDraft));
    });

    return () => unsubscribe();
  }, []);

  const handleOpenAddCollectionBill = () => {
    setCollectionBillToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditCollectionBill = (collectionBill, isDraft = false) => {
    setCollectionBillToEdit({ ...collectionBill, isDraft });
    setIsAddModalOpen(true);
  };

  // Save new bill OR update existing bill (supports Draft and Published modes directly to Firestore)
  const handleSaveCollectionBill = async (collectionBillData, existingCollectionBillId, saveMode = 'firestore') => {
    const isDraft = saveMode === 'local';

    if (!isDraft) {
      // Ask for confirmation before saving
      const isConfirmed = await triggerConfirm(
        'Save Confirmation',
        existingCollectionBillId && !collectionBillToEdit?.isDraft
          ? `Are you sure you want to update and save changes to bill ${collectionBillData.billNo}?`
          : `Are you sure you want to save bill ${collectionBillData.billNo}? This will add it to your store inventory.`,
        'info',
        'Save Bill'
      );

      if (!isConfirmed) {
        throw new Error('Cancelled');
      }
    }

    try {
      setIsActionLoading(true);
      if (existingCollectionBillId) {
        // Update existing bill (draft or published)
        const updated = await updateCollectionBillInFirestore(existingCollectionBillId, {
          ...collectionBillData,
          isDraft
        });

        if (selectedCollectionBill && selectedCollectionBill.id === existingCollectionBillId) {
          setSelectedCollectionBill(updated);
        }
      } else {
        // Create brand new bill (draft or published)
        await addCollectionBillToFirestore({
          ...collectionBillData,
          isDraft
        });
      }
    } catch (error) {
      console.error('Database save/update bill failed:', error);
      triggerAlert(
        'Error Saving',
        'Failed to save bill. Please check your network connection.',
        'danger'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // Save a Draft Bill directly
  const handlePublishDraftCollectionBill = async (draftCollectionBill) => {
    // Ask for confirmation before saving draft
    const isConfirmed = await triggerConfirm(
      'Save Confirmation',
      `Are you sure you want to save draft bill ${draftCollectionBill.billNo}? This will add it to your store inventory.`,
      'info',
      'Save Bill'
    );

    if (!isConfirmed) return;

    try {
      setIsActionLoading(true);
      const published = await publishDraftCollectionBillToFirestore(draftCollectionBill);
      if (selectedCollectionBill && selectedCollectionBill.id === draftCollectionBill.id) {
        setSelectedCollectionBill(published);
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
      triggerAlert(
        'Save Failed',
        'Failed to save draft bill. Please check your network connection.',
        'danger'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete bill from Firestore (handles stock subtraction automatically in the service)
  const handleDeleteCollectionBill = async (collectionBillId, isDraft = false) => {
    const isConfirmed = await triggerConfirm(
      'Delete Confirmation',
      `Are you sure you want to permanently delete this ${isDraft ? 'draft' : 'saved'} collection bill? This action cannot be undone.`,
      'danger',
      'Delete Bill'
    );

    if (!isConfirmed) return;

    try {
      setIsActionLoading(true);
      await deleteCollectionBillFromFirestore(collectionBillId);
      if (selectedCollectionBill && selectedCollectionBill.id === collectionBillId) {
        setSelectedCollectionBill(null);
      }
    } catch (error) {
      console.error('Database delete failed:', error);
      triggerAlert(
        'Delete Failed',
        'Failed to delete bill. Please check your network connection.',
        'danger'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAddToStock = async (collectionBill) => {
    const isConfirmed = await triggerConfirm(
      'Sync to Stock Confirmation',
      `Are you sure you want to add medicine items from bill ${collectionBill.billNo} to the live stock inventory?`,
      'info',
      'Add to Stock'
    );

    if (!isConfirmed) return;

    try {
      setIsActionLoading(true);
      await addBillToStock(collectionBill);

      // Update state in official bills list
      setOfficialCollectionBills((prev) =>
        prev.map((b) => (b.id === collectionBill.id ? { ...b, addedToStock: true } : b))
      );

      // Update selected bill detail state
      setSelectedCollectionBill((prev) =>
        prev ? { ...prev, addedToStock: true } : null
      );

      triggerAlert(
        'Stock Synchronized',
        `Successfully added bill ${collectionBill.billNo} medicine items to stock inventory!`,
        'success'
      );
    } catch (error) {
      console.error('Failed to add bill to stock:', error);
      triggerAlert(
        'Synchronization Failed',
        'An error occurred while adding items to stock. Please check your network connection.',
        'danger'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <>
      {/* Global Transparent Loader for Async Mutations */}
      {isActionLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] space-y-3">
          <div className="relative flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-zinc-100 animate-spin" />
            <div className="absolute h-14 w-14 border border-zinc-100/20 rounded-full animate-ping"></div>
          </div>
          <span className="text-xs text-zinc-300 font-semibold tracking-wide">Syncing with database...</span>
        </div>
      )}

      <CollectionBillsList
        officialCollectionBills={officialCollectionBills}
        draftCollectionBills={draftCollectionBills}
        searchQuery={searchQuery}
        onSelectCollectionBill={(collectionBill) => setSelectedCollectionBill(collectionBill)}
        onEditCollectionBill={handleOpenEditCollectionBill}
        onDeleteCollectionBill={handleDeleteCollectionBill}
        onOpenAddCollectionBill={handleOpenAddCollectionBill}
        onPublishDraftCollectionBill={handlePublishDraftCollectionBill}
        onAddToStock={handleAddToStock}
        isFetching={isFetching}
      />

      {/* Add / Edit Collection Bill Modal */}
      <AddCollectionBillModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setCollectionBillToEdit(null);
        }}
        onSaveCollectionBill={handleSaveCollectionBill}
        collectionBillToEdit={collectionBillToEdit}
      />

      {/* Collection Bill Detail View Modal */}
      <CollectionBillDetailModal
        collectionBill={selectedCollectionBill}
        isOpen={!!selectedCollectionBill}
        onClose={() => setSelectedCollectionBill(null)}
        onEdit={(collectionBill) => handleOpenEditCollectionBill(collectionBill, collectionBill.isDraft)}
        onAddToStock={handleAddToStock}
      />
    </>
  );
}
