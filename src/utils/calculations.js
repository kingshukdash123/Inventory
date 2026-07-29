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
  
  // Calculate Doctor Rate
  // If user enters doctorDisc %, calculate doctorRate.
  const doctorRate = Number(item.doctorRate) > 0 
    ? Number(item.doctorRate)
    : mrp * (100 - doctorDisc) / 100;

  const discountPercent = item.discount !== undefined && item.discount !== '' ? Number(item.discount) : 25;
  const discountAmount = doctorRate * (discountPercent / 100);

  const taxableBase = Math.max(0, doctorRate - discountAmount);

  const cgstPercent = item.cgstPercent !== undefined && item.cgstPercent !== '' ? Number(item.cgstPercent) : 5;
  const sgstPercent = item.sgstPercent !== undefined && item.sgstPercent !== '' ? Number(item.sgstPercent) : 5;

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
