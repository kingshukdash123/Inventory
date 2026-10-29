/**
 * Helper utility for calculating medicine bill line items & aggregated summaries
 * based on the exact TODO specification:
 * 
 * doctor_rate = mrp * (100 - doctor_disc) / 100
 * discount_amount = doctor_rate * (discount / 100)
 * taxable_base = doctor_rate - discount_amount
 * cgst_amount = taxable_base * (cgst_percent / 100)
 * sgst_amount = taxable_base * (sgst_percent / 100)
 * nett_rate = taxable_base + cgst_amount + sgst_amount
 * amount = quantity * nett_rate
 */

export function calculateLineItem(item) {
  const quantity = Number(item.quantity) || 0;
  const mrp = Number(item.mrp) || 0;
  const doctorDisc = Number(item.doctorDisc) || 0; // % of MRP
  
  // Calculate Doctor Rate dynamically from MRP and Doctor Discount %
  const doctorRate = mrp * (100 - doctorDisc) / 100;

  const discountPercent = item.discount !== undefined && item.discount !== '' ? Number(item.discount) : 25;
  const discountAmount = doctorRate * (discountPercent / 100);

  const taxableBase = Math.max(0, doctorRate - discountAmount);

  const cgstPercent = item.cgstPercent !== undefined && item.cgstPercent !== '' ? Number(item.cgstPercent) : 2.5;
  const sgstPercent = item.sgstPercent !== undefined && item.sgstPercent !== '' ? Number(item.sgstPercent) : 2.5;

  const cgstAmount = taxableBase * (cgstPercent / 100);
  const sgstAmount = taxableBase * (sgstPercent / 100);

  const nettRate = taxableBase + cgstAmount + sgstAmount;
  const amount = quantity * nettRate;

  const totalDoctorRate = quantity * doctorRate;
  const totalCgst = quantity * cgstAmount;
  const totalSgst = quantity * sgstAmount;
  const totalDiscount = quantity * discountAmount;

  return {
    itemName: item.itemName || '',
    quantity,
    batchNo: item.batchNo || '',
    expiryDate: item.expiryDate || '',
    mrp: Number(mrp.toFixed(2)),
    doctorDisc: Number(doctorDisc.toFixed(2)),
    doctorRate: Number(doctorRate.toFixed(4)),
    discount: Number(discountPercent.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(4)),
    taxableBase: Number(taxableBase.toFixed(4)),
    cgstPercent: Number(cgstPercent.toFixed(2)),
    cgstAmount: Number(cgstAmount.toFixed(4)),
    sgstPercent: Number(sgstPercent.toFixed(2)),
    sgstAmount: Number(sgstAmount.toFixed(4)),
    nettRate: Number(nettRate.toFixed(4)),
    amount: Number(amount.toFixed(2)),
    totalDoctorRate: Number(totalDoctorRate.toFixed(2)),
    totalCgst: Number(totalCgst.toFixed(2)),
    totalSgst: Number(totalSgst.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2))
  };
}

export function calculateBillSummary(items = []) {
  return items.reduce((acc, rawItem) => {
    const item = calculateLineItem(rawItem);
    acc.totalItems += 1;
    acc.totalQuantity += item.quantity;
    acc.totalDoctorRate += item.totalDoctorRate;
    acc.totalDiscount += item.totalDiscount;
    acc.totalCgst += item.totalCgst;
    acc.totalSgst += item.totalSgst;
    acc.grandTotal += item.amount;
    return acc;
  }, {
    totalItems: 0,
    totalQuantity: 0,
    totalDoctorRate: 0,
    totalDiscount: 0,
    totalCgst: 0,
    totalSgst: 0,
    grandTotal: 0
  });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount || 0);
}

/**
 * Format date values to DD/MM/YYYY format (e.g. 14/10/2026)
 */
