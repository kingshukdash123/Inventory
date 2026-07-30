import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Calculator, Check, AlertCircle, HardDrive, Loader2 } from 'lucide-react';
import { calculateLineItem, calculateBillSummary, formatCurrency } from '../utils/calculations';
import { fetchStockItemsFromFirestore } from '../services/stockService';

export default function AddCollectionBillModal({ isOpen, onClose, onSaveCollectionBill, collectionBillToEdit = null }) {
  const [collectionBillNo, setCollectionBillNo] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState(''); // 'local' | 'firestore'
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState([]);
  const prevItemsLengthRef = useRef(0);
  const billNoInputRef = useRef(null);
  
  // Autocomplete suggestions states and refs
  const [suggestions, setSuggestions] = useState([]);
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const debounceTimeoutRef = useRef(null);
  const lastFetchedStockRef = useRef([]);

  // Clean up debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Focus Bill No input on modal open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (billNoInputRef.current) {
          billNoInputRef.current.focus();
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
          cgstPercent: 2.5,
          sgstPercent: 2.5
        }
      ]);
    } else {
      setCollectionBillNo('');
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
          cgstPercent: 2.5,
          sgstPercent: 2.5
        }
      ]);
    }
    setErrorMessage('');
  }, [collectionBillToEdit, isOpen]);

  // Auto-focus the last added item row's name field when a new row is appended
  useEffect(() => {
    if (items.length > prevItemsLengthRef.current) {
      const nameInputs = document.querySelectorAll('input[data-field="itemName"]');
      if (nameInputs.length > 0) {
        const lastInput = nameInputs[nameInputs.length - 1];
        lastInput.focus();
        if (lastInput.select) {
          lastInput.select();
        }
      }
    }
    prevItemsLengthRef.current = items.length;
  }, [items]);

  // Handle line item field changes
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    let val = value;
    if (field === 'itemName' || field === 'batchNo') {
      val = value.toUpperCase();
    }
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  // Handle expiry date input MM/YY formatting with backspace check
  const handleExpiryChange = (index, value) => {
    const prevValue = items[index]?.expiryDate || '';
    
    // If user is deleting text, let the default edit take place
    if (value.length < prevValue.length) {
      // If deleting the slash itself, delete the preceding month digit too to avoid getting stuck
      if (prevValue.endsWith('/') && value.length === 2) {
        handleItemChange(index, 'expiryDate', value.slice(0, 1));
        return;
      }
      handleItemChange(index, 'expiryDate', value);
      return;
    }

    // Keep only digits
    const digits = value.replace(/\D/g, '');
    let formatted = '';

    if (digits.length > 0) {
      const month = digits.slice(0, 2);
      formatted = month;

      if (digits.length >= 2) {
        const year = digits.slice(2, 4);
        formatted = `${month}/${year}`;
      }
    }

    handleItemChange(index, 'expiryDate', formatted.slice(0, 5));
  };

  // Fetch matching stock items and filter unique medicine names
  const performSearch = async (queryText) => {
    if (!queryText || queryText.length < 2) {
      setSuggestions([]);
      setIsSearchLoading(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    try {
      const allStock = await fetchStockItemsFromFirestore();
      lastFetchedStockRef.current = allStock;

      const normalizedQuery = queryText.toUpperCase();
      const matchedNames = new Set();
      allStock.forEach((item) => {
        if (item.medicineName.toUpperCase().includes(normalizedQuery)) {
          matchedNames.add(item.medicineName.toUpperCase());
        }
      });

      setSuggestions(Array.from(matchedNames));
      setSelectedSuggestionIndex(-1);
    } catch (error) {
      console.error('Error performing stock search:', error);
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
    } finally {
      setIsSearchLoading(false);
    }
  };

  // Handle typing inside medicine name field with debouncing
  const handleItemNameChange = (index, value) => {
    handleItemChange(index, 'itemName', value);
    setActiveRowIndex(index);
    setSelectedSuggestionIndex(-1);

    if (value.length < 2) {
      setSuggestions([]);
      setIsSearchLoading(false);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      return;
    }

    setIsSearchLoading(true);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Handle selecting a suggested medicine name
  const handleSelectSuggestion = (index, suggestionName) => {
    const matches = lastFetchedStockRef.current.filter(
      (item) => item.medicineName.toUpperCase() === suggestionName.toUpperCase()
    );

    const latestItem = matches.length > 0
      ? matches.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        })[0]
      : null;

    const updated = [...items];
    if (latestItem) {
      updated[index] = {
        ...updated[index],
        itemName: latestItem.medicineName.toUpperCase(),
        quantity: '', // quantity is empty
        batchNo: latestItem.batchNo.toUpperCase(),
        expiryDate: latestItem.expiryDate,
        mrp: latestItem.mrp || '',
        doctorDisc: latestItem.doctorDisc || 0,
        discount: latestItem.discount || 0,
        cgstPercent: latestItem.cgstPercent || 2.5,
        sgstPercent: latestItem.sgstPercent || 2.5
      };
    } else {
      updated[index].itemName = suggestionName.toUpperCase();
    }

    setItems(updated);
    setActiveRowIndex(null);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
  };

  // Handle input blur to close suggestions dropdown
  const handleInputBlur = () => {
    setTimeout(() => {
      setActiveRowIndex(null);
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
    }, 200);
  };

  // Handle custom key navigation for medicine name dropdown suggestions
  const handleItemNameKeyDown = (e, index) => {
    if (activeRowIndex !== index || suggestions.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedSuggestionIndex((prev) => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedSuggestionIndex((prev) => 
        prev > 0 ? prev - 1 : -1
      );
    } else if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        e.preventDefault();
        e.stopPropagation();
        handleSelectSuggestion(index, suggestions[selectedSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setActiveRowIndex(null);
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
    }
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
        cgstPercent: 2.5,
        sgstPercent: 2.5
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

  const handleKeyDown = (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
      return;
    }

    const form = e.currentTarget;
    const focusable = Array.from(
      form.querySelectorAll('input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])')
    );
    const index = focusable.indexOf(e.target);

    if (e.key === 'Enter') {
      // If pressing Enter in the last row's SGST input, add a new row and focus it
      if (e.target.getAttribute('data-field') === 'sgstPercent') {
        const sgstInputs = Array.from(document.querySelectorAll('input[data-field="sgstPercent"]'));
        const sgstIndex = sgstInputs.indexOf(e.target);
        if (sgstIndex === sgstInputs.length - 1) {
          e.preventDefault();
          handleAddItemRow();
          return;
        }
      }

      e.preventDefault();
      if (index > -1 && index < focusable.length - 1) {
        focusable[index + 1].focus();
        if (focusable[index + 1].select) {
          focusable[index + 1].select();
        }
      }
    }

    if (e.key === 'ArrowLeft') {
      let isCursorAtStart = true;
      try {
        if (e.target.selectionStart !== null) {
          isCursorAtStart = e.target.selectionStart === 0 && e.target.selectionEnd === 0;
        }
      } catch {
        // Selection properties are not supported (e.g. input type="number" or type="date")
        isCursorAtStart = true;
      }
      if (isCursorAtStart && index > 0) {
        e.preventDefault();
        focusable[index - 1].focus();
        if (focusable[index - 1].select) {
          focusable[index - 1].select();
        }
      }
    }

    if (e.key === 'ArrowRight') {
      let isCursorAtEnd = true;
      try {
        if (e.target.selectionStart !== null) {
          isCursorAtEnd = e.target.selectionStart === e.target.value.length && e.target.selectionEnd === e.target.value.length;
        }
      } catch {
        // Selection properties are not supported (e.g. input type="number" or type="date")
        isCursorAtEnd = true;
      }
      if (isCursorAtEnd && index > -1 && index < focusable.length - 1) {
        e.preventDefault();
        focusable[index + 1].focus();
        if (focusable[index + 1].select) {
          focusable[index + 1].select();
        }
      }
    }
  };

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

  if (!isOpen) return null;

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
        <form 
          onSubmit={(e) => handleSubmit(e, 'firestore')} 
          onKeyDown={handleKeyDown}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
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
                ref={billNoInputRef}
                type="text"
                value={collectionBillNo}
                onChange={(e) => setCollectionBillNo(e.target.value.toUpperCase())}
                required
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                Pharma Supplier Name <span className="text-zinc-500">*</span>
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value.toUpperCase())}
                required
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none uppercase"
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

            <div className="border border-zinc-800 rounded-xl overflow-visible bg-zinc-900/40">
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
                        <td className="p-2 relative">
                          <div className="relative flex items-center w-full">
                            <input
                              type="text"
                              value={rawItem.itemName}
                              onChange={(e) => handleItemNameChange(index, e.target.value)}
                              onBlur={handleInputBlur}
                              onKeyDown={(e) => handleItemNameKeyDown(e, index)}
                              data-field="itemName"
                              required
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 pr-7 text-xs text-zinc-200 outline-none uppercase"
                            />
                            {isSearchLoading && activeRowIndex === index && (
                              <div className="absolute right-2 flex items-center justify-center pointer-events-none">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                              </div>
                            )}
                          </div>
                          {activeRowIndex === index && suggestions.length > 0 && (
                            <div className="absolute left-2 right-2 mt-1 max-h-48 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-50 divide-y divide-zinc-900 select-none">
                              {suggestions.map((suggestionName, idx) => (
                                <div
                                  key={suggestionName}
                                  onMouseDown={() => handleSelectSuggestion(index, suggestionName)}
                                  className={`px-3 py-2 text-xs font-semibold uppercase transition-colors cursor-pointer ${
                                    selectedSuggestionIndex === idx
                                      ? 'bg-zinc-900 text-zinc-100 font-bold'
                                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-200'
                                  }`}
                                >
                                  {suggestionName}
                                </div>
                              ))}
                            </div>
                          )}
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
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-200 font-mono outline-none uppercase"
                          />
                        </td>

                        {/* Expiry Date */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={rawItem.expiryDate}
                            onChange={(e) => handleExpiryChange(index, e.target.value)}
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
                            data-field="sgstPercent"
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
                rows="4"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg p-3 text-xs text-zinc-200 outline-none resize-none"
              ></textarea>
            </div>

            {/* Live Financial Summary Box */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-2.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2">
                Bill Summary
              </h5>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total Doctor Rate:</span>
                <span className="font-mono font-semibold text-zinc-300">{formatCurrency(summary.totalDoctorRate)}</span>
              </div>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total Discount:</span>
                <span className="font-mono text-zinc-400">-{formatCurrency(summary.totalDiscount)}</span>
              </div>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total CGST:</span>
                <span className="font-mono text-zinc-400">{formatCurrency(summary.totalCgst)}</span>
              </div>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total SGST:</span>
                <span className="font-mono text-zinc-400">{formatCurrency(summary.totalSgst)}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-zinc-100 border-t border-zinc-800 pt-2">
                <span>Total Amount:</span>
                <span className="font-mono text-zinc-100 text-base">{formatCurrency(summary.grandTotal)}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'local')}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 text-xs font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-50"
            title="Save as a draft bill"
          >
            {isSubmitting && submitMode === 'local' ? (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            ) : (
              <HardDrive className="h-4 w-4 text-zinc-400" />
            )}
            <span>{isSubmitting && submitMode === 'local' ? 'Saving Draft...' : 'Save Draft'}</span>
          </button>

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
