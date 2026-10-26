import { Scissors } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/calculations';

export default function HalfA4Bill({
  pageData,
  sellingBill,
  sellerDetails = {},
  isBlankCutPlaceholder = false
}) {
  // Option B: If bottom half is left blank with a cutting guide
  if (isBlankCutPlaceholder || !pageData) {
    return (
      <div className="half-a4-bill w-[210mm] h-[148.5mm] max-h-[148.5mm] box-border p-6 flex flex-col items-center justify-center bg-white text-zinc-400 select-none overflow-hidden print:border-none">
        <div className="w-full h-full border border-dashed border-zinc-250 rounded-lg flex flex-col items-center justify-center gap-2 bg-zinc-50/30 print:hidden">
          <Scissors className="h-4 w-4 rotate-90 text-zinc-400" />
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            Bottom Half (Blank for Cutting)
          </p>
        </div>
      </div>
    );
  }

  const {
    pageNumber,
    totalPages,
    items = [],
    startIndex = 0,
    isFinal = true
  } = pageData;

  const summary = sellingBill?.summary || {};
  const pageSubtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const isValidInfo = (val) => {
    if (!val || typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (!trimmed) return false;
    const upper = trimmed.toUpperCase();
    return upper !== 'N/A' && upper !== 'NONE' && upper !== '-' && upper !== 'NULL' && upper !== 'UNDEFINED';
  };

  const sellerAddress = isValidInfo(sellerDetails?.address) ? sellerDetails.address.trim() : null;
  const sellerContact = isValidInfo(sellerDetails?.contact) ? sellerDetails.contact.trim() : null;
  const sellerGstin = isValidInfo(sellerDetails?.gstin) ? sellerDetails.gstin.trim() : null;
  const sellerDlNo = isValidInfo(sellerDetails?.dlNo) ? sellerDetails.dlNo.trim() : null;

  const docAddress = isValidInfo(sellingBill?.doctorAddress) ? sellingBill.doctorAddress.trim() : null;
  const docTaxId = isValidInfo(sellingBill?.doctorTaxId) ? sellingBill.doctorTaxId.trim() : null;
  const docDlNo = isValidInfo(sellingBill?.doctorDlNo || sellingBill?.dlNo) ? (sellingBill.doctorDlNo || sellingBill.dlNo).trim() : null;
  const docPhone = isValidInfo(sellingBill?.doctorPhone) ? sellingBill.doctorPhone.trim() : null;

  return (
    <div className="half-a4-bill w-[210mm] h-[148.5mm] max-h-[148.5mm] box-border px-[7mm] py-[5mm] bg-white text-black flex flex-col justify-between overflow-hidden relative font-sans leading-none">
      
      {/* Top Header: Clean & Perfectly Aligned (No Tax Invoice or Original badges) */}
      <div>
        <div className="flex items-start justify-between border-b border-zinc-300 pb-2 gap-4">
          
          {/* Seller Details (Left) */}
          <div className="w-[50%] flex flex-col space-y-1">
            <h2 className="text-[15px] font-bold uppercase tracking-tight text-black font-sans leading-tight">
              {sellerDetails.name || 'STORE NAME'}
            </h2>
            
            {(sellerAddress || sellerContact) && (
              <p className="text-[11px] text-zinc-800 leading-tight">
                {sellerAddress && (
                  <span>
                    <strong className="text-black">Address:</strong> {sellerAddress}
                  </span>
                )}
                {sellerAddress && sellerContact && <span> . </span>}
                {sellerContact && (
                  <span>
                    <strong className="text-black">Phone:</strong> {sellerContact}
                  </span>
                )}
              </p>
            )}

            {(sellerGstin || sellerDlNo) && (
              <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-zinc-800 pt-0.5">
                {sellerGstin && (
                  <span>
                    <strong className="text-black">Tax ID:</strong>{' '}
                    <span className="font-mono font-semibold">{sellerGstin}</span>
                  </span>
                )}
                {sellerDlNo && (
                  <span>
                    <strong className="text-black">DL No:</strong>{' '}
                    <span className="font-mono font-semibold">{sellerDlNo}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Document & Doctor Details (Right) - Clean & Perfectly Aligned */}
          <div className="w-[50%] text-right flex flex-col space-y-1">
            <div className="flex items-center justify-end gap-3 text-[11.5px] text-zinc-800">
              <span>
                <strong className="text-black">Inv No:</strong>{' '}
                <span className="font-mono font-bold text-black text-[13px]">{sellingBill.billNo || 'N/A'}</span>
              </span>
              <span>•</span>
              <span>
                <strong className="text-black">Date:</strong> {formatDate(sellingBill.invoiceDate)}
              </span>
            </div>

            <div className="text-[11.5px] text-zinc-800 pt-0.5">
              <span className="text-zinc-600">Billed To: </span>
              <span className="font-bold text-[13px] text-black">{sellingBill.doctorName || 'Customer'}</span>
            </div>

            {(docAddress || docPhone) && (
              <div className="text-[10.5px] text-zinc-800 leading-tight truncate max-w-full">
                {docAddress && (
                  <span>
                    <strong className="text-black">Address:</strong> {docAddress}
                  </span>
                )}
                {docAddress && docPhone && <span> . </span>}
                {docPhone && (
                  <span>
                    <strong className="text-black">Phone:</strong> {docPhone}
                  </span>
                )}
              </div>
            )}

            {(docTaxId || docDlNo) && (
              <div className="flex items-center justify-end gap-x-3 text-[10.5px] text-zinc-800 pt-0.5">
                {docTaxId && (
                  <span>
                    <strong className="text-black">Tax ID:</strong>{' '}
                    <span className="font-mono font-semibold">{docTaxId}</span>
                  </span>
                )}
                {docDlNo && (
                  <span>
                    <strong className="text-black">DL No:</strong>{' '}
                    <span className="font-mono font-semibold">{docDlNo}</span>
                  </span>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Medicine Product Line Items Table: Clean, subtle black-and-white borders */}
        <div className="mt-1.5 border border-zinc-300 rounded-none overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100 text-black font-bold uppercase text-[9.5px] border-b border-zinc-300">
                <th className="py-1 px-1.5 w-[4%] text-center border-r border-zinc-250">S.N.</th>
                <th className="py-1 px-2 w-[31%] border-r border-zinc-250">Product / Medicine Name</th>
                <th className="py-1 px-1.5 w-[11%] text-center border-r border-zinc-250">Batch</th>
                <th className="py-1 px-1.5 w-[8%] text-center border-r border-zinc-250">Exp.</th>
                <th className="py-1 px-1.5 w-[6%] text-center border-r border-zinc-250">Qty</th>
                <th className="py-1 px-1 w-[7%] text-right border-r border-zinc-250">MRP</th>
                <th className="py-1 px-1 w-[7%] text-right border-r border-zinc-250">Rate</th>
                <th className="py-1 px-1 w-[5.5%] text-right border-r border-zinc-250">CGST%</th>
                <th className="py-1 px-1 w-[5.5%] text-right border-r border-zinc-250">SGST%</th>
                <th className="py-1 px-2 w-[15%] text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-[9px] text-black">
              {items.map((item, idx) => {
                const globalIndex = startIndex + idx + 1;
                const cgst = item.cgstPercent !== undefined && item.cgstPercent !== null ? item.cgstPercent : 2.5;
                const sgst = item.sgstPercent !== undefined && item.sgstPercent !== null ? item.sgstPercent : 2.5;

                return (
                  <tr key={idx} className="leading-tight">
                    <td className="py-1 px-1.5 text-center text-zinc-600 border-r border-zinc-200">
                      {globalIndex}
                    </td>
                    <td className="py-1 px-2 font-medium text-black border-r border-zinc-200 truncate max-w-[200px]">
                      {item.itemName}
                    </td>
                    <td className="py-1 px-1.5 text-center font-mono text-zinc-700 border-r border-zinc-200">
                      {item.batchNo || '-'}
                    </td>
                    <td className="py-1 px-1.5 text-center font-mono text-zinc-700 border-r border-zinc-200">
                      {item.expiryDate || '-'}
                    </td>
                    <td className="py-1 px-1.5 text-center font-bold text-black border-r border-zinc-200">
                      {item.quantity}
                    </td>
                    <td className="py-1 px-1 text-right font-mono text-zinc-700 border-r border-zinc-200">
                      {Number(item.mrp || 0).toFixed(2)}
                    </td>
                    <td className="py-1 px-1 text-right font-mono text-zinc-800 border-r border-zinc-200">
                      {Number(item.rate || 0).toFixed(2)}
                    </td>
                    <td className="py-1 px-1 text-right font-mono text-zinc-600 border-r border-zinc-200">
                      {cgst ? `${cgst}%` : '0%'}
                    </td>
                    <td className="py-1 px-1 text-right font-mono text-zinc-600 border-r border-zinc-200">
                      {sgst ? `${sgst}%` : '0%'}
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-bold text-black">
                      {Number(item.amount || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Continuation Notice if not final page */}
      {!isFinal && (
        <div className="grid grid-cols-3 items-center border border-zinc-300 bg-zinc-50 px-3 py-1 text-[9px] font-bold text-black mt-1">
          <span className="text-left font-bold text-black">
            Subtotal: ₹{pageSubtotal.toFixed(2)}
          </span>
          <span className="text-center text-zinc-600 font-semibold">
            Page {pageNumber} of {totalPages}
          </span>
          <span className="text-right text-zinc-600 font-medium">
            ... Continued on next page (Page {pageNumber + 1}) ➔
          </span>
        </div>
      )}

      {/* Bottom Footer: Strictly ONLY printed on date & business signature on left, Bill Summary on right */}
      {isFinal && (
        <div className="mt-1 pt-1.5 border-t border-zinc-300 flex items-end justify-between gap-4">
          
          {/* Bottom Left: ONLY Printed on Date & Business Signature */}
          <div className="w-[38%] flex flex-col justify-end space-y-3">
            <div className="text-[9px] text-zinc-600">
              Printed on: {new Date().toLocaleDateString('en-IN')}
            </div>

            <div>
              <div className="h-10"></div>
              <p className="text-[8.5px] border-t border-zinc-400 font-medium text-black uppercase pt-1 tracking-wider inline-block min-w-[140px]">
                Authorized Signatory
              </p>
            </div>
          </div>

          {/* In between of Signature and Bill Summary: Page number */}
          <div className="flex-1 flex flex-col items-center justify-end pb-1">
            <span className="text-[9.5px] font-semibold text-zinc-600 tracking-wide">
              Page {pageNumber} of {totalPages}
            </span>
          </div>

          {/* Bottom Right: Bill Summary Box (Clean Black & White, No Colors, No Hard Borders) */}
          <div className="w-[45%] border border-zinc-300 rounded-none bg-zinc-50/50 p-2 space-y-1 shadow-none">
            <div className="text-[9px] font-bold uppercase tracking-wider text-black border-b border-zinc-300 pb-1">
              <span>Bill Summary</span>
            </div>

            <div className="flex justify-between text-[9px] text-zinc-800">
              <span>Items Total (Net):</span>
              <span className="font-mono font-semibold text-black">{formatCurrency(summary.totalAmount)}</span>
            </div>

            <div className="flex justify-between text-[9px] text-zinc-800">
              <span>Total GST:</span>
              <span className="font-mono text-black">{formatCurrency(summary.totalGst)}</span>
            </div>

            {/* Initial Due and Prev Due combined and shown as Previous Due */}
            <div className="flex justify-between text-[9px] text-zinc-800">
              <span>Previous Due:</span>
              <span className="font-mono text-black">
                {formatCurrency((Number(summary.prevDue) || 0) + (Number(summary.initialDue) || 0))}
              </span>
            </div>

            {Number(summary.fixedDiscount) > 0 && (
              <div className="flex justify-between text-[9px] text-zinc-800">
                <span>Fixed Discount:</span>
                <span className="font-mono text-black">- {formatCurrency(summary.fixedDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-[11px] font-bold text-black border-t border-zinc-400 pt-1.5 mt-0.5">
              <span>GRAND TOTAL:</span>
              <span className="font-mono text-black text-[12px] font-bold">
                {formatCurrency(summary.grandTotal)}
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
