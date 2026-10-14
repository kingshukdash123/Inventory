import { useState, useEffect, useMemo } from 'react';
import { Package, DollarSign, Layers, ShieldAlert, RefreshCw, Calendar, Percent } from 'lucide-react';
import { fetchStockItemsFromFirestore, subscribeStockItems } from '../services/stockService';
import { formatCurrency, formatDate } from '../utils/calculations';

export default function InventoryPage({ searchQuery = '' }) {
  const [stockItems, setStockItems] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'instock' | 'lowstock' | 'outofstock'

  // Fetch stock items from Firestore
  const loadStock = async () => {
    try {
      setIsFetching(true);
      const data = await fetchStockItemsFromFirestore();
      setStockItems(data);
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setIsFetching(false);
    }
  };

  // Load data on mount: parallel initial load to show skeleton, followed by real-time sync
  useEffect(() => {
    async function initData() {
      try {
        setIsFetching(true);
        const data = await fetchStockItemsFromFirestore();
        setStockItems(data);
      } catch (error) {
        console.error('Error on initial inventory load:', error);
      } finally {
        setIsFetching(false);
      }
    }

    initData();

    const unsubscribe = subscribeStockItems(setStockItems);
    return () => unsubscribe();
  }, []);

  // 1. Group stock items by medicine product and resolve 0-quantity sub-row rules
  const processedProducts = useMemo(() => {
    const groups = new Map();

    stockItems.forEach((item) => {
      const key = (item.medicineName || '').trim().toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, {
          medicineName: item.medicineName,
          batches: []
        });
      }
      groups.get(key).batches.push(item);
    });

    const parseTimestamp = (d) => {
      if (!d) return 0;
      if (d?.toDate) return d.toDate().getTime();
      if (d instanceof Date) return d.getTime();
      const time = new Date(d).getTime();
      return isNaN(time) ? 0 : time;
    };

    const result = [];

    groups.forEach((group) => {
      const { batches } = group;
      const positiveBatches = batches.filter(b => (Number(b.availableQuantity) || 0) > 0);
      const zeroBatches = batches.filter(b => (Number(b.availableQuantity) || 0) <= 0);

      let resolvedBatches = [];

      if (positiveBatches.length > 0) {
        // If there are batches with positive stock, eliminate all 0-qty batches
        resolvedBatches = positiveBatches;
      } else {
        // If all batches have 0 qty, keep ONLY the single latest batch
        const sortedZero = [...zeroBatches].sort((a, b) => {
          const timeA = parseTimestamp(a.updatedAt) || parseTimestamp(a.createdAt);
          const timeB = parseTimestamp(b.updatedAt) || parseTimestamp(b.createdAt);
          return timeB - timeA;
        });
        resolvedBatches = sortedZero.length > 0 ? [sortedZero[0]] : [];
      }

      // Sort batches within product alphabetically by batch number
      resolvedBatches.sort((a, b) => (a.batchNo || '').localeCompare(b.batchNo || ''));

      const totalQty = resolvedBatches.reduce(
        (acc, b) => acc + (Number(b.availableQuantity) || 0),
        0
      );

      result.push({
        medicineName: group.medicineName,
        totalAvailableQty: totalQty,
        batches: resolvedBatches
      });
    });

    return result.sort((a, b) =>
      (a.medicineName || '').localeCompare(b.medicineName || '', undefined, { sensitivity: 'base' })
    );
  }, [stockItems]);

  // Flatten active batches across all products for aggregate stats
  const activeBatches = useMemo(() => {
    return processedProducts.flatMap(p => p.batches);
  }, [processedProducts]);

  // 2. Filter products and batches based on search query and status filter
  const filteredProducts = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();

    return processedProducts
      .map((product) => {
        const medMatches = (product.medicineName || '').toLowerCase().includes(q);

        const matchingBatches = product.batches.filter((batch) => {
          // A. Search Query Match
          const batchMatches =
            medMatches ||
            (batch.batchNo || '').toLowerCase().includes(q) ||
            (batch.supplierName || '').toLowerCase().includes(q);

          if (!batchMatches) return false;

          // B. Status Filter Match
          if (statusFilter === 'instock') {
            return batch.availableQuantity >= 10;
          } else if (statusFilter === 'lowstock') {
            return batch.availableQuantity > 0 && batch.availableQuantity < 10;
          } else if (statusFilter === 'outofstock') {
            return batch.availableQuantity === 0;
          }

          return true;
        });

        if (matchingBatches.length === 0) return null;

        return {
          ...product,
          batches: matchingBatches
        };
      })
      .filter(Boolean);
  }, [processedProducts, searchQuery, statusFilter]);

  const filteredBatchesCount = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + p.batches.length, 0);
  }, [filteredProducts]);

  // Calculate Metrics from active inventory
  const totalUniqueMedicines = processedProducts.length;

  const totalStockValue = activeBatches.reduce((sum, item) => {
    return sum + (item.availableQuantity * item.purchaseRate);
  }, 0);

  const totalDoctorRateValue = activeBatches.reduce((sum, item) => {
    return sum + (item.availableQuantity * item.doctorRate);
  }, 0);

  const totalReceivedQty = stockItems.reduce((sum, item) => sum + (Number(item.receivedQuantity) || 0), 0);

  const inStockBatches = activeBatches.filter(item => item.availableQuantity >= 10).length;
  const lowStockAlerts = activeBatches.filter(item => item.availableQuantity > 0 && item.availableQuantity < 10).length;
  const outOfStockAlerts = activeBatches.filter(item => item.availableQuantity === 0).length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <Package className="h-5 w-5 text-zinc-400" />
            Medicine Stock Inventory
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time live inventory of pharmaceutical products compiled from synced collection bills.
          </p>
        </div>

        <div>
          <button
            onClick={loadStock}
            disabled={isFetching}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-zinc-400' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh Stock'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Unique Medicines */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Unique Medicines</span>
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {isFetching ? (
              <div className="h-7 w-12 bg-zinc-800 rounded animate-pulse mt-1"></div>
            ) : (
              <h3 className="text-2xl font-bold text-zinc-100">{totalUniqueMedicines}</h3>
            )}
            <p className="text-[11px] text-zinc-500 mt-0.5">Distinct medicine names</p>
          </div>
        </div>

        {/* Total Stock Value (Nett) */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Nett Value</span>
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {isFetching ? (
              <div className="h-7 w-24 bg-zinc-800 rounded animate-pulse mt-1"></div>
            ) : (
              <h3 className="text-2xl font-bold text-zinc-100">{formatCurrency(totalStockValue)}</h3>
            )}
            <p className="text-[11px] text-zinc-500 mt-0.5">Based on net purchase rates</p>
          </div>
        </div>

        {/* Total Doctor Rate Value */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Doc Rate Value</span>
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {isFetching ? (
              <div className="h-7 w-24 bg-zinc-800 rounded animate-pulse mt-1"></div>
            ) : (
              <h3 className="text-2xl font-bold text-zinc-100">{formatCurrency(totalDoctorRateValue)}</h3>
            )}
            <p className="text-[11px] text-zinc-500 mt-0.5">Based on doctor rates</p>
          </div>
        </div>

        {/* Total Items Received */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Received Qty</span>
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {isFetching ? (
              <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse mt-1"></div>
            ) : (
              <h3 className="text-2xl font-bold text-zinc-100">{totalReceivedQty} units</h3>
            )}
            <p className="text-[11px] text-zinc-500 mt-0.5">Cumulative units purchased</p>
          </div>
        </div>

        {/* Alerts: Low / Out of Stock */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Inventory Status Alerts</span>
            <div className={`p-2 rounded-lg ${
              outOfStockAlerts > 0 
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                : lowStockAlerts > 0 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {isFetching ? (
              <div className="h-7 w-16 bg-zinc-800 rounded animate-pulse mt-1"></div>
            ) : (
              <h3 className={`text-2xl font-bold ${
                outOfStockAlerts > 0 
                  ? 'text-rose-400' 
                  : lowStockAlerts > 0 
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}>
                {outOfStockAlerts + lowStockAlerts} Alerts
              </h3>
            )}
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {outOfStockAlerts} out of stock | {lowStockAlerts} low stock
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Items ({activeBatches.length})
            </button>
            <button
              onClick={() => setStatusFilter('instock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'instock'
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              In Stock ({inStockBatches})
            </button>
            <button
              onClick={() => setStatusFilter('lowstock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'lowstock'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Low Stock ({lowStockAlerts})
            </button>
            <button
              onClick={() => setStatusFilter('outofstock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'outofstock'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Out of Stock ({outOfStockAlerts})
            </button>
          </div>
        </div>

        <div className="text-xs text-zinc-500">
          Showing <strong className="text-zinc-300">{filteredBatchesCount}</strong> active batches ({filteredProducts.length} medicines)
        </div>
      </div>

      {/* Stock Table Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden shadow-xl min-h-[200px] relative">
        {isFetching ? (
          <div className="overflow-auto max-h-[calc(100vh-360px)] min-h-[250px] relative">
            <table className="w-full text-left text-xs text-zinc-300 min-w-[1300px]">
              <thead className="bg-zinc-950 sticky top-0 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[10px] z-10">
                <tr>
                  <th className="py-3.5 px-4 min-w-[220px]">Medicine Product</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4 text-center">Batch No</th>
                  <th className="py-3.5 px-4 text-center">Expiry</th>
                  <th className="py-3.5 px-4 text-center">Available Qty</th>
                  <th className="py-3.5 px-4 text-center">Received Qty</th>
                  <th className="py-3.5 px-4 text-right">MRP (₹)</th>
                  <th className="py-3.5 px-4 text-right">Doc Disc (%)</th>
                  <th className="py-3.5 px-4 text-right">Doc Rate (₹)</th>
                  <th className="py-3.5 px-4 text-right">Disc (%)</th>
                  <th className="py-3.5 px-4 text-right">Purchase Rate (₹)</th>
                  <th className="py-3.5 px-4 text-right min-w-[110px]">Taxes (GST)</th>
                  <th className="py-3.5 px-4 text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="py-4 px-4 min-w-[220px]"><div className="h-3.5 bg-zinc-800 rounded w-48"></div></td>
                    <td className="py-4 px-4 text-center"><div className="h-5 bg-zinc-800 rounded w-16 mx-auto"></div></td>
                    <td className="py-4 px-4 text-center"><div className="h-3.5 bg-zinc-800 rounded w-12 mx-auto"></div></td>
                    <td className="py-4 px-4 text-center"><div className="h-5 bg-zinc-800 rounded w-14 mx-auto"></div></td>
                    <td className="py-4 px-4 text-center"><div className="h-5 bg-zinc-800 rounded w-14 mx-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-12 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-12 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-10 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-12 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-10 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-12 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-20 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-24 ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-500">
              <Package className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-300">
              {searchQuery ? 'No Matching Stock Items' : 'Stock Inventory is Empty'}
            </h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {searchQuery 
                ? `No stock items matched your search query: "${searchQuery}".`
                : 'Publish a supplier collection bill and click "Add to Stock" to populate your inventory.'}
            </p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-360px)] min-h-[250px] relative">
            <table className="w-full text-left text-xs text-zinc-300 min-w-[1300px]">
              <thead className="bg-zinc-950 sticky top-0 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[10px] z-10">
                <tr>
                  <th className="py-3.5 px-4 min-w-[220px]">Medicine Product</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4 text-center">Batch No</th>
                  <th className="py-3.5 px-4 text-center">Expiry</th>
                  <th className="py-3.5 px-4 text-center">Available Qty</th>
                  <th className="py-3.5 px-4 text-center">Received Qty</th>
                  <th className="py-3.5 px-4 text-right">MRP (₹)</th>
                  <th className="py-3.5 px-4 text-right">Doc Disc (%)</th>
                  <th className="py-3.5 px-4 text-right">Doc Rate (₹)</th>
                  <th className="py-3.5 px-4 text-right">Disc (%)</th>
                  <th className="py-3.5 px-4 text-right">Purchase Rate (₹)</th>
                  <th className="py-3.5 px-4 text-right min-w-[110px]">Taxes (GST)</th>
                  <th className="py-3.5 px-4 text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {filteredProducts.map((product) => {
                  const batchCount = product.batches.length;

                  return product.batches.map((item, index) => {
                    const isFirst = index === 0;
                    const isLast = index === batchCount - 1;
                    const isLow = item.availableQuantity > 0 && item.availableQuantity < 10;
                    const isOut = item.availableQuantity === 0;

                    return (
                      <tr 
                        key={item.id}
                        className={`hover:bg-zinc-800/40 transition-colors ${
                          isLast ? 'border-b border-zinc-700/80' : 'border-b border-zinc-800/40'
                        }`}
                      >
                        {/* Merged Product Name Cell */}
                        {isFirst && (
                          <td 
                            rowSpan={batchCount}
                            className="py-3.5 px-4 min-w-[220px] align-top bg-zinc-950/40 border-r border-zinc-800/80"
                          >
                            <div className="font-semibold text-zinc-100 text-sm">{product.medicineName}</div>
                            {batchCount > 1 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded font-mono font-semibold border border-zinc-700/60 shadow-xs">
                                  {batchCount} Batches
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  Total: {product.totalAvailableQty} units
                                </span>
                              </div>
                            )}
                          </td>
                        )}

                        {/* Supplier */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-sm text-zinc-300">
                            {batchCount > 1 && (
                              <span className="text-zinc-500 font-mono text-xs select-none">↳</span>
                            )}
                            <span>{item.supplierName || 'N/A'}</span>
                          </div>
                        </td>

                        {/* Batch */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="bg-zinc-800/80 px-2 py-0.5 rounded text-[11px] font-mono text-zinc-300 border border-zinc-700/30">
                            {item.batchNo || 'N/A'}
                          </span>
                        </td>

                        {/* Expiry */}
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-400 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Calendar className="h-3 w-3 text-zinc-500" />
                            <span>{item.expiryDate || 'N/A'}</span>
                          </div>
                        </td>

                        {/* Available Qty */}
                        <td className="py-3.5 px-4 text-center">
                          {isOut ? (
                            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] px-2.5 py-0.5 rounded font-bold font-mono">
                              {item.availableQuantity} (Low)
                            </span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] px-2.5 py-0.5 rounded font-bold font-mono">
                              {item.availableQuantity}
                            </span>
                          )}
                        </td>

                        {/* Received Qty */}
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-400">
                          {item.receivedQuantity}
                        </td>

                        {/* MRP */}
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                          ₹{item.mrp?.toFixed(2)}
                        </td>

                        {/* Doctor Discount */}
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-400">
                          {item.doctorDisc || 0}%
                        </td>

                        {/* Doctor Rate */}
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                          ₹{item.doctorRate?.toFixed(2)}
                        </td>

                        {/* Retailer Discount */}
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-400">
                          {item.discount || 0}%
                        </td>

                        {/* Purchase Rate */}
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-200 font-semibold">
                          ₹{item.purchaseRate?.toFixed(2)}
                        </td>

                        {/* CGST + SGST */}
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-400">
                          <div className="flex items-center justify-end gap-1">
                            <Percent className="h-3 w-3 text-zinc-500" />
                            <span>{((item.cgstPercent || 0) + (item.sgstPercent || 0)).toFixed(1)}%</span>
                          </div>
                          <div className="text-[9px] text-zinc-500">
                            C: {item.cgstPercent || 0}% | S: {item.sgstPercent || 0}%
                          </div>
                        </td>

                        {/* Updated At */}
                        <td className="py-3.5 px-4 text-right text-[11px] text-zinc-500 whitespace-nowrap">
                          {item.updatedAt 
                            ? formatDate(item.updatedAt)
                            : 'N/A'
                          }
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