export function formatDate(dateInput) {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Match YYYY-MM-DD (e.g. 2026-10-14)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
    // Match DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[1]}/${dmyMatch[2]}/${dmyMatch[3]}`;
    }
  }

  try {
    const date = typeof dateInput?.toDate === 'function'
      ? dateInput.toDate()
      : (dateInput instanceof Date ? dateInput : new Date(dateInput));

    if (isNaN(date.getTime())) return String(dateInput);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

export function calculateSellingLineItem(item) {
  const quantity = Number(item.quantity) || 0;
  const mrp = Number(item.mrp) || 0;
  const discountPercent = Number(item.discount) || 0; // UI label Disc

  // rate = mrp * (100 - discountPercent) / 100
  const rate = mrp * (100 - discountPercent) / 100;

  const cgstPercent = item.cgstPercent !== undefined && item.cgstPercent !== '' ? Number(item.cgstPercent) : 2.5;
  const sgstPercent = item.sgstPercent !== undefined && item.sgstPercent !== '' ? Number(item.sgstPercent) : 2.5;

  const cgstAmount = rate * (cgstPercent / 100);
  const sgstAmount = rate * (sgstPercent / 100);

  const nettRate = rate + cgstAmount + sgstAmount;
  const amount = quantity * nettRate;

  return {
    itemName: item.itemName || '',
    quantity,
    batchNo: item.batchNo || '',
    expiryDate: item.expiryDate || '',
    mrp: Number(mrp.toFixed(2)),
    discount: Number(discountPercent.toFixed(2)),
    rate: Number(rate.toFixed(4)),
    cgstPercent: Number(cgstPercent.toFixed(2)),
    cgstAmount: Number(cgstAmount.toFixed(4)),
    sgstPercent: Number(sgstPercent.toFixed(2)),
    sgstAmount: Number(sgstAmount.toFixed(4)),
    nettRate: Number(nettRate.toFixed(4)),
    amount: Number(amount.toFixed(2))
  };
}

export function calculateSellingBillSummary(items = [], fixedDiscount = 0) {
  const fd = Math.max(0, Number(fixedDiscount) || 0);

  const summary = items.reduce((acc, rawItem) => {
    const item = calculateSellingLineItem(rawItem);
    acc.totalItems += 1;
    acc.totalQuantity += item.quantity;
    acc.totalGst += item.quantity * (item.cgstAmount + item.sgstAmount);
    acc.totalAmount += item.amount;
    return acc;
  }, {
    totalItems: 0,
    totalQuantity: 0,
    totalGst: 0,
    totalAmount: 0,
    fixedDiscount: fd,
    grandTotal: 0
  });
  
  // Grand total = total amount - fixed discount
  summary.grandTotal = Math.max(0, summary.totalAmount - fd);
  
  // Format to standard decimals
  summary.totalGst = Number(summary.totalGst.toFixed(2));
  summary.totalAmount = Number(summary.totalAmount.toFixed(2));
  summary.fixedDiscount = Number(fd.toFixed(2));
  summary.grandTotal = Number(summary.grandTotal.toFixed(2));

  return summary;
}

/**
 * Parse an expiry date string (e.g. "MM/YY", "MM/YYYY", "YYYY-MM-DD")
 * into a comparable numeric sort key: (year * 100 + month).
 * Returns 0 for invalid or missing dates.
 */
export function parseExpiryToNumber(expiryStr) {
  if (!expiryStr || typeof expiryStr !== 'string') return 0;
  const str = expiryStr.trim();
  if (!str || str.toUpperCase() === 'N/A') return 0;

  // Match MM/YY or MM/YYYY (with / or -)
  const mmyyMatch = str.match(/^(\d{1,2})[/-](\d{2}|\d{4})$/);
  if (mmyyMatch) {
    const month = parseInt(mmyyMatch[1], 10);
    let year = parseInt(mmyyMatch[2], 10);
    if (year < 100) {
      // 2-digit year (e.g. 26 -> 2026, 99 -> 1999)
      year += year < 70 ? 2000 : 1900;
    }
    return year * 100 + month;
  }

  // Match YYYY-MM or YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    return year * 100 + month;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    return year * 100 + month;
  }

  // Fallback to Date object if parseable
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.getFullYear() * 100 + (date.getMonth() + 1);
  }

  return 0;
}

