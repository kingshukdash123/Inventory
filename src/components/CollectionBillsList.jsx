import { useState } from 'react';
import { 
  Receipt, 
  Eye, 
  Edit3,
  Trash2, 
  Building2, 
  Calendar, 
  TrendingUp,
  FileText,
  DollarSign,
  Plus,
  HardDrive,
  UploadCloud,
  Database,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/calculations';

export default function CollectionBillsList({ 
  officialCollectionBills = [], 
  draftCollectionBills = [],
  searchQuery, 
  onSelectCollectionBill, 
  onEditCollectionBill,
  onDeleteCollectionBill, 
  onOpenAddCollectionBill,
  onPublishDraftCollectionBill,
  onAddToStock,
  isFetching = false
}) {
  const [collectionBillMode, setCollectionBillMode] = useState('official'); // 'official' (Published) | 'draft'

  const currentCollectionBills = collectionBillMode === 'official' ? officialCollectionBills : draftCollectionBills;

  // Filter and sort logic (order by invoice date descending, tie-break by createdAt)
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

  const filteredCollectionBills = currentCollectionBills
    .filter((collectionBill) => {
      const formattedDate = formatDate(collectionBill.invoiceDate);
      return (
        (collectionBill.billNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (collectionBill.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (formattedDate || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (collectionBill.invoiceDate || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (collectionBill.items || []).some(item => (item.itemName || '').toLowerCase().includes(searchQuery.toLowerCase()))
      );
    })
    .sort((a, b) => {
      const dateA = getInvoiceDateTimestamp(a);
      const dateB = getInvoiceDateTimestamp(b);
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      return getCreatedAtTimestamp(b) - getCreatedAtTimestamp(a);
    });

  // Calculate Dashboard Metrics strictly for Published Bills
  const metrics = officialCollectionBills.reduce((acc, collectionBill) => {
    const summary = collectionBill.summary || {};
    acc.totalAmount += summary.grandTotal || 0;
    acc.totalDoctorRate += summary.totalDoctorRate || 0;
    acc.totalCgst += summary.totalCgst || 0;
    acc.totalSgst += summary.totalSgst || 0;
    acc.totalItems += summary.totalItems || 0;
    return acc;
  }, { totalAmount: 0, totalDoctorRate: 0, totalCgst: 0, totalSgst: 0, totalItems: 0 });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Title & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <Receipt className="h-5 w-5 text-zinc-400" />
            Medicine Collection Bills
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Supplier purchase bills and product line items collected from pharmaceutical companies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Switch between Published Bills & Draft Bills */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setCollectionBillMode('official')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                collectionBillMode === 'official'
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              <span>Saved Bills ({officialCollectionBills.length})</span>
            </button>

            <button
              onClick={() => setCollectionBillMode('draft')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                collectionBillMode === 'draft'
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <HardDrive className="h-3.5 w-3.5" />
              <span>Draft Bills ({draftCollectionBills.length})</span>
            </button>
          </div>

          <button
            onClick={onOpenAddCollectionBill}
            className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95 border border-zinc-200/20"
          >
            <Plus className="h-4 w-4" />
            <span>Collect New Bill</span>
          </button>
        </div>
      </div>

      {/* Published Store Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bills */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Saved Bills</span>
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {isFetching ? (
              <div className="h-7 w-12 bg-zinc-800 rounded animate-pulse mt-1"></div>
            ) : (
              <h3 className="text-2xl font-bold text-zinc-100">{officialCollectionBills.length}</h3>
            )}
            <p className="text-[11px] text-zinc-500 mt-0.5">{metrics.totalItems} total line items</p>
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Store Purchase</span>
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {isFetching ? (
              <div className="h-7 w-24 bg-zinc-800 rounded animate-pulse mt-1"></div>
            ) : (
              <h3 className="text-2xl font-bold text-zinc-100">{formatCurrency(metrics.totalAmount)}</h3>
            )}
            <p className="text-[11px] text-zinc-500 mt-0.5">Net Payable across saved bills</p>
          </div>
        </div>

        {/* Total Doctor Rate */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Doctor Rate</span>
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {isFetching ? (
              <div className="h-7 w-24 bg-zinc-800 rounded animate-pulse mt-1"></div>
            ) : (
              <h3 className="text-2xl font-bold text-zinc-100">{formatCurrency(metrics.totalDoctorRate)}</h3>
            )}
            <p className="text-[11px] text-zinc-500 mt-0.5">Cumulative Doctor Rate sum</p>
          </div>
        </div>

        {/* Total CGST & SGST */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Taxes (CGST + SGST)</span>
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {isFetching ? (
              <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse mt-1"></div>
            ) : (
              <h3 className="text-2xl font-bold text-zinc-100">
                {formatCurrency(metrics.totalCgst + metrics.totalSgst)}
              </h3>
            )}
            <p className="text-[11px] text-zinc-500 mt-0.5">
              CGST: {formatCurrency(metrics.totalCgst)} | SGST: {formatCurrency(metrics.totalSgst)}
            </p>
          </div>
        </div>
      </div>

      {/* Notice Banner when in Draft Bills Mode */}
      {collectionBillMode === 'draft' && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>Draft Mode:</strong> These draft bills are saved locally and are <strong>excluded</strong> from store analytics until saved.
            </span>
          </div>
          <span className="text-[11px] bg-amber-500/20 px-2 py-0.5 rounded font-mono font-medium text-amber-200">
            {draftCollectionBills.length} drafts
          </span>
        </div>
      )}

      {/* Table Section Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <span className="text-xs font-medium text-zinc-400 flex items-center gap-2">
          {collectionBillMode === 'official' ? (
            <>
              <Database className="h-4 w-4 text-zinc-400" />
              Saved Bills Directory
            </>
          ) : (
            <>
              <HardDrive className="h-4 w-4 text-amber-400" />
              Draft Bills Directory
            </>
          )}
        </span>
        <span className="text-xs text-zinc-500">
          Showing <strong className="text-zinc-300">{filteredCollectionBills.length}</strong> of {currentCollectionBills.length} items
        </span>
      </div>

      {/* Bills Table Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden shadow-xl min-h-[200px] relative">
        {isFetching ? (
          <div className="overflow-auto max-h-[calc(100vh-320px)] min-h-[250px] relative">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 sticky top-0 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[11px] z-10">
                <tr>
                  <th className="py-3.5 px-4">Bill No</th>
                  <th className="py-3.5 px-4">Pharma Supplier</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4 text-right">Doctor Rate</th>
                  <th className="py-3.5 px-4 text-right">CGST</th>
                  <th className="py-3.5 px-4 text-right">SGST</th>
                  <th className="py-3.5 px-4 text-right">Nett Amount</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-3.5 bg-zinc-800 rounded w-20"></div></td>
                    <td className="py-4 px-4"><div className="h-3.5 bg-zinc-800 rounded w-36"></div></td>
                    <td className="py-4 px-4"><div className="h-3.5 bg-zinc-800 rounded w-24"></div></td>
                    <td className="py-4 px-4 text-center"><div className="h-5 bg-zinc-800 rounded w-16 mx-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-14 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-10 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-10 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-16 ml-auto font-bold"></div></td>
                    <td className="py-4 px-4 text-center"><div className="h-7 bg-zinc-800 rounded w-20 mx-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredCollectionBills.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-500">
              {collectionBillMode === 'official' ? <Database className="h-6 w-6" /> : <HardDrive className="h-6 w-6" />}
            </div>
            <h4 className="text-sm font-semibold text-zinc-300">
              {collectionBillMode === 'official' ? 'No Saved Bills' : 'No Draft Bills'}
            </h4>
            <p className="text-xs text-zinc-550 max-w-sm mx-auto">
              {collectionBillMode === 'official' 
                ? 'No saved bills yet. Click "Collect New Bill" to create one.'
                : 'No draft bills saved yet. Click "Save Draft" in the bill form to create drafts.'}
            </p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-320px)] min-h-[250px] relative">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 sticky top-0 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[11px] z-10">
                <tr>
                  <th className="py-3.5 px-4">Bill No</th>
                  <th className="py-3.5 px-4">Pharma Supplier</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4 text-right">Doctor Rate</th>
                  <th className="py-3.5 px-4 text-right">CGST</th>
                  <th className="py-3.5 px-4 text-right">SGST</th>
                  <th className="py-3.5 px-4 text-right">Nett Amount</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {filteredCollectionBills.map((collectionBill) => {
                  const summary = collectionBill.summary || {};
                  return (
                    <tr 
                      key={collectionBill.id}
                      onClick={() => onSelectCollectionBill(collectionBill)}
                      className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-zinc-200">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span>{collectionBill.billNo}</span>
                          {collectionBillMode === 'draft' ? (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-1.5 py-0.2 rounded font-sans">
                              Draft
                            </span>
                          ) : (
                            collectionBill.addedToStock ? (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0.2 rounded font-sans">
                                Saved
                              </span>
                            ) : (
                              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] px-1.5 py-0.2 rounded font-sans">
                                Save Failed
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-200">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                          <span className="truncate max-w-[180px]">{collectionBill.supplierName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-zinc-500" />
                          <span>{formatDate(collectionBill.invoiceDate)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[11px]">
                          {summary.totalItems || (collectionBill.items || []).length} products
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                        {formatCurrency(summary.totalDoctorRate)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-400">
                        {formatCurrency(summary.totalCgst)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-400">
                        {formatCurrency(summary.totalSgst)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-zinc-200 text-sm">
                        {formatCurrency(summary.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onSelectCollectionBill(collectionBill)}
                            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
                            title="View Products & Bill Summary"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onEditCollectionBill(collectionBill, collectionBillMode === 'draft')}
                            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
                            title="Edit Bill / Add Items"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          {collectionBillMode === 'draft' && (
                            <button
                              onClick={() => onPublishDraftCollectionBill(collectionBill)}
                              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
                              title="Save Bill"
                            >
                              <UploadCloud className="h-4 w-4" />
                            </button>
                          )}
                          {collectionBillMode === 'official' && !collectionBill.addedToStock && (
                            <button
                              onClick={() => onAddToStock(collectionBill)}
                              className="p-1.5 rounded-md hover:bg-zinc-800 text-rose-450 hover:text-rose-350 transition-colors animate-pulse"
                              title="Save to Stock (Failed)"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            onClick={() => onDeleteCollectionBill(collectionBill.id, collectionBillMode === 'draft')}
                            className="p-1.5 rounded-md hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition-colors"
                            title="Delete Bill"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
