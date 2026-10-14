/**
 * Converts a numerical amount into Indian currency words.
 * E.g. 1250.50 -> "Rupees One Thousand Two Hundred Fifty and Fifty Paise Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertLessThanThousand(num) {
  let str = '';
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += TENS[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  if (num > 0) {
    str += ONES[num] + ' ';
  }
  return str.trim();
}

export function convertNumberToWordsINR(amount) {
  const num = Math.round(Number(amount || 0) * 100) / 100;
  if (isNaN(num) || num <= 0) return 'Rupees Zero Only';

  const parts = num.toString().split('.');
  let rupees = parseInt(parts[0], 10);
  const paise = parts[1] ? parseInt(parts[1].padEnd(2, '0').slice(0, 2), 10) : 0;

  if (rupees === 0 && paise === 0) return 'Rupees Zero Only';

  let result = '';

  // Crores (1,00,00,000)
  if (rupees >= 10000000) {
    const crores = Math.floor(rupees / 10000000);
    result += convertLessThanThousand(crores) + ' Crore ';
    rupees %= 10000000;
  }

  // Lakhs (1,00,000)
  if (rupees >= 100000) {
    const lakhs = Math.floor(rupees / 100000);
    result += convertLessThanThousand(lakhs) + ' Lakh ';
    rupees %= 100000;
  }

  // Thousands (1,000)
  if (rupees >= 1000) {
    const thousands = Math.floor(rupees / 1000);
    result += convertLessThanThousand(thousands) + ' Thousand ';
    rupees %= 1000;
  }

  // Remaining hundreds, tens, ones
  if (rupees > 0) {
    result += convertLessThanThousand(rupees) + ' ';
  }

  result = result.trim();
  let words = `Rupees ${result}`;

  if (paise > 0) {
    words += ` and ${convertLessThanThousand(paise)} Paise`;
  }

  return `${words} Only`;
}
