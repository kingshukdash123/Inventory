import React, { useState, useEffect } from 'react';
import { Package, Search, DollarSign, Layers, ShieldAlert, RefreshCw, Calendar, Percent } from 'lucide-react';
import { fetchStockItemsFromFirestore } from '../services/stockService';
import { formatCurrency } from '../utils/calculations';

export default function InventoryPage({ searchQuery = '' }) {
  const [stockItems, setStockItems] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
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

  useEffect(() => {
    loadStock();
  }, []);

  // Filter items based on search query (medicine name or batch number) and status filter
  const filteredItems = stockItems.filter((item) => {
    // 1. Search Query filter
    const matchesSearch = 
      (item.medicineName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.batchNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Status Filter
    if (!matchesSearch) return false;
    
    if (statusFilter === 'instock') {
      return item.availableQuantity >= 10;
    } else if (statusFilter === 'lowstock') {
      return item.availableQuantity > 0 && item.availableQuantity < 10;
    } else if (statusFilter === 'outofstock') {
      return item.availableQuantity === 0;
    }
    
    return true;
  });

  // Calculate Metrics
  const totalUniqueMedicines = new Set(stockItems.map(item => item.medicineName?.toLowerCase())).size;
  
  const totalStockValue = stockItems.reduce((sum, item) => {
    return sum + (item.availableQuantity * item.purchaseRate);
  }, 0);

  const totalDoctorRateValue = stockItems.reduce((sum, item) => {
    return sum + (item.availableQuantity * item.doctorRate);
  }, 0);

  const totalReceivedQty = stockItems.reduce((sum, item) => sum + item.receivedQuantity, 0);
  
  const lowStockAlerts = stockItems.filter(item => item.availableQuantity > 0 && item.availableQuantity < 10).length;
  const outOfStockAlerts = stockItems.filter(item => item.availableQuantity === 0).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
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
              All Items ({stockItems.length})
            </button>
            <button
              onClick={() => setStatusFilter('instock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'instock'
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              In Stock ({stockItems.filter(i => i.availableQuantity >= 10).length})
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
          Showing <strong className="text-zinc-300">{filteredItems.length}</strong> of {stockItems.length} stock products
        </div>
      </div>

      {/* Stock Table Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden shadow-xl min-h-[200px] relative">
        {isFetching ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/90 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Medicine Product</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4 text-center">Batch No</th>
                  <th className="py-3.5 px-4 text-center">Expiry</th>
                  <th className="py-3.5 px-4 text-center">Available Qty</th>
                  <th className="py-3.5 px-4 text-center">Received Qty</th>
                  <th className="py-3.5 px-4 text-right">MRP (₹)</th>
                  <th className="py-3.5 px-4 text-right">Purchase Rate (₹)</th>
                  <th className="py-3.5 px-4 text-right">Doc Rate (₹)</th>
                  <th className="py-3.5 px-4 text-right">Taxes (GST)</th>
                  <th className="py-3.5 px-4 text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-3.5 bg-zinc-800 rounded w-44"></div></td>
                    <td className="py-4 px-4 text-center"><div className="h-5 bg-zinc-800 rounded w-16 mx-auto"></div></td>
                    <td className="py-4 px-4 text-center"><div className="h-3.5 bg-zinc-800 rounded w-12 mx-auto"></div></td>
                    <td className="py-4 px-4 text-center"><div className="h-5 bg-zinc-800 rounded w-14 mx-auto"></div></td>
                    <td className="py-4 px-4 text-center"><div className="h-5 bg-zinc-800 rounded w-14 mx-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-12 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-12 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-12 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-16 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-24 ml-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-3.5 bg-zinc-800 rounded w-24 ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredItems.length === 0 ? (
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/90 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Medicine Product</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4 text-center">Batch No</th>
                  <th className="py-3.5 px-4 text-center">Expiry</th>
                  <th className="py-3.5 px-4 text-center">Available Qty</th>
                  <th className="py-3.5 px-4 text-center">Received Qty</th>
                  <th className="py-3.5 px-4 text-right">MRP (₹)</th>
                  <th className="py-3.5 px-4 text-right">Purchase Rate (₹)</th>
                  <th className="py-3.5 px-4 text-right">Doc Rate (₹)</th>
                  <th className="py-3.5 px-4 text-right">Taxes (GST)</th>
                  <th className="py-3.5 px-4 text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {filteredItems.map((item) => {
                  const isLow = item.availableQuantity > 0 && item.availableQuantity < 10;
                  const isOut = item.availableQuantity === 0;
                  
                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-zinc-800/40 transition-colors border-b border-zinc-800/60"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-100 text-sm">{item.medicineName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-sm text-zinc-300">{item.supplierName || 'N/A'}</div>
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
                            {item.availableQuantity} units (Low)
                          </span>
                        ) : (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] px-2.5 py-0.5 rounded font-bold font-mono">
                            {item.availableQuantity} units
                          </span>
                        )}
                      </td>

                      {/* Received Qty */}
                      <td className="py-3.5 px-4 text-center font-mono text-zinc-400">
                        {item.receivedQuantity} units
                      </td>

                      {/* MRP */}
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                        ₹{item.mrp?.toFixed(2)}
                      </td>

                      {/* Purchase Rate */}
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-200 font-semibold">
                        ₹{item.purchaseRate?.toFixed(2)}
                      </td>

                      {/* Doctor Rate */}
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                        ₹{item.doctorRate?.toFixed(2)}
                      </td>

                      {/* CGST + SGST */}
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-400">
                        <div className="flex items-center justify-end gap-1">
                          <Percent className="h-3 w-3 text-zinc-500" />
                          <span>{(item.cgstPercent + item.sgstPercent).toFixed(1)}%</span>
                        </div>
                        <div className="text-[9px] text-zinc-500">
                          C: {item.cgstPercent}% | S: {item.sgstPercent}%
                        </div>
                      </td>

                      {/* Updated At */}
                      <td className="py-3.5 px-4 text-right text-[11px] text-zinc-500 whitespace-nowrap">
                        {item.updatedAt 
                          ? new Date(item.updatedAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'N/A'
                        }
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
