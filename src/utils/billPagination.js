/**
 * Distributes bill line items across Half-A4 (A5 size) pages,
 * and groups those half-pages into physical A4 sheets (2 halves per A4 sheet).
 */

export function paginateSellingBill(items = [], options = {}) {
  const {
    itemsPerSingleHalf = options.itemsPerFirstHalf || 12,       // Max items on a single half-page (includes Bill Summary box)
    itemsPerContinuationHalf = options.itemsPerContinuationHalf || 16, // Max items on continuation halves (no summary box)
    itemsPerFinalHalf = options.itemsPerFirstHalf || 12,        // Max items on final half of multi-page bill (includes summary box)
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

  // Case 1: Fits completely on a single half-page (with summary box)
  if (totalItems <= itemsPerSingleHalf) {
    const singleHalf = {
      pageNumber: 1,
      totalPages: 1,
      items: items,
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

  // Case 2: Multi-page bill — Fill each half sequentially/greedily (1st half completely filled first)
  const extraItems = totalItems - itemsPerFinalHalf;
  const totalPages = 1 + Math.ceil(extraItems / itemsPerContinuationHalf);

  const pageChunks = [];
  let itemOffset = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const isLastPage = pageNum === totalPages;
    const remainingItems = totalItems - itemOffset;

    if (isLastPage) {
      // Final page gets remaining items and contains the summary box
      pageChunks.push({
        pageNumber: pageNum,
        totalPages,
        items: items.slice(itemOffset),
        startIndex: itemOffset,
        isFinal: true,
        isContinuation: true,
        copyLabel: 'ORIGINAL'
      });
      break;
    }

    // Continuation page: Fill completely up to itemsPerContinuationHalf,
    // leaving at least 1 item for each remaining page.
    const pagesLeftAfterThis = totalPages - pageNum;
    const maxCanTake = remainingItems - pagesLeftAfterThis;
    const count = Math.min(itemsPerContinuationHalf, maxCanTake);
    const pageItems = items.slice(itemOffset, itemOffset + count);

    pageChunks.push({
      pageNumber: pageNum,
      totalPages,
      items: pageItems,
      startIndex: itemOffset,
      isFinal: false,
      isContinuation: pageNum > 1,
      copyLabel: 'ORIGINAL'
    });

    itemOffset += count;
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