/**
 * Parse an expiry date string or object into a Date object representing
 * the end of the expiration month or day.
 * Returns null for invalid or missing dates.
 */
export function parseExpiryToDate(expiryInput) {
  if (!expiryInput) return null;

  if (typeof expiryInput?.toDate === 'function') {
    return expiryInput.toDate();
  }

  if (expiryInput instanceof Date) {
    return isNaN(expiryInput.getTime()) ? null : expiryInput;
  }

  if (typeof expiryInput !== 'string') return null;
  const str = expiryInput.trim();
  if (!str || str.toUpperCase() === 'N/A' || str === '-') return null;

  // Match MM/YY or MM/YYYY (with / or -)
  const mmyyMatch = str.match(/^(\d{1,2})[/-](\d{2}|\d{4})$/);
  if (mmyyMatch) {
    const month = parseInt(mmyyMatch[1], 10);
    let year = parseInt(mmyyMatch[2], 10);
    if (year < 100) {
      year += year < 70 ? 2000 : 1900;
    }
    // Medicine expires at the end of the specified month (last day at 23:59:59.999)
    return new Date(year, month, 0, 23, 59, 59, 999);
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  // Match YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  // Match YYYY-MM
  const ymMatch = str.match(/^(\d{4})[/-](\d{1,2})$/);
  if (ymMatch) {
    const year = parseInt(ymMatch[1], 10);
    const month = parseInt(ymMatch[2], 10);
    return new Date(year, month, 0, 23, 59, 59, 999);
  }

  // Fallback to standard Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Check if a medicine batch is near expiry (expires within the given number of months from now, or already expired)
 * @param {string|Date} expiryInput 
 * @param {number} monthsThreshold Default is 6 months
 * @returns {boolean}
 */
export function isNearExpiry(expiryInput, monthsThreshold = 6) {
  const expDate = parseExpiryToDate(expiryInput);
  if (!expDate) return false;

  const now = new Date();
  // Threshold date: end of the N-th month from current month
  const thresholdDate = new Date(
    now.getFullYear(),
    now.getMonth() + monthsThreshold + 1,
    0,
    23,
    59,
    59,
    999
  );

  return expDate.getTime() <= thresholdDate.getTime();
}

/**
 * Check if a medicine batch is already expired (expiration date has passed)
 */
export function isExpired(expiryInput) {
  const expDate = parseExpiryToDate(expiryInput);
  if (!expDate) return false;
  return expDate.getTime() < Date.now();
}

/**
 * Compare two items with expiryDate descending (latest expiry date first).
 * Items without a valid expiry date (0) are sorted to the bottom.
 * Tie-breaker: batchNo ascending.
 */
export function compareExpiryDesc(a, b) {
  const valA = parseExpiryToNumber(a?.expiryDate);
  const valB = parseExpiryToNumber(b?.expiryDate);

  if (valA === 0 && valB !== 0) return 1;
  if (valB === 0 && valA !== 0) return -1;

  if (valB !== valA) {
    return valB - valA; // Descending: higher/later date first
  }
  return (a?.batchNo || '').localeCompare(b?.batchNo || '');
}

/**
 * Compare two items with expiryDate ascending (nearest/earliest expiry date first).
 * Items without a valid expiry date (0) are sorted to the bottom.
 * Tie-breaker: batchNo ascending.
 */
export function compareExpiryAsc(a, b) {
  const valA = parseExpiryToNumber(a?.expiryDate);
  const valB = parseExpiryToNumber(b?.expiryDate);

  // Missing or invalid dates go to the bottom
  if (valA === 0 && valB !== 0) return 1;
  if (valB === 0 && valA !== 0) return -1;

  if (valA !== valB) {
    return valA - valB; // Ascending: smaller/nearest date first
  }
  return (a?.batchNo || '').localeCompare(b?.batchNo || '');
}


