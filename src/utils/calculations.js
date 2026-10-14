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
    const dmyMatch = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
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

export function calculateSellingBillSummary(items = [], prevDue = 0, fixedDiscount = 0, initialDue = 0) {
  const pd = Number(prevDue) || 0;
  const initDue = Math.max(0, Number(initialDue) || 0);
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
    prevDue: pd,
    initialDue: initDue,
    fixedDiscount: fd,
    grandTotal: 0
  });
  
  // Total payable = total amount + prev due + initial due - fixed disc
  summary.grandTotal = Math.max(0, summary.totalAmount + pd + initDue - fd);
  
  // Format to standard decimals
  summary.totalGst = Number(summary.totalGst.toFixed(2));
  summary.totalAmount = Number(summary.totalAmount.toFixed(2));
  summary.prevDue = Number(pd.toFixed(2));
  summary.initialDue = Number(initDue.toFixed(2));
  summary.fixedDiscount = Number(fd.toFixed(2));
  summary.grandTotal = Number(summary.grandTotal.toFixed(2));

  return summary;
}

