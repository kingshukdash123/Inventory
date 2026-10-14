import { Scissors } from 'lucide-react';
import HalfA4Bill from './HalfA4Bill';

export default function HalfA4BillSheet({
  sheet,
  sellingBill,
  sellerDetails = {}
}) {
  const { topHalf, bottomHalf, sheetIndex, totalSheets } = sheet;

  return (
    <div className="a4-sheet relative w-[210mm] min-w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] box-border bg-white text-black shadow-2xl rounded-none flex flex-col justify-between overflow-hidden print:shadow-none print:m-0 print:border-none">
      
      {/* TOP HALF (Height: 148.5mm) */}
      <div className="h-[148.5mm] max-h-[148.5mm] w-full overflow-hidden flex flex-col">
        <HalfA4Bill
          pageData={topHalf}
          sellingBill={sellingBill}
          sellerDetails={sellerDetails}
          isBottomHalf={false}
        />
      </div>

      {/* HORIZONTAL CUT / PERFORATION LINE DIVIDER (Exact center at 148.5mm) */}
      <div className="w-full h-0 relative flex items-center justify-center z-10 border-b border-dashed border-zinc-300 print:border-zinc-400 print:border-dashed">
        <span className="absolute bg-white px-2 py-0.5 text-[8.5px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 select-none print:hidden">
          <Scissors className="h-3 w-3 text-zinc-400" />
          <span>Cut Line (1/2 A4 Page)</span>
          <Scissors className="h-3 w-3 text-zinc-400" />
        </span>
      </div>

      {/* BOTTOM HALF (Height: 148.5mm) */}
      <div className="h-[148.5mm] max-h-[148.5mm] w-full overflow-hidden flex flex-col">
        <HalfA4Bill
          pageData={bottomHalf}
          sellingBill={sellingBill}
          sellerDetails={sellerDetails}
          isBottomHalf={true}
          isBlankCutPlaceholder={!bottomHalf}
        />
      </div>

    </div>
  );
}
