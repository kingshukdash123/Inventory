/**
 * Distributes bill line items across Half-A4 (A5 size) pages,
 * and groups those half-pages into physical A4 sheets (2 halves per A4 sheet).
 */

export function paginateSellingBill(items = [], options = {}) {
  const {
    itemsPerFirstHalf = 8,       // Max items on the half that includes the Bill Summary box
    itemsPerContinuationHalf = 12, // Max items on continuation halves (no summary box)
    duplicateIfSingle = false     // User setting: Option B is false (blank bottom with cut guide)
  } = options;

  const totalItems = items.length;

  // Handle empty bill gracefully
  if (totalItems === 0) {
    const singleHalf = {
      pageNumber: 1,
      totalPages: 1,
      items: [],
      startIndex: 0,
      isFinal: true,
      isContinuation: false,
      copyLabel: 'ORIGINAL'
    };

    return [
      {
        sheetIndex: 1,
        totalSheets: 1,
        topHalf: singleHalf,
        bottomHalf: duplicateIfSingle ? { ...singleHalf, copyLabel: 'DUPLICATE FOR SUPPLIER' } : null
      }
    ];
  }

  // Determine total half-pages needed
  let totalPages = 1;
  if (totalItems > itemsPerFirstHalf) {
    const extraItems = totalItems - itemsPerFirstHalf;
    const extraPages = Math.ceil(extraItems / itemsPerContinuationHalf);
    totalPages = 1 + extraPages;
  }

  // Calculate items per page with balanced distribution
  const pageChunks = [];
  let itemOffset = 0;

  if (totalPages === 1) {
    pageChunks.push({
      pageNumber: 1,
      totalPages: 1,
      items: items,
      startIndex: 0,
      isFinal: true,
      isContinuation: false,
      copyLabel: 'ORIGINAL'
    });
  } else {
    // Balance items across pages so final page is <= itemsPerFirstHalf and continuation pages <= itemsPerContinuationHalf
    const finalItemsCount = Math.min(
      itemsPerFirstHalf,
      Math.max(1, Math.ceil(totalItems / totalPages))
    );
    let remainingForCont = totalItems - finalItemsCount;
    const contPagesCount = totalPages - 1;

    for (let p = 0; p < contPagesCount; p++) {
      const remainingPages = contPagesCount - p;
      const count = Math.min(itemsPerContinuationHalf, Math.ceil(remainingForCont / remainingPages));
      const pageItems = items.slice(itemOffset, itemOffset + count);
      
      pageChunks.push({
        pageNumber: p + 1,
        totalPages,
        items: pageItems,
        startIndex: itemOffset,
        isFinal: false,
        isContinuation: p > 0,
        copyLabel: 'ORIGINAL'
      });

      itemOffset += count;
      remainingForCont -= count;
    }

    // Final page gets remaining items and contains the summary box
    const finalItems = items.slice(itemOffset);
    pageChunks.push({
      pageNumber: totalPages,
      totalPages,
      items: finalItems,
      startIndex: itemOffset,
      isFinal: true,
      isContinuation: true,
      copyLabel: 'ORIGINAL'
    });
  }

  // Group half-pages into physical A4 sheets (2 halves per sheet)
  const sheets = [];
  const totalSheets = Math.ceil(pageChunks.length / 2);

  for (let s = 0; s < totalSheets; s++) {
    const topPage = pageChunks[s * 2];
    let bottomPage = pageChunks[s * 2 + 1] || null;

    // If there is only 1 page in the entire invoice and duplicateIfSingle is enabled, duplicate it on bottom
    if (!bottomPage && totalPages === 1 && duplicateIfSingle) {
      bottomPage = {
        ...topPage,
        copyLabel: 'DUPLICATE FOR SUPPLIER'
      };
    }

    sheets.push({
      sheetIndex: s + 1,
      totalSheets,
      topHalf: topPage,
      bottomHalf: bottomPage // null means empty space with cut guide
    });
  }

  return sheets;
}
