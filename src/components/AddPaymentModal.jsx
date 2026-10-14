import { useState } from 'react';
import { X, Check, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export default function AddPaymentModal({ isOpen, onClose, onSavePayment, doctorObj = null }) {
  const doctorName = doctorObj?.name || '';
  const doctorId = doctorObj?.id || '';
  const currentDue = doctorObj?.dueAmount || 0;

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form inputs when doctorObj changes (adjusting state during render)
  const [prevDocId, setPrevDocId] = useState(doctorObj?.id);
  if (doctorObj?.id !== prevDocId) {
    setPrevDocId(doctorObj?.id);
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('UPI');
    setNotes('');
    setErrorMessage('');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!doctorName || !doctorId) {
      setErrorMessage('Please choose a valid Doctor.');
      return;
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onSavePayment({
        doctorId,
        doctorName,
        amount: amt,
        paymentDate,
        paymentMode,
        notes
      });
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to record payment transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 shadow-sm">
              <DollarSign className="h-5 w-5 text-zinc-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Collect Doctor Payment</h3>
              <p className="text-[11px] text-zinc-500">Record a payment transaction</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
              Doctor Name
            </label>
            <div className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase">
              {doctorName || 'N/A'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Outstanding Due
              </label>
              <div className="w-full bg-zinc-900 border border-zinc-800 text-amber-450 rounded-lg px-3 py-2 text-xs font-mono font-bold">
                {formatCurrency(currentDue)}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Payment Date (DD/MM/YYYY)
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Amount Paid (₹) <span className="text-zinc-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none"
              >
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Cash">Cash Payment</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Cheque">Bank Cheque</option>
                <option value="Bank Transfer">NEFT / IMPS / RTGS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
              Payment Notes / Remarks
            </label>
            <textarea
              placeholder="E.g. Paid in cash, Google Pay Txn ID, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg p-3 text-xs text-zinc-300 outline-none resize-none"
            ></textarea>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-250 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-55"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
              ) : (
                <Check className="h-4 w-4 text-zinc-950" />
              )}
              <span>{isSubmitting ? 'Recording...' : 'Record Payment'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
