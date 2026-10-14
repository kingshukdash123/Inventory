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
        contact: ''
      };
    } catch {
      return {
        name: '',
        address: '',
        gstin: '',
        contact: ''
      };
    }
  });

  const duplicateIfSingle = false; // Default to Option B: Top Half only
  const itemsPerFirstHalf = 8;

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
    document.title = `${docName}_${billNum}`;
    window.print();
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
    itemsPerFirstHalf,
    itemsPerContinuationHalf: 12,
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
              Dr. {sellingBill.doctorName} • Bill #{sellingBill.billNo} • {sheets.length} Physical Page{sheets.length > 1 ? 's' : ''}
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
