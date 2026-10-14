import { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  History, 
  Plus, 
  TrendingDown, 
  Award,
  Trash2,
  Calendar,
  Loader2,
  UserCheck
} from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import { fetchDoctorsFromFirestore, subscribeDoctors } from '../services/doctorService';
import { fetchPaymentsFromFirestore, addPaymentToFirestore, deletePaymentFromFirestore, subscribePayments } from '../services/paymentService';
import { fetchSellingBillsFromFirestore, subscribeSellingBills } from '../services/sellingBillService';
import { formatCurrency, formatDate } from '../utils/calculations';

// Modals
import AddPaymentModal from '../components/AddPaymentModal';
import DoctorHistoryModal from '../components/DoctorHistoryModal';

export default function PaymentCollectionPage({ searchQuery = '' }) {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'history'
  const [doctors, setDoctors] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sellingBills, setSellingBills] = useState([]);
  
  // Modal states
  const [selectedDoctorForPayment, setSelectedDoctorForPayment] = useState(null);
  const [selectedDoctorForHistory, setSelectedDoctorForHistory] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [isFetching, setIsFetching] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { triggerAlert, triggerConfirm } = useDialog();

  // Load data on mount: parallel initial load to show skeleton, followed by real-time sync
  useEffect(() => {
    async function initData() {
      try {
        setIsFetching(true);
        const [docs, pays, bills] = await Promise.all([
          fetchDoctorsFromFirestore(),
          fetchPaymentsFromFirestore(),
          fetchSellingBillsFromFirestore()
        ]);
        setDoctors(docs);
        setPayments(pays);
        setSellingBills(bills);
      } catch (error) {
        console.error('Error on initial payment collection load:', error);
      } finally {
        setIsFetching(false);
      }
    }

    initData();

    const unsubscribeDoctors = subscribeDoctors(setDoctors);
    const unsubscribePayments = subscribePayments(setPayments);
    const unsubscribeBills = subscribeSellingBills(setSellingBills);

    return () => {
      unsubscribeDoctors();
      unsubscribePayments();
      unsubscribeBills();
    };
  }, []);

  const handleOpenPaymentModal = (doctor) => {
    setSelectedDoctorForPayment(doctor);
    setIsPaymentModalOpen(true);
  };

  const handleOpenHistoryModal = (doctor) => {
    setSelectedDoctorForHistory(doctor);
    setIsHistoryModalOpen(true);
  };

  const handleSavePayment = async (paymentData) => {
    try {
      setIsActionLoading(true);
      await addPaymentToFirestore(paymentData);
      
      triggerAlert(
        'Payment Recorded',
        `Successfully collected payment of ${formatCurrency(paymentData.amount)} from Dr. ${paymentData.doctorName}!`,
        'success'
      );
      
      // Realtime subscription automatically updates lists
    } catch (error) {
      console.error('Failed to record payment:', error);
      triggerAlert(
        'Payment failed',
        'Could not save payment transaction. Check your internet connection.',
        'danger'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    const isConfirmed = await triggerConfirm(
      'Delete Payment Confirmation',
      'Are you sure you want to permanently delete this payment transaction? This will revert the doctor\'s outstanding due balance.',
      'danger',
      'Delete Payment'
    );

    if (!isConfirmed) return;

    try {
      setIsActionLoading(true);
      await deletePaymentFromFirestore(paymentId);
      
      triggerAlert(
        'Payment Deleted',
        'Successfully deleted payment transaction. Account balances updated.',
        'success'
      );

      // Realtime subscription automatically updates lists
      
      // If history modal is currently open, we must also refresh the selectedDoctorForHistory object state
      if (selectedDoctorForHistory) {
        const docs = await fetchDoctorsFromFirestore();
        const updatedDoc = docs.find(d => d.id === selectedDoctorForHistory.id);
        if (updatedDoc) {
          setSelectedDoctorForHistory(updatedDoc);
        }
      }
    } catch (error) {
      console.error('Failed to delete payment:', error);
      triggerAlert(
        'Deletion Failed',
        'Could not delete payment transaction. Check network connection.',
        'danger'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filter lists based on search
  const filteredDoctors = doctors.filter(docObj => 
    docObj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (docObj.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (docObj.address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (docObj.taxId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayments = payments.filter(payObj => 
    payObj.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (formatDate(payObj.paymentDate) || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (payObj.paymentDate || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (payObj.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Aggregated summaries
  const totalOutstanding = doctors.reduce((sum, d) => sum + d.dueAmount, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const activeDoctorsCount = doctors.length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Global Transparent Loader for Async Mutations */}
      {isActionLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] space-y-3">
          <div className="relative flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-zinc-100 animate-spin" />
            <div className="absolute h-14 w-14 border border-zinc-100/20 rounded-full animate-ping"></div>
          </div>
          <span className="text-xs text-zinc-300 font-semibold tracking-wide">Updating balances...</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-zinc-400" />
            Doctor Details
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Track per-doctor analytical purchase history, record payments, and manage outstanding balances.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'analytics'
                ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Doctors & Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Recent Payments</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Outstanding Dues */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Outstanding Dues</span>
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-350 border border-zinc-700/60">
              <TrendingDown className="h-4 w-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-3">
            {isFetching ? (
              <div className="h-7 w-24 bg-zinc-800 rounded animate-pulse mt-1"></div>
            ) : (
              <h3 className="text-2xl font-bold text-amber-400">{formatCurrency(totalOutstanding)}</h3>
            )}
            <p className="text-[11px] text-zinc-500 mt-0.5">Total balance pending collection</p>
          </div>
        </div>

        {/* Total Payments Collected */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Payments Collected</span>
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-350 border border-zinc-700/60">
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            {isFetching ? (
              <div className="h-7 w-24 bg-zinc-800 rounded animate-pulse mt-1"></div>
            ) : (
              <h3 className="text-2xl font-bold text-emerald-400">{formatCurrency(totalCollected)}</h3>
            )}
            <p className="text-[11px] text-zinc-500 mt-0.5">Accumulated collected receipts</p>
          </div>
        </div>

        {/* Active Doctors */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Active Doctor Accounts</span>
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-350 border border-zinc-700/60">
              <Award className="h-4 w-4 text-zinc-200" />
            </div>
          </div>
          <div className="mt-3">
            {isFetching ? (
              <div className="h-7 w-12 bg-zinc-800 rounded animate-pulse mt-1"></div>
            ) : (
              <h3 className="text-2xl font-bold text-zinc-100">{activeDoctorsCount}</h3>
            )}
            <p className="text-[11px] text-zinc-500 mt-0.5">Doctors registered in system</p>
          </div>
        </div>
      </div>



      {/* Main Content Area */}
      <div className="bg-zinc-900/85 border border-zinc-800 rounded-xl overflow-hidden shadow-xl min-h-[300px] relative">
        {activeTab === 'analytics' ? (
          /* Tab: Doctors & Analytics */
          isFetching ? (
            <div className="overflow-auto max-h-[calc(100vh-420px)] min-h-[250px] relative">
              <table className="w-full text-left text-xs text-zinc-350">
                <thead className="bg-zinc-950 sticky top-0 text-zinc-400 font-semibold border-b border-zinc-800 uppercase text-[10px] tracking-wider z-10">
                  <tr>
                    <th className="py-3.5 px-6">Doctor Name</th>
                    <th className="py-3.5 px-6 text-right">Total Purchased (₹)</th>
                    <th className="py-3.5 px-6 text-right">Total Paid (₹)</th>
                    <th className="py-3.5 px-6 text-right">Outstanding Due (₹)</th>
                    <th className="py-3.5 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {[...Array(5)].map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="py-4 px-6"><div className="h-4 bg-zinc-800 rounded w-44"></div></td>
                      <td className="py-4 px-6 text-right"><div className="h-3.5 bg-zinc-800 rounded w-20 ml-auto"></div></td>
                      <td className="py-4 px-6 text-right"><div className="h-3.5 bg-zinc-800 rounded w-20 ml-auto"></div></td>
                      <td className="py-4 px-6 text-right"><div className="h-4 bg-zinc-800 rounded w-24 ml-auto"></div></td>
                      <td className="py-4 px-6 text-center"><div className="h-8 bg-zinc-800 rounded w-48 mx-auto"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users className="h-8 w-8 text-zinc-650 mx-auto" />
              <h4 className="text-sm font-bold text-zinc-300">No Doctors Registered</h4>
              <p className="text-xs text-zinc-550 max-w-sm mx-auto">
                Create a Selling Bill for a doctor to register them and track their financial analytics here.
              </p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-420px)] min-h-[250px] relative">
              <table className="w-full text-left text-xs text-zinc-350">
                <thead className="bg-zinc-950 sticky top-0 text-zinc-400 font-semibold border-b border-zinc-800 uppercase text-[10px] tracking-wider z-10">
                  <tr>
                    <th className="py-3.5 px-6">Doctor Name</th>
                    <th className="py-3.5 px-6 text-right">Total Purchased (₹)</th>
                    <th className="py-3.5 px-6 text-right">Total Paid (₹)</th>
                    <th className="py-3.5 px-6 text-right">Outstanding Due (₹)</th>
                    <th className="py-3.5 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {filteredDoctors.map((docObj) => (
                    <tr 
                      key={docObj.id} 
                      onClick={() => handleOpenHistoryModal(docObj)}
                      className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                      title="Click to view doctor history and analytical transactions"
                    >
                      <td className="py-4 px-6 text-zinc-150">
                        <div className="font-bold uppercase tracking-wide group-hover:text-blue-400 group-hover:underline transition-colors flex items-center gap-1.5">
                          <span>Dr. {docObj.name}</span>
                        </div>
                        {docObj.phone && (
                          <div className="text-[11px] text-zinc-500 font-normal truncate max-w-xs mt-0.5">
                            {docObj.phone}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-semibold text-zinc-300">
                        {formatCurrency(docObj.purchasedAmount)}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-semibold text-emerald-450">
                        {formatCurrency(docObj.paidAmount)}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-amber-400 text-sm">
                        {formatCurrency(docObj.dueAmount)}
                      </td>
                      <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPaymentModal(docObj);
                            }}
                            className="flex items-center gap-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
                          >
                            <Plus className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Collect Payment</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Tab: Recent Payments */
          isFetching ? (
            <div className="overflow-auto max-h-[calc(100vh-420px)] min-h-[250px] relative">
              <table className="w-full text-left text-xs text-zinc-350">
                <thead className="bg-zinc-950 sticky top-0 text-zinc-400 font-semibold border-b border-zinc-800 uppercase text-[10px] tracking-wider z-10">
                  <tr>
                    <th className="py-3.5 px-6">Payment Date</th>
                    <th className="py-3.5 px-6">Doctor Name</th>
                    <th className="py-3.5 px-6">Payment Mode</th>
                    <th className="py-3.5 px-6">Remarks / Notes</th>
                    <th className="py-3.5 px-6 text-right">Amount Collected (₹)</th>
                    <th className="py-3.5 px-6 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {[...Array(5)].map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="py-4 px-6"><div className="h-3.5 bg-zinc-800 rounded w-28"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-zinc-800 rounded w-36"></div></td>
                      <td className="py-4 px-6"><div className="h-5 bg-zinc-800 rounded w-16"></div></td>
                      <td className="py-4 px-6"><div className="h-3.5 bg-zinc-800 rounded w-40"></div></td>
                      <td className="py-4 px-6 text-right"><div className="h-4 bg-zinc-800 rounded w-20 ml-auto font-bold"></div></td>
                      <td className="py-4 px-6 text-center"><div className="h-7 bg-zinc-800 rounded w-7 mx-auto"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <History className="h-8 w-8 text-zinc-650 mx-auto" />
              <h4 className="text-sm font-bold text-zinc-300">No Payments Collected</h4>
              <p className="text-xs text-zinc-550 max-w-sm mx-auto">
                No payment collection transactions have been recorded in the system yet.
              </p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-420px)] min-h-[250px] relative">
              <table className="w-full text-left text-xs text-zinc-350">
                <thead className="bg-zinc-950 sticky top-0 text-zinc-400 font-semibold border-b border-zinc-800 uppercase text-[10px] tracking-wider z-10">
                  <tr>
                    <th className="py-3.5 px-6">Payment Date</th>
                    <th className="py-3.5 px-6">Doctor Name</th>
                    <th className="py-3.5 px-6">Payment Mode</th>
                    <th className="py-3.5 px-6">Remarks / Notes</th>
                    <th className="py-3.5 px-6 text-right">Amount Collected (₹)</th>
                    <th className="py-3.5 px-6 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {filteredPayments.map((payObj) => (
                    <tr key={payObj.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-4 px-6 text-zinc-400 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{formatDate(payObj.paymentDate)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-zinc-150 uppercase">
                        Dr. {payObj.doctorName}
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[11px] font-semibold border border-zinc-700/60">
                          {payObj.paymentMode}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-zinc-400 max-w-xs truncate">
                        {payObj.notes || 'N/A'}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-emerald-450 text-sm">
                        {formatCurrency(payObj.amount)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleDeletePayment(payObj.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-450 hover:text-rose-455 transition-colors"
                          title="Delete Payment (Revert outstanding dues)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Collect Payment Modal */}
      <AddPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedDoctorForPayment(null);
        }}
        onSavePayment={handleSavePayment}
        doctorObj={selectedDoctorForPayment}
      />

      {/* Ledger History Modal */}
      <DoctorHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedDoctorForHistory(null);
        }}
        doctorObj={selectedDoctorForHistory}
        sellingBills={sellingBills}
        payments={payments}
        onDeletePayment={handleDeletePayment}
      />
    </div>
  );
}
