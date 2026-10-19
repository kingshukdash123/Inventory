import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Printer, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  FileText, 
  Layers
} from 'lucide-react';
import HalfA4BillSheet from './HalfA4BillSheet';
import { paginateSellingBill } from '../utils/billPagination';
import { fetchSellerDetailsFromFirestore } from '../services/settingsService';

export default function BillPreviewModal({
  isOpen,
  onClose,
  sellingBill,
  zIndex = "z-50"
}) {
  const [zoomLevel, setZoomLevel] = useState(0.85);
  const [sellerDetails, setSellerDetails] = useState(() => {
    try {
      const stored = localStorage.getItem('seller_details');
      return stored ? JSON.parse(stored) : {
        name: '',
        address: '',
        gstin: '',
        dlNo: '',
        contact: ''
      };
    } catch {
      return {
        name: '',
        address: '',
        gstin: '',
        dlNo: '',
        contact: ''
      };
    }
  });

  const duplicateIfSingle = false; // Default to Option B: Top Half only
  const itemsPerSingleHalf = 12;
  const itemsPerContinuationHalf = 16;
  const itemsPerFinalHalf = 12;

  const containerRef = useRef(null);

  // Fetch fresh seller details from Firestore asynchronously on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadFreshSettings() {
      try {
        const details = await fetchSellerDetailsFromFirestore();
        if (details && isMounted) {
          setSellerDetails(details.toJson ? details.toJson() : details);
        }
      } catch (err) {
        console.warn('Could not fetch seller details from Firestore:', err);
      }
    }

    loadFreshSettings();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Set document.title to "Doctor name - Bill no" for PDF save / print default filename
  useEffect(() => {
    if (!isOpen || !sellingBill) return;

    const originalTitle = document.title;
    const docName = (sellingBill.doctorName || 'Doctor').replace(/[<>:"/\\|?*]/g, '').trim();
    const billNum = (sellingBill.billNo || 'Bill').replace(/[<>:"/\\|?*]/g, '').trim();
    document.title = `${docName}_${billNum}`;

    return () => {
      document.title = originalTitle;
    };
  }, [isOpen, sellingBill]);

  const handlePrint = useCallback(() => {
    const docName = (sellingBill?.doctorName || 'Doctor').replace(/[<>:"/\\|?*]/g, '').trim();
    const billNum = (sellingBill?.billNo || 'Bill').replace(/[<>:"/\\|?*]/g, '').trim();
    const printTitle = `${docName}_${billNum}`;
    document.title = printTitle;

    const printableArea = document.getElementById('printable-bill-area');
    if (!printableArea) {
      window.print();
      return;
    }

    // Remove any previously created print iframe
    const existingIframe = document.getElementById('print-invoice-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }

    // Create a hidden print iframe to isolate print rendering from app layout/modals
    const iframe = document.createElement('iframe');
    iframe.id = 'print-invoice-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow.document;
    frameDoc.open();

    // Grab all stylesheet links and style tags from current document
    const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(node => node.outerHTML)
      .join('\n');

    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${printTitle}</title>
          ${headStyles}
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            *, *::before, *::after {
              visibility: visible !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              visibility: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .a4-sheet {
              width: 210mm !important;
              min-width: 210mm !important;
              max-width: 210mm !important;
              height: 297mm !important;
              min-height: 297mm !important;
              max-height: 297mm !important;
              page-break-after: always !important;
              break-after: page !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              border: none !important;
              margin: 0 auto !important;
              padding: 0 !important;
              overflow: hidden !important;
              visibility: visible !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
            }
            .a4-sheet:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            .half-a4-bill {
              width: 210mm !important;
              min-width: 210mm !important;
              max-width: 210mm !important;
              height: 148.5mm !important;
              min-height: 148.5mm !important;
              max-height: 148.5mm !important;
              overflow: hidden !important;
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              background: #ffffff !important;
              visibility: visible !important;
            }
            .print\\:hidden, [class*="print:hidden"], .print-hidden {
              display: none !important;
              visibility: hidden !important;
            }
          </style>
        </head>
        <body style="background: #ffffff; color: #000000; margin: 0; padding: 0;">
          <div id="printable-bill-area" style="width: 210mm; margin: 0 auto;">
            ${printableArea.innerHTML}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    // Allow stylesheets to load, then trigger print dialog
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.warn('Iframe print error, falling back to window.print():', err);
        window.print();
      }
      setTimeout(() => {
        try {
          iframe.remove();
        } catch {}
      }, 3000);
    }, 300);
  }, [sellingBill]);

  // Handle keyboard shortcuts (Escape to close, Ctrl+P to print)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrint]);

  if (!isOpen || !sellingBill) return null;

  const items = sellingBill.items || [];

  // Generate paginated physical A4 sheets
  const sheets = paginateSellingBill(items, {
    itemsPerSingleHalf,
    itemsPerContinuationHalf,
    itemsPerFinalHalf,
    duplicateIfSingle
  });

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(1.3, prev + 0.1));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.5, prev - 0.1));
  };

  const handleResetZoom = () => {
    setZoomLevel(0.85);
  };

  return (
    <div className={`fixed inset-0 ${zIndex} flex flex-col bg-zinc-950/95 backdrop-blur-md overflow-hidden select-none print:static print:bg-white print:p-0 print:overflow-visible`}>
      
      {/* Top Floating Control Bar (Hidden on print) */}
      <div className="h-16 border-b border-zinc-800 bg-zinc-900/90 px-6 flex items-center justify-between shrink-0 print:hidden z-10 shadow-lg">
        
        {/* Left: Info */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 shadow-sm">
            <FileText className="h-5 w-5 text-zinc-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-100 tracking-tight">Print Invoice</h2>
              <span className="text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Half-A4 Format
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {sellingBill.doctorName} • Bill #{sellingBill.billNo} • {sheets.length} Physical Page{sheets.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Center: Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-800 rounded-xl p-1 shadow-inner">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-mono font-semibold text-zinc-300 w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="h-4 w-[1px] bg-zinc-800 mx-1"></div>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right: Print & Close */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow transition-all active:scale-95 cursor-pointer"
            title="Print or Save as PDF (Ctrl + P)"
          >
            <Printer className="h-4 w-4 text-zinc-950" />
            <span>Print Invoice</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close Preview (Escape)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Container with Scaled A4 Sheets */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-8 flex justify-center bg-zinc-950/60 print:p-0 print:m-0 print:overflow-visible print:bg-white"
      >
        <div 
          id="printable-bill-area"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center'
          }}
          className="flex flex-col items-center gap-10 transition-transform duration-150 ease-out print:transform-none print:gap-0 print:w-full print:m-0 print:p-0"
        >
          {sheets.map((sheet) => (
            <div key={sheet.sheetIndex} className="flex flex-col items-center print:m-0 print:p-0">
              
              {/* Sheet Index Badge (Screen only) */}
              <div className="mb-2 text-xs font-mono font-semibold text-zinc-400 flex items-center gap-2 print:hidden">
                <Layers className="h-3.5 w-3.5 text-zinc-500" />
                <span>Physical Sheet {sheet.sheetIndex} of {sheets.length} (A4 Size)</span>
              </div>

              {/* The A4 Page with 2 Halves */}
              <HalfA4BillSheet
                sheet={sheet}
                sellingBill={sellingBill}
                sellerDetails={sellerDetails}
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
