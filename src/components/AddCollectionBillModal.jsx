import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, Check, AlertCircle, HardDrive, Loader2 } from 'lucide-react';
import { calculateLineItem, calculateBillSummary, formatCurrency } from '../utils/calculations';

export default function AddCollectionBillModal({ isOpen, onClose, onSaveCollectionBill, collectionBillToEdit = null }) {
  if (!isOpen) return null;

  const [collectionBillNo, setCollectionBillNo] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState(''); // 'local' | 'firestore'
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState([]);

  // Sync state when modal opens or collectionBillToEdit changes
  useEffect(() => {
    if (collectionBillToEdit) {
      setCollectionBillNo(collectionBillToEdit.billNo || '');
      setSupplierName(collectionBillToEdit.supplierName || '');
      setInvoiceDate(collectionBillToEdit.invoiceDate || new Date().toISOString().split('T')[0]);
      setNotes(collectionBillToEdit.notes || '');
      setItems(collectionBillToEdit.items && collectionBillToEdit.items.length > 0 ? collectionBillToEdit.items : [
        {
          itemName: '',
          quantity: 1,
          batchNo: '',
          expiryDate: '',
          mrp: '',
          doctorDisc: 50,
          discount: 25,
          cgstPercent: 5,
          sgstPercent: 5
        }
      ]);
    } else {
      setCollectionBillNo(`INV-${Date.now().toString().slice(-6)}`);
      setSupplierName('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setItems([
        {
          itemName: '',
          quantity: 1,
          batchNo: '',
          expiryDate: '',
          mrp: '',
          doctorDisc: 50,
          discount: 25,
          cgstPercent: 5,
          sgstPercent: 5
        }
      ]);
    }
    setErrorMessage('');
  }, [collectionBillToEdit, isOpen]);

  // Handle line item field changes
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Add new empty line item
  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        itemName: '',
        quantity: 1,
        batchNo: '',
        expiryDate: '',
        mrp: '',
        doctorDisc: 50,
        discount: 25,
        cgstPercent: 5,
        sgstPercent: 5
      }
    ]);
  };

  // Remove line item row
  const handleRemoveItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate live line items and bill summary
  const calculatedItems = items.map(calculateLineItem);
  const summary = calculateBillSummary(calculatedItems);

  const handleSubmit = async (e, saveMode = 'firestore') => {
    if (e) e.preventDefault();

    if (!supplierName.trim()) {
      setErrorMessage('Please enter the Pharma Supplier Name.');
      return;
    }

    if (items.some(i => !i.itemName.trim())) {
      setErrorMessage('All medicine line items must have a medicine name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitMode(saveMode);
      setErrorMessage('');
      await onSaveCollectionBill({
        billNo: collectionBillNo,
        supplierName,
        invoiceDate,
        notes,
        items: items
      }, collectionBillToEdit ? collectionBillToEdit.id : null, saveMode);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save collection bill.');
    } finally {
      setIsSubmitting(false);
      setSubmitMode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 shadow-sm">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                {collectionBillToEdit ? `Edit Collection Bill (${collectionBillToEdit.billNo})` : 'Collect New Collection Bill'}
              </h3>
              <p className="text-xs text-zinc-400">
                {collectionBillToEdit ? 'Add or modify line items on this collection bill' : 'Record supplier purchase invoice and calculate tax rates'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={(e) => handleSubmit(e, 'firestore')} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Bill Top Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                Bill No <span className="text-zinc-500">*</span>
              </label>
              <input
                type="text"
                value={collectionBillNo}
                onChange={(e) => setCollectionBillNo(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                Pharma Supplier Name <span className="text-zinc-500">*</span>
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Cipla / Sun Pharma"
                required
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none"
              />
            </div>
          </div>

          {/* Medicines Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase text-zinc-300 tracking-wider">
                Medicine Products Collection ({items.length})
              </h4>

              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-x-auto bg-zinc-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[160px]">Medicine Name</th>
                    <th className="py-2.5 px-3 min-w-[70px]">Qty</th>
                    <th className="py-2.5 px-3 min-w-[90px]">Batch No</th>
                    <th className="py-2.5 px-3 min-w-[80px]">Expiry</th>
                    <th className="py-2.5 px-3 min-w-[85px]">MRP (₹)</th>
                    <th className="py-2.5 px-3 min-w-[85px]" title="Doctor Discount % of MRP">Doc Disc (%)</th>
                    <th className="py-2.5 px-3 min-w-[90px]" title="Auto-calculated Doctor Rate">Doc Rate (₹)</th>
                    <th className="py-2.5 px-3 min-w-[80px]" title="Discount % of Doctor Rate">Disc (%)</th>
                    <th className="py-2.5 px-3 min-w-[70px]">CGST (%)</th>
                    <th className="py-2.5 px-3 min-w-[70px]">SGST (%)</th>
                    <th className="py-2.5 px-3 min-w-[90px]">Nett Rate</th>
                    <th className="py-2.5 px-3 min-w-[95px] text-right">Amount (₹)</th>
                    <th className="py-2.5 px-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {items.map((rawItem, index) => {
                    const calc = calculatedItems[index];
                    return (
                      <tr key={index} className="hover:bg-zinc-900/80 transition-colors">
                        {/* Medicine Name */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={rawItem.itemName}
                            onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                            placeholder="e.g. Paracetamol"
                            required
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-200 outline-none"
                          />
                        </td>

                        {/* Quantity */}
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={rawItem.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-200 text-center font-mono outline-none"
                          />
                        </td>

                        {/* Batch No */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={rawItem.batchNo}
                            onChange={(e) => handleItemChange(index, 'batchNo', e.target.value)}
                            placeholder="BATCH-12"
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-200 font-mono outline-none"
                          />
                        </td>

                        {/* Expiry Date */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={rawItem.expiryDate}
                            onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                            placeholder="MM/YY"
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-200 text-center font-mono outline-none"
                          />
                        </td>

                        {/* MRP */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={rawItem.mrp}
                            onChange={(e) => handleItemChange(index, 'mrp', e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-200 text-right font-mono outline-none"
                          />
                        </td>

                        {/* Doctor Disc % */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={rawItem.doctorDisc}
                            onChange={(e) => handleItemChange(index, 'doctorDisc', e.target.value)}
                            placeholder="50"
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-100 font-bold text-center font-mono outline-none"
                          />
                        </td>

                        {/* Calculated Doctor Rate */}
                        <td className="p-2">
                          <div className="w-full bg-zinc-900 border border-zinc-800/80 rounded px-2 py-1 text-xs text-zinc-300 text-right font-mono font-semibold">
                            {calc.doctorRate.toFixed(2)}
                          </div>
                        </td>

                        {/* Discount % */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={rawItem.discount}
                            onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-200 text-center font-mono outline-none"
                          />
                        </td>

                        {/* CGST % */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={rawItem.cgstPercent}
                            onChange={(e) => handleItemChange(index, 'cgstPercent', e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-200 text-center font-mono outline-none"
                          />
                        </td>

                        {/* SGST % */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={rawItem.sgstPercent}
                            onChange={(e) => handleItemChange(index, 'sgstPercent', e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-200 text-center font-mono outline-none"
                          />
                        </td>

                        {/* Nett Rate (Readonly) */}
                        <td className="p-2">
                          <div className="w-full bg-zinc-900 border border-zinc-800/80 rounded px-2 py-1 text-xs text-zinc-300 text-right font-mono">
                            {calc.nettRate.toFixed(2)}
                          </div>
                        </td>

                        {/* Line Amount */}
                        <td className="p-2 text-right">
                          <div className="w-full bg-zinc-900 border border-zinc-800/80 rounded px-2 py-1 text-xs text-zinc-100 font-bold text-right font-mono">
                            {calc.amount.toFixed(2)}
                          </div>
                        </td>

                        {/* Delete Row Button */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(index)}
                            disabled={items.length === 1}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes Input & Financial Summary Box */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                Bill Remarks / Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional supplier notes or batch details..."
                rows="4"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg p-3 text-xs text-zinc-200 outline-none resize-none"
              ></textarea>
            </div>

            {/* Live Financial Summary Box */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-2.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2">
                Realtime Bill Calculation Summary
              </h5>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total Doctor Rate:</span>
                <span className="font-mono font-semibold text-zinc-300">{formatCurrency(summary.totalDoctorRate)}</span>
              </div>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total Discount ({items[0]?.discount || 25}%):</span>
                <span className="font-mono text-zinc-400">-{formatCurrency(summary.totalDiscount)}</span>
              </div>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total CGST Tax:</span>
                <span className="font-mono text-zinc-400">{formatCurrency(summary.totalCgst)}</span>
              </div>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total SGST Tax:</span>
                <span className="font-mono text-zinc-400">{formatCurrency(summary.totalSgst)}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-zinc-100 border-t border-zinc-800 pt-2">
                <span>Grand Total Amount:</span>
                <span className="font-mono text-zinc-100 text-base">{formatCurrency(summary.grandTotal)}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-3">
          {(!collectionBillToEdit || collectionBillToEdit.isDraft) ? (
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'local')}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 text-xs font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-50"
              title="Save as a local draft"
            >
              {isSubmitting && submitMode === 'local' ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              ) : (
                <HardDrive className="h-4 w-4 text-zinc-400" />
              )}
              <span>{isSubmitting && submitMode === 'local' ? 'Saving Draft...' : 'Save as Draft'}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'firestore')}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold px-5 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting && submitMode === 'firestore' ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
              ) : (
                <Check className="h-4 w-4 text-zinc-950" />
              )}
              <span>
                {isSubmitting && submitMode === 'firestore' 
                  ? 'Publishing...' 
                  : collectionBillToEdit ? 'Update & Publish Bill' : 'Save & Publish Bill'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
