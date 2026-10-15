import { useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/calculations';
import SellingBillDetailModal from './SellingBillDetailModal';

export default function DoctorHistoryModal({ 
  isOpen, 
  onClose, 
  doctorObj = null, 
  sellingBills = [], 
  payments = [],
  onDeletePayment 
}) {
  const [selectedBill, setSelectedBill] = useState(null);

  if (!isOpen || !doctorObj) return null;

  const normalizedDoctorName = (doctorObj.name || '').trim().toUpperCase();

  const getInvoiceDateTimestamp = (bill) => {
    if (bill.invoiceDate) {
      const parsed = new Date(bill.invoiceDate).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  };

  const getCreatedAtTimestamp = (bill) => {
    if (bill.createdAt) {
      if (typeof bill.createdAt?.toDate === 'function') {
        return bill.createdAt.toDate().getTime();
      }
      if (typeof bill.createdAt === 'string') {
        const parsed = new Date(bill.createdAt).getTime();
        if (!isNaN(parsed)) return parsed;
      }
      if (bill.createdAt instanceof Date) {
        return bill.createdAt.getTime();
      }
    }
    return 0;
  };

  // Filter bills & payments for this doctor (by doctorId or normalized name)
  const doctorBills = sellingBills
    .filter(b => 
      !b.isDraft && (b.doctorId === doctorObj.id || (b.doctorName && b.doctorName.trim().toUpperCase() === normalizedDoctorName))
    )
    .sort((a, b) => {
      const dateA = getInvoiceDateTimestamp(a);
      const dateB = getInvoiceDateTimestamp(b);
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      return getCreatedAtTimestamp(b) - getCreatedAtTimestamp(a);
    });
  const doctorPayments = payments.filter(p => 
    p.doctorId === doctorObj.id || (p.doctorName && p.doctorName.trim().toUpperCase() === normalizedDoctorName)
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
            <div>
              <h3 className="text-base font-bold text-zinc-100 uppercase tracking-wide">
                {doctorObj.name}'s Account History
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 flex flex-wrap items-center gap-2">
                <span>Comprehensive list of all sales invoices and payment collections</span>
                {(doctorObj.phone || doctorObj.taxId || doctorObj.address) && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-500 font-normal">
                      {[doctorObj.phone, doctorObj.taxId ? `Tax: ${doctorObj.taxId}` : '', doctorObj.address].filter(Boolean).join(' • ')}
                    </span>
                  </>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Ledger Summary Cards */}
          <div className="p-6 grid grid-cols-3 gap-4 border-b border-zinc-900 bg-zinc-900/10">
            <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Purchased</span>
              <h4 className="text-lg font-bold font-mono mt-1 text-zinc-200">{formatCurrency(doctorObj.purchasedAmount)}</h4>
              <p className="text-[9px] text-zinc-500 mt-0.5">{doctorBills.length} invoices issued</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Paid</span>
              <h4 className="text-lg font-bold font-mono mt-1 text-emerald-450">{formatCurrency(doctorObj.paidAmount)}</h4>
              <p className="text-[9px] text-zinc-500 mt-0.5">{doctorPayments.length} receipts recorded</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Current Outstanding Due</span>
              <h4 className="text-lg font-bold font-mono mt-1 text-amber-450">{formatCurrency(doctorObj.dueAmount)}</h4>
              <p className="text-[9px] text-zinc-500 mt-0.5">Net balance pending collection</p>
            </div>
          </div>

          {/* Modal Body / History Tables */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[300px]">
            
            {/* Column 1: Sales Bills */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                <ArrowUpRight className="h-4 w-4 text-zinc-500" />
                Sales Invoices ({doctorBills.length})
              </h4>

              {doctorBills.length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-6 text-center">No sales invoices generated yet.</p>
              ) : (
                <div className="border border-zinc-800 rounded-xl overflow-auto max-h-[300px] bg-zinc-900/30 relative">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 sticky top-0 text-zinc-450 font-semibold border-b border-zinc-800 z-10">
                      <tr>
                        <th className="py-2 px-3">Bill No</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-right">Items</th>
                        <th className="py-2 px-3 text-right">Invoice Net (₹)</th>
                        <th className="py-2 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 font-medium">
                      {doctorBills.map((bill) => (
                        <tr 
                          key={bill.id} 
                          onClick={() => setSelectedBill(bill)}
                          className="hover:bg-zinc-850/80 text-zinc-300 cursor-pointer transition-colors group"
                          title="Click to open invoice details"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                            {bill.billNo}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-450">{formatDate(bill.invoiceDate)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-400">{(bill.items || []).length}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-zinc-200">
                            {bill.summary?.totalAmount?.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="p-1 rounded text-zinc-500 group-hover:text-zinc-200 group-hover:bg-zinc-800 transition-colors inline-flex items-center">
                              <Eye className="h-3.5 w-3.5" />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Column 2: Payment Receipts */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                <ArrowDownLeft className="h-4 w-4 text-emerald-555" />
                Payment Receipts ({doctorPayments.length})
              </h4>

              {doctorPayments.length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-6 text-center">No payments collected yet.</p>
              ) : (
                <div className="border border-zinc-800 rounded-xl overflow-auto max-h-[300px] bg-zinc-900/30 relative">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 sticky top-0 text-zinc-455 font-semibold border-b border-zinc-800 z-10">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Mode</th>
                        <th className="py-2 px-3 text-right">Paid (₹)</th>
                        <th className="py-2 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 font-medium">
                      {doctorPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-zinc-900/60 text-zinc-300">
                          <td className="py-2.5 px-3 text-zinc-450">{formatDate(payment.paymentDate)}</td>
                          <td className="py-2.5 px-3 font-semibold text-zinc-400">{payment.paymentMode}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                            {payment.amount?.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => onDeletePayment(payment.id)}
                              className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete Payment (Revert outstanding dues)"
                            >
                              <Trash2Icon className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
            >
              Close History View
            </button>
          </div>

        </div>
      </div>

      {/* Selling Bill Detail View Modal */}
      <SellingBillDetailModal
        sellingBill={selectedBill}
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        zIndex="z-[70]"
      />
    </>
  );
}

// Simple local TrashIcon definition to avoid importing error
function Trash2Icon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}
