import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Calculator, Check, AlertCircle, HardDrive, Loader2, Building2, Users, Receipt } from 'lucide-react';
import { calculateSellingLineItem, calculateSellingBillSummary, formatCurrency } from '../utils/calculations';
import { fetchStockItemsFromFirestore } from '../services/stockService';
import { fetchDoctorsFromFirestore } from '../services/doctorService';
import { fetchSellerDetailsFromFirestore } from '../services/settingsService';
import { fetchSellingBillsFromFirestore } from '../services/sellingBillService';

export default function AddSellingBillModal({ 
  isOpen, 
  onClose, 
  onSaveSellingBill, 
  sellingBillToEdit = null,
  sellingBills = []
}) {
  const [sellingBillNo, setSellingBillNo] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [doctorAddress, setDoctorAddress] = useState('');
  const [doctorTaxId, setDoctorTaxId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [notes, setNotes] = useState('');
  const [fixedDiscount, setFixedDiscount] = useState('');
  const [initialDue, setInitialDue] = useState('');
  const [prevDue, setPrevDue] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState(''); // 'local' | 'firestore'
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState([]);
  const prevItemsLengthRef = useRef(0);
  const billNoInputRef = useRef(null);

  // Seller details state dynamically loaded from Settings
  const [sellerDetails, setSellerDetails] = useState({
    name: '',
    address: '',
    gstin: '',
    contact: ''
  });

  // Load seller details on modal open from Firestore (with localStorage fallback)
  useEffect(() => {
    async function loadSeller() {
      try {
        const details = await fetchSellerDetailsFromFirestore();
        if (details) {
          setSellerDetails(details);
          // Sync cache
          localStorage.setItem('seller_details', JSON.stringify(details.toJson()));
          return;
        }
      } catch (e) {
        console.error('Failed to fetch seller details from Firestore:', e);
      }

      // Local storage fallback
      const stored = localStorage.getItem('seller_details');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSellerDetails({
            name: parsed.name || '',
            address: parsed.address || '',
            gstin: parsed.gstin || '',
            contact: parsed.contact || ''
          });
        } catch (e) {
          console.error('Failed to parse seller details from local storage:', e);
        }
      }
    }

    if (isOpen) {
      loadSeller();
    }
  }, [isOpen]);

  // Doctors autocomplete states
  const [doctorsList, setDoctorsList] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  // Past selling bills for doctor historical discount lookup
  const [fetchedSellingBills, setFetchedSellingBills] = useState([]);

  useEffect(() => {
    async function loadPastBills() {
      if (isOpen && (!sellingBills || sellingBills.length === 0)) {
        try {
          const fetched = await fetchSellingBillsFromFirestore();
          setFetchedSellingBills(fetched.filter(b => !b.isDraft));
        } catch (e) {
          console.error('Failed to load past selling bills for discount lookup:', e);
        }
      }
    }
    loadPastBills();
  }, [isOpen, sellingBills]);

  const allSellingBills = (sellingBills && sellingBills.length > 0) ? sellingBills : fetchedSellingBills;

  // Medicine Autocomplete states
  const [suggestions, setSuggestions] = useState([]); // Array of stock item objects
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

  // Fetch doctors on mount
  useEffect(() => {
    async function loadDoctors() {
      try {
        const docs = await fetchDoctorsFromFirestore();
        setDoctorsList(docs);
      } catch (err) {
        console.error('Error fetching doctors:', err);
      }
    }
    if (isOpen) {
      loadDoctors();
    }
  }, [isOpen]);

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

  // Track previous prop references to sync form state without cascading effect renders
  const [prevEditBill, setPrevEditBill] = useState(sellingBillToEdit);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen || sellingBillToEdit !== prevEditBill) {
    setPrevIsOpen(isOpen);
    setPrevEditBill(sellingBillToEdit);

    if (sellingBillToEdit) {
      setSellingBillNo(sellingBillToEdit.billNo || '');
      setDoctorName(sellingBillToEdit.doctorName || '');
      setDoctorId(sellingBillToEdit.doctorId || '');
      setDoctorPhone(sellingBillToEdit.doctorPhone || '');
      setDoctorAddress(sellingBillToEdit.doctorAddress || sellingBillToEdit.address || '');
      setDoctorTaxId(sellingBillToEdit.doctorTaxId || sellingBillToEdit.taxId || sellingBillToEdit.gstin || '');
      setInvoiceDate(sellingBillToEdit.invoiceDate || new Date().toISOString().split('T')[0]);
      setNotes(sellingBillToEdit.notes || '');
      setFixedDiscount(sellingBillToEdit.summary?.fixedDiscount !== undefined && sellingBillToEdit.summary?.fixedDiscount !== null ? sellingBillToEdit.summary.fixedDiscount : (sellingBillToEdit.fixedDiscount || ''));
      setInitialDue(sellingBillToEdit.summary?.initialDue !== undefined && sellingBillToEdit.summary?.initialDue !== null ? sellingBillToEdit.summary.initialDue : (sellingBillToEdit.initialDue || ''));
      setPrevDue(sellingBillToEdit.summary?.prevDue || 0);
      setItems(sellingBillToEdit.items && sellingBillToEdit.items.length > 0 ? sellingBillToEdit.items.map(item => ({
        ...item,
        discount: item.discount !== undefined ? item.discount : ''
      })) : [
        {
          itemName: '',
          quantity: 1,
          batchNo: '',
          expiryDate: '',
          mrp: '',
          discount: '',
          cgstPercent: 2.5,
          sgstPercent: 2.5,
          availableQty: 9999
        }
      ]);
    } else {
      setSellingBillNo('');
      setDoctorName('');
      setDoctorId('');
      setDoctorPhone('');
      setDoctorAddress('');
      setDoctorTaxId('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setFixedDiscount('');
      setInitialDue('');
      setPrevDue(0);
      setItems([
        {
          itemName: '',
          quantity: 1,
          batchNo: '',
          expiryDate: '',
          mrp: '',
          discount: '',
          cgstPercent: 2.5,
          sgstPercent: 2.5,
          availableQty: 9999
        }
      ]);
    }
    setErrorMessage('');
  }

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

  // Helper to find the discount for a product from that doctor's last bill
  const getLastDiscountForDoctorAndProduct = (docName, docId, prodName) => {
    if (!prodName || !prodName.trim()) return '';
    const normProd = prodName.trim().toUpperCase();
    const normDoc = (docName || '').trim().toUpperCase();
    const id = docId || '';

    if (!normDoc && !id) return '';

    const sourceBills = allSellingBills.length > 0 ? allSellingBills : sellingBills;

    for (const bill of sourceBills) {
      if (bill.isDraft) continue;
      if (sellingBillToEdit && bill.id === sellingBillToEdit.id) continue;

      const matchesDoctor = (id && bill.doctorId === id) || 
        (normDoc && (bill.doctorName || '').trim().toUpperCase() === normDoc);

      if (!matchesDoctor) continue;

      const matchedItem = (bill.items || []).find(
        (it) => (it.itemName || '').trim().toUpperCase() === normProd
      );

      if (matchedItem && matchedItem.discount !== undefined && matchedItem.discount !== '') {
        return matchedItem.discount;
      }
    }

    return '';
  };

  // Handle doctor input change
  const handleDoctorInputChange = (val) => {
    const uppercaseVal = val.toUpperCase();
    setDoctorName(uppercaseVal);
    setDoctorId('');
    
    // If user changes doctor name, check if it matches an existing doctor to reload prevDue, phone, address, taxId
    const matched = doctorsList.find(d => d.name.toUpperCase() === uppercaseVal);
    if (matched) {
      setDoctorId(matched.id);
      setPrevDue(matched.dueAmount);
      if (matched.phone) {
        setDoctorPhone(matched.phone);
      }
      if (matched.address) {
        setDoctorAddress(matched.address);
      }
      if (matched.taxId) {
        setDoctorTaxId(matched.taxId);
      }
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (!item.itemName.trim()) return item;
          const lastDisc = getLastDiscountForDoctorAndProduct(matched.name, matched.id, item.itemName);
          return {
            ...item,
            discount: lastDisc
          };
        })
      );
    } else {
      setPrevDue(0); // Assume new doctor with 0 due
    }

    if (uppercaseVal.trim().length > 0) {
      const filtered = doctorsList.filter(d => d.name.toUpperCase().includes(uppercaseVal));
      setFilteredDoctors(filtered);
      setShowDoctorDropdown(true);
    } else {
      setFilteredDoctors([]);
      setShowDoctorDropdown(false);
    }
  };

  const selectDoctorSuggestion = (docObj) => {
    setDoctorName(docObj.name);
    setDoctorId(docObj.id);
    setPrevDue(docObj.dueAmount);
    if (docObj.phone) {
      setDoctorPhone(docObj.phone);
    }
    if (docObj.address) {
      setDoctorAddress(docObj.address);
    }
    if (docObj.taxId) {
      setDoctorTaxId(docObj.taxId);
    }
    setShowDoctorDropdown(false);

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (!item.itemName.trim()) return item;
        const lastDisc = getLastDiscountForDoctorAndProduct(docObj.name, docObj.id, item.itemName);
        return {
          ...item,
          discount: lastDisc
        };
      })
    );
  };

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

  // Fetch matching stock items and filter unique medicine names + batches
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
      // Filter items from stock that match query in name, showing batch options
      const matched = allStock.filter(
        (stockItem) => 
          stockItem.medicineName.toUpperCase().includes(normalizedQuery) && 
          stockItem.availableQuantity > 0
      );

      setSuggestions(matched);
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

  // Handle selecting a suggested medicine stock item
  const handleSelectSuggestion = (index, stockItem) => {
    const medName = stockItem.medicineName.toUpperCase();
    const prevDiscount = getLastDiscountForDoctorAndProduct(doctorName, doctorId, medName);

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      itemName: medName,
      quantity: '', // Keep quantity empty
      batchNo: stockItem.batchNo.toUpperCase(),
      expiryDate: stockItem.expiryDate,
      mrp: stockItem.mrp || 0,
      discount: prevDiscount, // only taken from that doctor's last bill with this product, else empty ('')
      cgstPercent: stockItem.cgstPercent || 2.5,
      sgstPercent: stockItem.sgstPercent || 2.5,
      availableQty: stockItem.availableQuantity // Hold this to validate
    };

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
        discount: '',
        cgstPercent: 2.5,
        sgstPercent: 2.5,
        availableQty: 9999
      }
    ]);
  };

  // Remove line item row
  const handleRemoveItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate live line items and bill summary
  const calculatedItems = items.map(calculateSellingLineItem);
  const summary = calculateSellingBillSummary(calculatedItems, prevDue, fixedDiscount, initialDue);

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
      // If pressing Enter on any field of a product: go to next row, or add one product if no next row
      const productRow = e.target.closest('tbody tr');
      if (productRow) {
        e.preventDefault();
        setActiveRowIndex(null);
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);

        const tbody = productRow.closest('tbody');
        const allRows = Array.from(tbody.querySelectorAll('tr'));
        const rowIndex = allRows.indexOf(productRow);

        if (rowIndex === allRows.length - 1) {
          handleAddItemRow();
        } else {
          const nextRow = allRows[rowIndex + 1];
          const nextInput = nextRow.querySelector('input[data-field="itemName"]') || nextRow.querySelector('input');
          if (nextInput) {
            nextInput.focus();
            if (nextInput.select) {
              nextInput.select();
            }
          }
        }
        return;
      }

      e.preventDefault();
      if (index > -1 && index < focusable.length - 1) {
        focusable[index + 1].focus();
        if (focusable[index + 1].select) {
          focusable[index + 1].select();
        }
      }
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const productRow = e.target.closest('tbody tr');
      if (productRow) {
        const tbody = productRow.closest('tbody');
        const allRows = Array.from(tbody.querySelectorAll('tr'));
        const rowIndex = allRows.indexOf(productRow);

        if (rowIndex > -1) {
          const targetRowIndex = e.key === 'ArrowDown' ? rowIndex + 1 : rowIndex - 1;

          if (targetRowIndex >= 0 && targetRowIndex < allRows.length) {
            e.preventDefault();
            setActiveRowIndex(null);
            setSuggestions([]);
            setSelectedSuggestionIndex(-1);

            const targetRow = allRows[targetRowIndex];
            const currentRowInputs = Array.from(productRow.querySelectorAll('input:not([disabled]):not([readonly])'));
            const targetRowInputs = Array.from(targetRow.querySelectorAll('input:not([disabled]):not([readonly])'));
            const currentInputIndex = currentRowInputs.indexOf(e.target);

            const targetInput = (currentInputIndex > -1 && targetRowInputs[currentInputIndex])
              ? targetRowInputs[currentInputIndex]
              : (targetRow.querySelector('input[data-field="itemName"]') || targetRowInputs[0]);

            if (targetInput) {
              targetInput.focus();
              if (targetInput.select) {
                targetInput.select();
              }
            }
            return;
          }
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

    if (!doctorName.trim()) {
      setErrorMessage('Please enter the Doctor Name.');
      return;
    }

    if (items.some(i => !i.itemName.trim())) {
      setErrorMessage('All medicine line items must have a medicine name.');
      return;
    }

    // Validation: check for 0 or empty quantity
    const zeroQtyItem = items.find(i => i.quantity === '' || i.quantity === null || i.quantity === undefined || Number(i.quantity) <= 0);
    if (zeroQtyItem) {
      setErrorMessage(
        zeroQtyItem.itemName && zeroQtyItem.itemName.trim()
          ? `Quantity for "${zeroQtyItem.itemName}" must not be 0.`
          : 'Product quantity must not be 0.'
      );
      return;
    }

    // Validation: check stock limit
    if (saveMode === 'firestore') {
      const stockViolation = items.find(i => Number(i.quantity) > i.availableQty);
      if (stockViolation) {
        setErrorMessage(`Cannot sell ${stockViolation.quantity} units of ${stockViolation.itemName}. Only ${stockViolation.availableQty} units are available in Stock Batch ${stockViolation.batchNo}.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setSubmitMode(saveMode);
      setErrorMessage('');
      await onSaveSellingBill({
        billNo: sellingBillNo,
        doctorId,
        doctorName,
        doctorPhone,
        doctorAddress,
        doctorTaxId,
        invoiceDate,
        notes,
        fixedDiscount: Number(fixedDiscount) || 0,
        initialDue: Number(initialDue) || 0,
        items: items
      }, sellingBillToEdit ? sellingBillToEdit.id : null, saveMode);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save selling bill.');
    } finally {
      setIsSubmitting(false);
      setSubmitMode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-[95vw] lg:max-w-7xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 shadow-sm">
              <Calculator className="h-5 w-5 animate-pulse text-zinc-350" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                {sellingBillToEdit ? `Edit Doctor Selling Bill (${sellingBillToEdit.billNo})` : 'Create New Doctor Bill'}
              </h3>
              <p className="text-xs text-zinc-400">
                Create patient/doctor bill, adjust stock, and update account balance
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

          {/* 3 Columns: Seller Details | Doctor Details | Bill No & Date */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-zinc-900/40 p-5 rounded-xl border border-zinc-800">
            {/* Column 1: Seller Details */}
            <div className="lg:col-span-3 space-y-2.5 border-b lg:border-b-0 lg:border-r border-zinc-800 pb-4 lg:pb-0 lg:pr-5">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                <h4 className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider">
                  Seller Details
                </h4>
              </div>
              <div className="space-y-1.5 text-xs text-zinc-300">
                <p className="font-bold text-sm text-zinc-100">{sellerDetails.name || 'Company Name'}</p>
                <p className="text-zinc-400 text-xs leading-relaxed">{sellerDetails.address || 'Address not specified'}</p>
                <p className="font-mono text-zinc-400 text-[11px]">
                  <span className="text-zinc-500 font-semibold">GSTIN:</span> {sellerDetails.gstin || 'N/A'}
                </p>
                <p className="text-zinc-400 text-[11px]">
                  <span className="text-zinc-500 font-semibold">Contact:</span> {sellerDetails.contact || 'N/A'}
                </p>
              </div>
            </div>

            {/* Column 2: Doctor Details */}
            <div className="lg:col-span-6 space-y-3 border-b lg:border-b-0 lg:border-r border-zinc-800 pb-4 lg:pb-0 lg:pr-5">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-zinc-400" />
                <h4 className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider">
                  Doctor Details
                </h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="relative">
                  <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                    Doctor Name <span className="text-zinc-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => handleDoctorInputChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowDoctorDropdown(false), 200)}
                    required
                    placeholder="ENTER DOCTOR NAME"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none uppercase"
                  />
                  {showDoctorDropdown && filteredDoctors.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 max-h-36 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-50 divide-y divide-zinc-900">
                      {filteredDoctors.map((docObj) => (
                        <div
                          key={docObj.id}
                          onMouseDown={() => selectDoctorSuggestion(docObj)}
                          className="px-3 py-2 text-xs font-semibold uppercase text-zinc-300 hover:bg-zinc-900 hover:text-zinc-200 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span>{docObj.name}</span>
                            <span className="text-[10px] text-zinc-500 lowercase font-normal">(due: ₹{docObj.dueAmount.toFixed(2)})</span>
                          </div>
                          {(docObj.address || docObj.taxId || docObj.phone) && (
                            <div className="text-[10px] text-zinc-500 font-normal truncate mt-0.5">
                              {[docObj.taxId ? `Tax: ${docObj.taxId}` : '', docObj.address, docObj.phone].filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                    Contact No
                  </label>
                  <input
                    type="tel"
                    value={doctorPhone}
                    onChange={(e) => setDoctorPhone(e.target.value)}
                    placeholder="E.G. +91 99999 99999"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                    Doctor Address
                  </label>
                  <input
                    type="text"
                    value={doctorAddress}
                    onChange={(e) => setDoctorAddress(e.target.value)}
                    placeholder="CLINIC / HOSPITAL ADDRESS"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                    Tax ID / GSTIN
                  </label>
                  <input
                    type="text"
                    value={doctorTaxId}
                    onChange={(e) => setDoctorTaxId(e.target.value.toUpperCase())}
                    placeholder="GSTIN / REG NO."
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Column 3: Bill No & Date */}
            <div className="lg:col-span-3 space-y-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-zinc-400" />
                <h4 className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider">
                  Bill No & Date
                </h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                    Bill No (Auto-Generated if empty)
                  </label>
                  <input
                    ref={billNoInputRef}
                    type="text"
                    value={sellingBillNo}
                    onChange={(e) => setSellingBillNo(e.target.value.toUpperCase())}
                    placeholder="E.G. SB-0001"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                    Invoice Date (DD/MM/YYYY)
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Medicines Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase text-zinc-300 tracking-wider">
                Medicine Products Sold ({items.length})
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
                    <th className="py-2.5 px-3 w-[50px]">S.No.</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Product Name (Stock Search)</th>
                    <th className="py-2.5 px-3 min-w-[70px]">Qty</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Batch No</th>
                    <th className="py-2.5 px-3 min-w-[80px]">Expiry</th>
                    <th className="py-2.5 px-3 min-w-[85px]">MRP (₹)</th>
                    <th className="py-2.5 px-3 min-w-[80px]" title="Discount % from MRP">Disc (%)</th>
                    <th className="py-2.5 px-3 min-w-[90px]" title="Rate (mrp * (100 - Disc)/100)">Rate (₹)</th>
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
                    const numQty = Number(rawItem.quantity);
                    const isZeroQty = rawItem.quantity !== '' && numQty <= 0;
                    const outOfStock = numQty > rawItem.availableQty;

                    return (
                      <tr key={index} className={`hover:bg-zinc-900/80 transition-colors ${outOfStock || isZeroQty ? 'bg-rose-500/5' : ''}`}>
                        {/* Serial No */}
                        <td className="p-2 text-center text-zinc-500 font-mono">
                          {index + 1}
                        </td>

                        {/* Medicine Name with Stock Autocomplete */}
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
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 pr-7 text-xs text-zinc-200 outline-none uppercase font-semibold"
                            />
                            {isSearchLoading && activeRowIndex === index && (
                              <div className="absolute right-2 flex items-center justify-center pointer-events-none">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                              </div>
                            )}
                          </div>
                          
                          {activeRowIndex === index && suggestions.length > 0 && (
                            <div className="absolute left-2 right-2 mt-1 max-h-48 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-50 divide-y divide-zinc-900 select-none">
                              {suggestions.map((stockItem, idx) => (
                                <div
                                  key={stockItem.id}
                                  onMouseDown={() => handleSelectSuggestion(index, stockItem)}
                                  className={`px-3 py-2 text-xs font-semibold uppercase transition-colors cursor-pointer ${selectedSuggestionIndex === idx
                                      ? 'bg-zinc-900 text-zinc-100 font-bold'
                                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-200'
                                    }`}
                                >
                                  <div className="flex justify-between">
                                    <span>{stockItem.medicineName}</span>
                                    <span className="text-[10px] text-zinc-500 font-normal">
                                      Batch: {stockItem.batchNo} | Exp: {stockItem.expiryDate}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-[10px] text-zinc-500 font-normal mt-0.5">
                                    <span>MRP: ₹{stockItem.mrp.toFixed(2)} | Doc Disc: {stockItem.doctorDisc}%</span>
                                    <span className="font-bold text-zinc-400">Stock Qty: {stockItem.availableQuantity}</span>
                                  </div>
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
                            className={`w-full bg-zinc-950 border rounded px-2 py-1 text-xs text-zinc-200 text-center font-mono outline-none ${
                              outOfStock || isZeroQty ? 'border-rose-500 focus:border-rose-500 text-rose-300' : 'border-zinc-800 focus:border-zinc-500'
                            }`}
                          />
                          {isZeroQty ? (
                            <span className="block text-[9px] text-center mt-0.5 font-bold text-rose-450 animate-pulse">
                              must not be 0
                            </span>
                          ) : rawItem.availableQty !== 9999 ? (
                            <span className={`block text-[9px] text-center mt-0.5 font-bold ${outOfStock ? 'text-rose-450 animate-pulse' : 'text-zinc-550'}`}>
                              max: {rawItem.availableQty}
                            </span>
                          ) : null}
                        </td>

                        {/* Batch No */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={rawItem.batchNo}
                            onChange={(e) => handleItemChange(index, 'batchNo', e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-300 font-mono outline-none uppercase"
                          />
                        </td>

                        {/* Expiry Date */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={rawItem.expiryDate}
                            onChange={(e) => handleExpiryChange(index, e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-300 text-center font-mono outline-none"
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
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-300 text-right font-mono outline-none"
                          />
                        </td>

                        {/* Discount % (Disc) */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={rawItem.discount}
                            onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-100 font-bold text-center font-mono outline-none"
                          />
                        </td>

                        {/* Calculated Doctor Rate */}
                        <td className="p-2">
                          <div className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 text-right font-mono font-semibold">
                            {calc.rate.toFixed(2)}
                          </div>
                        </td>

                        {/* CGST % */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1;;"
                            min="0"
                            value={rawItem.cgstPercent}
                            onChange={(e) => handleItemChange(index, 'cgstPercent', e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-300 text-center font-mono outline-none"
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
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded px-2 py-1 text-xs text-zinc-300 text-center font-mono outline-none"
                          />
                        </td>

                        {/* Nett Rate (Readonly) */}
                        <td className="p-2">
                          <div className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 text-right font-mono">
                            {calc.nettRate.toFixed(2)}
                          </div>
                        </td>

                        {/* Line Amount */}
                        <td className="p-2 text-right">
                          <div className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 font-bold text-right font-mono">
                            {calc.amount.toFixed(2)}
                          </div>
                        </td>

                        {/* Delete Row Button */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(index)}
                            disabled={items.length === 1}
                            className="p-1 rounded text-zinc-500 hover:text-rose-450 hover:bg-rose-500/10 transition-colors disabled:opacity-30"
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
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                    Fixed Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={fixedDiscount}
                    onChange={(e) => setFixedDiscount(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                    Initial Due (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={initialDue}
                    onChange={(e) => setInitialDue(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                  Bill Remarks / Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg p-3 text-xs text-zinc-350 outline-none resize-none"
                ></textarea>
              </div>
            </div>

            {/* Live Financial Summary Box with exact requested format */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-2.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2">
                Bill Summary
              </h5>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total Amount (Items Net):</span>
                <span className="font-mono font-semibold text-zinc-300">{formatCurrency(summary.totalAmount)}</span>
              </div>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Total GST:</span>
                <span className="font-mono text-zinc-400">{formatCurrency(summary.totalGst)}</span>
              </div>

              <div className="flex justify-between text-xs text-zinc-300">
                <span>Prev Due:</span>
                <span className="font-mono text-zinc-450">{formatCurrency(summary.prevDue)}</span>
              </div>

              {Number(summary.initialDue) > 0 && (
                <div className="flex justify-between text-xs text-zinc-300 font-medium">
                  <span>Initial Due:</span>
                  <span className="font-mono text-amber-400">+ {formatCurrency(summary.initialDue)}</span>
                </div>
              )}

              {Number(summary.fixedDiscount) > 0 && (
                <div className="flex justify-between text-xs text-amber-400/90 font-medium">
                  <span>Fixed Discount:</span>
                  <span className="font-mono">- {formatCurrency(summary.fixedDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-zinc-100 border-t border-zinc-800 pt-2">
                <span>Total Payable:</span>
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
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-350 border border-zinc-800 text-xs font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-50"
            title="Save as a draft bill (doesn't adjust stock)"
          >
            {isSubmitting && submitMode === 'local' ? (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-450" />
            ) : (
              <HardDrive className="h-4 w-4 text-zinc-450" />
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
                  ? 'Saving...'
                  : sellingBillToEdit ? 'Save Bill' : 'Save Bill'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
