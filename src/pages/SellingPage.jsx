import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import SellingBillsList from '../components/SellingBillsList';
import AddSellingBillModal from '../components/AddSellingBillModal';
import SellingBillDetailModal from '../components/SellingBillDetailModal';
import BillPreviewModal from '../components/BillPreviewModal';
import { useDialog } from '../context/DialogContext';

import { 
  addSellingBillToFirestore, 
  updateSellingBillInFirestore,
  fetchSellingBillsFromFirestore,
  deleteSellingBillFromFirestore,
  publishDraftSellingBillToFirestore,
  subscribeSellingBills
} from '../services/sellingBillService';
import { fetchDoctorsFromFirestore, subscribeDoctors } from '../services/doctorService';

export default function SellingPage({ searchQuery }) {
  const [officialSellingBills, setOfficialSellingBills] = useState([]);
  const [draftSellingBills, setDraftSellingBills] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedSellingBill, setSelectedSellingBill] = useState(null);
  const [sellingBillToEdit, setSellingBillToEdit] = useState(null);
  const [billToPreview, setBillToPreview] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { triggerAlert, triggerConfirm } = useDialog();

  // Load data on mount: parallel initial load to show skeleton, followed by real-time sync
  useEffect(() => {
    async function initData() {
      try {
        setIsFetching(true);
        const [bills, docs] = await Promise.all([
          fetchSellingBillsFromFirestore(),
          fetchDoctorsFromFirestore()
        ]);
        setOfficialSellingBills(bills.filter(b => !b.isDraft));
        setDraftSellingBills(bills.filter(b => b.isDraft));
        setDoctors(docs);
      } catch (error) {
        console.error('Error on initial selling page load:', error);
      } finally {
        setIsFetching(false);
      }
    }

    initData();

    const unsubscribeBills = subscribeSellingBills((bills) => {
      setOfficialSellingBills(bills.filter(b => !b.isDraft));
      setDraftSellingBills(bills.filter(b => b.isDraft));
    });

    const unsubscribeDoctors = subscribeDoctors(setDoctors);

    return () => {
      unsubscribeBills();
      unsubscribeDoctors();
    };
  }, []);

  const handleOpenAddSellingBill = () => {
    setSellingBillToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditSellingBill = (sellingBill, isDraft = false) => {
    setSellingBillToEdit({ ...sellingBill, isDraft });
    setIsAddModalOpen(true);
  };

  // Save new bill OR update existing bill (supports Draft and Published modes)
  const handleSaveSellingBill = async (sellingBillData, existingSellingBillId, saveMode = 'firestore') => {
    const isDraft = saveMode === 'local';

    if (!isDraft) {
      const isConfirmed = await triggerConfirm(
        'Save Invoice Confirmation',
        existingSellingBillId && !sellingBillToEdit?.isDraft
          ? `Are you sure you want to update and save changes to selling bill ${sellingBillData.billNo}?`
          : `Are you sure you want to save doctor bill ${sellingBillData.billNo}? This will update medicine stock and doctor balance.`,
        'info',
        'Save Invoice'
      );

      if (!isConfirmed) {
        throw new Error('Cancelled');
      }
    }

    try {
      setIsActionLoading(true);
      let result = null;
      if (existingSellingBillId) {
        // Update existing bill (draft or published)
        result = await updateSellingBillInFirestore(existingSellingBillId, {
          ...sellingBillData,
          isDraft
        });

        if (selectedSellingBill && selectedSellingBill.id === existingSellingBillId) {
          setSelectedSellingBill(result);
        }
      } else {
        // Create brand new bill (draft or published)
        result = await addSellingBillToFirestore({
          ...sellingBillData,
          isDraft
        });
      }
      
      // Refresh doctor balances in dashboard card
      const docs = await fetchDoctorsFromFirestore();
      setDoctors(docs);

      return result;

    } catch (error) {
      console.error('Database save/update bill failed:', error);
      triggerAlert(
        'Error Saving',
        'Failed to save selling bill. Verify connection and stock levels.',
        'danger'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // Save a Draft Bill directly
  const handlePublishDraftSellingBill = async (draftSellingBill) => {
    const isConfirmed = await triggerConfirm(
      'Save Invoice Confirmation',
      `Are you sure you want to save draft selling bill ${draftSellingBill.billNo}? This will update medicine stock and doctor balance.`,
      'info',
      'Save Invoice'
    );

    if (!isConfirmed) return;

    try {
      setIsActionLoading(true);
      const published = await publishDraftSellingBillToFirestore(draftSellingBill);
      if (selectedSellingBill && selectedSellingBill.id === draftSellingBill.id) {
        setSelectedSellingBill(published);
      }
      
      // Refresh doctor dues
      const docs = await fetchDoctorsFromFirestore();
      setDoctors(docs);

    } catch (error) {
      console.error('Failed to save draft:', error);
      triggerAlert(
        'Save Failed',
        'Failed to save draft selling bill. Check connection or stock availability.',
        'danger'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete bill from Firestore (reverts stock and doctor balances automatically)
  const handleDeleteSellingBill = async (sellingBillId, isDraft = false) => {
    const isConfirmed = await triggerConfirm(
      'Delete Invoice Confirmation',
      `Are you sure you want to permanently delete this ${isDraft ? 'draft' : 'saved'} selling invoice? Reverting this action will restock medicines and reduce doctor outstanding dues.`,
      'danger',
      'Delete Invoice'
    );

    if (!isConfirmed) return;

    try {
      setIsActionLoading(true);
      await deleteSellingBillFromFirestore(sellingBillId);
      if (selectedSellingBill && selectedSellingBill.id === sellingBillId) {
        setSelectedSellingBill(null);
      }

      // Refresh doctor balances
      const docs = await fetchDoctorsFromFirestore();
      setDoctors(docs);

    } catch (error) {
      console.error('Database delete failed:', error);
      triggerAlert(
        'Delete Failed',
        'Failed to delete selling bill. Please check your network connection.',
        'danger'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // Calculate sum of outstanding dues from the doctor list
  const totalOutstandingDues = doctors.reduce((sum, d) => sum + (d.dueAmount || 0), 0);

  return (
    <>
      {/* Global Transparent Loader for Async Mutations */}
      {isActionLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] space-y-3">
          <div className="relative flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-zinc-100 animate-spin" />
            <div className="absolute h-14 w-14 border border-zinc-100/20 rounded-full animate-ping"></div>
          </div>
          <span className="text-xs text-zinc-300 font-semibold tracking-wide">Saving bill details...</span>
        </div>
      )}

      <SellingBillsList
        officialSellingBills={officialSellingBills}
        draftSellingBills={draftSellingBills}
        totalOutstandingDues={totalOutstandingDues}
        searchQuery={searchQuery}
        onSelectSellingBill={(sellingBill) => setSelectedSellingBill(sellingBill)}
        onEditSellingBill={handleOpenEditSellingBill}
        onDeleteSellingBill={handleDeleteSellingBill}
        onOpenAddSellingBill={handleOpenAddSellingBill}
        onPublishDraftSellingBill={handlePublishDraftSellingBill}
        onPrintSellingBill={(sellingBill) => setBillToPreview(sellingBill)}
        isFetching={isFetching}
      />

      {/* Add / Edit Selling Bill Modal */}
      <AddSellingBillModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSellingBillToEdit(null);
        }}
        onSaveSellingBill={handleSaveSellingBill}
        onPrint={(sellingBill) => setBillToPreview(sellingBill)}
        sellingBillToEdit={sellingBillToEdit}
        sellingBills={officialSellingBills}
      />

      {/* Selling Bill Detail View Modal */}
      <SellingBillDetailModal
        sellingBill={selectedSellingBill}
        isOpen={!!selectedSellingBill}
        onClose={() => setSelectedSellingBill(null)}
        onEdit={(sellingBill) => handleOpenEditSellingBill(sellingBill, sellingBill.isDraft)}
        onPrint={(sellingBill) => setBillToPreview(sellingBill)}
      />

      {/* Half-A4 Selling Bill Print Preview Modal */}
      <BillPreviewModal
        isOpen={!!billToPreview}
        onClose={() => setBillToPreview(null)}
        sellingBill={billToPreview}
      />
    </>
  );
}
