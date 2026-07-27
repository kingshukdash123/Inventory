import React from 'react';
import { X, Building2, Calendar, FileText, Printer, Edit3, Package } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export default function CollectionBillDetailModal({ collectionBill, isOpen, onClose, onEdit }) {
  if (!isOpen || !collectionBill) return null;

  const summary = collectionBill.summary || {};
  const items = collectionBill.items || [];

  // const handlePrint = () => {
  //   window.print();
  // };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 font-mono font-bold text-sm shadow-sm">
              #
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100 font-mono">{collectionBill.billNo}</h3>
              <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                <span>{collectionBill.supplierName}</span>
                <span>•</span>
                <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                <span>{collectionBill.invoiceDate}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                if (onEdit) onEdit(collectionBill);
              }}
              className="flex items-center gap-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit / Add Items</span>
            </button>
            {/* <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Print Invoice</span>
            </button> */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Notes if present */}
          {collectionBill.notes && (
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-xs text-zinc-300 flex items-start gap-2">
              <FileText className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-200">Bill Remarks: </span>
                {collectionBill.notes}
              </div>
            </div>
          )}

          {/* Products List Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Package className="h-4 w-4 text-zinc-400" />
              Collected Medicines Line Items ({items.length})
            </h4>

            <div className="border border-zinc-800 rounded-xl overflow-x-auto bg-zinc-900/40">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Medicine Item Name</th>
                    <th className="py-3 px-4 text-center">Batch No</th>
                    <th className="py-3 px-4 text-center">Expiry</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">MRP (₹)</th>
                    <th className="py-3 px-4 text-right">Doc Disc (%)</th>
                    <th className="py-3 px-4 text-right">Doc Rate (₹)</th>
                    <th className="py-3 px-4 text-right">Disc (%)</th>
                    <th className="py-3 px-4 text-right">CGST</th>
                    <th className="py-3 px-4 text-right">SGST</th>
                    <th className="py-3 px-4 text-right">Nett Rate</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/80 transition-colors">
                      <td className="py-3 px-4 text-zinc-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-100">{item.itemName}</td>
                      <td className="py-3 px-4 text-center font-mono text-zinc-400">
                        <span className="bg-zinc-800/80 px-2 py-0.5 rounded text-[11px]">{item.batchNo || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-zinc-400">{item.expiryDate || 'N/A'}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-zinc-200">{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-300">₹{item.mrp?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-300 font-semibold">{item.doctorDisc}%</td>
                      <td className="py-3 px-4 text-right font-mono text-sky-300 font-semibold">₹{item.doctorRate?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-400">{item.discount}%</td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-400">₹{item.cgstAmount?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-400">₹{item.sgstAmount?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-300">₹{item.nettRate?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown Summary Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div></div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3 shadow-lg">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2">
                Bill Tax & Total Breakdown Summary
              </h5>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total Doctor Rate:</span>
                <span className="font-mono font-semibold text-sky-300">{formatCurrency(summary.totalDoctorRate)}</span>
              </div>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total Doctor Discount Given:</span>
                <span className="font-mono text-zinc-400">-{formatCurrency(summary.totalDiscount)}</span>
              </div>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total CGST Collected:</span>
                <span className="font-mono text-amber-300">{formatCurrency(summary.totalCgst)}</span>
              </div>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total SGST Collected:</span>
                <span className="font-mono text-amber-300">{formatCurrency(summary.totalSgst)}</span>
              </div>

              <div className="flex justify-between text-base font-bold text-zinc-100 border-t border-zinc-800 pt-3">
                <span>Grand Total Net Amount:</span>
                <span className="font-mono text-emerald-400 text-lg">{formatCurrency(summary.grandTotal)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
          >
            Close Detail View
          </button>
        </div>

      </div>
    </div>
  );
}
