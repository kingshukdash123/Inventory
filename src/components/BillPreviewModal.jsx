import { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  FileText, 
  Check, 
  Layers, 
  Scissors, 
  Copy
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
  const [sellerDetails, setSellerDetails] = useState({
    name: '',
    address: '',
    gstin: '',
    contact: ''
  });
  const [duplicateIfSingle, setDuplicateIfSingle] = useState(false); // Default to Option B: Top Half only
  const [itemsPerFirstHalf, setItemsPerFirstHalf] = useState(8);

  const containerRef = useRef(null);

  // Load seller details on mount / open
  useEffect(() => {
    if (!isOpen) return;

    // 1. Instant fallback from localStorage
    try {
      const stored = localStorage.getItem('seller_details');
      if (stored) {
        setSellerDetails(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not read seller_details from localStorage:', e);
    }

    // 2. Fetch fresh details from Firestore
    async function loadFreshSettings() {
      try {
        const details = await fetchSellerDetailsFromFirestore();
        if (details) {
          setSellerDetails(details.toJson ? details.toJson() : details);
        }
      } catch (err) {
        console.warn('Could not fetch seller details from Firestore:', err);
      }
    }

    loadFreshSettings();
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
  }, [isOpen]);

  if (!isOpen || !sellingBill) return null;

  const items = sellingBill.items || [];

  // Generate paginated physical A4 sheets
  const sheets = paginateSellingBill(items, {
    itemsPerFirstHalf,
    itemsPerContinuationHalf: 12,
    duplicateIfSingle
  });

  const isSinglePage = items.length <= itemsPerFirstHalf;

  const handlePrint = () => {
    const docName = (sellingBill?.doctorName || 'Doctor').replace(/[<>:"/\\|?*]/g, '').trim();
    const billNum = (sellingBill?.billNo || 'Bill').replace(/[<>:"/\\|?*]/g, '').trim();
    document.title = `${docName}_${billNum}`;
    window.print();
  };

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
    <div className={`fixed inset-0 ${zIndex} flex flex-col bg-zinc-950/90 backdrop-blur-md overflow-hidden select-none animate-fadeIn`}>
      
      {/* Top Controls Toolbar (Hidden in print) */}
      <div className="h-16 px-4 sm:px-6 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-4 shrink-0 shadow-lg z-20 print:hidden">
        
        {/* Left: Invoice Title & Meta */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 font-bold shadow-inner">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100 font-mono">
                {sellingBill.billNo || 'Invoice Preview'}
              </h3>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono border border-zinc-750">
                Half-A4 Layout
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Dr. {sellingBill.doctorName} • {items.length} product{items.length === 1 ? '' : 's'} • {sheets.length} A4 Sheet{sheets.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Center: Controls for Zoom */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-zinc-300">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-xs font-mono font-semibold text-zinc-400 min-w-[48px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-100 transition-colors border-l border-zinc-800 ml-0.5"
              title="Reset Zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>

        {/* Right: Print Button & Close */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95 border border-zinc-200/20"
          >
            <Printer className="h-4 w-4" />
            <span>Print Invoice</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Close Preview (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

      </div>

      {/* Main Preview Scroll Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-6 md:p-10 flex flex-col items-center bg-zinc-950/80 print:p-0 print:m-0 print:bg-white print:overflow-visible"
      >
        <div 
          id="printable-bill-area"
          style={{ 
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center'
          }}
          className="flex flex-col items-center gap-10 transition-transform duration-150 ease-out print:transform-none print:gap-0 print:w-full print:m-0 print:p-0"
        >
          {sheets.map((sheet, index) => (
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
